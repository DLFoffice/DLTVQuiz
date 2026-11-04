// น้องนักบินอวกาศ DLTV แบบ 3D (three.js)
// ใช้: const m = new Mascot(containerEl, { logoUrl }); m.play('wave' | 'jump' | 'happy' | 'sad' | 'nod' | 'shake' | 'spin')
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const YELLOW = 0xfbb900;
const WHITE = 0xf2fbfa;
const VISOR = 0x4b4f56;

const ease = {
  outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  bell: (t) => Math.sin(Math.PI * Math.min(Math.max(t, 0), 1)), // 0 -> 1 -> 0
};

export class Mascot {
  constructor(container, opts = {}) {
    this.el = container;
    this.opts = opts;
    this.pointer = new THREE.Vector2();
    this.drag = { on: false, moved: 0, x: 0, yaw: 0, vel: 0 };
    this.action = null;
    this.signalSpeed = 1;
    this.mood = 'idle';
    this.nextBlink = 1.5;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.el.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    this.camera.position.set(0, 1.75, 10);
    this.camera.lookAt(0, 1.6, 0);

    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 6); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9db8ff, 1.4); rim.position.set(-4, 3, -4); this.scene.add(rim);
    this.scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x223070, 0.6));

    this.build();
    this.bind();
    this.resize();
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.tick());
    this.play('wave');
  }

  // ---------------------------------------------------------------- model
  build() {
    const white = new THREE.MeshPhysicalMaterial({ color: WHITE, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18 });
    const yellow = new THREE.MeshPhysicalMaterial({ color: YELLOW, roughness: 0.38, clearcoat: 0.4, emissive: 0x4a3000, emissiveIntensity: 0.25 });
    const visor = new THREE.MeshPhysicalMaterial({ color: VISOR, roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
    const grey = new THREE.MeshStandardMaterial({ color: 0xc9d2d6, roughness: 0.4, metalness: 0.3 });
    const glow = new THREE.MeshBasicMaterial({ color: YELLOW });
    const M = (g, m) => new THREE.Mesh(g, m);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.body = new THREE.Group();
    this.root.add(this.body);

    // ขา + เท้า
    this.legs = [];
    [-1, 1].forEach((s) => {
      const leg = new THREE.Group();
      leg.position.set(0.2 * s, 0.62, 0);
      const l = M(new THREE.CapsuleGeometry(0.16, 0.28, 8, 16), white); l.position.y = -0.24; leg.add(l);
      const foot = M(new THREE.SphereGeometry(0.2, 24, 16), white); foot.scale.set(1.05, 0.55, 1.35); foot.position.set(0, -0.5, 0.06); leg.add(foot);
      this.body.add(leg); this.legs.push(leg);
    });

    // ลำตัว
    const torso = M(new THREE.CapsuleGeometry(0.42, 0.42, 12, 32), white);
    torso.scale.set(1, 1, 0.86); torso.position.y = 1.0; this.body.add(torso);
    const belt = M(new THREE.TorusGeometry(0.405, 0.045, 12, 48), yellow);
    belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.86, 1); belt.position.y = 0.74; this.body.add(belt);
    const collar = M(new THREE.TorusGeometry(0.3, 0.07, 16, 48), yellow);
    collar.rotation.x = Math.PI / 2; collar.position.y = 1.42; this.body.add(collar);

    // โลโก้ DLTV ที่หน้าอก
    if (this.opts.logoUrl) {
      new THREE.TextureLoader().load(this.opts.logoUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const badge = M(new THREE.PlaneGeometry(0.36, 0.33),
          new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
        badge.position.set(0, 1.02, 0.372); badge.rotation.x = -0.05; this.body.add(badge);
      });
    }

    // แขน
    this.arms = [];
    [-1, 1].forEach((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.4 * s, 1.3, 0);
      const arm = M(new THREE.CapsuleGeometry(0.12, 0.34, 8, 16), white); arm.position.y = -0.24; pivot.add(arm);
      const cuff = M(new THREE.TorusGeometry(0.12, 0.03, 8, 24), yellow); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.4; pivot.add(cuff);
      const hand = M(new THREE.SphereGeometry(0.15, 24, 16), white); hand.position.y = -0.52; pivot.add(hand);
      pivot.userData.side = s;
      pivot.rotation.order = 'ZXY'; // เอียงไปด้านหน้าก่อน แล้วค่อยยกแขนออกข้าง
      this.body.add(pivot); this.arms.push(pivot);
    });

    // หัว (หมวกนักบินอวกาศ)
    this.headPivot = new THREE.Group();
    this.headPivot.position.y = 1.45;
    this.body.add(this.headPivot);
    const head = new THREE.Group(); head.position.y = 0.86; this.headPivot.add(head); this.head = head;

    const helmet = M(new THREE.SphereGeometry(0.95, 64, 48), white); helmet.scale.set(1.06, 0.96, 1); head.add(helmet);
    const vis = M(new THREE.SphereGeometry(1, 64, 48), visor); vis.scale.set(0.79, 0.66, 0.48); vis.position.z = 0.55; head.add(vis);

    // ตา + ปาก
    this.eyes = new THREE.Group(); head.add(this.eyes);
    [-1, 1].forEach((s) => {
      const e = M(new THREE.SphereGeometry(0.1, 24, 16), glow); e.scale.set(1, 1.05, 0.35); e.position.set(0.28 * s, 0.1, 1.0); this.eyes.add(e);
    });
    this.mouth = M(new THREE.CircleGeometry(0.17, 32, Math.PI, Math.PI), glow);
    this.mouth.position.set(0, -0.12, 1.035); this.mouth.rotation.x = -0.18; head.add(this.mouth);
    this.mouthSad = M(new THREE.TorusGeometry(0.13, 0.03, 8, 24, Math.PI), glow);
    this.mouthSad.position.set(0, -0.28, 1.0); this.mouthSad.rotation.x = -0.2; this.mouthSad.visible = false; head.add(this.mouthSad);

    // แสงสะท้อนบนกระจก
    const shine = M(new THREE.TorusGeometry(0.55, 0.028, 8, 24, 0.55), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
    shine.position.z = 0.93; shine.rotation.z = 1.95; head.add(shine);

    // เสาอากาศ + คลื่นสัญญาณ
    const ant = new THREE.Group();
    const dir = new THREE.Vector3(0.62, 0.72, 0.15).normalize();
    ant.position.copy(dir.clone().multiplyScalar(0.9));
    ant.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const base = M(new THREE.CylinderGeometry(0.09, 0.11, 0.08, 20), grey); ant.add(base);
    const stick = M(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 12), grey); stick.position.y = 0.15; ant.add(stick);
    this.antBall = M(new THREE.SphereGeometry(0.075, 20, 16), white); this.antBall.position.y = 0.3; ant.add(this.antBall);
    head.add(ant); this.antenna = ant;

    this.waves = [];
    const waveOrigin = dir.clone().multiplyScalar(1.22);
    for (let i = 0; i < 3; i++) {
      const w = M(new THREE.TorusGeometry(0.22 + i * 0.17, 0.035, 8, 32, 1.5),
        new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0.9, depthWrite: false }));
      w.position.copy(waveOrigin); w.position.z = 0.2; w.rotation.z = -0.15;
      head.add(w); this.waves.push(w);
    }

    // เงาที่พื้น
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,20,.45)'); gr.addColorStop(1, 'rgba(0,0,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    this.shadow = M(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.01; this.scene.add(this.shadow);

    this.root.scale.setScalar(0.001); // โผล่ขึ้นมาตอนเริ่ม
    this.intro = 0;
  }

  // ---------------------------------------------------------------- input
  bind() {
    const cvs = this.renderer.domElement;
    cvs.style.touchAction = 'pan-y';
    window.addEventListener('pointermove', (e) => {
      const r = cvs.getBoundingClientRect();
      this.pointer.set(
        THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.5, 1.5),
        THREE.MathUtils.clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1.5, 1.5)
      );
      if (this.drag.on) {
        const dx = e.clientX - this.drag.x; this.drag.x = e.clientX;
        this.drag.moved += Math.abs(dx); this.drag.vel = dx * 0.012; this.drag.yaw += this.drag.vel;
      }
    }, { passive: true });
    cvs.addEventListener('pointerdown', (e) => { this.drag.on = true; this.drag.moved = 0; this.drag.x = e.clientX; });
    window.addEventListener('pointerup', () => {
      if (!this.drag.on) return;
      this.drag.on = false;
      if (this.drag.moved < 6) this.play(Math.random() < 0.5 ? 'jump' : 'spin'); // แตะที่ตัวน้อง
    });
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.el);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.renderer.setAnimationLoop(null);
      else { this.clock.getDelta(); this.renderer.setAnimationLoop(() => this.tick()); }
    });
  }

  resize() {
    const w = Math.max(this.el.clientWidth, 1), h = Math.max(this.el.clientHeight, 1);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    // ให้ตัวน้อง (สูง ~3.4, กว้าง ~3) อยู่ในกรอบเสมอ
    const fitH = 3.9 / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    const fitW = 3.4 / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect);
    this.camera.position.z = Math.max(fitH, fitW);
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- api
  play(name) { this.action = { name, t: 0, dur: { wave: 1.8, jump: 0.8, happy: 2.6, sad: 2.2, nod: 0.6, shake: 0.7, spin: 1.1 }[name] || 1 }; }
  setSignal(speed) { this.signalSpeed = speed; }
  setMood(m) { this.mood = m; this.mouth.visible = m !== 'sad'; this.mouthSad.visible = m === 'sad'; }
  dispose() { this.renderer.setAnimationLoop(null); this.ro.disconnect(); this.renderer.dispose(); this.el.innerHTML = ''; }

  // ---------------------------------------------------------------- loop
  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const k = this.reduced ? 0.3 : 1;
    const L = (a, b, f) => a + (b - a) * (1 - Math.exp(-f * dt));

    // intro pop
    if (this.intro < 1) { this.intro = Math.min(1, this.intro + dt / 0.9); this.root.scale.setScalar(Math.max(0.001, ease.outBack(this.intro))); }

    // ค่าพื้นฐาน (idle)
    let y = Math.sin(t * 2.2) * 0.05 * k, sx = 1, sy = 1, spin = 0;
    let headX = -this.pointer.y * 0.22, headY = this.pointer.x * 0.45, headZ = Math.sin(t * 1.1) * 0.04 * k;
    let armA = 0.28 + Math.sin(t * 2.2) * 0.05 * k, armB = 0.28 + Math.sin(t * 2.2 + 1) * 0.05 * k; // A = ขวาจอ(+x), B = ซ้ายจอ
    let bodyZ = Math.sin(t * 1.3) * 0.03 * k, fwdA = 0, fwdB = 0; // fwd = ยกแขนมาด้านหน้า (หัวใหญ่จะได้ไม่บังแขน)
    if (this.mood === 'sad') { headX = 0.32; armA = armB = 0.08; }

    const a = this.action;
    if (a) {
      a.t += dt; const p = Math.min(a.t / a.dur, 1);
      switch (a.name) {
        case 'wave': armA = 1.95 + Math.sin(a.t * 14) * 0.4; fwdA = -0.45; headZ = -0.12; headY = 0.15; break;
        case 'jump': { const h = ease.bell(p); y += h * 0.75; sy = 1 + (p < 0.15 ? -0.18 * ease.bell(p / 0.15) : 0.06 * h); sx = 2 - sy; armA = armB = 0.3 + h * 1.4; fwdA = fwdB = -0.3 * h; break; }
        case 'spin': y += ease.bell(p) * 0.45; spin = ease.inOut(p) * Math.PI * 2; armA = armB = 0.3 + ease.bell(p) * 1.2; break;
        case 'happy': {
          const hop = Math.abs(Math.sin(p * Math.PI * 3)); y += hop * 0.6;
          sy = 1 + (hop < 0.15 ? -0.12 : 0.04); sx = 2 - sy;
          spin = p > 0.33 && p < 0.66 ? ease.inOut((p - 0.33) / 0.33) * Math.PI * 2 : 0;
          armA = 1.9 + Math.sin(a.t * 16) * 0.3; armB = 1.9 + Math.sin(a.t * 16 + 1.5) * 0.3; fwdA = fwdB = -0.5; headX = -0.2; break;
        }
        case 'sad': headX = 0.38; headY = Math.sin(a.t * 9) * 0.25 * (1 - p); armA = armB = 0.05; y -= 0.05; break;
        case 'nod': headX = Math.sin(p * Math.PI * 2) * 0.28; break;
        case 'shake': headY = Math.sin(p * Math.PI * 4) * 0.45; headZ = 0; break;
      }
      if (p >= 1) this.action = null;
    }

    // ลากหมุนตัว + สปริงกลับ
    if (!this.drag.on) { this.drag.yaw = L(this.drag.yaw, 0, 3); }

    this.root.position.y = y;
    this.body.scale.set(L(this.body.scale.x, sx, 25), L(this.body.scale.y, sy, 25), L(this.body.scale.z, sx, 25));
    this.root.rotation.y = this.drag.yaw + spin;
    this.body.rotation.z = L(this.body.rotation.z, bodyZ, 6);
    this.headPivot.rotation.x = L(this.headPivot.rotation.x, headX, 8);
    this.headPivot.rotation.y = L(this.headPivot.rotation.y, headY, 8);
    this.headPivot.rotation.z = L(this.headPivot.rotation.z, headZ, 8);
    this.arms[1].rotation.z = L(this.arms[1].rotation.z, armA, 14);
    this.arms[0].rotation.z = L(this.arms[0].rotation.z, -armB, 14);
    this.arms[1].rotation.x = L(this.arms[1].rotation.x, fwdA, 10);
    this.arms[0].rotation.x = L(this.arms[0].rotation.x, fwdB, 10);
    this.legs[0].rotation.x = this.legs[1].rotation.x = 0;

    // กะพริบตา
    this.nextBlink -= dt;
    let ey = 1;
    if (this.nextBlink < 0.12) ey = 0.12;
    if (this.nextBlink < 0) this.nextBlink = 2 + Math.random() * 3;
    if (this.mood === 'happy' || (a && a.name === 'happy')) ey = 0.45; // ยิ้มตาหยี
    this.eyes.scale.y = L(this.eyes.scale.y, ey, 30);

    // คลื่นสัญญาณ
    const sp = this.signalSpeed * 2.2;
    this.waves.forEach((w, i) => {
      const ph = (t * sp - i * 0.33) % 1;
      w.material.opacity = 0.15 + 0.85 * Math.max(0, Math.sin(ph * Math.PI));
      w.scale.setScalar(0.92 + 0.1 * ph);
    });
    this.antBall.scale.setScalar(1 + 0.15 * Math.max(0, Math.sin(t * sp * Math.PI * 2)));

    // เงา
    const s = 1 - Math.min(y, 0.8) * 0.5;
    this.shadow.scale.set(s, s, s); this.shadow.material.opacity = 0.9 * s;

    this.renderer.render(this.scene, this.camera);
  }
}
