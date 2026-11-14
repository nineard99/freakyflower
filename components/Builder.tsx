'use client';

import { useEffect, useRef, useState } from 'react';
import { baht, flowerImg, FLOWERS, PAPERS, RIBBONS, ROLES, summarize, type Item, type Role } from '@/lib/catalog';
import { Bouquet3D, type Bouquet3DHandle } from './Bouquet3D';
import { BouquetSvg } from './BouquetSvg';
import { FilmToggle } from './FilmToggle';
import { useBouquet } from './BouquetProvider';
import { Summary } from './Summary';

type View = '2d' | '3d';
const VIEW_KEY = 'onlyflower.view';

export function Builder({ onDone }: { onDone: () => void }) {
  const b = useBouquet();
  const { design, selected } = b;
  const svgRef = useRef<SVGSVGElement>(null);
  const threeRef = useRef<Bouquet3DHandle>(null);
  // มุมมองพื้นที่จัดช่อ: 2D (ภาพด้านหน้า) หรือ 3D (หมุนดูรอบช่อ) — สลับได้ตลอด ใช้ข้อมูลช่อชุดเดียวกัน
  const [view, setViewState] = useState<View>('2d');
  useEffect(() => {
    try { if (localStorage.getItem(VIEW_KEY) === '3d') setViewState('3d'); } catch { /* ignore */ }
  }, []);
  const setView = (v: View) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [role, setRole] = useState<Role>('main');
  const sel = design.items.find((it) => it.id === selected);

  const toSvg = (clientX: number, clientY: number) => {
    const pt = new DOMPoint(clientX, clientY).matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
    return { x: Math.max(20, Math.min(380, pt.x)), y: Math.max(20, Math.min(480, pt.y)) };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = (e.target as Element).closest('.item');
    if (!g) { b.setSelected(null); return; }
    const id = Number(g.getAttribute('data-id'));
    const it = design.items.find((x) => x.id === id)!;
    b.setSelected(id);
    const p = toSvg(e.clientX, e.clientY);
    drag.current = { id, dx: p.x - it.x, dy: p.y - it.y };
    svgRef.current!.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const p = toSvg(e.clientX, e.clientY);
    b.updateItem(drag.current.id, { x: p.x - drag.current.dx, y: p.y - drag.current.dy });
  };
  const endDrag = () => { drag.current = null; };

  const onDrop = (e: React.DragEvent<Element>) => {
    e.preventDefault();
    const [type, color] = e.dataTransfer.getData('text/plain').split('|');
    if (!FLOWERS[type]) return;
    const p = view === '3d' ? threeRef.current?.stagePoint(e.clientX, e.clientY) : toSvg(e.clientX, e.clientY);
    b.addFlower(type, color, p?.x, p?.y);
  };

  // คีย์บอร์ด: ลูกศรเลื่อน, Delete ลบ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!sel || (e.target as Element).matches('input, textarea, select')) return;
      const step = e.shiftKey ? 10 : 3;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); b.arrange(sel.id, 'del'); }
      else if (moves[e.key]) { e.preventDefault(); b.updateItem(sel.id, { x: sel.x + moves[e.key][0], y: sel.y + moves[e.key][1] }); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sel, b]);

  return (
    <div className="builder">
      {/* palette */}
      <aside className="panel palette">
        <div className="seg seg--block" role="tablist" aria-label="ประเภทดอกไม้">
          {ROLES.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={role === r.id} className={role === r.id ? 'on' : ''} onClick={() => setRole(r.id)}>{r.name}</button>
          ))}
        </div>
        <p className="palette__hint">{ROLES.find((r) => r.id === role)!.hint}</p>
        <div className="palette__list" key={role}>
          {Object.entries(FLOWERS).filter(([, f]) => f.role === role).map(([type, f]) => {
            const color = pick[type] ?? f.colors[0].id;
            const add = () => b.addFlower(type, color);
            return (
              <div
                key={type} className="fl" draggable role="button" tabIndex={0} aria-label={`เพิ่ม${f.name}`}
                onClick={add}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(); } }}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', `${type}|${color}`)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="fl__img" src={flowerImg(type, color)} alt="" draggable={false} />
                <div className="fl__info">
                  <span className="fl__name">{f.name}</span>
                  <span className="fl__price">{baht(f.price)} / {f.unit}</span>
                  {f.colors.length > 1 && (
                    <span className="fl__colors">
                      {f.colors.map((c) => (
                        <button
                          key={c.id} type="button" title={c.name} aria-label={c.name}
                          className={`dot${c.id === color ? ' on' : ''}`}
                          style={{ '--c': c.hex } as React.CSSProperties}
                          onClick={(e) => { e.stopPropagation(); setPick((p) => ({ ...p, [type]: c.id })); }}
                        />
                      ))}
                    </span>
                  )}
                </div>
                <span className="fl__add" aria-hidden>+</span>
              </div>
            );
          })}
        </div>
      </aside>

      {/* stage */}
      <div className="stage-wrap">
        <div className="stage-bar">
          <span className="muted">{design.items.length} ชิ้น · {baht(summarize(design).total)}</span>
          <div className="seg" role="group" aria-label="มุมมองพื้นที่จัดช่อ">
            {(['2d', '3d'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v.toUpperCase()}</button>
            ))}
          </div>
          <button
            className="btn btn--ghost btn--sm" type="button"
            onClick={() => { if (design.items.length && confirm('ล้างดอกไม้ทั้งหมดในช่อ?')) b.clear(); }}
          >
            ล้างทั้งหมด
          </button>
        </div>
        <div className="stage">
          {view === '3d' ? (
            <>
              <Bouquet3D
                ref={threeRef} design={design} selected={selected} label="พื้นที่จัดช่อดอกไม้ แบบ 3D"
                onSelect={b.setSelected} onMove={(id, x, y) => b.updateItem(id, { x, y })}
                onFail={() => { setView('2d'); alert('อุปกรณ์นี้เปิดโหมด 3D ไม่ได้ — กลับไปใช้โหมด 2D'); }}
                onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
              />
              <div className="stage__3d-bar">
                <span>ลากที่ว่างเพื่อหมุนช่อ · ลากดอกเพื่อย้าย</span>
                <button type="button" className="chip" onClick={() => threeRef.current?.resetView()}>↺ มุมเริ่มต้น</button>
              </div>
            </>
          ) : (
            <BouquetSvg
              ref={svgRef} design={design} selected={selected} label="พื้นที่จัดช่อดอกไม้"
              onPointerDown={onPointerDown} onPointerMove={onPointerMove}
              onPointerUp={endDrag} onPointerCancel={endDrag}
              onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
            />
          )}
          {!design.items.length && <p className="stage__empty">เลือกดอกไม้เพื่อเริ่มจัดช่อ ✿</p>}
        </div>
      </div>

      {/* options */}
      <aside className="panel options">
        <div className="opt-block">
          <h3 className="panel__title">ดอกที่เลือก</h3>
          {sel ? <SelectedTools it={sel} layers={view === '2d'} /> : <p className="muted">แตะดอกไม้ในช่อเพื่อแก้ไข</p>}
        </div>

        <div className="opt-block">
          <h3 className="panel__title">กระดาษห่อ · {PAPERS[design.paper].name}</h3>
          <div className="swatches swatches--lg">
            {PAPERS.map((p, i) => (
              <button
                key={p.name} type="button" title={p.name} aria-label={p.name}
                className={`sw${p.kind === 'news' ? ' sw--news' : ''}${i === design.paper ? ' on' : ''}`}
                style={{ '--c': p.color } as React.CSSProperties}
                onClick={() => b.setPaper(i)}
              />
            ))}
          </div>
          <FilmToggle />
        </div>
        <div className="opt-block">
          <h3 className="panel__title">ริบบิ้น · {RIBBONS[design.ribbon][0]}</h3>
          <Swatches list={RIBBONS} value={design.ribbon} onChange={b.setRibbon} />
        </div>

        <div className="opt-block">
          <h3 className="panel__title">สรุปรายการ</h3>
          <Summary design={design} />
          <button type="button" className="btn btn--block" onClick={onDone} disabled={!design.items.length}>ใช้ช่อนี้</button>
        </div>
      </aside>
    </div>
  );
}

