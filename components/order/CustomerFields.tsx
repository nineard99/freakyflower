import { PICKUP, PICKUP_SLOTS } from '@/lib/catalog';
import { TimeSelect } from '../TimeSelect';
import { FieldError } from './Step';

type Errors = { name?: string; phone?: string; pickup?: string };

// ขั้นตอนข้อมูลผู้สั่ง — ชื่อ/เบอร์/IG เป็นช่องแบบ uncontrolled (อ่านค่าตอนส่งฟอร์ม พิมพ์แล้วไม่เรนเดอร์ใหม่)
export function CustomerFields({ errors, pickup, onPickup }: { errors: Errors; pickup: string; onPickup: (t: string) => void }) {
  return (
    <>
      <label className="field">
        <span className="field__label">ชื่อ</span>
        <input
          id="loy-name" className="input" name="name" required autoComplete="name"
          aria-invalid={!!errors.name || undefined} aria-describedby={errors.name ? 'err-name' : undefined}
        />
        {errors.name && <FieldError id="err-name">{errors.name}</FieldError>}
      </label>
      <label className="field">
        <span className="field__label">เบอร์โทร</span>
        <input
          id="loy-phone" className="input num" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="0812345678"
          aria-invalid={!!errors.phone || undefined} aria-describedby={errors.phone ? 'err-phone' : undefined}
        />
        {errors.phone && <FieldError id="err-phone">{errors.phone}</FieldError>}
      </label>
      <label className="field">
        <span className="field__label">Instagram <span className="field__opt">ไม่บังคับ</span></span>
        <input id="loy-ig" className="input" name="ig" autoCapitalize="none" autoCorrect="off" placeholder="@yourname" />
      </label>
      <div className="field">
        <span id="lbl-pickup" className="field__label">เวลามารับ</span>
        <TimeSelect
          id="loy-pickup" labelledBy="lbl-pickup" slots={PICKUP_SLOTS} value={pickup}
          invalid={!!errors.pickup} describedBy={errors.pickup ? 'err-pickup' : 'hint-pickup'}
          onChange={onPickup}
        />
        {errors.pickup
          ? <FieldError id="err-pickup">{errors.pickup}</FieldError>
          : <span id="hint-pickup" className="field__hint num">รับได้เฉพาะวันที่ {PICKUP.date} เวลา {PICKUP.from}–{PICKUP.to} น.</span>}
      </div>
    </>
  );
}
