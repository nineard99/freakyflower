'use client';

import { useEffect, useState } from 'react';
import { baht, CONFIG, flowerImg, FLOWERS, PAPERS, RIBBONS, ROLES, summarize } from '@/lib/catalog';
import { BouquetSvg } from './BouquetSvg';
import { FilmToggle } from './FilmToggle';
import { useBouquet } from './BouquetProvider';

// โหมด "ให้ร้านจัดให้": ลูกค้าเลือกชนิด สี จำนวน — ร้านเป็นคนจัดวางเอง
export function ShopPicker({ onClose }: { onClose: () => void }) {
  const { shop, shopDesign, setShop } = useBouquet();
  const [active, setActive] = useState<Record<string, string>>({});
  const total = Object.values(shop.counts).reduce((a, n) => a + n, 0);
  const sum = summarize(shopDesign);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const add = (key: string, delta: number) =>
    setShop((s) => {
      const n = Math.max(0, (s.counts[key] ?? 0) + delta);
      if (delta > 0 && total >= CONFIG.maxItems) return s;
      const counts = { ...s.counts, [key]: n };
      if (!n) delete counts[key];
      return { ...s, counts };
    });

  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label="ให้ร้านจัดให้">
      <div className="picker__bar">
        <div className="wrap picker__bar-inner">
          <button type="button" className="link" onClick={onClose}>← กลับไปที่ฟอร์ม</button>
          <strong>ให้ร้านจัดให้</strong>
        </div>
      </div>

      <div className="wrap picker__body shop">
        <aside className="shop__preview panel">
          {total ? <BouquetSvg design={shopDesign} label="ภาพตัวอย่างช่อ" /> : <div className="shop__empty">เลือกดอกไม้ที่อยากได้<br />แล้วร้านจัดให้สวยๆ</div>}
          <p className="shop__note-small">ภาพตัวอย่าง · ร้านจัดจริงตามรายการ ตำแหน่งอาจต่างจากภาพ</p>
        </aside>

        <div className="shop__list">
          {ROLES.map((r) => (
            <section key={r.id} className="shop__group">
              <h3>{r.name} <small>{r.hint}</small></h3>
              {Object.entries(FLOWERS).filter(([, f]) => f.role === r.id).map(([type, f]) => {
                const color = active[type] ?? f.colors[0].id;
                const key = `${type}|${color}`;
                const n = shop.counts[key] ?? 0;
                const picked = f.colors.filter((c) => shop.counts[`${type}|${c.id}`]);
                return (
                  <div key={type} className={`shop__row${picked.length ? ' on' : ''}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flowerImg(type, color)} alt="" width={56} height={56} />
                    <div className="shop__info">
                      <span className="shop__name">{f.name}</span>
                      <span className="shop__price">{baht(f.price)} / {f.unit}</span>
                      {f.colors.length > 1 && (
                        <span className="fl__colors">
                          {f.colors.map((c) => (
                            <button
                              key={c.id} type="button" title={c.name} aria-label={`${f.name}สี${c.name}`}
                              className={`dot${c.id === color ? ' on' : ''}${shop.counts[`${type}|${c.id}`] ? ' has' : ''}`}
                              style={{ '--c': c.hex } as React.CSSProperties}
                              onClick={() => setActive((a) => ({ ...a, [type]: c.id }))}
                            />
                          ))}
                        </span>
                      )}
                      {picked.length > 0 && (
                        <span className="shop__picked">{picked.map((c) => `${c.name} ×${shop.counts[`${type}|${c.id}`]}`).join(' · ')}</span>
                      )}
                    </div>
                    <div className="stepper" aria-label={`จำนวน${f.name}${f.colors.find((c) => c.id === color)?.name ?? ''}`}>
                      <button type="button" onClick={() => add(key, -1)} disabled={!n} aria-label="ลด">−</button>
                      <span key={n}>{n}</span>
                      <button type="button" onClick={() => add(key, 1)} disabled={total >= CONFIG.maxItems} aria-label="เพิ่ม">+</button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          <section className="shop__group">
            <h3>กระดาษห่อ <small>{PAPERS[shop.paper].name}</small></h3>
            <div className="swatches swatches--lg">
              {PAPERS.map((p, i) => (
                <button
                  key={p.name} type="button" title={p.name} aria-label={p.name}
                  className={`sw${p.kind === 'news' ? ' sw--news' : ''}${i === shop.paper ? ' on' : ''}`}
                  style={{ '--c': p.color } as React.CSSProperties}
                  onClick={() => setShop((s) => ({ ...s, paper: i }))}
                />
              ))}
            </div>
            <FilmToggle />
            <h3>ริบบิ้น <small>{RIBBONS[shop.ribbon][0]}</small></h3>
            <div className="swatches swatches--lg">
              {RIBBONS.map(([name, hex], i) => (
                <button
                  key={name} type="button" title={name} aria-label={name}
                  className={`sw${i === shop.ribbon ? ' on' : ''}`}
                  style={{ '--c': hex } as React.CSSProperties}
                  onClick={() => setShop((s) => ({ ...s, ribbon: i }))}
                />
              ))}
            </div>
          </section>

          <section className="shop__group order__form">
            <label>บอกร้านเพิ่มเติม (ถ้ามี)
              <textarea
                id="shop-note" rows={2} maxLength={300} value={shop.note}
                placeholder="เช่น ขอโทนชมพูหวานๆ / อยากให้กุหลาบเด่นตรงกลาง"
                onChange={(e) => setShop((s) => ({ ...s, note: e.target.value }))}
              />
            </label>
          </section>
        </div>
      </div>

      <div className="shop__bar">
        <div className="wrap shop__bar-inner">
          <div>
            <span className="muted">{total} ชิ้น</span>
            <strong>{baht(sum.total)}</strong>
          </div>
          <button type="button" className="btn" onClick={onClose} disabled={!total}>ใช้รายการนี้</button>
        </div>
      </div>
    </div>
  );
}
