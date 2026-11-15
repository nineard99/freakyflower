'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

// ชิ้นส่วน mono ของ Thermal ที่ใช้ซ้ำหลายหน้า — control = pill, container = กล่องมุม 2px, เลือกแล้ว = กลับสี ink

/* ---------- SegmentedControl: radio จริง → ลูกศรซ้าย/ขวาเลื่อนตัวเลือกได้ ---------- */
export function Seg<T extends string>({ label, options, value, onChange, full, compact }: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
  compact?: boolean;
}) {
  const name = useId();
  return (
    <div className={`seg${full ? ' seg--full' : ''}${compact ? ' seg--xs' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/* ---------- Checkbox: สี่เหลี่ยมมุม 2px, ติ๊กแล้ว = ink fill ---------- */
export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (on: boolean) => void; children: ReactNode }) {
  return (
    <label className="check">
      <span className="check__box">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="check__mark" aria-hidden><Icon name="check" size={14} strokeWidth={2.6} /></span>
      </span>
      <span className="check__text">{children}</span>
    </label>
  );
}

/* ---------- Swatches: ชิปสีสี่เหลี่ยม (สีของลูกค้า = เนื้อหา ไม่ใช่สีของระบบ) ---------- */
export type SwatchItem = { key: string; name: string; color: string; pattern?: boolean; has?: boolean };
export function Swatches({ label, items, value, onChange, small }: {
  label: string;
  items: SwatchItem[];
  value: string;
  onChange: (key: string) => void;
  small?: boolean;
}) {
  // radio จริง: Tab เข้ากลุ่มครั้งเดียว ลูกศรเลื่อนตัวเลือก
  const name = useId();
  return (
    <div className={`swatches${small ? ' swatches--sm' : ''}`} role="radiogroup" aria-label={label}>
      {items.map((s) => (
        <label key={s.key} title={s.name} onClick={(e) => e.stopPropagation()}>
          <input type="radio" name={name} checked={s.key === value} aria-label={s.name} onChange={() => onChange(s.key)} />
          <span className={`sw${s.pattern ? ' sw--news' : ''}`} data-has={s.has || undefined} style={{ '--c': s.color } as React.CSSProperties} />
        </label>
      ))}
    </div>
  );
}

/* ---------- Alert: error ใช้ ink red + ไอคอน + คำ (ไม่พึ่งสีอย่างเดียว) ---------- */
export function Alert({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="alert alert--error" role="alert">
      <Icon name="circle-alert" className="alert__icon" />
      <div className="alert__body">
        <p className="alert__title">{title}</p>
        {children && <div className="alert__text">{children}</div>}
      </div>
    </div>
  );
}

/* ---------- Modal ยืนยัน: <dialog> จริง (กัน focus หลุด, Esc ปิด) · ยกเลิกอยู่ซ้าย · ลบ/แทนที่ = danger ไม่ร้อน ---------- */
export type ConfirmReq = { title: string; body?: string; confirmLabel: string; danger?: boolean; onConfirm: () => void };

export function useConfirm() {
  const [req, setReq] = useState<ConfirmReq | null>(null);
  const dialog = req ? <ConfirmDialog req={req} onClose={() => setReq(null)} /> : null;
  return { confirm: setReq, dialog };
}

function ConfirmDialog({ req, onClose }: { req: ConfirmReq; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref} className="modal" aria-labelledby={titleId} onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
    >
      <div className="modal__body">
        <h2 id={titleId} className="modal__title">{req.title}</h2>
        {req.body && <p className="modal__desc">{req.body}</p>}
      </div>
      <div className="modal__foot">
        <button type="button" className="btn btn--ghost" onClick={() => ref.current?.close()}>ยกเลิก</button>
        <button
          type="button" className={`btn${req.danger ? ' btn--danger' : ''}`}
          onClick={() => { req.onConfirm(); ref.current?.close(); }}
        >
          {req.confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

/* ---------- Toast: ข้อความสั้นกลับสี ink หายเองใน 4 วินาที ---------- */
export function useToast(ms = 4000) {
  const [note, setNote] = useState<{ msg: string; id: number } | null>(null);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), ms);
    return () => clearTimeout(t);
  }, [note, ms]);
  // live region อยู่ใน DOM ตลอด เปลี่ยนแค่ข้อความข้างใน — โปรแกรมอ่านจอจึงประกาศทุกครั้ง
  const toast = <div className="toast-region" role="status">{note && <div key={note.id} className="toast">{note.msg}</div>}</div>;
  const notify = (msg: string) => setNote({ msg, id: Date.now() });
  return { toast, notify };
}
