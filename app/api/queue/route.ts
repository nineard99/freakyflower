// คิวมัดพวงมาลัยที่ถูกจองไปแล้ว (อ่านจาก Sheet ผ่าน Apps Script) — หน้าเว็บใช้แสดงคิวที่เต็ม
// ไม่ cache: คิวเปลี่ยนตลอด (Route Handler GET ไม่ cache อยู่แล้วโดยค่าเริ่มต้น)
export async function GET() {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) return Response.json({ taken: [] });
  try {
    const res = await fetch(`${url}?action=queue`, { redirect: 'follow', cache: 'no-store' });
    const data = (await res.json()) as { ok?: boolean; taken?: unknown };
    const taken = Array.isArray(data.taken) ? data.taken.filter((t) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) : [];
    return Response.json({ taken }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[queue] อ่านคิวจาก Apps Script ไม่สำเร็จ:', err);
    return Response.json({ taken: [] }, { status: 502 });
  }
}
