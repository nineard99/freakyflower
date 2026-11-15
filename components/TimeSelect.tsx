'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';

// dropdown เลือกเวลา — ปุ่ม pill เปิดแผง (กล่อง 2px) ที่แบ่งช่วง บ่าย / เย็น / ค่ำ เป็นตารางชิปเวลา
// pattern: button + listbox (aria-activedescendant) · ลูกศรเลื่อน (ขึ้น/ลง = ทีละแถว) · Enter/Space เลือก · Esc ปิด
const COLS = 4;
const PERIODS: { name: string; until: number }[] = [
  { name: 'บ่าย', until: 17 * 60 },
  { name: 'เย็น', until: 19 * 60 },
  { name: 'ค่ำ', until: 24 * 60 },
];
const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };

type Props = {
  id: string;
  slots: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  labelledBy?: string;
};

export function TimeSelect({ id, slots, value, onChange, placeholder = 'เลือกเวลา', invalid, describedBy, labelledBy }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const optId = (i: number) => `${uid}-t${i}`;

  // แบ่งช่วงเวลา (เก็บ index เดิมไว้ใช้กับลูกศร)
  const groups = PERIODS.map((p, gi) => ({
    name: p.name,
    items: slots.map((t, i) => ({ t, i })).filter(({ t }) => toMin(t) < p.until && (gi === 0 || toMin(t) >= PERIODS[gi - 1].until)),
  })).filter((g) => g.items.length);

  const show = () => {
    setActive(Math.max(0, slots.indexOf(value)));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus({ preventScroll: true });
  };
  const pick = (t: string) => { onChange(t); close(); };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    listRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) close(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // ลูกศรขึ้น/ลงย้ายทีละแถวภายในช่วงเดียวกัน ข้ามช่วงได้ด้วย
  const rowMove = (dir: 1 | -1) => {
    const g = groups.findIndex((x) => x.items.some((it) => it.i === active));
    const pos = groups[g].items.findIndex((it) => it.i === active);
    const col = pos % COLS;
    const target = pos + dir * COLS;
    if (target >= 0 && target < groups[g].items.length) return groups[g].items[target].i;
    const ng = groups[g + dir];
    if (!ng) return active;
    if (dir === 1) return ng.items[Math.min(col, ng.items.length - 1)].i;
    const lastRow = Math.floor((ng.items.length - 1) / COLS) * COLS;
    return ng.items[Math.min(lastRow + col, ng.items.length - 1)].i;
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const last = slots.length - 1;
    const next: Record<string, () => number> = {
      ArrowRight: () => Math.min(last, active + 1),
      ArrowLeft: () => Math.max(0, active - 1),
      ArrowDown: () => rowMove(1),
      ArrowUp: () => rowMove(-1),
      Home: () => 0,
      End: () => last,
    };
    if (next[e.key]) { e.preventDefault(); setActive(next[e.key]()); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(slots[active]); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') close(false);
  };

  useEffect(() => {
    if (open) document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' });
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tsel" ref={rootRef} data-open={open || undefined}>
      <button
        ref={btnRef} id={id} type="button" className="tsel__btn"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${uid}-list` : undefined}
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        aria-labelledby={labelledBy ? `${labelledBy} ${id}` : undefined}
        data-empty={!value || undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show(); } }}
      >
        <Icon name="clock" size={18} />
        <span className="tsel__value num">{value ? `${value} น.` : placeholder}</span>
        <Icon name="chevron-down" size={18} className="tsel__chev" />
      </button>

      {open && (
        <div
          ref={listRef} id={`${uid}-list`} className="tsel__panel" role="listbox" tabIndex={-1}
          aria-labelledby={labelledBy} aria-activedescendant={optId(active)} onKeyDown={onListKey}
        >
          {groups.map((g) => (
            <div key={g.name} className="tsel__group" role="group" aria-label={`ช่วง${g.name}`}>
              <p className="tsel__period" aria-hidden>
                {g.name}<span className="num">{g.items[0].t}–{g.items[g.items.length - 1].t}</span>
              </p>
              <div className="tsel__grid">
                {g.items.map(({ t, i }) => (
                  <div
                    key={t} id={optId(i)} role="option" aria-selected={t === value}
                    className="tsel__opt num" data-active={i === active || undefined}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => pick(t)}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
