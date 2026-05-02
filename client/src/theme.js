export const C = {
  bg:        '#0A0F0D',
  surface:   '#0F1812',
  card:      '#141F17',
  cardHi:    '#192519',
  accent:    '#00E87A',
  accentLow: 'rgba(0,232,122,0.07)',
  accentMid: 'rgba(0,232,122,0.20)',
  accentHi:  'rgba(0,232,122,0.40)',
  text:      '#E8F5EC',
  textMid:   '#9DB8A6',
  muted:     '#567060',
  border:    '#1A2E20',
  borderMid: '#223A28',
  warn:      '#F5A623',
  warnLow:   'rgba(245,166,35,0.10)',
  danger:    '#FF5555',
  dangerLow: 'rgba(255,85,85,0.10)',
  info:      '#4DA6FF',
  infoLow:   'rgba(77,166,255,0.08)',
};

export const urgencyMap = {
  Critical: { color: C.danger, bg: C.dangerLow },
  High:     { color: C.warn,   bg: C.warnLow   },
  Medium:   { color: C.accent, bg: C.accentLow  },
};

export const ROLES = [
  { id: 'freelance-writer',  label: 'Writer',          icon: '✍️' },
  { id: 'designer',          label: 'Designer',         icon: '🎨' },
  { id: 'developer',         label: 'Developer',        icon: '💻' },
  { id: 'marketer',          label: 'Marketer',         icon: '📣' },
  { id: 'consultant',        label: 'Consultant',       icon: '🧠' },
  { id: 'ecommerce',         label: 'E-commerce',       icon: '🛒' },
  { id: 'video-creator',     label: 'Video Creator',    icon: '🎬' },
  { id: 'coach',             label: 'Coach',            icon: '🏆' },
];

export const CONCERNS = [
  { id: 'ai-replacing',  label: 'AI replacing my work',   icon: '🤖' },
  { id: 'higher-rates',  label: 'Charging higher rates',  icon: '💰' },
  { id: 'more-clients',  label: 'Getting more clients',   icon: '📈' },
  { id: 'faster',        label: 'Delivering faster',      icon: '⚡' },
  { id: 'new-skills',    label: 'Learning new skills',    icon: '📚' },
  { id: 'standing-out',  label: 'Standing out',           icon: '🌟' },
];

export const EXPERIENCE = [
  { id: 'new',         label: 'Just starting out',  sub: '< 1 year'  },
  { id: 'growing',     label: 'Building momentum',  sub: '1–3 years' },
  { id: 'established', label: 'Well established',   sub: '3–7 years' },
  { id: 'veteran',     label: 'Industry veteran',   sub: '7+ years'  },
];

export const INCOME_RANGES = [
  { id: 'under-1k', label: 'Under $1,000 / mo'     },
  { id: '1k-3k',    label: '$1,000 – $3,000 / mo'  },
  { id: '3k-6k',    label: '$3,000 – $6,000 / mo'  },
  { id: '6k-10k',   label: '$6,000 – $10,000 / mo' },
  { id: '10k-plus', label: '$10,000+ / mo'          },
];

export const HOURS = [
  { id: '5',  label: '5 min / day',    sub: 'Micro habit'    },
  { id: '15', label: '15 min / day',   sub: 'Consistent'     },
  { id: '30', label: '30 min / day',   sub: 'Serious growth' },
  { id: '60', label: '1 hour / day',   sub: 'Fast track'     },
  { id: '90', label: '2+ hours / day', sub: 'All in'         },
];
