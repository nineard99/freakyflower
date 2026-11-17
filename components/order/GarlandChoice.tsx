import { baht, CONFIG, GARLAND } from '@/lib/catalog';
import type { GarlandPick } from '@/lib/garland';
import { Icon } from '../Icon';

const { shop, diy } = GARLAND.modes;

// การ์ดพวงมาลัยรัดเกล้า (ขั้นตอนที่ 1) — กดเพื่อเพิ่ม/เอาออก + จำนวน
// เลือกว่าให้ร้านมัดหรือซื้อไปทำเอง และเวลาคิว อยู่ในแถบสรุปคำสั่งจอง
export function GarlandChoice({ value, onChange }: { value: GarlandPick | null; onChange: (g: GarlandPick | null) => void }) {
  const setQty = (n: number) => onChange(n < 1 ? null : { qty: Math.min(CONFIG.maxQty, n), mode: value?.mode ?? 'shop' });
  return (
    <div className="garland" id="loy-garland">
      <button type="button" aria-pressed={!!value} className="choice garland__card" onClick={() => onChange(value ? null : { qty: 1, mode: 'shop' })}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="garland__img" src={GARLAND.image} alt="" loading="lazy" />
        <span className="choice__check" aria-hidden>
          {value && value.qty > 1 ? <b className="num">{value.qty}</b> : <Icon name="check" size={14} strokeWidth={2.6} />}
        </span>
        <span className="garland__text">
          <span className="choice__name">{GARLAND.name}</span>
          <span className="garland__desc">{GARLAND.desc}</span>
          <span className="garland__prices num">
            <span>{shop.name} {baht(shop.price)}</span>
            <span>{diy.name} {baht(diy.price)}</span>
          </span>
        </span>
      </button>
      {value && (
        <div className="garland__foot">
          <div className="stepper stepper--sm" role="group" aria-label={`จำนวน ${GARLAND.name}`}>
            <button type="button" onClick={() => setQty(value.qty - 1)} aria-label={value.qty > 1 ? `ลดจำนวน ${GARLAND.name}` : `เอา ${GARLAND.name} ออก`}>
              <Icon name={value.qty > 1 ? 'minus' : 'trash'} size={14} />
            </button>
            <span className="num" aria-live="polite">{value.qty}</span>
            <button type="button" onClick={() => setQty(value.qty + 1)} disabled={value.qty >= CONFIG.maxQty} aria-label={`เพิ่มจำนวน ${GARLAND.name}`}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          <span className="field__hint">เลือกแบบมัดและเวลาคิวที่สรุปคำสั่งจอง</span>
        </div>
      )}
    </div>
  );
}
