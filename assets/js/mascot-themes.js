// ธีมเอฟเฟกต์รอบตัวน้อง DLTV (สลับรายวัน)
//  - satellite : ดาวเทียมจิ๋วโคจร + คลื่นสัญญาณ + ดาวตก · โทนเหลืองทอง/น้ำเงิน DLTV
//  - learning  : หนังสือ ดินสอ ไม้บรรทัด ตัวอักษร ลอยรอบตัว + ฟองสบู่ · โทนพาสเทล
import * as THREE from 'three';
export { themeOfToday } from './theme-day.js';

export const THEMES = {
  satellite: {
    palette: ['#ffc21a', '#ffd966', '#ffffff', '#6aa8ff', '#2f6bff', '#fff1b8'],
    waves: ['#ffd23f', '#ffc21a', '#6aa8ff'],
    rimA: 0x4f8cff, rimB: 0xffc21a, fill: 0x2f5bd6,
    hemi: [0xeef3ff, 0x24357a],
    env: { top: '#2f5bff', mid: '#101c5c', bot: '#0b2a80', panels: [['#ffffff', 6], ['#ffd23f', 3.2], ['#4f8cff', 3], ['#2f6bff', 2.5], ['#fff1b8', 2]] },
    halo: ['rgba(255,214,90,.9)', 'rgba(255,194,26,.4)', 'rgba(79,140,255,.25)', 'rgba(47,107,255,0)'],
    ant: (t) => (Math.sin(t * 3) > 0 ? '#ffd23f' : '#6aa8ff'),
  },
  learning: {
    palette: ['#ffb3d9', '#b5f0dc', '#cdb8ff', '#ffd6a5', '#a8d8ff', '#fff3b0', '#ffffff'],
    waves: ['#ff9ecf', '#cdb8ff', '#8ef0d0'],
    rimA: 0xff9ecf, rimB: 0x8ef0d0, fill: 0xcdb8ff,
    hemi: [0xfff5fb, 0x6a5aa8],
    env: { top: '#b9a6ff', mid: '#3a3f8f', bot: '#ff9ecf', panels: [['#ffffff', 6], ['#ffd6a5', 3], ['#ff9ecf', 3], ['#8ef0d0', 3], ['#a8d8ff', 2.5]] },
    halo: ['rgba(255,240,250,.85)', 'rgba(255,158,207,.4)', 'rgba(181,240,220,.25)', 'rgba(205,184,255,0)'],
    ant: (t) => ['#ff9ecf', '#cdb8ff', '#8ef0d0', '#ffd6a5'][Math.floor(t * 1.5) % 4],
  },
};

