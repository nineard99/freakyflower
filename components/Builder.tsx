'use client';

import { useEffect, useRef, useState } from 'react';
import { baht, CONFIG, flowerImg, FLOWERS, PAPERS, RIBBONS, ROLES, summarize, templateDesign, TEMPLATES, type Item, type Role, type Template } from '@/lib/catalog';
import { Bouquet3D, type Bouquet3DHandle } from './Bouquet3D';
import { BouquetSvg } from './BouquetSvg';
import { FilmToggle } from './FilmToggle';
import { useBouquet } from './BouquetProvider';
import { Icon } from './Icon';
import { PickerShell } from './PickerShell';
import { Summary } from './Summary';
import { ThermalButton } from './ThermalButton';
import { Seg, Swatches, useConfirm, useToast } from './ui';

type View = '2d' | '3d';
type Tab = Role | 'preset';
const VIEW_KEY = 'onlyflower.view';
const TABS: { value: Tab; label: string }[] = [...ROLES.map((r) => ({ value: r.id as Tab, label: r.name })), { value: 'preset', label: 'แบบสำเร็จ' }];
const VIEWS: { value: View; label: string }[] = [{ value: '2d', label: '2D' }, { value: '3d', label: '3D' }];

// หน้าเต็มจอสำหรับจัดช่อเอง — โครง ToolShell ของ Thermal: คลังดอกไม้ · พื้นที่จัดช่อ (artboard) · inspector
export function Builder({ onClose }: { onClose: () => void }) {
  const b = useBouquet();
  const { design, selected } = b;
  const svgRef = useRef<SVGSVGElement>(null);
  const threeRef = useRef<Bouquet3DHandle>(null);
  const { confirm, dialog } = useConfirm();
  const { toast, notify } = useToast();
  // มุมมองพื้นที่จัดช่อ: 2D (ภาพด้านหน้า) หรือ 3D (หมุนดูรอบช่อ) — สลับได้ตลอด ใช้ข้อมูลช่อชุดเดียวกัน
  // ค่าเริ่ม: มือถือ/จอสัมผัส = 2D (ใช้ง่ายกว่า ไม่หนักเครื่อง) · จอใหญ่ = 3D · ถ้าเคยเลือกเองไว้ใช้ค่านั้น
  // Builder เปิดหลังลูกค้ากดเท่านั้น (ไม่ถูก render ฝั่ง server) จึงอ่าน window ตอนสร้าง state ได้ — มือถือไม่ต้องโหลด 3D ก่อนแล้วค่อยสลับ
  const [view, setViewState] = useState<View>(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === '2d' || saved === '3d') return saved;
    } catch { /* ignore */ }
    return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches ? '2d' : '3d';
  });
  const setView = (v: View) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>('main');
  const sel = design.items.find((it) => it.id === selected);
  const count = design.items.length;
  const full = count >= CONFIG.maxItems;

  const add = (type: string, color: string, x?: number, y?: number) => {
    if (full) return notify(`ใส่ได้สูงสุด ${CONFIG.maxItems} ชิ้นต่อช่อ ลบบางดอกออกก่อนเพิ่มใหม่`);
    b.addFlower(type, color, x, y);
  };

  // preset: โหลดแบบสำเร็จมาเป็นจุดเริ่ม แล้วแก้ต่อได้ทุกอย่าง (ย้าย / เพิ่ม / ลบดอก เปลี่ยนสี กระดาษ ริบบิ้น)
  const loadPreset = (t: Template) => {
    const go = () => b.replace(templateDesign(t));
    if (!count) return go();
    confirm({
      title: `แทนที่ช่อที่จัดอยู่ด้วยแบบ “${t.name}”`,
      body: 'ดอกไม้ที่จัดไว้ตอนนี้จะถูกแทนที่ และกู้คืนไม่ได้',
      confirmLabel: 'แทนที่', danger: true, onConfirm: go,
    });
  };

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
    add(type, color, p?.x, p?.y);
  };

  // คีย์บอร์ด: ลูกศรเลื่อน, Delete ลบ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!sel || (e.target as Element).matches('input, textarea, select') || document.querySelector('dialog[open]')) return;
      const step = e.shiftKey ? 10 : 3;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); b.arrange(sel.id, 'del'); }
      else if (moves[e.key]) { e.preventDefault(); b.updateItem(sel.id, { x: sel.x + moves[e.key][0], y: sel.y + moves[e.key][1] }); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sel, b]);

  return (
    <PickerShell
      tool title="จัดช่อเอง" onClose={onClose}
      meta={`${count} ชิ้น · ${baht(summarize(design).total)}`}
      actions={<ThermalButton size="s" icon="check" onClick={b.commitDraft} disabled={!count || (!b.editing?.lineId && b.linesFull)} still={!!dialog}>{b.editing?.lineId ? 'บันทึกช่อนี้' : 'เพิ่มลงออเดอร์'}</ThermalButton>}
    >
      <div className="tool">
        {/* คลังดอกไม้ */}
        <aside className="tool__library lib" aria-label="คลังดอกไม้">
          <div className="lib__head">
            <Seg label="ประเภทดอกไม้" options={TABS} value={tab} onChange={setTab} full compact />
            <p className="lib__hint">
              {tab === 'preset' ? 'เริ่มจากแบบสำเร็จ แล้วแก้ต่อได้ทุกอย่าง' : `${ROLES.find((r) => r.id === tab)!.hint} · แตะหรือลากมาใส่ช่อ`}
            </p>
          </div>
          {tab === 'preset' ? (
            <div className="lib__presets" key="preset">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" className="preset" onClick={() => loadPreset(t)}>
                  <BouquetSvg design={{ ...templateDesign(t), film: design.film }} label="" aria-hidden />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="lib__list" key={tab}>
              {Object.entries(FLOWERS).filter(([, f]) => f.role === tab).map(([type, f]) => {
                const color = pick[type] ?? f.colors[0].id;
                return (
                  <div
                    key={type} className="fl" draggable
                    onClick={() => add(type, color)}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', `${type}|${color}`)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="fl__img" src={flowerImg(type, color)} alt="" draggable={false} />
                    <div className="fl__info">
                      <span className="fl__name">{f.name}</span>
                      <span className="fl__price num">{baht(f.price)} / {f.unit}</span>
                      {f.colors.length > 1 && (
                        <Swatches
                          small label={`สี${f.name}`} value={color}
                          items={f.colors.map((c) => ({ key: c.id, name: c.name, color: c.hex }))}
                          onChange={(id) => setPick((p) => ({ ...p, [type]: id }))}
                        />
                      )}
                    </div>
                    <button type="button" className="fl__add" aria-label={`เพิ่ม${f.name}`} onClick={(e) => { e.stopPropagation(); add(type, color); }}>
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* พื้นที่จัดช่อ: canvas well (paper-sunken) → artboard (paper-raised) */}
        <section className="tool__canvas" aria-label="พื้นที่จัดช่อ">
          <div className="canvas__head">
            <span className="canvas__label num">{count}/{CONFIG.maxItems} ชิ้น</span>
            <div className="canvas__tools">
              <Seg label="มุมมองพื้นที่จัดช่อ" options={VIEWS} value={view} onChange={setView} compact />
              <button
                className="btn btn--ghost btn--xs" type="button" disabled={!count}
                onClick={() => confirm({
                  title: 'ล้างดอกไม้ทั้งหมดในช่อ',
                  body: 'ดอกไม้ทุกดอกจะถูกนำออก กระดาษห่อและริบบิ้นยังอยู่เหมือนเดิม',
                  confirmLabel: 'ล้างทั้งหมด', danger: true, onConfirm: b.clear,
                })}
              >
                ล้างทั้งหมด
              </button>
            </div>
          </div>

          <div className="canvas__stage">
            <div className="artboard">
              {view === '3d' ? (
                <Bouquet3D
                  ref={threeRef} design={design} selected={selected} label="พื้นที่จัดช่อดอกไม้ แบบ 3D"
                  onSelect={b.setSelected} onMove={(id, x, y) => b.updateItem(id, { x, y })}
                  onFail={() => { setView('2d'); notify('อุปกรณ์นี้เปิดมุมมอง 3D ไม่ได้ กลับมาใช้ 2D แทน'); }}
                  onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
                />
              ) : (
                <BouquetSvg
                  ref={svgRef} design={design} selected={selected} label="พื้นที่จัดช่อดอกไม้"
                  onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                  onPointerUp={endDrag} onPointerCancel={endDrag}
                  onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
                />
              )}
              {!count && (
                <div className="artboard__empty">
                  <p className="artboard__empty-title">เริ่มจัดช่อ</p>
                  <p>แตะดอกไม้ในคลังเพื่อใส่ลงช่อ หรือเริ่มจากแบบสำเร็จ</p>
                </div>
              )}
            </div>
          </div>

          {/* แถบเครื่องมือของดอกที่เลือก — ไม่มีดอกที่เลือกก็บอกวิธีใช้แทน (ความสูงคงที่ จอไม่กระตุก) */}
          <div className="canvas__dock">
            {sel || view === '3d' ? (
              <div className="toolbar" role="toolbar" aria-label={sel ? 'จัดการดอกที่เลือก' : 'มุมมอง 3D'}>
                {view === '3d' && (
                  <button type="button" className="btn btn--ghost btn--xs" onClick={() => threeRef.current?.resetView()}>
                    <Icon name="rotate-ccw" size={16} />มุมเริ่มต้น
                  </button>
                )}
                {sel && view === '3d' && <span className="toolbar__sep" />}
                {sel && view === '2d' && (
                  <>
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => b.arrange(sel.id, 'front')}><Icon name="bring-to-front" size={16} />หน้าสุด</button>
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => b.arrange(sel.id, 'back')}><Icon name="send-to-back" size={16} />หลังสุด</button>
                    <span className="toolbar__sep" />
                  </>
                )}
                {sel && (
                  <>
                    <button type="button" className="btn btn--ghost btn--xs" disabled={full} onClick={() => b.arrange(sel.id, 'dup')}><Icon name="copy" size={16} />ทำซ้ำ</button>
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => b.arrange(sel.id, 'del')}><Icon name="trash" size={16} />ลบ</button>
                  </>
                )}
              </div>
            ) : (
              <p className="canvas__hint">{count ? 'แตะดอกในช่อเพื่อแก้ไข · ลากเพื่อย้าย' : 'ดอกที่ใส่จะขึ้นในช่อทันที'}</p>
            )}
            {view === '3d' && !sel && <p className="canvas__hint">ลากที่ว่างเพื่อหมุนช่อ · ลากดอกเพื่อย้าย</p>}
          </div>
          {toast}
        </section>

        {/* inspector: เรื่องละหนึ่งส่วน */}
        <aside className="tool__inspector" aria-label="ตัวเลือกของช่อ">
          <section className={`insp insp--sel${sel ? '' : ' insp--idle'}`}>
            <div className="insp__head">
              <h3 className="insp__title">ดอกที่เลือก</h3>
              {sel && <span className="overline">{FLOWERS[sel.type].en}</span>}
            </div>
            {sel ? <SelectedTools it={sel} /> : <p className="insp__empty">แตะดอกไม้ในช่อเพื่อเปลี่ยนสีหรือปรับองศา</p>}
          </section>

          <section className="insp">
            <div className="insp__head">
              <h3 className="insp__title">กระดาษห่อ</h3>
              <span className="insp__value">{PAPERS[design.paper].name}</span>
            </div>
            <Swatches
              label="กระดาษห่อ" value={String(design.paper)} onChange={(k) => b.setPaper(+k)}
              items={PAPERS.map((p, i) => ({ key: String(i), name: p.name, color: p.color, pattern: p.kind === 'news' }))}
            />
            <FilmToggle checked={b.draftFilm} onChange={b.setDraftFilm} />
          </section>

          <section className="insp">
            <div className="insp__head">
              <h3 className="insp__title">ริบบิ้น</h3>
              <span className="insp__value">{RIBBONS[design.ribbon][0]}</span>
            </div>
            <Swatches
              label="ริบบิ้น" value={String(design.ribbon)} onChange={(k) => b.setRibbon(+k)}
              items={RIBBONS.map(([name, hex], i) => ({ key: String(i), name, color: hex }))}
            />
          </section>

          <section className="insp">
            <div className="insp__head"><h3 className="insp__title">สรุปรายการ</h3></div>
            <Summary design={design} />
          </section>
        </aside>
      </div>
      {dialog}
    </PickerShell>
  );
}

// สีและองศาของดอกที่เลือก — ค่าที่แน่นอนแสดงเป็นตัวเลขข้างสไลเดอร์
function SelectedTools({ it }: { it: Item }) {
  const b = useBouquet();
  const f = FLOWERS[it.type];
  return (
    <>
      <p className="insp__name">{f.name}</p>
      {f.colors.length > 1 && (
        <div className="insp__row">
          <span className="insp__label">สี</span>
          <Swatches
            label={`สี${f.name}`} value={it.color} onChange={(id) => b.updateItem(it.id, { color: id })}
            items={f.colors.map((c) => ({ key: c.id, name: c.name, color: c.hex }))}
          />
        </div>
      )}
      <label className="insp__row">
        <span className="insp__label">เอียง</span>
        <span className="slider">
          <input
            className="range" type="range" min={-30} max={30} step={1} value={it.r}
            style={{ '--pct': `${((it.r + 30) / 60) * 100}%` } as React.CSSProperties}
            onChange={(e) => b.updateItem(it.id, { r: +e.target.value })}
          />
          <output className="slider__value num">{it.r < 0 ? '−' : it.r > 0 ? '+' : ''}{Math.abs(it.r)}°</output>
        </span>
      </label>
    </>
  );
}
