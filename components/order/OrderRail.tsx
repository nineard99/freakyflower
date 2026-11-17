import type { ResolvedLine } from '@/lib/cart';
import { baht, GARLAND, GARLAND_SLOTS, PICKUP, PICKUP_SLOTS, wrapLabel, type GarlandMode } from '@/lib/catalog';
import { garlandTotal, type GarlandPick } from '@/lib/garland';
import { BouquetSvg } from '../BouquetSvg';
import { Icon } from '../Icon';
import { Summary } from '../Summary';
import { ThermalButton } from '../ThermalButton';
import { TimeSelect } from '../TimeSelect';
import { Alert, Seg } from '../ui';
import { FieldError } from './Step';

const MODES = (Object.keys(GARLAND.modes) as GarlandMode[]).map((m) => ({ value: m, label: GARLAND.modes[m].name }));

// แถบสรุปคำสั่งจอง (จอกว้างติดอยู่ด้านขวา) — แบ่ง 2 ส่วน: ช่อดอกไม้ (เวลารับทุก 30 นาที) · พวงมาลัยรัดเกล้า (มัดให้ = จองคิวทุก 10 นาที / ทำเอง = รับพร้อมช่อ)
// ปุ่มยืนยัน = ปุ่มร้อนปุ่มเดียวของหน้า → ผ่านแล้วค่อยขึ้น QR ให้โอนและแนบสลิป
export function OrderRail({
  resolved, garland, onGarland, pickup, onPickup, queue, onQueue, full, onQueueOpen, errors,
  itemsLabel, total, shown, messages, still, onRemove,
}: {
  resolved: ResolvedLine[];
  garland: GarlandPick | null;
  onGarland: (g: GarlandPick | null) => void;
  pickup: string;
  onPickup: (t: string) => void;
  queue: string;
  onQueue: (t: string) => void;
  full: string[]; // คิวมัดที่เต็มแล้ว
  onQueueOpen: () => void;
  errors: { pickup?: string; queue?: string };
  itemsLabel: string; // "3 ช่อ · 1 พวง"
  total: number;
  shown: number; // ยอดที่กำลังวิ่ง (useCountUp)
  messages: string[]; // ช่องที่ยังไม่ผ่าน
  still: boolean; // มีหน้าเครื่องมือ/modal บังอยู่
  onRemove: (r: ResolvedLine) => void;
}) {
  const hasFlowers = resolved.length > 0;
  const hasOrder = hasFlowers || !!garland;
  // เวลารับ (ทุก 30 นาที) อยู่ในส่วนช่อดอกไม้ — ถ้าไม่มีช่อแต่ซื้อพวงมาลัยไปทำเอง ย้ายไปอยู่ส่วนพวงมาลัย
  const pickupField = (label: string) => (
    <div className="field rail__time">
      <span id="lbl-pickup" className="field__label">{label}</span>
      <TimeSelect
        id="loy-pickup" labelledBy="lbl-pickup" slots={PICKUP_SLOTS} value={pickup}
        invalid={!!errors.pickup} describedBy={errors.pickup ? 'err-pickup' : 'hint-pickup'} onChange={onPickup}
      />
      {errors.pickup
        ? <FieldError id="err-pickup">{errors.pickup}</FieldError>
        : <span id="hint-pickup" className="field__hint num">{PICKUP.date} · ทุก {PICKUP.step} นาที {PICKUP.from}–{PICKUP.to} น.</span>}
    </div>
  );

  return (
    <aside className="rail enter" style={{ '--i': 4 } as React.CSSProperties} aria-label="สรุปคำสั่งจอง">
      <h2 className="rail__title">สรุปคำสั่งจอง</h2>

      {!hasOrder && (
        <div className="rail__bouquet">
          <div className="rail__art"><Icon name="flower" size={24} /></div>
          <div className="rail__what">
            <p className="rail__name">ยังไม่ได้เลือกสินค้า</p>
            <p className="rail__sub">เลือกช่อหรือพวงมาลัยในขั้นตอนที่ 1</p>
          </div>
        </div>
      )}

      {hasFlowers && (
        <section className="rail__sec" aria-labelledby="rail-flowers">
          <h3 id="rail-flowers" className="rail__sec-title">ช่อดอกไม้</h3>
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
          {pickupField(garland?.mode === 'diy' ? 'เวลารับช่อ (และพวงมาลัย)' : 'เวลารับช่อ')}
        </section>
      )}

      {garland && (
        <section className="rail__sec" aria-labelledby="rail-garland">
          <h3 id="rail-garland" className="rail__sec-title">{GARLAND.name}</h3>
          <div className="rail__line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="rail__art rail__art--sm"><img src={GARLAND.image} alt="" /></div>
            <div className="rail__what">
              <p className="rail__name">{GARLAND.name} <span className="rail__qty num">× {garland.qty}</span></p>
              <p className="rail__sub">{GARLAND.modes[garland.mode].name}</p>
            </div>
            <div className="rail__end">
              <span className="rail__price num">{baht(garlandTotal(garland))}</span>
              <button type="button" className="btn btn--ghost btn--xs btn--icon" aria-label={`ลบ ${GARLAND.name}`} onClick={() => onGarland(null)}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
          <Seg label="แบบมัดพวงมาลัย" full options={MODES} value={garland.mode} onChange={(mode) => onGarland({ ...garland, mode })} />
          {garland.mode === 'shop' ? (
            <div className="field rail__time">
              <span id="lbl-queue" className="field__label">คิวมัดพวงมาลัย</span>
              <TimeSelect
                id="loy-queue" labelledBy="lbl-queue" slots={GARLAND_SLOTS} value={queue} full={full} onOpen={onQueueOpen}
                placeholder="เลือกคิว" invalid={!!errors.queue} describedBy={errors.queue ? 'err-queue' : 'hint-queue'} onChange={onQueue}
              />
              {errors.queue
                ? <FieldError id="err-queue">{errors.queue}</FieldError>
                : <span id="hint-queue" className="field__hint num">{PICKUP.date} · คิวละ {GARLAND.queue.step} นาที {GARLAND.queue.from}–{GARLAND.queue.to} น. · 1 คิวต่อ 1 ออเดอร์ มาตรงเวลาเพื่อให้ร้านมัดให้</span>}
            </div>
          ) : hasFlowers ? (
            <p className="field__hint">รับพร้อมช่อดอกไม้ ตามเวลารับช่อด้านบน</p>
          ) : pickupField('เวลารับพวงมาลัย')}
        </section>
      )}

      {hasOrder && <div className="sum__total"><span>รวม {itemsLabel}</span><strong className="num">{baht(total)}</strong></div>}

      {messages.length > 0 && (
        <Alert title="ข้อมูลยังไม่ครบ">
          <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>
        </Alert>
      )}
      <ThermalButton type="submit" full icon="arrow-right" still={still}>
        {hasOrder ? `ยืนยันการจอง · ${baht(shown)}` : 'ยืนยันการจอง'}
      </ThermalButton>
      <p className="rail__note">กดยืนยันแล้วจะขึ้น QR ให้โอนเงินและแนบสลิป</p>
    </aside>
  );
}
