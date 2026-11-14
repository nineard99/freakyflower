import Link from 'next/link';
import credits from '@/lib/photo-credits.json';

export const metadata = { title: 'เครดิตภาพ — Only Flower' };

type Credit = { title: string; author: string; license: string; source: string };

export default function Credits() {
  return (
    <main className="wrap credits">
      <p><Link href="/" className="link">← กลับหน้าหลัก</Link></p>
      <h1>เครดิตภาพดอกไม้</h1>
      <p className="muted">
        ภาพดอกไม้มาจาก Wikimedia Commons ภายใต้สัญญาอนุญาตตามที่ระบุ
        ภาพบนเว็บนี้ถูกตัดพื้นหลังและครอปจากต้นฉบับ (ภาพที่เป็น CC BY-SA เผยแพร่ต่อภายใต้สัญญาอนุญาตเดียวกัน)
      </p>
      <table>
        <thead><tr><th>ภาพ</th><th>ผู้ถ่าย</th><th>สัญญาอนุญาต</th></tr></thead>
        <tbody>
          {Object.entries(credits as Record<string, Credit>).map(([name, c]) => (
            <tr key={name}>
              <td>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/flowers/${name}.webp`} alt="" width={40} height={40} />
                <a href={c.source} target="_blank" rel="noopener">{name}</a>
              </td>
              <td>{c.author}</td>
              <td>{c.license}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
