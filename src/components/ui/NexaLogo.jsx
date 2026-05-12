export default function NexaLogo({ size = 40, gradient = "indigo" }) {
  const id = `g${gradient}${size}`;
  const colors = gradient === "purple"
    ? ["#8b5cf6", "#06b6d4"]
    : ["#6366f1", "#06b6d4"];

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="12" fill={`url(#${id})`}/>
      <path d="M20 8L28 14V26L20 32L12 26V14L20 8Z" stroke="white" strokeWidth="1.5" fill="none"/>
      <circle cx="20" cy="20" r="4" fill="white"/>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor={colors[0]}/>
          <stop offset="100%" stopColor={colors[1]}/>
        </linearGradient>
      </defs>
    </svg>
  );
}
