// ระบบหลังบ้าน: ดึงสถิติจาก GAS → แสดงแดชบอร์ด + สร้างรายงาน PDF (A4)
import { getStats } from './api.js';

const $ = (s) => document.querySelector(s);
const LETTERS = ['ก', 'ข', 'ค', 'ง'];
// สีโทนสุภาพ
const C = { navy: '#2b3990', teal: '#2a9d8f', amber: '#d99a2b', rose: '#c8576f', slate: '#94a3b8', green: '#3a9d6a', violet: '#7466b8', sky: '#4f86c6' };
const SERIES = [C.navy, C.teal, C.amber, C.rose, C.violet, C.sky, '#64748b'];
const GROUP_COLORS = [C.navy, C.teal, C.amber, C.rose, C.slate];
const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

let KEY = sessionStorage.getItem('dltvKey') || '';
let S = null, timer = null, exporting = false;
const charts = {};

if (window.Chart) {
  Chart.defaults.font.family = 'Sarabun, sans-serif';
  Chart.defaults.font.size = 13;
  Chart.defaults.color = '#4b5563';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
}

// ===================================================== login / โหลดข้อมูล
$('#fLogin').addEventListener('submit', (e) => { e.preventDefault(); KEY = $('#iKey').value.trim(); load(true); });
$('#bLogout').onclick = () => { sessionStorage.removeItem('dltvKey'); location.reload(); };
$('#bRefresh').onclick = () => load();
$('#fDate').onchange = render;
$('#wSearch').oninput = renderWinners;
$('#mask').onchange = renderWinners;
$('#bPdf').onclick = exportPdf;
if (KEY) load(true);

async function load(first) {
  if (first) { $('#bLogin').disabled = true; $('#loginErr').textContent = ''; }
  try {
    S = await getStats(KEY);
    sessionStorage.setItem('dltvKey', KEY);
    $('#login').hidden = true; $('#app').hidden = false;
    fillDates(); render();
    clearInterval(timer); timer = setInterval(() => { if (!exporting) load(); }, 60000);
  } catch (e) {
    if (first || !S) { $('#login').hidden = false; $('#app').hidden = true; $('#loginErr').textContent = e.message; sessionStorage.removeItem('dltvKey'); }
  } finally { $('#bLogin').disabled = false; }
}

function fillDates() {
  const sel = $('#fDate'), cur = sel.value;
  const dates = allDates();
  sel.innerHTML = `<option value="">ทุกวัน (${dates.length} วัน)</option>` + dates.map((d) => `<option value="${d}">${thDate(d)}</option>`).join('');
  sel.value = dates.includes(cur) ? cur : '';
  $('#upd').textContent = 'ข้อมูล ณ ' + thStamp(S.updated) + ' · รีเฟรชอัตโนมัติทุก 1 นาที';
}

// ===================================================== คำนวณสถิติ (ใช้ร่วมกันทั้งหน้าจอและ PDF)
// record = [date, hour, group, score, passed, prize, phone, mask, seconds, received]
const allDates = () => [...new Set(S.records.map((r) => r[0]))].sort();

function compute(D) {
  const R = S.records.filter((r) => !D || r[0] === D);
  const n = R.length, people = new Set(R.map((r) => r[6])).size;
  const passed = sum(R, 4), prizes = sum(R, 5), received = sum(R, 9);
  const dates = allDates(), showDates = D ? [D] : dates;

  // ช่วงชั่วโมง (ใช้ช่วงเดียวกันทุกวัน)
  const hs = S.records.map((r) => r[1]);
  const h0 = hs.length ? Math.min(...hs) : 8, h1 = hs.length ? Math.max(...hs) : 17;
  const hours = []; for (let h = h0; h <= h1; h++) hours.push(h);
  const cell = {}; S.records.forEach((r) => { const k = r[0] + '|' + r[1]; cell[k] = (cell[k] || 0) + 1; });
  const byH = hours.map((h) => R.filter((r) => r[1] === h).length);
  const peakIdx = byH.indexOf(Math.max(...byH, 0));

  const perDay = dates.map((d) => {
    const x = S.records.filter((r) => r[0] === d);
    return { d, n: x.length, p: new Set(x.map((r) => r[6])).size, pass: sum(x, 4), w: sum(x, 5), rec: sum(x, 9) };
  });

  const groups = {}; R.forEach((r) => (groups[r[2]] = (groups[r[2]] || 0) + 1));
  const scores = []; for (let i = 0; i <= S.questions.length; i++) scores.push(R.filter((r) => r[3] === i).length);

  const qs = S.questions.map((q, i) => {
    const cnt = [0, 0, 0, 0, 0]; R.forEach((r) => cnt[Number(r[7][i]) || 0]++);
    const answered = n - cnt[0];
    return { q, i, cnt, answered, rate: answered ? cnt[q.answer] / answered : 0 };
  });
  const hard = [...qs].filter((x) => x.answered).sort((a, b) => a.rate - b.rate).slice(0, 3).map((x) => {
    const wrong = [1, 2, 3, 4].filter((k) => k !== x.q.answer).sort((a, b) => x.cnt[b] - x.cnt[a])[0];
    return { ...x, wrong };
  });

  return {
    D, R, n, people, passed, prizes, received, dates, showDates, hours, cell, byH,
    peak: byH[peakIdx] ? hours[peakIdx] : null, peakN: byH[peakIdx] || 0,
    perDay: perDay.filter((x) => !D || x.d === D), perDayAll: perDay, groups, scores, qs, hard,
    avg: n ? sum(R, 3) / n : 0, secs: n ? sum(R, 8) / n : 0,
    winners: S.winners.filter((w) => !D || w.date === D),
  };
}

