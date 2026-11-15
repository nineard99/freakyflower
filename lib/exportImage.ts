import { flowerImg, type Design } from './catalog';
import { bouquetMarkup, STAGE_H, STAGE_W } from './wrap';

const toDataUrl = async (src: string) => {
  const blob = await (await fetch(src)).blob();
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
};

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const cache = new Map<string, Promise<string>>(); // รูปดอกไม้ที่แปลงแล้ว (หลายช่อใช้รูปซ้ำกัน)
const cachedDataUrl = (src: string) => {
  if (!cache.has(src)) cache.set(src, toDataUrl(src).catch((e) => { cache.delete(src); throw e; }));
  return cache.get(src)!;
};

// วาดช่อเป็นรูป (data URL): ฝังรูปดอกไม้เป็น data URL ใน SVG เดียว (SVG ที่โหลดเป็น <img> ดึงไฟล์ภายนอกไม่ได้)
// ค่าเริ่มเป็น JPEG — เล็กกว่า PNG หลายเท่า ส่งหลายช่อในออเดอร์เดียวได้ไม่เกินขนาดที่ server รับ
export async function designToImage(d: Design, scale = 1.2, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<string> {
  const srcs = [...new Set(d.items.map((it) => flowerImg(it.type, it.color)))];
  const data = Object.fromEntries(await Promise.all(srcs.map(async (s) => [s, await cachedDataUrl(s)] as const)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STAGE_W} ${STAGE_H}" width="${STAGE_W * scale}" height="${STAGE_H * scale}">` +
    `<rect width="${STAGE_W}" height="${STAGE_H}" fill="#fbf4f8"/>` +
    bouquetMarkup(d, 'x', (it) => data[flowerImg(it.type, it.color)]) + '</svg>';
  const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  const cv = document.createElement('canvas');
  cv.width = STAGE_W * scale;
  cv.height = STAGE_H * scale;
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL(type, 0.85);
}
