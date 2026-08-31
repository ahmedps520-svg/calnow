interface IconProps { size?: number; className?: string }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconHome = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M3 10.2 12 3.5l9 6.7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const IconChart = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7.5 15 3.5-4.5 3 2.5L20 7" /></svg>
);
export const IconList = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.1" fill="currentColor" stroke="none" /></svg>
);
export const IconGear = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="3.1" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z" /></svg>
);
export const IconPlus = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.2} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconDroplet = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 3.2s5.6 5.6 5.6 9.3A5.6 5.6 0 0 1 12 18a5.6 5.6 0 0 1-5.6-5.5C6.4 8.8 12 3.2 12 3.2z" /></svg>
);
export const IconMeal = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 3v7a2.5 2.5 0 0 0 5 0V3" /><path d="M6.5 10v11" /><path d="M17.5 3c-1.7 0-2.8 2-2.8 5.2 0 2.3.9 3.6 2.8 3.8V21" /></svg>
);
export const IconSyringe = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="m17 3 4 4" /><path d="m19.5 5.5-2.6 2.6" /><path d="m8.5 9.5 6 6" /><path d="m14.4 6.6 3 3L9 18l-4.5 1.5L6 15z" /><path d="m11 12-1.5 1.5" /></svg>
);
export const IconScale = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><rect x="3" y="4" width="18" height="16" rx="3.5" /><path d="M12 8v3" /><path d="M9 8.6a5 5 0 0 1 6 0" /></svg>
);
export const IconHeart = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 20s-7.5-4.5-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3c0 4.9-7.5 9.4-7.5 9.4z" /></svg>
);
export const IconWater = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M6 4h12l-1.2 15.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z" /><path d="M6.6 11h10.8" /></svg>
);
export const IconWalk = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="13.5" cy="4.3" r="1.7" /><path d="m9 21 2.4-5.2L9.6 13l.6-4.2 3.2-1.2 2.4 3.1 2.6 1" /><path d="m11.4 15.8 3 5.2" /><path d="m10.2 8.8-3.4 2 .4 3" /></svg>
);
export const IconSmile = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.2a4.4 4.4 0 0 0 7 0" /><path d="M9 9.5h.01M15 9.5h.01" strokeWidth={2.4} /></svg>
);
export const IconCamera = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.2-2h7.2l1.2 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.4" /></svg>
);
export const IconChevron = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="m9 5 7 7-7 7" /></svg>
);
export const IconBack = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></svg>
);
export const IconClose = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconCheck = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.2} className={className}><path d="m4.5 12.5 5 5 10-11" /></svg>
);
export const IconSpark = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 3.2 13.7 9l5.8 1.7-5.8 1.8L12 18.3l-1.7-5.8L4.5 10.7 10.3 9z" /><path d="M18.5 3.6v3M20 5.1h-3" /></svg>
);
export const IconLock = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><rect x="4.5" y="10" width="15" height="10.5" rx="2.6" /><path d="M8 10V7.6a4 4 0 0 1 8 0V10" /></svg>
);
export const IconStethoscope = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M5 3v5a4 4 0 0 0 8 0V3" /><path d="M4 3h2M12 3h2" /><path d="M9 12v2.5a5 5 0 0 0 5 5 4.5 4.5 0 0 0 4.5-4.5V13" /><circle cx="18.5" cy="10.8" r="2.2" /></svg>
);
export const IconTrash = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 6.5h16" /><path d="M9 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h3.4A1.3 1.3 0 0 1 15 4.8v1.7" /><path d="M6.5 6.5 7.4 20a1.3 1.3 0 0 0 1.3 1.2h6.6a1.3 1.3 0 0 0 1.3-1.2l.9-13.5" /></svg>
);
export const IconDownload = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 3.5v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4.5 19.5h15" /></svg>
);
export const IconUpload = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 15.5v-11" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4.5 19.5h15" /></svg>
);
export const IconSwap = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 8h13l-3-3" /><path d="M20 16H7l3 3" /></svg>
);
export const IconClock = ({ size = 24, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="8.6" /><path d="M12 7.4V12l3 1.8" /></svg>
);