function kpiList(st) {
  return [
    [C.navy, 'จำนวนครั้งที่เล่น', fmt(st.n), st.D ? thDate(st.D) : `รวม ${st.dates.length} วัน`],
    [C.sky, 'จำนวนคน (ไม่ซ้ำเบอร์)', fmt(st.people), st.n ? (st.n / Math.max(st.people, 1)).toFixed(2) + ' ครั้ง/คน' : '-'],
    [C.green, 'ผ่านเกณฑ์ ≥ ' + S.passScore + ' คะแนน', fmt(st.passed), st.n ? pct(st.passed / st.n) + ' ของผู้เล่น' : '-'],
    [C.amber, 'ตุ๊กตาที่แจก', fmt(st.prizes), S.dailyLimit ? `จำกัด ${S.dailyLimit} ตัว/วัน` : 'ไม่จำกัดจำนวน'],
    [C.teal, 'รับตุ๊กตาแล้ว', fmt(st.received), 'รอรับ ' + Math.max(st.prizes - st.received, 0)],
    [C.violet, 'คะแนนเฉลี่ย', st.avg.toFixed(2), 'จาก ' + S.questions.length + ' คะแนน'],
    [C.rose, 'เวลาเฉลี่ยที่ใช้', fmtSec(st.secs), 'ต่อการเล่น 1 ครั้ง'],
    [C.slate, 'ช่วงเวลาที่คนมากที่สุด', st.peak !== null ? `${hl(st.peak)}–${hl(st.peak + 1)}` : '-', st.peakN ? st.peakN + ' ครั้ง' : ''],
  ];
}
const kpiHtml = (list) => list.map(([c, l, v, s]) => `<div class="kpi" style="--c:${c}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('');

// ===================================================== กราฟ (แบบเส้นโค้ง)
function area(color, alpha = 0.14) {
  return (ctx) => {
    const { chart: c } = ctx; if (!c.chartArea) return hexA(color, alpha);
    const g = c.ctx.createLinearGradient(0, c.chartArea.top, 0, c.chartArea.bottom);
    g.addColorStop(0, hexA(color, alpha * 1.8)); g.addColorStop(1, hexA(color, 0)); return g;
  };
}
function curve(label, data, color, extra = {}) {
  return { label, data, borderColor: color, backgroundColor: area(color), pointBackgroundColor: '#fff', pointBorderColor: color,
    pointBorderWidth: 2, pointRadius: 3.5, pointHoverRadius: 6, borderWidth: 2.5, tension: 0.4, cubicInterpolationMode: 'monotone', fill: true, ...extra };
}
function lineOpts(legend = true, xTitle, yTitle) {
  return { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: legend, position: 'top', align: 'end' } },
    scales: { x: { grid: { display: false }, title: { display: !!xTitle, text: xTitle } },
              y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef0f3' }, border: { display: false }, title: { display: !!yTitle, text: yTitle } } } };
}

function cfgHour(st) {
  // หลายวัน: 1 เส้นต่อวัน / เลือกวันเดียว: เส้นเดียว + จุดสูงสุด
  const many = !st.D && st.dates.length > 1;
  const datasets = many
    ? st.dates.map((d, i) => curve(thDate(d), st.hours.map((h) => st.cell[d + '|' + h] || 0), SERIES[i % SERIES.length], { fill: false, pointRadius: 3 }))
    : [curve('จำนวนครั้งที่เล่น', st.byH, C.navy, {
        pointRadius: st.hours.map((h) => (h === st.peak ? 7 : 3.5)),
        pointBackgroundColor: st.hours.map((h) => (h === st.peak ? C.amber : '#fff')),
        pointBorderColor: st.hours.map((h) => (h === st.peak ? C.amber : C.navy)) })];
  if (many) datasets.push(curve('รวมทุกวัน', st.byH, C.slate, { borderDash: [6, 5], fill: false, pointRadius: 0, borderWidth: 2 }));
  return { type: 'line', data: { labels: st.hours.map((h) => hl(h) + ' น.'), datasets }, options: lineOpts(true, '', 'จำนวนครั้ง') };
}
function cfgDay(st) {
  const P = st.perDayAll, labels = P.map((x) => thDate(x.d));
  if (P.length < 2) { // มีวันเดียว: ใช้แท่งแทนเส้น
    return { type: 'bar', data: { labels, datasets: [
      { label: 'จำนวนครั้งที่เล่น', data: P.map((x) => x.n), backgroundColor: hexA(C.navy, 0.85), borderRadius: 6, maxBarThickness: 60 },
      { label: 'จำนวนคน', data: P.map((x) => x.p), backgroundColor: hexA(C.teal, 0.85), borderRadius: 6, maxBarThickness: 60 },
      { label: 'ได้ตุ๊กตา', data: P.map((x) => x.w), backgroundColor: hexA(C.amber, 0.85), borderRadius: 6, maxBarThickness: 60 }] }, options: lineOpts(true) };
  }
  return { type: 'line', data: { labels, datasets: [
    curve('จำนวนครั้งที่เล่น', P.map((x) => x.n), C.navy),
    curve('จำนวนคน', P.map((x) => x.p), C.teal, { fill: false }),
    curve('ได้ตุ๊กตา', P.map((x) => x.w), C.amber, { fill: false })] }, options: lineOpts(true) };
}
function cfgScore(st) {
  const pass = S.passScore;
  return { type: 'line', data: { labels: st.scores.map((_, i) => String(i)), datasets: [curve('จำนวนคน', st.scores, C.teal, {
      pointBackgroundColor: st.scores.map((_, i) => (i >= pass ? C.green : '#fff')), pointBorderColor: st.scores.map((_, i) => (i >= pass ? C.green : C.teal)) })] },
    options: { ...lineOpts(false, 'คะแนน', 'จำนวนคน'), plugins: { legend: { display: false },
      tooltip: { callbacks: { title: (c) => c[0].label + ' คะแนน' + (+c[0].label >= pass ? ' (ผ่านเกณฑ์)' : '') } } } } };
}
function cfgGroup(st) {
  return { type: 'doughnut', data: { labels: Object.keys(st.groups), datasets: [{ data: Object.values(st.groups), backgroundColor: GROUP_COLORS, borderColor: '#fff', borderWidth: 2 }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right' },
      tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} (${pct(c.raw / Math.max(st.n, 1))})` } } } } };
}
function cfgQ(st) {
  return { type: 'bar', data: { labels: st.qs.map((x) => 'ข้อ ' + (x.i + 1)), datasets: [{ label: '% ตอบถูก', data: st.qs.map((x) => +(x.rate * 100).toFixed(1)), borderRadius: 4, barThickness: 14,
      backgroundColor: st.qs.map((x) => (x.rate >= 0.8 ? hexA(C.green, 0.85) : x.rate >= 0.6 ? hexA(C.amber, 0.85) : hexA(C.rose, 0.85))) }] },
    options: { maintainAspectRatio: false, indexAxis: 'y',
      scales: { x: { min: 0, max: 100, ticks: { callback: (v) => v + '%' }, grid: { color: '#eef0f3' }, border: { display: false } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => wrap(st.qs[c[0].dataIndex].q.question), label: (c) => ` ตอบถูก ${c.raw}%` } } } } };
}

