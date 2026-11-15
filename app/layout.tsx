import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai, Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

// Thermal design system: Space Grotesk (display) · Inter (body) · IBM Plex Sans Thai (Thai fallback ของทั้งสองชุด)
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-grotesk' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' });
const thai = IBM_Plex_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-plex-thai' });

export const metadata: Metadata = {
  title: 'freakyflower — Pre-order ช่อดอกไม้',
  description: 'สั่งจองช่อดอกไม้ล่วงหน้า เลือกแบบสำเร็จหรือจัดวางดอกไม้เองได้ตามใจ',
};

// สีแถบเบราว์เซอร์บนมือถือ = paper-raised ของ top bar
export const viewport: Viewport = { themeColor: '#fbfaf6', colorScheme: 'light' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${display.variable} ${body.variable} ${thai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
