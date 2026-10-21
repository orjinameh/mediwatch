// NEWS2 aggregate score (scale 1 SpO2). Parameters that are missing from a reading are skipped
// instead of being scored, so a partial sensor reading never produces a false score.
const num = (x) => typeof x === 'number' && Number.isFinite(x);

function calcNEWS2(v = {}) {
  let s = 0;
  let maxSingle = 0;
  const abnormal = [];
  const add = (pts) => { s += pts; if (pts > maxSingle) maxSingle = pts; };

  const rr = v.respRate;
  if (num(rr)) {
    if (rr <= 8) add(3); else if (rr <= 11) add(1); else if (rr <= 20) add(0); else if (rr <= 24) add(2); else add(3);
    if (rr < 12 || rr > 20) abnormal.push(`Resp Rate: ${rr}/min`);
  }
  const o = v.spo2;
  if (num(o)) {
    if (o <= 91) add(3); else if (o <= 93) add(2); else if (o <= 95) add(1); else add(0);
    if (o < 96) abnormal.push(`SpO2: ${o}%`);
  }
  const b = v.systolic;
  if (num(b)) {
    if (b <= 90) add(3); else if (b <= 100) add(2); else if (b <= 110) add(1); else if (b <= 219) add(0); else add(3);
    if (b < 111 || b > 219) abnormal.push(`BP: ${b}/${num(v.diastolic) ? v.diastolic : '?'}mmHg`);
  }
  const h = v.heartRate;
  if (num(h)) {
    if (h <= 40) add(3); else if (h <= 50) add(1); else if (h <= 90) add(0); else if (h <= 110) add(1); else if (h <= 130) add(2); else add(3);
    if (h < 51 || h > 90) abnormal.push(`HR: ${h}bpm`);
  }
  const t = v.temperature;
  if (num(t)) {
    if (t <= 35.0) add(3); else if (t <= 36.0) add(1); else if (t <= 38.0) add(0); else if (t <= 39.0) add(1); else add(2);
    if (t < 36.1 || t > 38.0) abnormal.push(`Temp: ${t}°C`);
  }

  // Any single parameter scoring 3 ("red score") needs urgent review even if the total is low
  const red = maxSingle === 3;
  let level = s >= 7 ? 'CRITICAL' : s >= 5 ? 'HIGH' : s >= 3 ? 'MEDIUM' : 'LOW';
  if (red && level === 'LOW') level = 'MEDIUM';
  return { total: s, level, abnormal, red };
}

module.exports = { calcNEWS2 };