// ===================================================== ตาราง (ใช้ร่วมกัน)
function hardHtml(st) {
  if (!st.hard.length) return '<p class="empty">ยังไม่มีข้อมูล</p>';
  return '<div class="hard">' + st.hard.map((x) => `<article>
    <div><span class="no">ข้อ ${x.i + 1}</span><span class="rate">${pct(x.rate)}</span> <small>ตอบถูก</small></div>
    <p>${esc(x.q.question)}</p>
    <p class="rightpick">เฉลย: ${LETTERS[x.q.answer - 1]}. ${esc(x.q.choices[x.q.answer - 1])}</p>
    <p class="wrongpick">ตอบผิดบ่อยที่สุด: ${LETTERS[x.wrong - 1]}. ${esc(x.q.choices[x.wrong - 1])} (${x.cnt[x.wrong]} คน)</p></article>`).join('') + '</div>';
}
function heatHtml(st) {
  if (!S.records.length) return '<p class="empty">ยังไม่มีข้อมูล</p>';
  let mx = 0; st.showDates.forEach((d) => st.hours.forEach((h) => (mx = Math.max(mx, st.cell[d + '|' + h] || 0))));
  let t = '<table><tr><th class="l">วันที่</th>' + st.hours.map((h) => `<th>${hl(h)}</th>`).join('') + '<th>รวม</th></tr>';
  st.showDates.forEach((d) => {
    let tot = 0;
    t += `<tr><td class="l">${thDate(d)}</td>` + st.hours.map((h) => { const v = st.cell[d + '|' + h] || 0; tot += v; return `<td style="${heat(v / (mx || 1))}">${v || ''}</td>`; }).join('') + `<td><b>${tot}</b></td></tr>`;
  });
  return t + '</table>';
}
function dailyHtml(st) {
  const rows = st.perDay;
  if (!rows.length) return '<p class="empty">ยังไม่มีข้อมูล</p>';
  const T = rows.reduce((a, x) => [a[0] + x.n, a[1] + x.pass, a[2] + x.w, a[3] + x.rec], [0, 0, 0, 0]);
  return `<table><tr><th class="l">วันที่</th><th>เล่น (ครั้ง)</th><th>จำนวนคน</th><th>ผ่านเกณฑ์</th><th>% ผ่าน</th><th>แจกตุ๊กตา</th><th>รับแล้ว</th></tr>` +
    rows.map((x) => `<tr><td class="l">${thDate(x.d)}</td><td>${x.n}</td><td>${x.p}</td><td>${x.pass}</td><td>${pct(x.pass / Math.max(x.n, 1))}</td><td>${x.w}</td><td>${x.rec}</td></tr>`).join('') +
    (rows.length > 1 ? `<tr class="tot"><td class="l">รวม</td><td>${T[0]}</td><td>${st.people}</td><td>${T[1]}</td><td>${pct(T[1] / Math.max(T[0], 1))}</td><td>${T[2]}</td><td>${T[3]}</td></tr>` : '') + '</table>';
}
function winnersHtml(W, mask, start = 0) {
  return `<table><tr><th>#</th><th class="l">วันที่ / เวลา</th><th class="l">ชื่อ-สกุล</th><th>เบอร์โทร</th><th class="l">กลุ่ม</th><th>คะแนน</th><th>รหัสรางวัล</th><th>สถานะ</th></tr>` +
    W.map((w, i) => `<tr><td>${start + i + 1}</td><td class="l">${thDate(w.date)} ${esc(w.time).slice(0, 5)}</td><td class="l">${esc(w.name)}</td>
      <td>${phone(w.phone, mask)}</td><td class="l">${esc(w.group)}</td><td>${w.score}</td><td><b>${esc(w.code)}</b></td>
      <td>${w.received ? '<span class="pill ok">รับแล้ว</span>' : '<span class="pill wait">รอรับ</span>'}</td></tr>`).join('') + '</table>';
}

