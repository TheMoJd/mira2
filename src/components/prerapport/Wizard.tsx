import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { preRapport } from '../../data/prerapport';
import { emptyPreRapportForm } from '../../types/prerapport';
import type { PreRapportForm, PreRapportErrors } from '../../types/prerapport';
import { STEP_COUNT, validateStep } from './validation';
import { submitPreRapport } from './submit';
import WizardButton from './WizardButton';
import TextField from './fields/TextField';
import TextArea from './fields/TextArea';
import TagList from './fields/TagList';
import FileField from './fields/FileField';
import Checkbox from './fields/Checkbox';

const EASE = [0.22, 1, 0.36, 1] as const;

type View = 'intro' | 'form' | 'success';

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
};

/** En-tête d'étape : titre + sous-titre + grille de champs. */
function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="display" style={{ fontSize: 'clamp(23px,2.8vw,30px)', margin: '0 0 8px', color: 'var(--ink)' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 26px', maxWidth: 520 }}>{subtitle}</p>}
      <div style={{ display: 'grid', gap: 22 }}>{children}</div>
    </div>
  );
}

export default function Wizard() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('intro');
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<PreRapportForm>(emptyPreRapportForm);
  const [errors, setErrors] = useState<PreRapportErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Honeypot anti-bot : champ caché, jamais rempli par un humain.
  const [honeypot, setHoneypot] = useState('');

  const set = <K extends keyof PreRapportForm>(key: K, value: PreRapportForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const start = () => { setDir(1); setStep(0); setView('form'); };

  const handlePrimary = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (step < STEP_COUNT - 1) {
      setDir(1);
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitPreRapport(form, honeypot);
      if (result.ok) setView('success');
      else setSubmitError(result.error ?? 'Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const goPrev = () => { setDir(-1); setStep((s) => Math.max(0, s - 1)); };

  const f = preRapport.fields;

  const renderStep = () => {
    const meta = preRapport.steps[step];
    switch (step) {
      case 0:
        return (
          <StepShell title={meta.title} subtitle={meta.subtitle}>
            <TextArea
              label={f.secteurActivite.label}
              placeholder={f.secteurActivite.placeholder}
              value={form.secteurActivite}
              onChange={(v) => set('secteurActivite', v)}
              error={errors.secteurActivite}
              rows={4}
              autoFocus
            />
            <TextField
              label={f.siret.label}
              placeholder={f.siret.placeholder}
              hint={f.siret.hint}
              value={form.siret}
              onChange={(v) => set('siret', v)}
              error={errors.siret}
              inputMode="numeric"
              optional
            />
          </StepShell>
        );
      case 1:
        return (
          <StepShell title={meta.title} subtitle={meta.subtitle}>
            <TextArea
              label={f.produitsServices.label}
              placeholder={f.produitsServices.placeholder}
              value={form.produitsServices}
              onChange={(v) => set('produitsServices', v)}
              error={errors.produitsServices}
              rows={4}
              autoFocus
            />
            <TextArea
              label={f.clients.label}
              placeholder={f.clients.placeholder}
              value={form.clients}
              onChange={(v) => set('clients', v)}
              error={errors.clients}
              rows={4}
            />
          </StepShell>
        );
      case 2:
        return (
          <StepShell title={meta.title} subtitle={meta.subtitle}>
            <TagList
              label={f.famillesMetiers.label}
              placeholder={f.famillesMetiers.placeholder}
              hint={f.famillesMetiers.hint}
              values={form.famillesMetiers}
              onChange={(v) => set('famillesMetiers', v)}
              error={errors.famillesMetiers}
              max={6}
              autoFocus
            />
          </StepShell>
        );
      case 3:
        return (
          <StepShell title={meta.title} subtitle={meta.subtitle}>
            <TextField
              label={f.siteUrl.label}
              placeholder={f.siteUrl.placeholder}
              hint={f.siteUrl.hint}
              value={form.siteUrl}
              onChange={(v) => set('siteUrl', v)}
              error={errors.siteUrl}
              type="url"
              inputMode="url"
              optional
              autoFocus
            />
            <FileField
              label={f.plaquette.label}
              hint={f.plaquette.hint}
              file={form.plaquette}
              onChange={(file) => set('plaquette', file)}
            />
          </StepShell>
        );
      case 4:
        return (
          <StepShell title={meta.title} subtitle={meta.subtitle}>
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
              autoFocus
            />
            <Checkbox
              checked={form.consentRgpd}
              onChange={(v) => set('consentRgpd', v)}
              error={errors.consentRgpd}
            >
              {preRapport.consent}{' '}
              <a href="#" style={{ color: 'var(--violet)', textDecoration: 'underline' }}>Politique de confidentialité</a>.
            </Checkbox>
          </StepShell>
        );
      default:
        return null;
    }
  };

  const meta = preRapport.steps[step];
  const pct = ((step + 1) / STEP_COUNT) * 100;

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
      {view === 'form' && (
        <div style={{ padding: '20px clamp(26px,4.5vw,48px) 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="kicker" style={{ color: 'var(--violet)', fontSize: 11 }}>{meta.kicker}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meta.label}</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: 'var(--lavender)', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--violet), var(--violet-300))' }}
            />
          </div>
        </div>
      )}

      <div style={{ padding: 'clamp(26px,4.5vw,48px)' }}>
        {view === 'intro' && <Intro onStart={start} />}

        {view === 'form' && (
          <form onSubmit={handlePrimary} noValidate>
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
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: EASE }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            {submitError && (
              <p role="alert" style={{ color: 'var(--risk)', fontSize: 13.5, lineHeight: 1.5, margin: '18px 0 0' }}>
                {submitError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 34 }}>
              {step > 0 ? (
                <WizardButton variant="ghost" onClick={goPrev}>← Retour</WizardButton>
              ) : (
                <span />
              )}
              <WizardButton type="submit" disabled={submitting}>
                {step < STEP_COUNT - 1 ? 'Continuer →' : submitting ? 'Génération…' : 'Recevoir mon pré-rapport'}
              </WizardButton>
            </div>
          </form>
        )}

        {view === 'success' && <Success email={form.email} onHome={() => navigate('/')} />}
      </div>
    </div>
  );
}

/* ---------- vues hors formulaire ---------- */

function Intro({ onStart }: { onStart: () => void }) {
  const { intro } = preRapport;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
      <div className="kicker" style={{ color: 'var(--violet)', marginBottom: 16 }}>{intro.eyebrow}</div>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: '0 0 16px', color: 'var(--ink)' }}>{intro.title}</h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 28px', maxWidth: 560 }}>{intro.sub}</p>

      <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
        {intro.points.map((p) => (
          <div key={p.t} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <span style={{ color: 'var(--opp)', flexShrink: 0, fontWeight: 700 }}>✓</span>
            <span style={{ fontSize: 15, color: 'var(--ink-1)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--ink)' }}>{p.t}</strong> — {p.d}
            </span>
          </div>
        ))}
      </div>

      <div className="pr-audiences" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 30 }}>
        {intro.audiences.map((a) => (
          <div key={a.who} style={{ background: 'var(--bg-soft)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r)', padding: '16px 18px' }}>
            <div className="kicker" style={{ color: 'var(--violet)', fontSize: 11, marginBottom: 8 }}>{a.who}</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)', margin: 0 }}>{a.msg}</p>
          </div>
        ))}
      </div>

      <WizardButton onClick={onStart}>{intro.cta} →</WizardButton>
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 14 }}>{intro.legal}</p>
    </motion.div>
  );
}

function Success({ email, onHome }: { email: string; onHome: () => void }) {
  const { success } = preRapport;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{ textAlign: 'center', padding: '12px 0' }}
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
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 460, margin: '0 auto 8px' }}>{success.body}</p>
      <p style={{ fontSize: 15, color: 'var(--ink-1)', marginBottom: 8 }}>
        Envoi à <strong>{email}</strong>
      </p>
      <p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginBottom: 28 }}>{success.note}</p>
      <WizardButton onClick={onHome}>{success.cta}</WizardButton>
    </motion.div>
  );
}
