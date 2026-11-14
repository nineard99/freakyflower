'use client';

import { baht, summarize, templateDesign, TEMPLATES, type Template } from '@/lib/catalog';
import { BouquetSvg } from './BouquetSvg';
import { useBouquet } from './BouquetProvider';

// การ์ดเลือกช่อในฟอร์ม: แบบสำเร็จ + กรอบ "จัดเอง" อยู่ในกริดเดียวกัน
export function BouquetChoices({ onCustom, onShop }: { onCustom: () => void; onShop: () => void }) {
  const { design, choice, choose, shopDesign, withFilm, replace } = useBouquet();
  const hasCustom = design.items.length > 0;
  const hasShop = shopDesign.items.length > 0;

  // เอาแบบสำเร็จไปแก้ต่อในหน้าจัดวางเอง (กลายเป็นช่อ "จัดวางเอง")
  const customize = (t: Template) => {
    if (hasCustom && !confirm(`แทนที่ช่อที่จัดเองไว้ด้วยแบบ “${t.name}”?`)) return;
    replace(templateDesign(t));
    choose('custom');
    onCustom();
  };

  return (
    <div className="choices" role="radiogroup" aria-label="เลือกช่อดอกไม้">
      {TEMPLATES.map((t) => {
        const d = withFilm(templateDesign(t));
        const on = choice === t.id;
        return (
          <div key={t.id} className="choice-cell">
            <button type="button" role="radio" aria-checked={on} className={`choice${on ? ' on' : ''}`} onClick={() => choose(t.id)}>
              <BouquetSvg design={d} label={t.name} />
              <span className="choice__name">{t.name}</span>
              <span className="choice__price">{baht(summarize(d).total)}</span>
            </button>
            <button type="button" className="choice__edit" aria-label={`ปรับแบบ ${t.name} เอง`} onClick={() => customize(t)}>✎ ปรับแบบนี้เอง</button>
          </div>
        );
      })}
      <button
        type="button" role="radio" aria-checked={choice === 'custom'}
        className={`choice choice--custom${choice === 'custom' ? ' on' : ''}`}
        onClick={() => { choose('custom'); onCustom(); }}
      >
        {hasCustom ? <BouquetSvg design={design} label="ช่อที่จัดเอง" /> : <span className="choice__plus" aria-hidden>+</span>}
        <span className="choice__name">จัดวางเอง</span>
        <span className="choice__price">{hasCustom ? `${baht(summarize(design).total)} · แก้ไข` : 'เริ่มจากแบบสำเร็จหรือวางเอง'}</span>
      </button>
      <button
        type="button" role="radio" aria-checked={choice === 'shop'}
        className={`choice choice--custom${choice === 'shop' ? ' on' : ''}`}
        onClick={() => { choose('shop'); onShop(); }}
      >
        {hasShop ? <BouquetSvg design={shopDesign} label="ช่อที่ให้ร้านจัด" /> : <span className="choice__plus" aria-hidden>✿</span>}
        <span className="choice__name">ให้ร้านจัดให้</span>
        <span className="choice__price">{hasShop ? `${baht(summarize(shopDesign).total)} · แก้ไข` : 'เลือกแค่ดอกที่อยากได้'}</span>
      </button>
    </div>
  );
}
