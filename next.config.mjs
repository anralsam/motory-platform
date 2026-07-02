/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // ── Security headers — hardening على مستوى المنصات العالمية ──
  //  • HSTS: يفرض HTTPS دائماً (سنتان + النطاقات الفرعية).
  //  • X-Frame-Options: يمنع تضمين اللوحات داخل iframe (حماية Clickjacking).
  //  • nosniff: يمنع تخمين نوع المحتوى.
  //  • Referrer-Policy: لا تُسرَّب روابط اللوحات الداخلية لمواقع خارجية.
  //  • Permissions-Policy: تعطيل الكاميرا/المايك/الموقع افتراضياً.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
  // Legacy static HTML is retired. Permanently redirect any old .html URL
  // (bookmarks, indexed links) to its Next.js App Router equivalent.
  async redirects() {
    const map = [
      ['/index.html', '/'],
      ['/home.html', '/'],
      ['/login.html', '/auth/signin'],
      ['/signin.html', '/auth/signin'],
      ['/signup.html', '/auth/signup'],
      ['/join.html', '/auth/signup'],
      ['/register.html', '/auth/signup'],
      ['/dashboard.html', '/dashboard'],
      ['/customers.html', '/dashboard/customers'],
      ['/inventory.html', '/dashboard/inventory'],
      ['/messages.html', '/dashboard/messages'],
      ['/reports.html', '/dashboard/reports'],
      ['/team.html', '/dashboard/team'],
      ['/settings.html', '/dashboard/settings'],
      ['/pos.html', '/dashboard/invoices'],
      ['/appointments.html', '/dashboard/orders'],
      ['/orders.html', '/dashboard/orders'],
      ['/expenses.html', '/dashboard'],
      // The control room is retired → unified into /dashboard-pro (Governance tab).
      ['/vm-control-center', '/dashboard-pro'],
      ['/admin-vold.html', '/dashboard-pro'],
      ['/vm-control-center.html', '/dashboard-pro'],
      ['/vm-secure-panel.html', '/dashboard-pro'],
    ];
    return map.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};
export default nextConfig;
