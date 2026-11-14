import type { Metadata } from 'next';
import { Cormorant_Garamond, Prompt } from 'next/font/google';
import './globals.css';

const prompt = Prompt({ subsets: ['thai', 'latin'], weight: ['300', '400', '500', '600'], variable: '--font-sans' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Only Flower — Pre-order ช่อดอกไม้',
  description: 'สั่งจองช่อดอกไม้ล่วงหน้า เลือกแบบสำเร็จหรือจัดวางดอกไม้เองได้ตามใจ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${prompt.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
