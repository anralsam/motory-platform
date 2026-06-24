/* VOLD MOTOR wordmark — light-mode variant (black text, transparent).
   Used on the light auth pages. The landing (dark) uses the white variant. */
export default function Logo({ className = 'h-7 w-auto' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="VOLD MOTOR" className={className} />;
}
