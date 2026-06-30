import './globals.css';
import { Tajawal, Inter } from 'next/font/google';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'VOLD MOTOR — لوحة التحكم',
  description: 'منصة إدارة مراكز العناية بالسيارات',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans text-slate-900">{children}</body>
    </html>
  );
}