// layers: ปุ่มสลับหน้า/หลัง ใช้เฉพาะ 2D (ใน 3D ลำดับหน้า-หลังมาจากตำแหน่งจริง)
function SelectedTools({ it, layers }: { it: Item; layers: boolean }) {
  const b = useBouquet();
  const f = FLOWERS[it.type];
  return (
    <div>
      <p className="sel-name">{f.name} · {f.en}</p>
      {f.colors.length > 1 && (
        <div className="swatches">
          {f.colors.map((c) => (
            <button
              key={c.id} type="button" title={c.name} aria-label={c.name}
              className={`sw${c.id === it.color ? ' on' : ''}`}
              style={{ '--c': c.hex } as React.CSSProperties}
              onClick={() => b.updateItem(it.id, { color: c.id })}
            />
          ))}
        </div>
      )}
      <label className="range">เอียง
        <input type="range" min={-30} max={30} step={1} value={it.r} onChange={(e) => b.updateItem(it.id, { r: +e.target.value })} />
      </label>
      <div className="tool-row">
        {layers && (
          <>
            <button type="button" className="chip" onClick={() => b.arrange(it.id, 'front')}>ไว้ด้านหน้า</button>
            <button type="button" className="chip" onClick={() => b.arrange(it.id, 'back')}>ไว้ด้านหลัง</button>
          </>
        )}
        <button type="button" className="chip" onClick={() => b.arrange(it.id, 'dup')}>ทำซ้ำ</button>
        <button type="button" className="chip chip--danger" onClick={() => b.arrange(it.id, 'del')}>ลบ</button>
      </div>
    </div>
  );
}

function Swatches({ list, value, onChange }: { list: [string, string][]; value: number; onChange: (i: number) => void }) {
  return (
    <div className="swatches swatches--lg">
      {list.map(([name, hex], i) => (
        <button
          key={name} type="button" title={name} aria-label={name}
          className={`sw${i === value ? ' on' : ''}`}
          style={{ '--c': hex } as React.CSSProperties}
          onClick={() => onChange(i)}
        />
      ))}
    </div>
  );
}
