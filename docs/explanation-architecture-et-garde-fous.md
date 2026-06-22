# Explication — Architecture & garde-fous du pré-rapport

> **Quadrant Diataxis : Explanation.** Le *pourquoi* des choix de conception. Pour la
> description exhaustive des fichiers et signatures, voir
> [reference-pipeline-prerapport.md](reference-pipeline-prerapport.md).

Le pré-rapport a une contrainte produit forte : il doit être **crédible et défendable**
(c'est un outil de lead-gen pour des DRH), sans cannibaliser l'offre payante ni « ressembler
à du ChatGPT déguisé ». Cette contrainte explique la plupart des décisions ci-dessous.

---

## Pourquoi deux functions, dont une en arrière-plan

La génération enchaîne un appel LLM, un rendu Chromium et un envoi d'email. Cela prend
**bien plus que les ~10 s** d'une requête HTTP synchrone, et le navigateur de l'utilisateur
ne doit pas rester suspendu.

D'où la séparation :

- **`submit-prerapport`** est synchrone et rapide. Son seul travail : valider, capturer le
  lead (la conversion est déjà acquise dès que l'email est en base), et rendre la main
  (`202 Accepted`).
- **`generate-prerapport-background`** est une *background function* Netlify (jusqu'à 15 min).
  Elle fait le travail long sans bloquer personne.

Le pont entre les deux est un simple `fetch` POST `{ leadId }`. Si ce déclenchement échoue,
**le lead est quand même capturé** (status `received`) et la génération est rejouable —
on ne perd jamais un prospect à cause d'un hoquet réseau.

### L'idempotence par claim atomique

Une background function peut être déclenchée plus d'une fois (retry réseau, double POST). Si
deux exécutions tournaient en parallèle, on génèrerait deux PDF et on enverrait deux emails.

La parade est un **compare-and-set** en base :

```ts
update({ status: 'generating' }).eq('id', leadId).eq('status', 'received')
```

Seule l'exécution qui voit encore `received` « gagne » le lead et continue. La seconde matche
0 ligne et abandonne proprement. Pas de verrou applicatif, pas de file d'attente : la base
arbitre. C'est le même patron qu'un `UPDATE ... WHERE status = ?` conditionnel classique.

### La machine à états

```
received ──(claim)──▶ generating ──(succès)──▶ sent
                          │
                          └──(exception)──▶ failed  (+ notifyFailure)
```

`sent` signifie « rapport généré **et stocké** ». L'email est best-effort : s'il échoue alors
que le PDF est en base, on alerte l'ops (`notifyFailure`) mais on **ne repasse pas** en
`failed` — le PDF reste récupérable et renvoyable. On ne pénalise pas un lead réussi pour un
incident d'email.

---

## Le garde-fou central : « zéro chiffre inventé »

C'est l'invariant produit le plus important. Un rapport qui invente une statistique est pire
qu'inutile : il détruit la crédibilité. Le système le garantit par **défense en profondeur**,
à quatre niveaux.

1. **La donnée.** Tous les chiffres citables vivent dans `statbank.ts` — des stats macro
   réelles, publiques, sourcées (chacune avec `verbatim` d'origine pour l'audit). Il n'existe
   aucun chiffre propriétaire ni scoring par métier en V1 (décision CEO D4).

2. **La grille `allowedSources`.** Chaque section ne peut citer que certaines sources
   (`rapportStructure.ts`). `buildUserMessage` ne fournit au modèle, **par section**, que les
   stats autorisées. Le modèle ne voit littéralement pas les chiffres qu'il n'a pas le droit
   de citer à cet endroit.

3. **Le prompt.** `SYSTEM_PROMPT` ouvre sur 10 règles absolues, dont la règle n°1 : « Tu ne
   cites QUE des statistiques présentes dans la banque fournie. […] Si une donnée n'est pas
   fournie, tu n'avances aucun chiffre — tu restes qualitatif. » Plus des règles de prudence :
   recréditer les sources secondaires, formuler les projections au conditionnel, signaler les
   données mondiales/US non transposables à une PME française, et l'honnêteté sur les familles
   non couvertes (« à confirmer » plutôt qu'une généralité inventée).

4. **Le rendu.** `reportHtml.ts` n'affiche que le texte de `report_json` ; la bibliographie §9
   est **reconstruite depuis `statbank`** par les `id` cités (`sources_citees`). Un `id`
   inexistant n'apparaît tout simplement pas. Aucune fabrication possible à l'étape de rendu.

La sortie structurée (`response_format` json_schema `strict`) verrouille la **forme** : le
modèle doit produire exactement les 10 sections et, en §3, une caractérisation par famille.
Cela rend deux rapports comparables d'une entreprise à l'autre.

### Unité d'analyse : la famille de métiers, pas le secteur

Le rapport est structuré par **famille de métiers** (classification ISCO-08), pas par secteur.
Le secteur (code NAF) ne sert qu'à **pondérer** l'exposition. C'est un choix de fond : un même
métier est plus ou moins exposé selon le secteur, mais c'est le métier qui porte le diagnostic.
`famillesMetiers.ts` ancre l'appariement « texte libre Q4 → ISCO ».

Quand aucune source ne couvre directement une famille déclarée, la caractérisation tombe à
`exposition: 'à confirmer'`, `confiance: 'faible'`, `transposable_france: false`. On affiche
honnêtement la limite plutôt que de combler par du vide sourcé. C'est assumé : le socle ne
couvre pas les 28 familles.

### La frontière gratuit / payant

Le freemium applique **l'état de l'art public à vos métiers**. Il ne touche **jamais** aux
données internes de l'entreprise (maturité IA, inventaire de compétences, organisation) — le
formulaire n'en collecte d'ailleurs aucune. Le scoring fin par métier, l'analyse d'écart et la
feuille de route sont réservés au payant, vers lequel la section §8 fait un pont (texte figé).
C'est ce qui empêche le freemium de cannibaliser l'offre principale.

---

## Sécurité

### Le front ne touche jamais Supabase

Tout passe par les functions, qui utilisent la clé `service_role` (jamais exposée au
navigateur). Le front envoie un `multipart/form-data` à `submit`, point. C'est ce qui permet
une validation serveur de confiance et garde la clé secrète côté serveur.

### Anti-SSRF sur la lecture du site {#anti-ssrf}

`fetchSiteResume` récupère une URL fournie par l'utilisateur. Une URL publique peut rediriger
vers une IP privée ou les métadonnées cloud (`169.254.169.254`) — c'est une SSRF classique.
`redirect: 'follow'` serait dangereux. La parade :

- on suit les redirections **manuellement** et on **re-valide l'hôte à chaque saut** ;
- protocoles `http`/`https` uniquement ;
- hôtes loopback / privés / link-local bloqués (`127.*`, `10.*`, `192.168.*`, `169.254.*`, `172.16–31.*`, `localhost`, `::1`…) ;
- timeout (6 s), cap de taille (~1,5 Mo lus), contrôle du `content-type` (`text/html` seulement).

Résiduel non couvert (assumé) : le DNS-rebinding (un hostname public qui résout vers une IP
privée). Les tests dans `enrichment.test.ts` figent ces comportements.

### Anti-injection de prompt

Le résumé du site est du **contenu externe non fiable**. Avant injection dans le prompt,
`sanitizeUntrusted` neutralise toute forge de délimiteurs (`<<<` / `>>>`) pour empêcher le
contenu de « refermer » son bloc et s'évader vers la zone d'instructions. Le bloc est isolé
entre des délimiteurs, et la règle système n°10 ordonne au modèle de le traiter comme une
donnée descriptive, jamais comme des instructions. Double protection : structurelle + prompt.

### Anti-abus du formulaire public {#anti-abus}

Deux mécanismes volontairement légers (aucune nouvelle PII, aucune migration, propre côté
RGPD) :

- **Honeypot** : un champ caché `company_website_hp`. Rempli ⇒ bot. On renvoie alors un `202`
  factice (sans rien insérer) pour ne pas signaler au bot que le piège a fonctionné.
- **Rate-limit** : max 3 soumissions par email sur une fenêtre glissante d'1 h (comptage sur
  `leads.created_at`).

Le rate-limit par **IP** a été écarté : l'IP est une donnée personnelle (surface RGPD en plus)
pour un gain marginal sur une V1.

---

## Choix de rendu PDF

- **Fonction string pure** (`renderReportHtml`), pas de React SSR. Le rapport est un document
  d'impression sans interactivité, `report_json` est déjà plat → une fonction pure suffit, sans
  dépendance, et se teste au Vitest.
- **Chromium headless** (`puppeteer-core` + `@sparticuz/chromium`) rend fidèlement le HTML/CSS
  en PDF A4. En local (Windows), `@sparticuz/chromium` est un binaire Linux qui ne tourne pas ;
  d'où l'override `CHROME_EXECUTABLE_PATH` vers le Chrome/Edge de la machine.
- **Polices Google Fonts via `<link>`** (Newsreader + Hanken Grotesk, comme la landing).
  `@sparticuz/chromium` n'embarque presque aucune police ; on attend `document.fonts.ready`
  avant `page.pdf()`. Embarquer les `.woff2` en base64 aurait été plus robuste hors-ligne mais
  lourd à maintenir.
- **PDF en pièce jointe** (pas de lien signé). Le PDF se forwarde DRH → DG sans expiration ni
  ré-authentification — ce forward **est** le canal d'acquisition (décision produit D3).

---

## Le corpus de connaissance (d'où viennent les stats)

La stat-bank est extraite d'un corpus de 17 rapports de référence, qui alimentent deux
livrables différents :

- **Méthodologie d'exposition** (→ scoring du rapport final payant / V2) : Iceberg Index (MIT),
  ILO Generative AI & jobs, OCDE Capability, WEF Future of Jobs, Stanford AI Index.
- **Contexte RH-France** (→ ton + structure du freemium) : Parlons RH (baromètres 2025 & 2026),
  CEGOS, Neobrain × Sopra Steria, Indeed.

Le **ton** suit le baromètre Parlons RH (clair, RH, sourcé) ; la **structure**, elle, suit le
blueprint moteur §0→§9. La couche France (FR1–FR4) compense un socle quasi 100 % mondial/US/OCDE
et s'emploie surtout en §2 (contexte) et §7 (repère sectoriel).

---

## Limites connues & dette assumée

- **Couverture §3 inégale** : le socle ne couvre pas directement les 28 familles → caractérisation « à confirmer » assumée pour les familles non couvertes.
- **RGPD en placeholders** : `rgpd.ts` et le §9 portent des mentions provisoires en attente de la version juridique (Victor / Jean-Marie). Ne pas les présenter comme une affirmation de conformité.
- **Parsing plaquette reporté** : la présence de la plaquette est notée, mais son contenu n'est pas encore parsé (libs lourdes hors V1). Seul le site est lu.
- **Deux bugs de configuration** (voir [reference](reference-pipeline-prerapport.md#variables-denvironnement)) : `RESEND_FROM` vs `RESEND_FROM_EMAIL`, et le plafond plaquette UI (10 Mo) vs serveur (4 Mo).

---

## Historique des décisions

Le détail daté des arbitrages (produit et technique) vit dans les notes de décision :

- [`freemium-pre-rapport-decisions.md`](freemium-pre-rapport-decisions.md) — cadrage produit, retours CEO (19/06).
- [`freemium-rapport-structure.md`](freemium-rapport-structure.md) — structure du rapport (Tranche 3).
- [`freemium-tranche4b-decisions.md`](freemium-tranche4b-decisions.md) — PDF, email, enrichissement, robustesse (`/grill-me` 22/06).
- [`freemium-plan-technique.md`](freemium-plan-technique.md) — plan technique d'origine (partiellement dépassé).
