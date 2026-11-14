'use client';

import { useEffect } from 'react';
import { templateDesign, TEMPLATES, type Template } from '@/lib/catalog';
import { BouquetSvg } from './BouquetSvg';
import { Builder } from './Builder';
import { useBouquet } from './BouquetProvider';

// หน้าเต็มจอสำหรับจัดช่อเอง
export function BouquetPicker({ onClose }: { onClose: () => void }) {
  const { design, replace, withFilm } = useBouquet();

  // preset: โหลดแบบสำเร็จมาเป็นจุดเริ่ม แล้วแก้ต่อได้ทุกอย่าง (ย้าย / เพิ่ม / ลบดอก เปลี่ยนสี กระดาษ ริบบิ้น)
  const loadPreset = (t: Template) => {
    if (design.items.length && !confirm(`แทนที่ช่อที่จัดอยู่ด้วยแบบ “${t.name}”?`)) return;
    replace(templateDesign(t));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label="จัดช่อดอกไม้เอง">
      <div className="picker__bar">
        <div className="wrap picker__bar-inner">
          <button type="button" className="link" onClick={onClose}>← กลับไปที่ฟอร์ม</button>
          <strong>จัดช่อเอง</strong>
        </div>
      </div>
      <div className="wrap picker__body">
        <p className="muted picker__hint">แตะ (หรือลาก) ดอกไม้มาใส่ช่อ · ลากเพื่อย้าย · แตะดอกในช่อเพื่อเอียงหรือเปลี่ยนสี · สลับมุมมอง 2D / 3D ได้ตลอดระหว่างจัด</p>
        <div className="presets" role="group" aria-label="เริ่มจากแบบสำเร็จ">
          <span className="presets__label muted">เริ่มจากแบบสำเร็จ<br />แล้วแก้ต่อได้</span>
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="preset" onClick={() => loadPreset(t)}>
              <BouquetSvg design={withFilm(templateDesign(t))} label="" aria-hidden />
              <span>{t.name}</span>
            </button>
          ))}
        </div>
        <Builder onDone={onClose} />
      </div>
    </div>
  );
}
