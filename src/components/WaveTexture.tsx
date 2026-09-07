export default function WaveTexture({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="mml-waves"
            width="220"
            height="140"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(1.1)"
          >
            <path
              d="M0 100 Q 27.5 60 55 100 T 110 100 T 165 100 T 220 100"
              fill="none"
              stroke="#64ddff"
              strokeWidth="1.5"
            />
            <path
              d="M0 60 Q 27.5 20 55 60 T 110 60 T 165 60 T 220 60"
              fill="none"
              stroke="#64ddff"
              strokeWidth="1"
            />
            <path
              d="M0 130 Q 27.5 100 55 130 T 110 130 T 165 130 T 220 130"
              fill="none"
              stroke="#f6a9f3"
              strokeWidth="1"
            />
            <circle cx="20" cy="30" r="1.4" fill="#64ddff" />
            <circle cx="130" cy="90" r="1.2" fill="#f6a9f3" />
            <circle cx="190" cy="40" r="1.4" fill="#64ddff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mml-waves)" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
}
