export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="MML logo"
    >
      <defs>
        <linearGradient id="mml-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64ddff" />
          <stop offset="100%" stopColor="#f6a9f3" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="#050608" stroke="url(#mml-ring)" strokeWidth="3" />
      <path
        d="M50 20 L74 30 V52 C74 68 63 78 50 82 C37 78 26 68 26 52 V30 Z"
        fill="none"
        stroke="#64ddff"
        strokeWidth="2.5"
      />
      <text
        x="50"
        y="57"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="#e9f6fb"
        fontFamily="var(--font-sans), Arial, sans-serif"
      >
        MML
      </text>
    </svg>
  );
}
