import './globals.css';
import { Cairo, Inter } from 'next/font/google';

const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'VOLD MOTOR — لوحة التحكم',
  description: 'منصة إدارة مراكز العناية بالسيارات',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans text-gray-900">{children}</body>
    </html>
  );
}