// ===================================================== แสดงผลบนหน้าจอ
function render() {
  const st = compute($('#fDate').value);
  $('#kpis').innerHTML = kpiHtml(kpiList(st));
  $('#peak').innerHTML = st.peak !== null ? `ช่วงที่คนมามากที่สุด <b>${hl(st.peak)}–${hl(st.peak + 1)} น.</b> (${st.peakN} ครั้ง)` : '';
  draw('cHour', cfgHour(st)); draw('cDay', cfgDay(st)); draw('cScore', cfgScore(st)); draw('cGroup', cfgGroup(st)); draw('cQ', cfgQ(st));
  $('#hard').innerHTML = hardHtml(st);
  $('#heat').innerHTML = heatHtml(st);
  $('#daily').innerHTML = dailyHtml(st);
  renderWinners();
}
function renderWinners() {
  if (!S) return;
  const q = $('#wSearch').value.trim().toLowerCase();
  const W = compute($('#fDate').value).winners.filter((w) => !q || [w.name, w.phone, w.code].join(' ').toLowerCase().includes(q));
  $('#winCount').textContent = W.length + ' คน';
  $('#winners').innerHTML = W.length ? winnersHtml(W, $('#mask').checked) : '<p class="empty">ยังไม่มีผู้ได้รับรางวัล</p>';
}
function draw(id, cfg) {
  if (!window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), cfg);
}