// ---------------------------------------------------------------- textures
function tex(size, draw, w = size, h = size) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function glowTexture(stops) {
  return tex(256, (g, s) => {
    const h = s / 2, gr = g.createRadialGradient(h, h, 0, h, h, h);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
}
const streakTex = () => tex(256, (g, w, h) => {
  const gr = g.createLinearGradient(0, h / 2, w, h / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.85, 'rgba(255,240,190,.9)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w - 6, h / 2 - 5); g.arc(w - 6, h / 2, 5, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill();
}, 256, 16);
const bubbleTex = () => tex(128, (g, s) => {
  const h = s / 2;
  const rim = g.createRadialGradient(h, h, h * 0.55, h, h, h * 0.98);
  rim.addColorStop(0, 'rgba(255,255,255,0.02)'); rim.addColorStop(0.7, 'rgba(255,220,245,0.22)'); rim.addColorStop(0.88, 'rgba(190,240,255,0.65)'); rim.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rim; g.beginPath(); g.arc(h, h, h * 0.98, 0, 7); g.fill();
  const hl = g.createRadialGradient(h * 0.62, h * 0.55, 0, h * 0.62, h * 0.55, h * 0.32);
  hl.addColorStop(0, 'rgba(255,255,255,0.95)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.beginPath(); g.arc(h * 0.62, h * 0.55, h * 0.32, 0, 7); g.fill();
});
const letterTex = (ch, bg) => tex(128, (g, s) => {
  g.fillStyle = bg; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 4, 0, 7); g.fill();
  g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
  g.fillStyle = '#3a3f8f'; g.font = '700 74px Kanit, Sarabun, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ch, s / 2, s / 2 + 4);
});
const rulerTex = () => tex(256, (g, w, h) => {
  g.fillStyle = '#ffe9a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c98a1a';
  for (let i = 0; i <= 24; i++) g.fillRect(6 + i * 10, 0, 2, i % 5 ? 12 : 22);
}, 256, 48);

// ---------------------------------------------------------------- helpers
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
const add = (to, m) => (to.add(m), m);
function sprite(map, color, opts = {}) {
  return new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, toneMapped: false, ...opts }));
}
function twinkles(m, n, palette) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = sprite(m.sparkTex, palette[i % palette.length], { blending: THREE.AdditiveBlending });
    s.userData = { a: Math.random() * 7, r: 1.4 + Math.random() * 1.1, y: 0.2 + Math.random() * 3.3, sp: 0.1 + Math.random() * 0.25, tw: 1 + Math.random() * 3, ph: Math.random() * 6, size: 0.1 + Math.random() * 0.2 };
    m.scene.add(s); list.push(s);
  }
  return (t, dt) => list.forEach((p) => {
    const u = p.userData; u.a += dt * u.sp;
    p.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 0.8 + u.ph) * 0.15, Math.sin(u.a) * u.r * 0.6 - 0.2);
    const tw = Math.max(0, Math.sin(t * u.tw + u.ph)); p.scale.setScalar(u.size * (0.3 + tw)); p.material.opacity = 0.2 + 0.8 * tw;
  });
}
function haloAndPad(m, th, padColors) {
  const halo = sprite(glowTexture(th.halo), 0xffffff, { blending: THREE.AdditiveBlending, opacity: 0.4 });
  halo.position.set(0, 2.0, -1.5); halo.scale.set(3.4, 3.4, 1); m.scene.add(halo);
  const pad = new THREE.Group(); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.012; m.scene.add(pad);
  padColors.forEach(([c, r1, r2, o]) => add(pad, new THREE.Mesh(new THREE.RingGeometry(r1, r2, 96), basic(c, { transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false }))));
  return (t, s) => {
    halo.material.opacity = 0.32 + 0.1 * Math.sin(t * 1.6); halo.material.rotation = t * 0.1;
    pad.rotation.z = t * 0.6; pad.children.forEach((r, i) => (r.material.opacity = padColors[i][3] * (0.6 + 0.4 * s)));
  };
}

