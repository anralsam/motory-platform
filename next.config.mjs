/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
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
      ['/admin-vold.html', '/vm-control-center'],
      ['/vm-control-center.html', '/vm-control-center'],
      ['/vm-secure-panel.html', '/vm-control-center'],
    ];
    return map.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};
export default nextConfig;
