/* Line icons for the landing page. 1.75 stroke to sit beside semibold text. */
import type { SVGProps } from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const MicIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
  </svg>
);

export const ProofIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M9 21s-5-4.6-5-9a5 5 0 0 1 10 0c0 1-.3 2-.7 3" />
    <circle cx="9" cy="12" r="1.8" />
    <path d="M14 14.5h6v6.5l-1.5-1-1.5 1-1.5-1-1.5 1zM16 17h2" />
  </svg>
);

export const SealIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 2.8l2 1.5 2.5-.2.8 2.4 2.1 1.4-.9 2.3.9 2.3-2.1 1.4-.8 2.4-2.5-.2-2 1.5-2-1.5-2.5.2-.8-2.4-2.1-1.4.9-2.3-.9-2.3 2.1-1.4.8-2.4 2.5.2z" />
    <path d="M8.8 10.6l2.2 2.2 4.2-4.4" />
  </svg>
);

export const OarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M3 15c3 3.5 15 3.5 18 0l-1.2 3.4c-3.8 2.2-11.8 2.2-15.6 0z" />
    <path d="M6.5 14.6C7.2 9.8 16.8 9.8 17.5 14.6" />
    <path d="M12 3v7" />
  </svg>
);

export const ShieldIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 3l7 2.8v5.4c0 4.6-3 8-7 9.8-4-1.8-7-5.2-7-9.8V5.8z" />
    <path d="M9 12l2.2 2.2L15.5 10" />
  </svg>
);

export const EyeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ArrowIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
