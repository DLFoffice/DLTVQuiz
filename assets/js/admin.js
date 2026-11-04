// ระบบหลังบ้าน: ดึงสถิติจาก GAS แล้วแสดงกราฟ + Export PDF
import { getStats } from './api.js';

const $ = (s) => document.querySelector(s);
const COLORS = ['#8b5cf6', '#ff4fa3', '#06b6d4', '#ff8a00', '#22c55e', '#3b82f6', '#ffc21a'];
const LETTERS = ['ก', 'ข', 'ค', 'ง'];
let KEY = sessionStorage.getItem('dltvKey') || '';
let S = null;
const charts = {};
let timer = null;

if (window.Chart) {
  Chart.defaults.font.family = 'Sarabun, sans-serif';
  Chart.defaults.font.size = 13;
  Chart.defaults.color = '#4b5380';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
}

// ===================================================== login
$('#fLogin').addEventListener('submit', (e) => { e.preventDefault(); KEY = $('#iKey').value.trim(); load(true); });
$('#bLogout').onclick = () => { sessionStorage.removeItem('dltvKey'); location.reload(); };
$('#bRefresh').onclick = () => load();
$('#fDate').onchange = render;
$('#wSearch').oninput = renderWinners;
$('#mask').onchange = renderWinners;
$('#bPdf').onclick = exportPdf;
$('#bPrint').onclick = printReport;
if (KEY) load(true);

async function load(first) {
  if (first) { $('#bLogin').disabled = true; $('#loginErr').textContent = ''; }
  try {
    S = await getStats(KEY);
    sessionStorage.setItem('dltvKey', KEY);
    $('#login').hidden = true; $('#app').hidden = false;
    fillDates(); render();
    clearInterval(timer); timer = setInterval(() => { if (!document.body.classList.contains('pdf')) load(); }, 60000);
  } catch (e) {
    if (first || !S) { $('#login').hidden = false; $('#app').hidden = true; $('#loginErr').textContent = e.message; sessionStorage.removeItem('dltvKey'); }
  } finally { $('#bLogin').disabled = false; }
}

function fillDates() {
  const sel = $('#fDate'), cur = sel.value;
  const dates = [...new Set(S.records.map((r) => r[0]))].sort();
  sel.innerHTML = '<option value="">ทุกวัน (' + dates.length + ' วัน)</option>' + dates.map((d) => `<option value="${d}">${thDate(d)}</option>`).join('');
  sel.value = dates.includes(cur) ? cur : '';
  $('#upd').textContent = 'อัปเดตล่าสุด ' + S.updated + ' · รีเฟรชอัตโนมัติทุก 1 นาที';
}

// ===================================================== render
// record = [date, hour, group, score, passed, prize, phone, mask, seconds, received]
function filtered() { const d = $('#fDate').value; return S.records.filter((r) => !d || r[0] === d); }