// ===================================================== Export PDF
// สร้างรายงานแยก (กว้าง 760px) → จับภาพทีละส่วน → วางลง A4 เอง เพื่อไม่ให้ส่วนใดถูกตัดครึ่งหน้า
async function exportPdf() {
  if (!S || exporting) return;
  if (!window.html2canvas || !window.jspdf) { alert('โหลดไลบรารีสร้าง PDF ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'); return; }
  exporting = true; $('#busy').hidden = false; $('#busyText').textContent = 'กำลังสร้าง PDF…';
  const root = $('#pdfRoot'), made = [];
  const scrollY = window.scrollY; window.scrollTo(0, 0);
  try {
    const st = compute($('#fDate').value);
    const range = st.D ? 'วันที่ ' + thDate(st.D) : 'รวมทุกวัน' + (st.dates.length ? ` (${thDate(st.dates[0])} – ${thDate(st.dates[st.dates.length - 1])})` : '');
    const meta = `ข้อมูล: ${range} · ข้อมูล ณ ${thStamp(S.updated)}`;
    const chartBox = (id, h, title, note = '') => `<div class="panel"><h2>${title}</h2>${note ? `<p>${note}</p>` : ''}<canvas id="${id}" width="${id === 'pHour' ? 734 : 346}" height="${h}"></canvas></div>`;

    let html = `
      <div data-block="first" class="rp-head">
        <img src="assets/img/foundation-logo.png" alt="">
        <div><h1>รายงานสรุปผลกิจกรรมตอบคำถามชิงตุ๊กตา DLTV</h1>
          <p>มูลนิธิการศึกษาทางไกลผ่านดาวเทียม ในพระบรมราชูปถัมภ์</p><p class="meta">${meta}</p></div>
        <img class="dl" src="assets/img/dltv-logo.png" alt="">
      </div>
      <div data-block="run" class="rp-run"><b>รายงานสรุปผลกิจกรรมตอบคำถามชิงตุ๊กตา DLTV</b><span>${meta}</span></div>
      <div data-block><h2>ภาพรวม</h2><div class="k4">${kpiHtml(kpiList(st))}</div></div>
      <div data-block>${chartBox('pHour', 230, 'จำนวนผู้เข้าร่วมตามช่วงเวลา', st.peak !== null ? `ช่วงที่คนมามากที่สุด ${hl(st.peak)}–${hl(st.peak + 1)} น. (${st.peakN} ครั้ง)` : '')}</div>
      <div data-block class="two">${chartBox('pDay', 200, 'จำนวนผู้เข้าร่วมรายวัน')}${chartBox('pScore', 200, 'การกระจายคะแนน')}</div>
      <div data-block class="two">${chartBox('pGroup', 200, 'กลุ่มผู้เข้าร่วม')}${chartBox('pQ', 200, 'อัตราตอบถูกรายข้อ')}</div>
      <div data-block><h2>สรุปรายวัน</h2>${dailyHtml(st)}</div>
      <div data-block><h2>ความหนาแน่น วันที่ × ช่วงเวลา (จำนวนครั้งที่เล่น)</h2>${heatHtml(st)}</div>
      <div data-block><h2>ข้อที่ตอบผิดมากที่สุด</h2>${hardHtml(st)}</div>`;
    if ($('#incWin').checked && st.winners.length) {
      const per = 30; // แบ่งตารางเป็นช่วง ๆ ให้ขึ้นหน้าใหม่ได้สวย
      for (let i = 0; i < st.winners.length; i += per) {
        html += `<div data-block><h2>รายชื่อผู้ได้รับรางวัล${i ? ' (ต่อ)' : ` (${st.winners.length} คน)`}</h2>${winnersHtml(st.winners.slice(i, i + per), $('#mask').checked, i)}</div>`;
      }
    }
    root.innerHTML = html;

    // กราฟในรายงาน: ขนาดคงที่ ไม่มีแอนิเมชัน ความละเอียด 2x
    const fixed = (cfg) => { cfg.options = { ...cfg.options, responsive: false, animation: false, devicePixelRatio: 2, maintainAspectRatio: false }; return cfg; };
    [['pHour', cfgHour], ['pDay', cfgDay], ['pScore', cfgScore], ['pGroup', cfgGroup], ['pQ', cfgQ]].forEach(([id, fn]) => made.push(new Chart(document.getElementById(id), fixed(fn(st)))));

    await Promise.all([...root.querySelectorAll('img')].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    if (document.fonts) await document.fonts.ready;
    await sleep(150);

    // จับภาพทีละส่วน
    const shot = (el) => html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, scrollX: 0, scrollY: 0, windowWidth: 1200 });
    const blocks = [...root.querySelectorAll('[data-block]')];
    const imgs = [];
    for (let i = 0; i < blocks.length; i++) {
      $('#busyText').textContent = `กำลังสร้าง PDF… ${Math.round(((i + 1) / blocks.length) * 100)}%`;
      imgs.push({ kind: blocks[i].dataset.block, canvas: await shot(blocks[i]) });
    }

    // จัดหน้า A4
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const M = 12, W = 210 - M * 2, top = M, bottom = 297 - 14;
    const mm = (cv) => (cv.height / cv.width) * W;
    const put = (cv, y) => { pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', M, y, W, mm(cv)); return y + mm(cv); };
    const run = imgs.find((x) => x.kind === 'run').canvas;
    let y = top;
    imgs.filter((x) => x.kind !== 'run').forEach((x, i) => {
      const h = mm(x.canvas);
      if (i > 0 && y + h > bottom) { pdf.addPage(); y = put(run, top) + 1; }
      y = put(x.canvas, y);
    });
    const pages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      pdf.setPage(p); pdf.setDrawColor(229, 231, 235); pdf.line(M, 297 - 10, 210 - M, 297 - 10);
      pdf.setFontSize(8.5); pdf.setTextColor(120);
      pdf.text('DLTV Quiz Report', M, 297 - 6);
      pdf.text(`${p} / ${pages}`, 210 - M, 297 - 6, { align: 'right' });
    }
    pdf.save(`DLTV-Quiz-สรุปผล-${st.D || 'ทุกวัน'}.pdf`);
  } catch (e) {
    console.error(e); alert('สร้าง PDF ไม่สำเร็จ: ' + e.message);
  } finally {
    made.forEach((c) => c.destroy()); root.innerHTML = '';
    window.scrollTo(0, scrollY); $('#busy').hidden = true; exporting = false;
  }
}

