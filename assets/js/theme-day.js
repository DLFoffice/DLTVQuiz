// เลือกธีมของวัน (ไฟล์เล็ก ไม่พึ่ง three.js — หน้าเว็บทำงานได้แม้โหลด 3D ไม่สำเร็จ)
export const THEME_NAMES = ['satellite', 'learning'];

/** ธีมของวันนี้ (ทุกเครื่องได้ธีมเดียวกันในวันเดียวกัน) — สลับวันละธีม เริ่ม 7 พ.ย. 2569 = satellite */
export function themeOfToday(setting = 'auto') {
  const q = new URLSearchParams(location.search).get('theme');
  if (THEME_NAMES.includes(q)) return q;                 // ทดสอบ: ?theme=satellite หรือ ?theme=learning
  if (THEME_NAMES.includes(setting)) return setting;           // ล็อกธีมจาก config.js
  const day = Math.floor((Date.now() + 7 * 3600e3) / 864e5); // วันตามเวลาไทย
  const base = Math.floor(Date.UTC(2026, 10, 7) / 864e5);
  return (((day - base) % 2) + 2) % 2 === 0 ? 'satellite' : 'learning';
}

