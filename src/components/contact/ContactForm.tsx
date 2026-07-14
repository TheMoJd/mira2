import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  contact,
  FONCTION_AUTRE,
  FONCTIONS,
  SECTEURS,
  EFFECTIFS,
  MATURITES,
  PRE_DIAGNOSTICS,
  PRIORITES,
  HORIZONS,
  MAX_MESSAGE_LEN,
} from '../../data/contact';
import { emptyContactForm } from '../../types/contact';
import type { ContactForm as ContactFormData, ContactErrors } from '../../types/contact';
import { MAX_IDENTITY_LEN } from '../prerapport/validation';
import { validateContact } from './validation';
import { submitContact } from './submit';
import WizardButton from '../prerapport/WizardButton';
import TextField from '../prerapport/fields/TextField';
import TextArea from '../prerapport/fields/TextArea';
import SelectField from '../prerapport/fields/SelectField';
import Checkbox from '../prerapport/fields/Checkbox';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Bloc visuel de formulaire : titre + sous-titre + grille de champs. */
function BlockShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend style={{ padding: 0, marginBottom: subtitle ? 4 : 18 }}>
        <span className="display" style={{ fontSize: 'clamp(20px,2.4vw,24px)', color: 'var(--ink)' }}>{title}</span>
      </legend>
      {subtitle && <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', margin: '0 0 22px', maxWidth: 520 }}>{subtitle}</p>}
      <div style={{ display: 'grid', gap: 22 }}>{children}</div>
    </fieldset>
  );
}