function render() {
  const D = $('#fDate').value, R = filtered();
  const n = R.length, people = new Set(R.map((r) => r[6])).size;
  const passed = sum(R, 4), prizes = sum(R, 5), received = sum(R, 9);
  const avg = n ? sum(R, 3) / n : 0, secs = n ? sum(R, 8) / n : 0;

  $('#kpis').innerHTML = [
    ['k1', 'จำนวนครั้งที่เล่น', n.toLocaleString(), D ? thDate(D) : 'รวมทุกวัน'],
    ['k2', 'จำนวนคน (ไม่ซ้ำเบอร์)', people.toLocaleString(), n ? (n / Math.max(people, 1)).toFixed(2) + ' ครั้ง/คน' : '-'],
    ['k3', 'ผ่านเกณฑ์ ≥ ' + S.passScore, passed.toLocaleString(), n ? pct(passed / n) + ' ของผู้เล่น' : '-'],
    ['k4', 'ตุ๊กตาที่แจก', prizes.toLocaleString(), S.dailyLimit ? 'จำกัด ' + S.dailyLimit + ' ตัว/วัน' : 'ไม่จำกัดจำนวน'],
    ['k5', 'รับตุ๊กตาแล้ว', received.toLocaleString(), 'รอรับ ' + Math.max(prizes - received, 0)],
    ['k6', 'คะแนนเฉลี่ย', avg.toFixed(2), 'จาก ' + S.questions.length + ' คะแนน'],
    ['k7', 'เวลาเฉลี่ยที่ใช้', fmtSec(secs), 'ต่อการเล่น 1 ครั้ง'],
  ].map(([c, l, v, s]) => `<div class="kpi ${c}"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('');

  // --- รายวัน ---
  const dates = [...new Set(S.records.map((r) => r[0]))].sort();
  const per = dates.map((d) => { const x = S.records.filter((r) => r[0] === d); return { d, n: x.length, p: new Set(x.map((r) => r[6])).size, w: sum(x, 5), pass: sum(x, 4), rec: sum(x, 9) }; });
  chart('cDay', {
    type: 'bar',
    data: { labels: per.map((x) => thDate(x.d)), datasets: [
      { label: 'จำนวนครั้งที่เล่น', data: per.map((x) => x.n), backgroundColor: grad('#8b5cf6', '#6366f1'), borderRadius: 8, order: 2 },
      { label: 'ได้ตุ๊กตา', data: per.map((x) => x.w), backgroundColor: grad('#ff4fa3', '#ff8a00'), borderRadius: 8, order: 2 },
      { label: 'จำนวนคน', data: per.map((x) => x.p), type: 'line', borderColor: '#06b6d4', backgroundColor: '#06b6d4', tension: 0.35, pointRadius: 5, borderWidth: 3, order: 1 },
    ] },
    options: baseOpts(),
  });

  // --- รายชั่วโมง ---
  const byH = {}; R.forEach((r) => (byH[r[1]] = (byH[r[1]] || 0) + 1));
  const hs = Object.keys(byH).map(Number);
  const h0 = hs.length ? Math.min(...hs) : 8, h1 = hs.length ? Math.max(...hs) : 17;
  const hours = []; for (let h = h0; h <= h1; h++) hours.push(h);
  const peak = hs.sort((a, b) => byH[b] - byH[a])[0];
  $('#peak').innerHTML = peak !== undefined ? `ช่วงที่คนมามากที่สุด <b>${hl(peak)}–${hl(peak + 1)} น.</b> (${byH[peak]} ครั้ง)` : 'ยังไม่มีข้อมูล';
  chart('cHour', {
    type: 'bar',
    data: { labels: hours.map(hl), datasets: [{ label: 'จำนวนครั้ง', data: hours.map((h) => byH[h] || 0),
      backgroundColor: hours.map((h) => (h === peak ? '#ff8a00' : '#8b5cf6')), borderRadius: 8 }] },
    options: baseOpts(false),
  });

  // --- กลุ่ม ---
  const g = {}; R.forEach((r) => (g[r[2]] = (g[r[2]] || 0) + 1));
  chart('cGroup', {
    type: 'doughnut',
    data: { labels: Object.keys(g), datasets: [{ data: Object.values(g), backgroundColor: COLORS, borderColor: '#fff', borderWidth: 3, hoverOffset: 10 }] },
    options: { maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right' },
      tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} (${pct(c.raw / Math.max(n, 1))})` } } } },
  });

  // --- คะแนน ---
  const sc = []; for (let i = 0; i <= S.questions.length; i++) sc.push(R.filter((r) => r[3] === i).length);
  chart('cScore', {
    type: 'bar',
    data: { labels: sc.map((_, i) => String(i)), datasets: [{ label: 'จำนวนคน', data: sc, borderRadius: 6,
      backgroundColor: sc.map((_, i) => (i >= S.passScore ? '#22c55e' : i >= S.passScore - 2 ? '#ffc21a' : '#c4b5fd')) }] },
    options: baseOpts(false, 'คะแนน'),
  });

  // --- รายข้อ ---
  const qs = S.questions.map((q, i) => {
    const cnt = [0, 0, 0, 0, 0]; R.forEach((r) => cnt[Number(r[7][i]) || 0]++);
    const answered = n - cnt[0];
    return { q, i, cnt, rate: answered ? cnt[q.answer] / answered : 0, answered };
  });
  chart('cQ', {
    type: 'bar',
    data: { labels: qs.map((x) => 'ข้อ ' + (x.i + 1)), datasets: [{ label: '% ตอบถูก', data: qs.map((x) => +(x.rate * 100).toFixed(1)), borderRadius: 6,
      backgroundColor: qs.map((x) => (x.rate >= 0.8 ? '#22c55e' : x.rate >= 0.6 ? '#ffc21a' : '#ff4fa3')) }] },
    options: { ...baseOpts(false), indexAxis: 'y',
      scales: { x: { min: 0, max: 100, ticks: { callback: (v) => v + '%' }, grid: { color: '#eef0f7' } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => wrap(qs[c[0].dataIndex].q.question), label: (c) => ` ตอบถูก ${c.raw}%` } } } },
  });
  const hard = [...qs].filter((x) => x.answered).sort((a, b) => a.rate - b.rate).slice(0, 3);
  $('#hard').innerHTML = hard.length ? '<div class="hard">' + hard.map((x) => {
    const wrongIdx = [1, 2, 3, 4].filter((k) => k !== x.q.answer).sort((a, b) => x.cnt[b] - x.cnt[a])[0];
    return `<article><div><span class="no">ข้อ ${x.i + 1}</span><span class="rate">${pct(x.rate)}</span> <small>ตอบถูก</small></div>
      <p>${esc(x.q.question)}</p>
      <p class="rightpick">✔ เฉลย: ${LETTERS[x.q.answer - 1]}. ${esc(x.q.choices[x.q.answer - 1])}</p>
      <p class="wrongpick">✘ ตอบผิดบ่อยสุด: ${LETTERS[wrongIdx - 1]}. ${esc(x.q.choices[wrongIdx - 1])} (${x.cnt[wrongIdx]} คน)</p></article>`;
  }).join('') + '</div>' : '<p class="empty">ยังไม่มีข้อมูล</p>';

  // --- heatmap วันที่ × ชั่วโมง ---
  const showDates = D ? [D] : dates;
  const allH = S.records.map((r) => r[1]);
  if (allH.length) {
    const a = Math.min(...allH), b = Math.max(...allH); let mx = 0; const cell = {};
    S.records.forEach((r) => { const k = r[0] + '|' + r[1]; cell[k] = (cell[k] || 0) + 1; mx = Math.max(mx, cell[k]); });
    let t = '<table><tr><th class="l">วันที่</th>'; for (let h = a; h <= b; h++) t += `<th>${hl(h)}</th>`; t += '<th>รวม</th></tr>';
    showDates.forEach((d) => {
      let tot = 0; t += `<tr><td class="l">${thDate(d)}</td>`;
      for (let h = a; h <= b; h++) { const v = cell[d + '|' + h] || 0; tot += v; t += `<td style="${heat(v / mx)}">${v || ''}</td>`; }
      t += `<th>${tot}</th></tr>`;
    });
    $('#heat').innerHTML = t + '</table>';
  } else $('#heat').innerHTML = '<p class="empty">ยังไม่มีข้อมูล</p>';

  // --- ตารางรายวัน ---
  const rows = per.filter((x) => !D || x.d === D);
  const T = rows.reduce((a, x) => [a[0] + x.n, a[1] + x.p, a[2] + x.pass, a[3] + x.w, a[4] + x.rec], [0, 0, 0, 0, 0]);
  $('#daily').innerHTML = rows.length ? `<table><tr><th class="l">วันที่</th><th>เล่น (ครั้ง)</th><th>จำนวนคน</th><th>ผ่านเกณฑ์</th><th>% ผ่าน</th><th>แจกตุ๊กตา</th><th>รับแล้ว</th></tr>` +
    rows.map((x) => `<tr><td class="l">${thDate(x.d)}</td><td>${x.n}</td><td>${x.p}</td><td>${x.pass}</td><td>${pct(x.pass / Math.max(x.n, 1))}</td><td>${x.w}</td><td>${x.rec}</td></tr>`).join('') +
    (rows.length > 1 ? `<tr class="tot"><td class="l">รวม</td><td>${T[0]}</td><td>-</td><td>${T[2]}</td><td>${pct(T[2] / Math.max(T[0], 1))}</td><td>${T[3]}</td><td>${T[4]}</td></tr>` : '') + '</table>'
    : '<p class="empty">ยังไม่มีข้อมูล</p>';

  renderWinners();
  $('#rpMeta').textContent = 'ข้อมูล: ' + (D ? 'วันที่ ' + thDate(D) : 'รวมทุกวัน' + (dates.length ? ` (${thDate(dates[0])} – ${thDate(dates[dates.length - 1])})` : '')) + ' · ข้อมูล ณ ' + S.updated;
}

