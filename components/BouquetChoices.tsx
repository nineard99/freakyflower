'use client';

import { baht, summarize, templateDesign, TEMPLATES, type Template } from '@/lib/catalog';
import { BouquetSvg } from './BouquetSvg';
import { useBouquet } from './BouquetProvider';
import { Icon } from './Icon';
import type { ConfirmReq } from './ui';

// ตัวเลือกช่อในฟอร์ม: แบบสำเร็จ (การ์ด) + ออกแบบเอง 2 ทาง (แถวที่เปิดเครื่องมือ) — ปุ่มสลับ บอกตัวที่เลือกด้วย aria-pressed
export function BouquetChoices({ onCustom, onShop, confirm }: { onCustom: () => void; onShop: () => void; confirm: (req: ConfirmReq) => void }) {
  const { design, choice, choose, shopDesign, withFilm, replace } = useBouquet();
  const hasCustom = design.items.length > 0;
  const hasShop = shopDesign.items.length > 0;

  // เอาแบบสำเร็จไปแก้ต่อในหน้าจัดวางเอง (กลายเป็นช่อ "จัดวางเอง")
  const customize = (t: Template) => {
    const go = () => { replace(templateDesign(t)); choose('custom'); onCustom(); };
    if (!hasCustom) return go();
    confirm({
      title: `แทนที่ช่อที่จัดเองไว้ด้วยแบบ “${t.name}”`,
      body: 'ช่อที่จัดเองไว้ตอนนี้จะถูกแทนที่ และกู้คืนไม่ได้',
      confirmLabel: 'แทนที่', danger: true, onConfirm: go,
    });
  };

  return (
    <div className="choices" role="group" aria-label="เลือกช่อดอกไม้" id="loy-choices">
      <p className="choices__label">แบบสำเร็จ</p>
      <div className="choices__grid">
        {TEMPLATES.map((t) => {
          const d = withFilm(templateDesign(t));
          const on = choice === t.id;
          return (
            <div key={t.id} className="choice-cell">
              <button type="button" aria-pressed={on} className="choice" onClick={() => choose(t.id)}>
                <span className="choice__media"><BouquetSvg design={d} label={t.name} /></span>
                <span className="choice__check" aria-hidden><Icon name="check" size={14} strokeWidth={2.6} /></span>
                <span className="choice__name">{t.name}</span>
                <span className="choice__price num">{baht(summarize(d).total)}</span>
              </button>
              <button type="button" className="btn btn--ghost btn--xs choice__edit" aria-label={`ปรับแต่งแบบ ${t.name}`} onClick={() => customize(t)}>
                <Icon name="pencil" size={14} />ปรับแต่ง
              </button>
            </div>
          );
        })}
      </div>

      <p className="choices__label">หรือออกแบบเอง</p>
      <div className="choices__rows">
        <button
          type="button" aria-pressed={choice === 'custom'} className="choice-row"
          onClick={() => { choose('custom'); onCustom(); }}
        >
          <span className="choice-row__media">
            {hasCustom ? <BouquetSvg design={design} label="ช่อที่จัดเอง" /> : <Icon name="plus" size={24} />}
          </span>
          <span className="choice-row__text">
            <span className="choice__name">จัดวางเอง</span>
            <span className="choice-row__desc num">{hasCustom ? `${baht(summarize(design).total)} · แตะเพื่อแก้ไข` : 'เลือกดอกไม้แล้ววางเองทั้งช่อ'}</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
        <button
          type="button" aria-pressed={choice === 'shop'} className="choice-row"
          onClick={() => { choose('shop'); onShop(); }}
        >
          <span className="choice-row__media">
            {hasShop ? <BouquetSvg design={shopDesign} label="ช่อที่ให้ร้านจัด" /> : <Icon name="flower" size={24} />}
          </span>
          <span className="choice-row__text">
            <span className="choice__name">ให้ร้านจัดให้</span>
            <span className="choice-row__desc num">{hasShop ? `${baht(summarize(shopDesign).total)} · แตะเพื่อแก้ไข` : 'เลือกแค่ดอกที่อยากได้'}</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
    </div>
  );
}
