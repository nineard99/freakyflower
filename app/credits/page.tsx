import Link from 'next/link';
import { CONFIG } from '@/lib/catalog';
import credits from '@/lib/photo-credits.json';
import { Icon } from '@/components/Icon';

export const metadata = { title: 'เครดิตภาพ — freakyflower' };

type Credit = { title: string; author: string; license: string; source: string };

export default function Credits() {
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar__inner">
          <p className="topbar__name">{CONFIG.shopName}</p>
          <div className="topbar__actions">
            <Link href="/" className="btn btn--ghost"><Icon name="arrow-left" size={18} />กลับหน้าจอง</Link>
          </div>
        </div>
      </header>
      <main className="wrap credits">
        <header className="credits__head">
          <h1 className="credits__title">เครดิตภาพดอกไม้</h1>
          <p className="hero__lead">
            ภาพดอกไม้มาจาก Wikimedia Commons ภายใต้สัญญาอนุญาตตามที่ระบุ
            ภาพบนเว็บนี้ถูกตัดพื้นหลังและครอปจากต้นฉบับ ภาพที่เป็น CC BY-SA เผยแพร่ต่อภายใต้สัญญาอนุญาตเดียวกัน
          </p>
        </header>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ภาพ</th><th>ผู้ถ่าย</th><th>สัญญาอนุญาต</th></tr></thead>
            <tbody>
              {Object.entries(credits as Record<string, Credit>).map(([name, c]) => (
                <tr key={name}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/flowers/${name}.webp`} alt="" width={40} height={40} />
                    <a href={c.source} target="_blank" rel="noopener" className="link">{name}</a>
                  </td>
                  <td>{c.author}</td>
                  <td>{c.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
