'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

// โครงหน้าเต็มจอของเครื่องมือ (จัดช่อเอง / ให้ร้านจัดให้): TopBar 56px — ชื่อ + สถานะทางซ้าย, action ทางขวา
// ปุ่มร้อน (ThermalButton) ของหน้านี้อยู่ท้ายสุดของ actions เสมอ
export function PickerShell({ title, meta, onClose, actions, tool, children }: {
  title: string;
  meta?: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  /** true = โครงเครื่องมือสูงเต็มจอ แต่ละแผงเลื่อนเอง (จอกว้าง) */
  tool?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // onClose เปลี่ยนตัวทุกครั้งที่ร่างเปลี่ยน — เก็บใน ref ไว้ ไม่ให้ effect ข้างล่างรันซ้ำ
  // (ถ้ารันซ้ำจะดึงโฟกัสออกจากช่องที่พิมพ์อยู่ แป้นพิมพ์บนมือถือปิดทันที)
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    // หน้าที่ถูกบังอยู่ข้างหลังต้องรับโฟกัสไม่ได้ (Tab ไม่หลุดออกจากหน้าเครื่องมือ)
    const behind = [...(ref.current?.parentElement?.children ?? [])].filter(
      (el) => el !== ref.current && el.matches('header, main, footer') && !el.hasAttribute('inert'),
    );
    behind.forEach((el) => el.setAttribute('inert', ''));
    // Esc ปิดหน้า — ยกเว้นตอนมี modal ยืนยันเปิดอยู่ (Esc นั้นเป็นของ modal)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) closeRef.current(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      behind.forEach((el) => el.removeAttribute('inert'));
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div ref={ref} className={`picker${tool ? ' picker--tool' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
      <header className="topbar">
        <div className="topbar__inner topbar__inner--tool">
          <button type="button" className="btn btn--ghost topbar__back" onClick={onClose} aria-label="กลับไปที่ฟอร์ม">
            <Icon name="arrow-left" size={18} /><span>กลับ</span>
          </button>
          <div className="topbar__brand">
            <strong className="topbar__name">{title}</strong>
            {meta && <span className="topbar__meta num">{meta}</span>}
          </div>
          <div className="topbar__actions">{actions}</div>
        </div>
      </header>
      {children}
    </div>
  );
}
