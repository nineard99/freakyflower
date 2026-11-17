import { FieldError } from './Step';

type Errors = { name?: string; phone?: string };
export type Customer = { name: string; phone: string; ig: string };

// ขั้นตอนข้อมูลผู้สั่ง — ช่องแบบ uncontrolled (อ่านค่าตอนส่งฟอร์ม พิมพ์แล้วไม่เรนเดอร์ใหม่)
// defaults = ค่าที่กรอกไว้ก่อนไปหน้าชำระเงิน (กดกลับมาแก้แล้วไม่ต้องกรอกใหม่)
export function CustomerFields({ errors, defaults }: { errors: Errors; defaults?: Customer }) {
  return (
    <>
      <label className="field">
        <span className="field__label">ชื่อ</span>
        <input
          id="loy-name" className="input" name="name" required autoComplete="name" defaultValue={defaults?.name}
          aria-invalid={!!errors.name || undefined} aria-describedby={errors.name ? 'err-name' : undefined}
        />
        {errors.name && <FieldError id="err-name">{errors.name}</FieldError>}
      </label>
      <label className="field">
        <span className="field__label">เบอร์โทร</span>
        <input
          id="loy-phone" className="input num" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="0812345678"
          defaultValue={defaults?.phone}
          aria-invalid={!!errors.phone || undefined} aria-describedby={errors.phone ? 'err-phone' : undefined}
        />
        {errors.phone && <FieldError id="err-phone">{errors.phone}</FieldError>}
      </label>
      <label className="field">
        <span className="field__label">Instagram <span className="field__opt">ไม่บังคับ</span></span>
        <input id="loy-ig" className="input" name="ig" autoCapitalize="none" autoCorrect="off" placeholder="@yourname" defaultValue={defaults?.ig} />
      </label>
    </>
  );
}
