import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconPlay = (p: P) => (
  <Svg {...p}>
    <path d="M6 4.5v15l13-7.5z" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconPause = (p: P) => (
  <Svg {...p}>
    <rect x="5.5" y="4.5" width="4.5" height="15" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4.5" height="15" rx="1" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconSkipFwd = (p: P) => (
  <Svg {...p}>
    <path d="M4 5v14l10-7z" fill="currentColor" stroke="none" />
    <rect x="16.5" y="5" width="3" height="14" rx="1" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconSkipBack = (p: P) => (
  <Svg {...p}>
    <path d="M20 5v14L10 12z" fill="currentColor" stroke="none" />
    <rect x="4.5" y="5" width="3" height="14" rx="1" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconRestart = (p: P) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </Svg>
);
export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Svg>
);
export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
  </Svg>
);
export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p}>
    <path
      d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </Svg>
);
export const IconChevronUp = (p: P) => (
  <Svg {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
);
export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const IconChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const IconArrowDown = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v16m0 0-6-6m6 6 6-6" />
  </Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </Svg>
);
export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
  </Svg>
);
export const IconHistory = (p: P) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 2.6-6.3" />
    <path d="M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  </Svg>
);
export const IconList = (p: P) => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconTarget = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconSequence = (p: P) => (
  <Svg {...p}>
    <circle cx="5" cy="6" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="18" r="2" />
    <path d="m6.8 7.4 3.4 3.2m3.2 3 3.4 3.2" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m4 12.5 5.5 5.5L20 6.5" />
  </Svg>
);
export const IconGear = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
  </Svg>
);
export const IconVolume = ({ muted, ...p }: P & { muted?: boolean }) => (
  <Svg {...p}>
    <path d="M11 5 6.5 9H3v6h3.5L11 19z" fill="currentColor" stroke="none" />
    {muted ? <path d="m15 9 6 6m0-6-6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />}
  </Svg>
);
export const IconVibe = ({ muted, ...p }: P & { muted?: boolean }) => (
  <Svg {...p}>
    <rect x="8" y="3" width="8" height="18" rx="2.5" />
    {muted ? (
      <path d="m4 4 16 16" />
    ) : (
      <>
        <path d="M4.5 9v6" />
        <path d="M19.5 9v6" />
      </>
    )}
  </Svg>
);
export const IconRun = (p: P) => (
  <Svg {...p}>
    <circle cx="14.5" cy="4.5" r="2" />
    <path d="m8 21 3-6-2.5-3L11 8l3 2 3 1M11 8 8 9l-2 3" />
  </Svg>
);
