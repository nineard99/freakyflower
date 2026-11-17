'use client';

import { useEffect, useRef, useState } from 'react';
import type { ResolvedLine } from '@/lib/cart';
import { baht, GARLAND, PICKUP } from '@/lib/catalog';
import { garlandTotal, type GarlandPick } from '@/lib/garland';
import { Icon } from '../Icon';
import { ThermalButton } from '../ThermalButton';
import { Alert } from '../ui';
import { PaymentFields } from './PaymentFields';

// หลังกดยืนยันการจอง: สรุปสั้นๆ → ยอดโอน + QR → แนบสลิป → ส่ง (ส่งออเดอร์เข้า Sheet ตอนนี้)
export function PaymentView({ resolved, garland, pickup, queue, itemsLabel, total, sending, failure, queueTaken, onBack, onSubmit }: {
  resolved: ResolvedLine[];
  garland: GarlandPick | null;
  pickup: string;
  queue: string;
  itemsLabel: string;
  total: number;
  sending: boolean;
  failure: string;
  queueTaken: boolean; // คิวที่เลือกเพิ่งเต็ม → ต้องกลับไปเลือกใหม่
  onBack: () => void;
  onSubmit: (slip: File) => void;
}) {
  const [slip, setSlip] = useState<File | null>(null);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <main className="wrap done">
      <form
        className="ticket paynow" noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!slip) {
            setError('แนบรูปสลิปการโอน');
            document.getElementById('loy-slip')?.focus();
            return;
          }
          onSubmit(slip);
        }}
      >
        <button type="button" className="btn btn--ghost btn--xs paynow__back" onClick={onBack} disabled={sending}>
          <Icon name="arrow-left" size={16} />แก้ไขคำสั่งจอง
        </button>
        <header className="ticket__head">
          <h1 ref={titleRef} tabIndex={-1} className="ticket__title">โอนเงินและแนบสลิป</h1>
          <p className="muted">โอนตามยอดด้วย QR ด้านล่าง แล้วแนบสลิปเพื่อยืนยันการจอง</p>
        </header>

        <dl className="ticket__facts">
          {resolved.length > 0 && (
            <div><dt>ช่อดอกไม้</dt><dd><ul className="ticket__lines">{resolved.map((r) => <li key={r.line.id}>{r.name} <span className="num">× {r.line.qty}</span></li>)}</ul></dd></div>
          )}
          {garland && (
            <div><dt>{GARLAND.name}</dt><dd className="num">{GARLAND.modes[garland.mode].name} × {garland.qty} · {baht(garlandTotal(garland))}</dd></div>
          )}
          {pickup && <div><dt>เวลารับ</dt><dd className="num">{PICKUP.date} · {pickup} น.</dd></div>}
          {queue && <div><dt>คิวมัดพวงมาลัย</dt><dd className="num">{PICKUP.date} · {queue} น.</dd></div>}
          <div><dt>รวม</dt><dd className="num">{itemsLabel}</dd></div>
        </dl>

        <div className="pay">
          <PaymentFields
            hasOrder shown={total} slip={slip} error={error}
            onSlip={(f) => { setSlip(f); setError(''); }}
            onBadFile={setError}
          />
        </div>

        {failure && (
          <Alert title="ยังจองไม่สำเร็จ">
            {failure}
            {queueTaken && <> <button type="button" className="link paynow__relink" onClick={onBack}>กลับไปเลือกคิวใหม่</button></>}
          </Alert>
        )}
        <ThermalButton type="submit" full icon="arrow-right" status={sending ? 'loading' : 'idle'}>
          {sending ? 'กำลังส่ง' : `ส่งสลิป · ยืนยันการจอง ${baht(total)}`}
        </ThermalButton>
        <p className="rail__note">ร้านจะตรวจสลิปและติดต่อกลับทางเบอร์โทรที่ให้ไว้</p>
      </form>
    </main>
  );
}
