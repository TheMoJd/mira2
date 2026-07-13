export interface NavItem { label: string; href: string; }

export interface HeroData {
  eyebrow: string;
  h1a: string;
  h1b: string;
  sub: string;
}

export type StatTone = 'risk' | 'amber' | 'violet' | 'cyan';

export interface Stat {
  value: number;
  suffix: string;
  label: string;
  tone: StatTone;
  decimals?: number;
  source?: string;
}

export interface Phase {
  n: string;
  tag: string;
  title: string;
  /** Libellé de positionnement (sous-titre). Optionnel : masqué si absent. */
  role?: string;
  body: string;
  points: string[];
}

export interface Reading {
  key: string;
  label: string;
  lead: string;
  desc: string;
  bullets: string[];
}

export interface Differentiator { t: string; d: string; }

export interface PricingPlan {
  name: string;
  price: string;
  sub: string;
  cta: string;
  featured: boolean;
  features: string[];
}

export interface PricingTier { range: string; price: string; }

export interface ComplianceItem { t: string; d: string; }

export interface Job { name: string; exp: number; opp: number; }

export interface BrandData {
  name: string;
  full: string;
  tagline: string;
  cta: string;
  ctaSub: string;
  /** CTA secondaire du hero : rapport complet = prestation (cible : section tarifs). */
  ctaContact: string;
}

export interface MiraData {
  brand: BrandData;
  nav: NavItem[];
  hero: HeroData;
  refs: string[];
  refsLead: string;
  stats: Stat[];
  phases: Phase[];
  readings: Reading[];
  diff: Differentiator[];
  pricing: PricingPlan[];
  tiers: PricingTier[];
  tiersNote: string;
  compliance: ComplianceItem[];
  jobs: Job[];
}
