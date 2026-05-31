export interface NavItem { label: string; href: string; }

export interface HeroData {
  eyebrow: string;
  h1a: string;
  h1b: string;
  h1c: string;
  sub: string;
}

export type StatTone = 'risk' | 'amber' | 'violet' | 'cyan';

export interface Stat {
  value: number;
  suffix: string;
  label: string;
  tone: StatTone;
  decimals?: number;
}

export interface MarketBig { value: number; suffix: string; label: string; }
export interface MarketSide { value: number; prefix: string; label: string; }
export interface MarketData {
  kicker: string;
  title: string;
  body: string;
  big: MarketBig;
  side: MarketSide;
}

export interface Phase {
  n: string;
  tag: string;
  title: string;
  role: string;
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
}

export interface MiraData {
  brand: BrandData;
  nav: NavItem[];
  hero: HeroData;
  refs: string[];
  refsLead: string;
  stats: Stat[];
  market: MarketData;
  phases: Phase[];
  readings: Reading[];
  diff: Differentiator[];
  pricing: PricingPlan[];
  tiers: PricingTier[];
  tiersNote: string;
  compliance: ComplianceItem[];
  jobs: Job[];
}

export type Variation = 'a' | 'b' | 'c';