// ===================================================== helpers
function heat(f) {
  if (!f) return '';
  const c = mix([238, 241, 250], [43, 57, 144], Math.min(f, 1)); // ฟ้าอ่อน -> น้ำเงิน
  return `background:rgb(${c});color:${f > 0.5 ? '#fff' : '#1f2937'}`;
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(','); }
function sum(a, i) { return a.reduce((s, r) => s + (Number(r[i]) || 0), 0); }
function pct(x) { return (x * 100).toFixed(1) + '%'; }
function fmt(n) { return Number(n).toLocaleString('th-TH'); }
function hl(h) { return ('0' + h).slice(-2) + ':00'; }
function fmtSec(s) { s = Math.round(s); return s >= 60 ? `${Math.floor(s / 60)} นาที ${s % 60} วิ` : s + ' วินาที'; }
function thDate(d) { const p = String(d).split('-'); return p.length === 3 ? `${+p[2]} ${TH_MONTH[+p[1] - 1]} ${+p[0] + 543}` : d; }
function thStamp(s) { // "04/11/2026 12:29" -> "4 พ.ย. 2569 12:29 น."
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})/);
  return m ? `${+m[1]} ${TH_MONTH[+m[2] - 1]} ${+m[3] + (+m[3] < 2400 ? 543 : 0)} ${m[4]} น.` : s;
}
function phone(p, mask) { return mask ? p.replace(/^(\d{3})\d{3}(\d{4})$/, '$1-xxx-$2') : p.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3'); }
function wrap(s) { return String(s).match(/.{1,48}/g) || [s]; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
