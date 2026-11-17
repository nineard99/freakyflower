// คิวมัดพวงมาลัยที่ถูกจองไปแล้ว (อ่านจาก Sheet ผ่าน Apps Script) — หน้าเว็บใช้แสดงคิวที่เต็ม
// ไม่ cache: คิวเปลี่ยนตลอด (Route Handler GET ไม่ cache อยู่แล้วโดยค่าเริ่มต้น)
// อ่านไม่ได้ → คืน [] (หน้าเว็บยังใช้ได้ Apps Script เช็กคิวซ้ำตอนส่งออเดอร์อยู่แล้ว)
export async function GET() {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) return Response.json({ taken: [] });
  try {
    const res = await fetch(`${url}?action=queue`, { redirect: 'follow', cache: 'no-store' });
    const text = await res.text();
    if (!text.trimStart().startsWith('{')) {
      // Apps Script ตอบเป็นหน้า HTML = deployment ที่ใช้อยู่ยังไม่มี doGet (ยังไม่ได้ Deploy เวอร์ชันใหม่) หรือ URL ผิด
      console.error(`[queue] Apps Script ตอบกลับไม่ใช่ JSON (HTTP ${res.status}) — วางโค้ดใหม่จาก scripts/loykrathong-apps-script.gs แล้ว Deploy → Manage deployments → Edit → New version`);
      return Response.json({ taken: [] }, { status: 502 });
    }
    const data = JSON.parse(text) as { ok?: boolean; taken?: unknown; error?: string };
    if (!data.ok) console.error('[queue] Apps Script ปฏิเสธ:', data.error);
    const taken = Array.isArray(data.taken) ? data.taken.filter((t) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) : [];
    return Response.json({ taken }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[queue] อ่านคิวจาก Apps Script ไม่สำเร็จ:', err);
    return Response.json({ taken: [] }, { status: 502 });
  }
}
