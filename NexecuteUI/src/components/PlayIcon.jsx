export default function PlayIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2L14 8L4 14V2Z" fill={color} />
    </svg>
  );
}