function renderWinners() {
  if (!S) return;
  const D = $('#fDate').value, q = $('#wSearch').value.trim().toLowerCase(), mask = $('#mask').checked;
  const W = S.winners.filter((w) => (!D || w.date === D) && (!q || [w.name, w.phone, w.code].join(' ').toLowerCase().includes(q)));
  $('#winCount').textContent = W.length;
  $('#winners').innerHTML = W.length ? `<table><tr><th>#</th><th class="l">วันที่ / เวลา</th><th class="l">ชื่อ-สกุล</th><th>เบอร์โทร</th><th class="l">กลุ่ม</th><th>คะแนน</th><th>รหัสรางวัล</th><th>สถานะ</th></tr>` +
    W.map((w, i) => `<tr><td>${i + 1}</td><td class="l">${thDate(w.date)} ${esc(w.time).slice(0, 5)}</td><td class="l">${esc(w.name)}</td>
      <td>${mask ? w.phone.replace(/^(\d{3})\d{3}(\d{4})$/, '$1-xxx-$2') : w.phone.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')}</td>
      <td class="l">${esc(w.group)}</td><td>${w.score}</td><td><b>${esc(w.code)}</b></td>
      <td>${w.received ? '<span class="pill ok">รับแล้ว</span>' : '<span class="pill wait">รอรับ</span>'}</td></tr>`).join('') + '</table>'
    : '<p class="empty">ยังไม่มีผู้ได้รับรางวัล</p>';
}

