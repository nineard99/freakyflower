import type { ResolvedLine } from '@/lib/cart';
import { baht, PICKUP, wrapLabel } from '@/lib/catalog';
import { BouquetSvg } from '../BouquetSvg';
import { Icon } from '../Icon';
import { Summary } from '../Summary';
import { ThermalButton } from '../ThermalButton';
import { Alert } from '../ui';

// แถบสรุปคำสั่งจอง (จอกว้างติดอยู่ด้านขวา) + ปุ่มยืนยัน — ปุ่มร้อนปุ่มเดียวของหน้า
export function OrderRail({ resolved, count, total, shown, pickup, messages, failure, sending, still, onRemove }: {
  resolved: ResolvedLine[];
  count: number;
  total: number;
  shown: number; // ยอดที่กำลังวิ่ง (useCountUp)
  pickup: string;
  messages: string[]; // ช่องที่ยังไม่ผ่าน
  failure: string; // ส่งแล้วไม่สำเร็จ
  sending: boolean;
  still: boolean; // มีหน้าเครื่องมือ/modal บังอยู่
  onRemove: (r: ResolvedLine) => void;
}) {
  const hasOrder = resolved.length > 0;
  return (
    <aside className="rail enter" style={{ '--i': 4 } as React.CSSProperties} aria-label="สรุปคำสั่งจอง">
      <h2 className="rail__title">สรุปคำสั่งจอง</h2>
      {hasOrder ? (
        <ul className="rail__lines">
          {resolved.map((r) => (
            <li key={r.line.id} className="rail__line">
              <div className="rail__art rail__art--sm"><BouquetSvg design={r.design} label={r.name} /></div>
              <div className="rail__what">
                <p className="rail__name">{r.name} <span className="rail__qty num">× {r.line.qty}</span></p>
                <p className="rail__sub">{wrapLabel(r.design)}</p>
                <details className="rail__detail">
                  <summary>รายการดอกไม้</summary>
                  <Summary design={r.design} />
                </details>
              </div>
              <div className="rail__end">
                <span className="rail__price num">{baht(r.total)}</span>
                <button type="button" className="btn btn--ghost btn--xs btn--icon" aria-label={`ลบ ${r.name}`} onClick={() => onRemove(r)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rail__bouquet">
          <div className="rail__art"><Icon name="flower" size={24} /></div>
          <div className="rail__what">
            <p className="rail__name">ยังไม่ได้เลือกช่อ</p>
            <p className="rail__sub">เลือกแบบในขั้นตอนที่ 1</p>
          </div>
        </div>
      )}
      {hasOrder && <div className="sum__total"><span>รวม {count} ช่อ</span><strong className="num">{baht(total)}</strong></div>}
      <dl className="rail__facts">
        <div><dt>รับช่อ</dt><dd className="num">{PICKUP.date} · {pickup ? `${pickup} น.` : 'ยังไม่เลือกเวลา'}</dd></div>
      </dl>
      {messages.length > 0 && (
        <Alert title="ข้อมูลยังไม่ครบ">
          <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>
        </Alert>
      )}
      {failure && <Alert title="ยังจองไม่สำเร็จ">{failure}</Alert>}
      <ThermalButton type="submit" full icon="arrow-right" status={sending ? 'loading' : 'idle'} still={still}>
        {sending ? 'กำลังส่ง' : hasOrder ? `ยืนยันการจอง · ${baht(shown)}` : 'ยืนยันการจอง'}
      </ThermalButton>
      <p className="rail__note">ร้านจะตรวจสลิปและติดต่อกลับทางเบอร์โทรที่ให้ไว้</p>
    </aside>
  );
}