// ---------------------------------------------------------------- ธีม A: ดาวเทียม DLTV
function miniSatellite() {
  const g = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc21a, metalness: 0.8, roughness: 0.25, emissive: 0x6a4500, emissiveIntensity: 0.4 });
  const panel = new THREE.MeshPhysicalMaterial({ color: 0x2f5bd6, metalness: 0.4, roughness: 0.2, emissive: 0x16348f, emissiveIntensity: 0.5, clearcoat: 1 });
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.09), gold));
  [-1, 1].forEach((s) => { const p = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.09), panel)); p.position.x = s * 0.17; });
  const dish = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.04, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xeef3ff, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide })));
  dish.position.y = 0.07; dish.rotation.x = Math.PI;
  const light = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), basic(0xff4d4d)));
  light.position.set(0, -0.06, 0.05); g.userData.light = light;
  return g;
}
function buildSatellite(m, th) {
  const updHalo = haloAndPad(m, th, [['#ffc21a', 0.74, 0.8, 0.85], ['#4f8cff', 0.84, 0.88, 0.7]]);
  const updTw = twinkles(m, 26, th.palette);
  // วงโคจรเส้นทอง/ฟ้า + ดาวเทียมจิ๋ว
  const orbits = [[1.45, 1.32, 0.3, '#ffc21a', 0.9], [1.75, 1.15, -0.45, '#6aa8ff', -0.65]].map(([r, tx, tz, c, speed], i) => {
    const g = new THREE.Group(); g.position.y = 1.05; g.rotation.set(tx, 0, tz); m.root.add(g);
    add(g, new THREE.Mesh(new THREE.TorusGeometry(r, 0.011, 6, 160), basic(c, { transparent: true, opacity: 0.75 })));
    const sat = add(g, miniSatellite()); sat.scale.setScalar(i ? 0.9 : 1.1);
    return { g, sat, r, speed, a: i * 2.2 };
  });
  // คลื่นสัญญาณวงกลมกระจายออกจากเสาอากาศ
  const pulses = Array.from({ length: 4 }, (_, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.018, 8, 64), basic(i % 2 ? '#6aa8ff' : '#ffd23f', { transparent: true, opacity: 0, depthWrite: false }));
    m.scene.add(ring); return { ring, life: 1 + i };
  });
  // ดาวตก
  const stex = streakTex();
  const shooters = Array.from({ length: 3 }, () => { const s = sprite(stex, '#fff3c4', { blending: THREE.AdditiveBlending, opacity: 0 }); m.scene.add(s); s.userData = { life: 1, wait: Math.random() * 4 }; return s; });
  const tip = new THREE.Vector3();
  let nextPulse = 0;
  return {
    update(t, dt, s) {
      updHalo(t, s); updTw(t, dt);
      orbits.forEach((o) => {
        o.a += dt * o.speed * (m.signalSpeed > 1 ? 2.5 : 1);
        o.sat.position.set(Math.cos(o.a) * o.r, Math.sin(o.a) * o.r, 0);
        o.sat.rotation.set(t * 0.7, t * 0.5, o.a);
        o.sat.userData.light.visible = Math.sin(t * 8 + o.a) > 0.3;
        o.g.rotation.y += dt * 0.12;
      });
      // ปล่อยคลื่นทุก ~0.9 วินาที (เร็วขึ้นตอนส่งคำตอบ)
      nextPulse -= dt * m.signalSpeed;
      if (nextPulse <= 0) {
        nextPulse = 0.9; m.antBall.getWorldPosition(tip);
        const p = pulses.reduce((a, b) => (a.life > b.life ? a : b)); p.life = 0; p.ring.position.copy(tip);
      }
      pulses.forEach((p) => {
        p.life += dt / 1.8; const k = Math.min(p.life, 1);
        p.ring.scale.setScalar(0.3 + k * 4.5); p.ring.material.opacity = k < 1 ? 0.75 * (1 - k) : 0;
        p.ring.lookAt(m.camera.position);
      });
      shooters.forEach((sh) => {
        const u = sh.userData;
        if (u.wait > 0) { u.wait -= dt; sh.material.opacity = 0; if (u.wait <= 0) { u.life = 0; u.x = -3 + Math.random() * 2; u.y = 3.2 + Math.random() * 1.2; } return; }
        u.life += dt / 0.9;
        sh.position.set(u.x + u.life * 5, u.y - u.life * 2.2, -2.5);
        sh.scale.set(1.6, 0.1, 1); sh.material.rotation = -0.41;
        sh.material.opacity = Math.sin(Math.min(u.life, 1) * Math.PI) * 0.9;
        if (u.life >= 1) u.wait = 2.5 + Math.random() * 5;
      });
    },
    burst() {},
  };
}

