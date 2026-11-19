'use client';

import { useState } from 'react';
import { baht, CONFIG, flowerImg, FLOWERS, PAPERS, RIBBONS, ROLES, summarize } from '@/lib/catalog';
import { BouquetSvg } from './BouquetSvg';
import { WrapChoice } from './WrapChoice';
import { useBouquet } from './BouquetProvider';
import { Icon } from './Icon';
import { PickerShell } from './PickerShell';
import { Summary } from './Summary';
import { ThermalButton } from './ThermalButton';
import { Swatches } from './ui';

// โหมด "ให้ร้านจัดให้": ลูกค้าเลือกชนิด สี จำนวน — ร้านเป็นคนจัดวางเอง
export function ShopPicker({ onClose }: { onClose: () => void }) {
  const { shop, shopDesign, setShop, draftFilm, setDraftFilm, editing, linesFull, commitDraft } = useBouquet();
  const [active, setActive] = useState<Record<string, string>>({});
  const total = Object.values(shop.counts).reduce((a, n) => a + n, 0);
  const sum = summarize(shopDesign);
  const full = total >= CONFIG.maxItems;

  const add = (key: string, delta: number) =>
    setShop((s) => {
      const n = Math.max(0, (s.counts[key] ?? 0) + delta);
      if (delta > 0 && total >= CONFIG.maxItems) return s;
      const counts = { ...s.counts, [key]: n };
      if (!n) delete counts[key];
      return { ...s, counts };
    });

  return (
    <PickerShell
      title="ให้ร้านจัดให้" onClose={onClose}
      meta={`${total} ชิ้น · ${baht(sum.total)}`}
      actions={<ThermalButton size="s" icon="check" onClick={commitDraft} disabled={!total || (!editing?.lineId && linesFull)}>{editing?.lineId ? 'บันทึกช่อนี้' : 'เพิ่มลงออเดอร์'}</ThermalButton>}
    >
      <div className="wrap shop">
        <aside className="shop__preview panel" aria-label="ภาพตัวอย่างช่อ">
          <div className="shop__art">
            {total ? <BouquetSvg design={shopDesign} label="ภาพตัวอย่างช่อ" /> : (
              <div className="shop__empty">
                <Icon name="flower" size={24} />
                <p>เลือกดอกไม้ที่อยากได้ แล้วร้านจัดช่อให้</p>
              </div>
            )}
          </div>
          <div className="shop__side">
            <p className="shop__note">ภาพตัวอย่าง ร้านจัดจริงตามรายการ ตำแหน่งดอกอาจต่างจากภาพ</p>
            {total > 0 && <Summary design={shopDesign} />}
          </div>
        </aside>

        <div className="shop__list">
          {ROLES.map((r) => (
            <section key={r.id} className="shop__group" aria-labelledby={`shop-${r.id}`}>
              <header className="shop__head">
                <h2 id={`shop-${r.id}`} className="shop__title">{r.name}</h2>
                <p className="shop__hint">{r.hint}</p>
              </header>
              <ul className="shop__rows">
                {Object.entries(FLOWERS).filter(([, f]) => f.role === r.id).map(([type, f]) => {
                  const color = active[type] ?? f.colors[0].id;
                  const key = `${type}|${color}`;
                  const n = shop.counts[key] ?? 0;
                  const picked = f.colors.filter((c) => shop.counts[`${type}|${c.id}`]);
                  return (
                    <li key={type} className="shop__row">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flowerImg(type, color)} alt="" width={56} height={56} />
                      <div className="shop__info">
                        <span className="shop__name">{f.name}</span>
                        <span className="shop__price num">{baht(f.price)} / {f.unit}</span>
                        {f.colors.length > 1 && (
                          <Swatches
                            small label={`สี${f.name}`} value={color}
                            items={f.colors.map((c) => ({ key: c.id, name: c.name, color: c.hex, has: !!shop.counts[`${type}|${c.id}`] }))}
                            onChange={(id) => setActive((a) => ({ ...a, [type]: id }))}
                          />
                        )}
                        {picked.length > 0 && (
                          <span className="shop__picked">
                            {picked.map((c) => <span key={c.id} className="badge badge--solid num">{c.name} × {shop.counts[`${type}|${c.id}`]}</span>)}
                          </span>
                        )}
                      </div>
                      <div className="stepper" role="group" aria-label={`จำนวน${f.name}${f.colors.find((c) => c.id === color)?.name ?? ''}`}>
                        <button type="button" onClick={() => add(key, -1)} disabled={!n} aria-label="ลด"><Icon name="minus" size={16} /></button>
                        <span className="num" aria-live="polite">{n}</span>
                        <button type="button" onClick={() => add(key, 1)} disabled={full} aria-label="เพิ่ม"><Icon name="plus" size={16} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section className="shop__group" aria-labelledby="shop-wrap">
            <header className="shop__head">
              <h2 id="shop-wrap" className="shop__title">การห่อ</h2>
              <p className="shop__hint">กระดาษ{PAPERS[shop.paper].name} · ริบบิ้น{RIBBONS[shop.ribbon][0]}</p>
            </header>
            <div className="shop__wrap">
              {PAPERS.length > 1 && (
                <div className="insp__row">
                  <span className="insp__label">กระดาษ</span>
                  <Swatches
                    label="กระดาษห่อ" value={String(shop.paper)} onChange={(k) => setShop((s) => ({ ...s, paper: +k }))}
                    items={PAPERS.map((p, i) => ({ key: String(i), name: p.name, color: p.color, pattern: p.kind === 'news' }))}
                  />
                </div>
              )}
              {RIBBONS.length > 1 && (
                <div className="insp__row">
                  <span className="insp__label">ริบบิ้น</span>
                  <Swatches
                    label="ริบบิ้น" value={String(shop.ribbon)} onChange={(k) => setShop((s) => ({ ...s, ribbon: +k }))}
                    items={RIBBONS.map(([name, hex], i) => ({ key: String(i), name, color: hex }))}
                  />
                </div>
              )}
              <WrapChoice film={draftFilm} onChange={setDraftFilm} />
            </div>
          </section>

          <section className="shop__group" aria-labelledby="shop-note-title">
            <header className="shop__head">
              <h2 id="shop-note-title" className="shop__title">บอกร้านเพิ่มเติม</h2>
              <p className="shop__hint">ไม่บังคับ</p>
            </header>
            <label className="field">
              <span className="sr-only">ข้อความถึงร้าน</span>
              <textarea
                id="shop-note" className="textarea" rows={3} maxLength={300} value={shop.note}
                placeholder="เช่น ขอโทนชมพูหวาน หรืออยากให้กุหลาบเด่นตรงกลาง"
                onChange={(e) => setShop((s) => ({ ...s, note: e.target.value }))}
              />
              <span className="field__hint num">{shop.note.length}/300</span>
            </label>
          </section>
        </div>
      </div>
    </PickerShell>
  );
}
