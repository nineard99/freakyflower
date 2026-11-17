'use client';

import { useEffect, useRef } from 'react';
import type { ResolvedLine } from '@/lib/cart';
import { baht, GARLAND, PICKUP } from '@/lib/catalog';
import type { GarlandPick } from '@/lib/garland';
import { BouquetSvg } from '../BouquetSvg';
import { Icon } from '../Icon';

// กลีบดอกไม้โปรยตอนจองสำเร็จ (สีของดอกไม้ = เนื้อหา ไม่ใช่สีของระบบ)
const PETALS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.35,
  dur: 4.5 + (i % 5) * 0.7,
  size: 8 + (i % 4) * 3,
  hue: ['#f4b6c8', '#e98aa8', '#f7d27a', '#fbfaf6', '#d9b8ef'][i % 5],
}));

// หน้าจองสำเร็จ — ลูกค้าแคปหน้าจอนี้ไว้แสดงตอนรับช่อ
export function OrderTicket({ orderNo, lines, garland, total, pickup, queue }: {
  orderNo: string; lines: ResolvedLine[]; garland: GarlandPick | null; total: number; pickup: string; queue: string;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);
  // ภาพสูงสุด 4 ช่อง — พวงมาลัยกินหนึ่งช่อง
  const max = garland ? 3 : 4;
  const arts = lines.slice(0, max);
  const tiles = arts.length + (garland ? 1 : 0);

  return (
    <main className="wrap done">
      <section className="ticket" role="status">
        <div className="petals" aria-hidden>
          {PETALS.map((p, i) => (
            <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, width: p.size, height: p.size * 1.3, background: p.hue }} />
          ))}
        </div>
        <header className="ticket__head">
          <span className="ticket__check" aria-hidden><Icon name="check" size={28} strokeWidth={2.2} className="draw" /></span>
          <h1 ref={titleRef} tabIndex={-1} className="ticket__title">จองสำเร็จ</h1>
          <p className="muted">บันทึกภาพหน้าจอนี้ไว้ แล้วแสดงตอนรับของที่{PICKUP.place}</p>
        </header>
        <div className="ticket__no">
          <span className="stat__label">เลขออเดอร์</span>
          <strong className="num">{orderNo}</strong>
        </div>
        <div className="ticket__body">
          <div className="ticket__arts" data-n={tiles}>
            {arts.map((r, i) => (
              <div key={r.line.id} className="ticket__art">
                <BouquetSvg design={r.design} label={r.name} />
                {i === max - 1 && lines.length > max && <span className="ticket__more num">+{lines.length - max}</span>}
              </div>
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {garland && <div className="ticket__art"><img src={GARLAND.image} alt={GARLAND.name} /></div>}
          </div>
          <dl className="ticket__facts">
            {lines.length > 0 && <div><dt>ช่อ</dt><dd><ul className="ticket__lines">{lines.map((r) => <li key={r.line.id}>{r.name} <span className="num">× {r.line.qty}</span></li>)}</ul></dd></div>}
            {garland && <div><dt>พวงมาลัย</dt><dd className="num">{GARLAND.modes[garland.mode].name} × {garland.qty}</dd></div>}
            {pickup && <div><dt>เวลารับ</dt><dd className="num">{PICKUP.date} · {pickup} น.</dd></div>}
            {queue && <div><dt>คิวมัดพวงมาลัย</dt><dd className="num">{PICKUP.date} · {queue} น.</dd></div>}
            <div><dt>ยอดชำระ</dt><dd className="num">{baht(total)}</dd></div>
          </dl>
        </div>
        <p className="ticket__note">ร้านจะตรวจสลิปและติดต่อกลับทางเบอร์โทรที่ให้ไว้</p>
      </section>
    </main>
  );
}
