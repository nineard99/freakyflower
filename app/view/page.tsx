import type { Metadata } from 'next';
import { BouquetViewer } from '@/components/BouquetViewer';

// หน้าดูช่อแบบ 3D สำหรับร้าน — เปิดจากลิงก์ "ดู 3D" ใน Google Sheet (ข้อมูลช่ออยู่หลัง # ในลิงก์)
export const metadata: Metadata = { title: 'ดูช่อ 3D — freakyflower', robots: { index: false, follow: false } };

export default function ViewPage() {
  return <BouquetViewer />;
}
