'use client';

import { memo, useMemo } from 'react';
import { resolveLines } from '@/lib/cart';
import { baht, CONFIG, summarize, templateDesign, TEMPLATES, wrapLabel, type Template } from '@/lib/catalog';
import { BouquetSvg } from './BouquetSvg';
import { useBouquet } from './BouquetProvider';
import { Icon } from './Icon';
import type { ConfirmReq } from './ui';
import { WrapChoice, WrapGuide } from './WrapChoice';

// จำนวนช่อของรายการ — ลดจนเหลือ 0 = เอาออกจากออเดอร์
function Qty({ name, qty, onChange }: { name: string; qty: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper stepper--sm" role="group" aria-label={`จำนวน ${name}`}>
      <button type="button" onClick={() => onChange(qty - 1)} aria-label={qty > 1 ? `ลดจำนวน ${name}` : `เอา ${name} ออก`}>
        <Icon name={qty > 1 ? 'minus' : 'trash'} size={14} />
      </button>
      <span className="num" aria-live="polite">{qty}</span>
      <button type="button" onClick={() => onChange(qty + 1)} disabled={qty >= CONFIG.maxQty} aria-label={`เพิ่มจำนวน ${name}`}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

// ตัวเลือกช่อในฟอร์ม: แบบสำเร็จ (การ์ด + จำนวน) · ออกแบบเอง 2 ทาง (สร้างช่อใหม่) · รายการช่อที่ออกแบบไว้แล้ว
// ออเดอร์เดียวสั่งได้หลายช่อ — การ์ดที่กดแล้ว (aria-pressed) = อยู่ในออเดอร์
export const BouquetChoices = memo(function BouquetChoices({ confirm }: { confirm: (req: ConfirmReq) => void }) {
  const { lines, linesFull, setQty, removeLine, setLineFilm, toggleTemplate, openDraft, pending } = useBouquet();
  // ภาพ + ราคาแบบสำเร็จ ทั้งแบบไม่ห่อ/ห่อฟิล์ม คำนวณครั้งเดียว (object เดิม → BouquetSvg ไม่วาดใหม่)
  const templates = useMemo(() => TEMPLATES.map((t) => {
    const plain = templateDesign(t), film = { ...plain, film: true };
    return { t, plain, film, price: summarize(plain).total, filmPrice: summarize(film).total };
  }), []);
  const designed = useMemo(() => resolveLines(lines).filter((r) => r.line.kind !== 'template'), [lines]);
  const hasCustom = pending.design.items.length > 0;
  const hasShop = pending.shopDesign.items.length > 0;

  // เอาแบบสำเร็จไปแก้ต่อในหน้าจัดวางเอง → ได้ช่อ "จัดวางเอง" ช่อใหม่
  const customize = (t: Template) => {
    const go = () => openDraft('custom', null, templateDesign(t));
    if (!hasCustom) return go();
    confirm({
      title: `เริ่มใหม่จากแบบ “${t.name}”`,
      body: 'ช่อที่จัดค้างไว้ (ยังไม่ได้เพิ่มลงออเดอร์) จะถูกแทนที่ และกู้คืนไม่ได้',
      confirmLabel: 'แทนที่', danger: true, onConfirm: go,
    });
  };

  return (
    <div className="choices" role="group" aria-label="เลือกช่อดอกไม้" id="loy-choices">
      <WrapGuide />

      <p className="choices__label">แบบสำเร็จ <span className="choices__sub">เลือกได้หลายแบบ</span></p>
      <div className="choices__grid">
        {templates.map(({ t, plain, film, price, filmPrice }) => {
          const line = lines.find((l) => l.kind === 'template' && l.templateId === t.id);
          const blocked = !line && linesFull;
          const d = line?.film ? film : plain;
          return (
            <div key={t.id} className="choice-cell">
              <button type="button" aria-pressed={!!line} className="choice" disabled={blocked} onClick={() => toggleTemplate(t.id)}>
                <span className="choice__media"><BouquetSvg design={d} label={t.name} /></span>
                <span className="choice__check" aria-hidden>
                  {line && line.qty > 1 ? <b className="num">{line.qty}</b> : <Icon name="check" size={14} strokeWidth={2.6} />}
                </span>
                <span className="choice__name">{t.name}</span>
                <span className="choice__price num">{baht(line?.film ? filmPrice : price)}</span>
              </button>
              <div className="choice-cell__foot">
                {line && <Qty name={t.name} qty={line.qty} onChange={(n) => setQty(line.id, n)} />}
                <button type="button" className="btn btn--ghost btn--xs choice__edit" aria-label={`ปรับแต่งแบบ ${t.name}`} disabled={linesFull} onClick={() => customize(t)}>
                  <Icon name="pencil" size={14} />ปรับแต่ง
                </button>
              </div>
              {line && <WrapChoice compact film={line.film} onChange={(on) => setLineFilm(line.id, on)} name={t.name} />}
            </div>
          );
        })}
      </div>

      <p className="choices__label">หรือออกแบบเอง</p>
      <div className="choices__rows">
        <button type="button" className="choice-row" disabled={linesFull} onClick={() => openDraft('custom')}>
          <span className="choice-row__media">
            {hasCustom ? <BouquetSvg design={pending.design} label="ช่อที่จัดค้างไว้" /> : <Icon name="plus" size={24} />}
          </span>
          <span className="choice-row__text">
            <span className="choice__name">จัดวางเอง</span>
            <span className="choice-row__desc num">{hasCustom ? `ทำต่อจากที่ค้างไว้ · ${baht(summarize(pending.design).total)}` : 'เลือกดอกไม้แล้ววางเองทั้งช่อ'}</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
        <button type="button" className="choice-row" disabled={linesFull} onClick={() => openDraft('shop')}>
          <span className="choice-row__media">
            {hasShop ? <BouquetSvg design={pending.shopDesign} label="รายการที่เลือกค้างไว้" /> : <Icon name="flower" size={24} />}
          </span>
          <span className="choice-row__text">
            <span className="choice__name">ให้ร้านจัดให้</span>
            <span className="choice-row__desc num">{hasShop ? `ทำต่อจากที่ค้างไว้ · ${baht(summarize(pending.shopDesign).total)}` : 'เลือกแค่ดอกที่อยากได้'}</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      {linesFull && <p className="field__hint">ครบ {CONFIG.maxLines} แบบต่อออเดอร์แล้ว เพิ่มจำนวนช่อของแบบที่เลือกไว้ได้</p>}

      {designed.length > 0 && (
        <>
          <p className="choices__label">ช่อที่ออกแบบไว้</p>
          <ul className="cart">
            {designed.map(({ line, name, design, unit, total }) => (
              <li key={line.id} className="cart__line">
                <span className="cart__art"><BouquetSvg design={design} label={name} /></span>
                <span className="cart__text">
                  <span className="cart__name">{name}</span>
                  <span className="cart__sub">{wrapLabel(design)}</span>
                  <span className="cart__sub num">{baht(unit)} / ช่อ{line.qty > 1 && <> · รวม {baht(total)}</>}</span>
                  <WrapChoice compact film={line.film} onChange={(on) => setLineFilm(line.id, on)} name={name} />
                </span>
                <span className="cart__actions">
                  <Qty name={name} qty={line.qty} onChange={(n) => setQty(line.id, n)} />
                  <button type="button" className="btn btn--ghost btn--xs" onClick={() => openDraft(line.kind as 'custom' | 'shop', line.id)} aria-label={`แก้ไข ${name}`}>
                    <Icon name="pencil" size={14} />แก้ไข
                  </button>
                  <button
                    type="button" className="btn btn--ghost btn--xs" aria-label={`ลบ ${name}`}
                    onClick={() => confirm({ title: `ลบ “${name}” ออกจากออเดอร์`, body: 'ช่อที่ออกแบบไว้จะหายไป และกู้คืนไม่ได้', confirmLabel: 'ลบ', danger: true, onConfirm: () => removeLine(line.id) })}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
});