// ---------------------------------------------------------------- ธีม B: ห้องเรียนฟองสบู่
function book(cover) {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.22), new THREE.MeshPhysicalMaterial({ color: cover, roughness: 0.4, clearcoat: 0.6 })));
  const pages = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.8 })));
  pages.position.x = 0.012;
  const band = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.072, 0.222), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })));
  band.position.x = -0.09;
  return g;
}
function pencil(body) {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 6), new THREE.MeshPhysicalMaterial({ color: body, roughness: 0.35, clearcoat: 0.6 })));
  const wood = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 6), new THREE.MeshStandardMaterial({ color: 0xf3d2a2, roughness: 0.8 }))); wood.position.y = 0.235;
  const lead = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), new THREE.MeshStandardMaterial({ color: 0x4a4a5a }))); lead.position.y = 0.27;
  const ferrule = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xd8dde8, metalness: 0.8, roughness: 0.25 }))); ferrule.position.y = -0.21;
  const eraser = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0xff9ecf, roughness: 0.6 }))); eraser.position.y = -0.255;
  return g;
}
function ruler() {
  const m = new THREE.MeshStandardMaterial({ map: rulerTex(), roughness: 0.5 });
  const side = new THREE.MeshStandardMaterial({ color: 0xffd97a, roughness: 0.5 });
  return new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.018, 0.09), [side, side, m, side, side, side]);
}
function star(color) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.05 : 0.11, a = (i / 10) * Math.PI * 2 + Math.PI / 2; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }); geo.center();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 1, emissive: color, emissiveIntensity: 0.15 }));
}
function buildLearning(m, th) {
  const updHalo = haloAndPad(m, th, [['#ff9ecf', 0.74, 0.8, 0.7], ['#8ef0d0', 0.84, 0.88, 0.6]]);
  const updTw = twinkles(m, 14, th.palette);
  const items = [
    book(0xff9ecf), book(0x8fd8ff), pencil(0xffd36e), pencil(0xb9a6ff), ruler(), star(0xffe27a), star(0xffb3d9),
    sprite(letterTex('ก', '#ffe0ef'), 0xffffff), sprite(letterTex('ข', '#dff7ee'), 0xffffff), sprite(letterTex('A', '#ece4ff'), 0xffffff), sprite(letterTex('B', '#fff0d6'), 0xffffff),
  ].map((o, i, arr) => {
    if (o.isSprite) o.scale.setScalar(0.3);
    m.scene.add(o);
    const ring = i % 2 ? 1.75 : 1.45;
    o.userData = { a: (i / arr.length) * Math.PI * 2, r: ring, y: 0.5 + ((i * 0.37) % 1) * 2.8, sp: (i % 2 ? -0.22 : 0.28), spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.8), ph: Math.random() * 6 };
    return o;
  });
  // ฟองสบู่ลอยขึ้น
  const btex = bubbleTex();
  const bubbles = Array.from({ length: 18 }, () => { const b = sprite(btex, 0xffffff, { opacity: 0.9 }); m.scene.add(b); resetBubble(b, true); return b; });
  function resetBubble(b, anywhere) {
    const a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 1.4;
    b.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r * 0.6 - 0.3, y: anywhere ? Math.random() * 3.6 : -0.1, v: 0.25 + Math.random() * 0.35, size: 0.12 + Math.random() * 0.22, ph: Math.random() * 6, top: 3 + Math.random() * 1.2 };
  }
  const pop = (b) => { m.burst(4, b.position, ['#ffffff', '#ffb3d9', '#b5f0dc']); resetBubble(b, false); };
  return {
    update(t, dt, s) {
      updHalo(t, s); updTw(t, dt);
      const fast = m.signalSpeed > 1 ? 2.5 : 1;
      items.forEach((o) => {
        const u = o.userData; u.a += dt * u.sp * fast;
        o.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 1.2 + u.ph) * 0.12, Math.sin(u.a) * u.r * 0.65 - 0.2);
        if (!o.isSprite) { o.rotation.x += dt * u.spin.x; o.rotation.y += dt * u.spin.y; o.rotation.z += dt * u.spin.z; }
        else o.material.rotation = Math.sin(t + u.ph) * 0.25;
      });
      bubbles.forEach((b) => {
        const u = b.userData; u.y += dt * u.v;
        b.position.set(u.x + Math.sin(t * 1.3 + u.ph) * 0.12, u.y, u.z);
        b.scale.setScalar(u.size * (1 + 0.06 * Math.sin(t * 3 + u.ph)));
        if (u.y > u.top) pop(b);
      });
    },
    burst(n) { bubbles.slice(0, Math.min(8, n >> 2)).forEach((b) => { b.userData.y = 1.6 + Math.random(); b.userData.v = 0.8; }); },
  };
}

export function buildFx(m, name) {
  return name === 'learning' ? buildLearning(m, THEMES.learning) : buildSatellite(m, THEMES.satellite);
}
