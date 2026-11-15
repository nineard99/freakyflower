import type { ReactNode } from 'react';
import { Icon } from '../Icon';

// หนึ่งขั้นตอนของฟอร์ม: วงเลข (กลายเป็นติ๊กเมื่อเสร็จ) · หัวข้อ + สถานะ · เนื้อหา
export function Step({ n, title, status, done, enterIndex, bodyClass, children }: {
  n: number;
  title: string;
  status: ReactNode;
  done: boolean;
  enterIndex: number; // ลำดับ animation ตอนเปิดหน้า
  bodyClass?: string;
  children: ReactNode;
}) {
  return (
    <section className="step enter" style={{ '--i': enterIndex } as React.CSSProperties} aria-labelledby={`step-${n}`}>
      <b className="step__badge" data-done={done || undefined} aria-hidden>
        <span>{n}</span><Icon name="check" size={14} strokeWidth={2.6} />
      </b>
      <header className="step__head">
        <h2 id={`step-${n}`} className="step__title">{title}</h2>
        <p className="step__status num">{status}</p>
      </header>
      <div className={`step__body${bodyClass ? ` ${bodyClass}` : ''}`}>{children}</div>
    </section>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return <span id={id} className="field__error"><Icon name="circle-alert" size={14} />{children}</span>;
}
