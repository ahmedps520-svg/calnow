/** The Calnow mark: a "C" cradling a droplet. Same geometry as the app icon. */
export function Logo({ size = 36, plain = false }: { size?: number; plain?: boolean }) {
  const id = plain ? 'logoPlain' : 'logoGrad';
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Calnow">
      {!plain && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6D4AFF" />
            <stop offset="52%" stopColor="#5B7CFF" />
            <stop offset="100%" stopColor="#00C2A8" />
          </linearGradient>
        </defs>
      )}
      {!plain && <rect width="512" height="512" rx="112" fill={`url(#${id})`} />}
      <g>
        <path
          d="M348.4 137.8 A150 150 0 1 0 348.4 374.2"
          fill="none"
          stroke={plain ? 'currentColor' : '#fff'}
          strokeWidth="56"
          strokeLinecap="round"
        />
        <path
          d="M386 180 C366 214 342 240 342 268 a44 44 0 1 0 88 0 c0 -28 -24 -54 -44 -88 z"
          fill={plain ? 'currentColor' : '#fff'}
        />
      </g>
    </svg>
  );
}