// ===================================================== Export PDF
async function exportPdf() {
  const D = $('#fDate').value;
  const file = 'DLTV-Quiz-สรุปผล-' + (D || 'ทุกวัน') + '.pdf';
  $('#busy').hidden = false;
  document.body.classList.add('pdf');
  document.body.classList.toggle('no-win', !$('#incWin').checked);
  $('#rpFoot').textContent = 'สร้างรายงานเมื่อ ' + new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  Object.values(charts).forEach((c) => { c.options.animation = false; c.resize(); });
  await new Promise((r) => setTimeout(r, 400));
  try {
    if (!window.html2pdf) throw new Error('nolib');
    await html2pdf().set({
      margin: [8, 8, 12, 8], filename: file,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1140 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.box', '.kpi', 'tr', '.hard article'] },
    }).from($('#report')).toPdf().get('pdf').then((pdf) => {
      const n = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFontSize(9); pdf.setTextColor(140); pdf.text(`DLTV Quiz Report  |  ${i} / ${n}`, 202, 291, { align: 'right' }); }
    }).save();
  } catch (e) {
    window.print(); // สำรอง: ใช้ "บันทึกเป็น PDF" จากหน้าต่างพิมพ์
  } finally {
    document.body.classList.remove('pdf', 'no-win');
    Object.values(charts).forEach((c) => { c.options.animation = {}; c.resize(); });
    $('#busy').hidden = true;
  }
}

// พิมพ์ / บันทึกเป็น PDF ผ่านหน้าต่างพิมพ์ของเบราว์เซอร์ (ตัวอักษรไทยคมชัดที่สุด)
function printReport() {
  document.body.classList.add('pdf');
  document.body.classList.toggle('no-win', !$('#incWin').checked);
  $('#rpFoot').textContent = 'พิมพ์เมื่อ ' + new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  Object.values(charts).forEach((c) => c.resize());
  setTimeout(() => {
    window.print();
    document.body.classList.remove('pdf', 'no-win');
    Object.values(charts).forEach((c) => c.resize());
  }, 350);
}

// ===================================================== helpers
function chart(id, cfg) {
  if (!window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), cfg);
}
function baseOpts(legend = true, xTitle) {
  return { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: legend, position: 'top' } },
    scales: { x: { grid: { display: false }, title: { display: !!xTitle, text: xTitle } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef0f7' } } } };
}
function grad(a, b) {
  return (ctx) => {
    const { chart: c } = ctx; if (!c.chartArea) return a;
    const g = c.ctx.createLinearGradient(0, c.chartArea.bottom, 0, c.chartArea.top); g.addColorStop(0, b); g.addColorStop(1, a); return g;
  };
}
function heat(f) {
  if (!f) return '';
  // ม่วงอ่อน -> ชมพู -> ส้ม
  const c = f < 0.5 ? mix([237, 233, 254], [255, 79, 163], f * 2) : mix([255, 79, 163], [255, 138, 0], (f - 0.5) * 2);
  return `background:rgb(${c});color:${f > 0.35 ? '#fff' : '#1d2433'};font-weight:${f > 0.6 ? 700 : 400}`;
}
function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(','); }
function sum(a, i) { return a.reduce((s, r) => s + (Number(r[i]) || 0), 0); }
function pct(x) { return (x * 100).toFixed(1) + '%'; }
function hl(h) { return ('0' + h).slice(-2) + ':00'; }
function fmtSec(s) { s = Math.round(s); return s >= 60 ? Math.floor(s / 60) + ' นาที ' + (s % 60) + ' วิ' : s + ' วินาที'; }
function thDate(d) { const p = String(d).split('-'); return p.length === 3 ? `${+p[2]} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][+p[1] - 1]} ${+p[0] + 543}` : d; }
function wrap(s) { return String(s).match(/.{1,48}/g) || [s]; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