export default function ContactForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ContactFormData>(emptyContactForm);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Honeypot anti-bot : champ caché, jamais rempli par un humain.
  const [honeypot, setHoneypot] = useState('');

  const set = <K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateContact(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Amène le premier champ en erreur dans le viewport.
      const first = document.querySelector('[aria-invalid="true"]');
      if (first instanceof HTMLElement) first.focus({ preventScroll: false });
      return;
    }
    setErrors({});
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitContact(form, honeypot);
      if (result.ok) setDone(true);
      else setSubmitError(result.error ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const f = contact.fields;

  if (done) return <Success onStart={() => navigate('/pre-rapport')} />;

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow)', padding: 'clamp(26px,4.5vw,48px)' }}>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 40 }}>
        {/* Honeypot anti-bot : hors flux, invisible et ignoré des humains. */}
        <input
          type="text"
          name="company_website_hp"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />

        {/* ---------- Bloc identité ---------- */}
        <BlockShell title={contact.blocs.identite.title} subtitle={contact.blocs.identite.subtitle}>
          <div className="pr-identity" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            <TextField
              label={f.prenom.label}
              placeholder={f.prenom.placeholder}
              value={form.prenom}
              onChange={(v) => set('prenom', v)}
              error={errors.prenom}
              autoComplete="given-name"
              maxLength={MAX_IDENTITY_LEN}
              autoFocus
            />
            <TextField
              label={f.nom.label}
              placeholder={f.nom.placeholder}
              value={form.nom}
              onChange={(v) => set('nom', v)}
              error={errors.nom}
              autoComplete="family-name"
              maxLength={MAX_IDENTITY_LEN}
            />
          </div>
          <TextField
            label={f.email.label}
            placeholder={f.email.placeholder}
            hint={f.email.hint}
            value={form.email}
            onChange={(v) => set('email', v)}
            error={errors.email}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
          <SelectField
            label={f.fonction.label}
            placeholder={contact.selectPlaceholder}
            options={FONCTIONS}
            value={form.fonction}
            onChange={(v) => set('fonction', v)}
            error={errors.fonction}
          />
          {form.fonction === FONCTION_AUTRE && (
            <TextField
              label={f.fonctionAutre.label}
              placeholder={f.fonctionAutre.placeholder}
              value={form.fonctionAutre}
              onChange={(v) => set('fonctionAutre', v)}
              error={errors.fonctionAutre}
              maxLength={MAX_IDENTITY_LEN}
              autoFocus
            />
          )}
          <TextField
            label={f.entreprise.label}
            placeholder={f.entreprise.placeholder}
            value={form.entreprise}
            onChange={(v) => set('entreprise', v)}
            error={errors.entreprise}
            autoComplete="organization"
            maxLength={MAX_IDENTITY_LEN}
          />
          <TextField
            label={f.telephone.label}
            placeholder={f.telephone.placeholder}
            hint={f.telephone.hint}
            value={form.telephone}
            onChange={(v) => set('telephone', v)}
            error={errors.telephone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            optional
          />
        </BlockShell>

        {/* ---------- Bloc contexte ---------- */}
        <BlockShell title={contact.blocs.contexte.title} subtitle={contact.blocs.contexte.subtitle}>
          <SelectField
            label={f.secteur.label}
            placeholder={contact.selectPlaceholder}
            options={SECTEURS}
            value={form.secteur}
            onChange={(v) => set('secteur', v)}
            error={errors.secteur}
          />
          <SelectField
            label={f.effectif.label}
            placeholder={contact.selectPlaceholder}
            options={EFFECTIFS}
            value={form.effectif}
            onChange={(v) => set('effectif', v)}
            error={errors.effectif}
          />
          <SelectField
            label={f.maturiteIa.label}
            hint={f.maturiteIa.hint}
            placeholder={contact.selectPlaceholder}
            options={MATURITES}
            value={form.maturiteIa}
            onChange={(v) => set('maturiteIa', v)}
            error={errors.maturiteIa}
          />
        </BlockShell>

        {/* ---------- Bloc besoin ---------- */}
        <BlockShell title={contact.blocs.besoin.title} subtitle={contact.blocs.besoin.subtitle}>
          <SelectField
            label={f.preDiagnostic.label}
            placeholder={contact.selectPlaceholder}
            options={PRE_DIAGNOSTICS}
            value={form.preDiagnostic}
            onChange={(v) => set('preDiagnostic', v)}
            error={errors.preDiagnostic}
          />
          <SelectField
            label={f.priorite.label}
            placeholder={contact.selectPlaceholder}
            options={PRIORITES}
            value={form.priorite}
            onChange={(v) => set('priorite', v)}
            error={errors.priorite}
          />
          <SelectField
            label={f.horizon.label}
            placeholder={contact.selectPlaceholder}
            options={HORIZONS}
            value={form.horizon}
            onChange={(v) => set('horizon', v)}
            error={errors.horizon}
          />
          <TextArea
            label={f.message.label}
            placeholder={f.message.placeholder}
            value={form.message}
            onChange={(v) => set('message', v)}
            error={errors.message}
            rows={4}
            optional
            maxLength={MAX_MESSAGE_LEN}
          />
        </BlockShell>

        {/* ---------- Consentement + envoi ---------- */}
        <div style={{ display: 'grid', gap: 20 }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-3)', margin: 0 }}>{contact.rgpdNotice}</p>
          <Checkbox checked={form.newsletter} onChange={(v) => set('newsletter', v)}>
            {contact.newsletterOptIn}
          </Checkbox>

          {submitError && (
            <p role="alert" style={{ color: 'var(--risk)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
              {submitError}
            </p>
          )}

          <div>
            <WizardButton type="submit" disabled={submitting} full>
              {submitting ? contact.submitting : contact.submitLabel}
            </WizardButton>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
              {contact.engagement}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------- vue de confirmation ---------- */

function Success({ onStart }: { onStart: () => void }) {
  const { success } = contact;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow)', padding: 'clamp(30px,5vw,56px)', textAlign: 'center' }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
        style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--violet-100)', color: 'var(--violet)', fontSize: 30,
        }}
      >
        ✓
      </motion.div>
      <h2 className="display" style={{ fontSize: 'clamp(26px,3.4vw,36px)', margin: '0 0 14px', color: 'var(--ink)' }}>{success.title}</h2>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 480, margin: '0 auto 28px' }}>{success.body}</p>
      <WizardButton onClick={onStart}>{success.cta} →</WizardButton>
    </motion.div>
  );
}
