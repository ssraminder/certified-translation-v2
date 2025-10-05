export default function Spinner({ size = 12, color = 'border-cyan-500' }) {
  return (
    <div className={`animate-spin rounded-full h-${size} w-${size} border-b-2 ${color}`}></div>
  );
}
