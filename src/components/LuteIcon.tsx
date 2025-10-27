// Lute wallet SVG icon (simple placeholder)
export default function LuteIcon({ className = "", size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="16" cy="16" r="16" fill="#00A78E" />
      <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6-6-2.7-6-6zm6-4a4 4 0 100 8 4 4 0 000-8z" fill="#fff" />
    </svg>
  );
}
