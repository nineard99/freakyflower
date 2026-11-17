'use client';

import { useEffect, useRef, useState } from 'react';
import { baht, LOYKRATHONG } from '@/lib/catalog';
import { fileSize } from '@/lib/image';
import { Icon } from '../Icon';
import { FieldError } from './Step';

// ขั้นตอนชำระเงิน: ยอดโอน · QR · แนบสลิป (ลากวางหรือเลือกไฟล์)
export function PaymentFields({ hasOrder, shown, slip, error, onSlip, onBadFile }: {
  hasOrder: boolean;
  shown: number;
  slip: File | null;
  error?: string;
  onSlip: (f: File) => void;
  onBadFile: (msg: string) => void;
}) {
  const qrRef = useRef<HTMLImageElement>(null);
  const [qrMissing, setQrMissing] = useState(false);
  const [preview, setPreview] = useState('');
  const [over, setOver] = useState(false); // กำลังลากไฟล์มาเหนือ dropzone

  // รูป QR อาจโหลดพังก่อน React ผูก onError (hydration) — เช็กซ้ำตอน mount
  useEffect(() => {
    const img = qrRef.current;
    if (img?.complete && !img.naturalWidth) setQrMissing(true);
  }, []);

  useEffect(() => {
    if (!slip) return setPreview('');
    const url = URL.createObjectURL(slip);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slip]);

  // วางไฟล์พลาดนอก dropzone → เบราว์เซอร์จะเปิดรูปแทนหน้านี้ ข้อมูลที่กรอกไว้หาย: กันไว้ทั้งหน้า
  useEffect(() => {
    const stop = (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', stop);
    return () => { window.removeEventListener('dragover', stop); window.removeEventListener('drop', stop); };
  }, []);

  const pick = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return onBadFile('ไฟล์นี้ไม่ใช่รูปภาพ เลือกไฟล์ JPG หรือ PNG');
    onSlip(file);
  };

  return (
    <>
      <div className="pay__amount">
        <span className="stat__label">ยอดโอน</span>
        <strong className="stat__value num" data-empty={!hasOrder || undefined}>{hasOrder ? baht(shown) : '—'}</strong>
        {!hasOrder && <span className="field__hint">เลือกช่อในขั้นตอนที่ 1 เพื่อดูยอดโอน</span>}
      </div>
      <figure className="pay__qr">
        {qrMissing ? (
          <div className="pay__qr-missing">ยังไม่มีรูป QR</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={qrRef} src={LOYKRATHONG.qrImage} alt="QR code สำหรับชำระเงิน" onError={() => setQrMissing(true)} />
        )}
        <figcaption>{LOYKRATHONG.accountName || 'สแกนด้วยแอปธนาคาร'}</figcaption>
        {/* โอนจากมือถือเครื่องเดียวกัน: บันทึกรูปแล้วเปิดในแอปธนาคาร */}
        {!qrMissing && (
          <a className="btn btn--xs" href={LOYKRATHONG.qrImage} download="freakyflower-qr.jpg">
            <Icon name="download" size={14} />บันทึกรูป QR
          </a>
        )}
      </figure>
      <div className="field pay__slip">
        <span className="field__label">สลิปการโอน</span>
        <div
          className="drop" data-over={over || undefined} data-invalid={!!error || undefined} data-filled={!!slip || undefined}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); }}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
        >
          <input
            id="loy-slip" className="drop__input" name="slip" type="file" accept="image/*" required
            aria-label="รูปสลิปการโอน" aria-invalid={!!error || undefined} aria-describedby={error ? 'err-slip' : undefined}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {slip && preview ? (
            <div className="drop__file">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={preview} className="drop__thumb" src={preview} alt="ตัวอย่างสลิปที่แนบ" />
              <span className="drop__meta">
                <span className="drop__name">{slip.name}</span>
                <span className="field__hint num">{fileSize(slip.size)}</span>
              </span>
              <label htmlFor="loy-slip" className="btn btn--xs">เปลี่ยนรูป</label>
            </div>
          ) : (
            <label htmlFor="loy-slip" className="drop__empty">
              <Icon name="upload" size={24} />
              <span className="drop__title">ลากรูปสลิปมาวาง หรือ <span className="drop__browse">เลือกไฟล์</span></span>
              <span className="field__hint">ไฟล์รูปภาพ JPG หรือ PNG</span>
            </label>
          )}
        </div>
        {error && <FieldError id="err-slip">{error}</FieldError>}
      </div>
    </>
  );
}
