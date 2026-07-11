function calcNEWS2(v) {
  let s = 0;
  const rr = v.respRate;
  if (rr <= 8) s += 3; else if (rr <= 11) s += 1; else if (rr <= 20) s += 0; else if (rr <= 24) s += 2; else s += 3;
  const o = v.spo2;
  if (o <= 91) s += 3; else if (o <= 93) s += 2; else if (o <= 95) s += 1;
  const b = v.systolic;
  if (b <= 90) s += 3; else if (b <= 100) s += 2; else if (b <= 110) s += 1; else if (b <= 219) s += 0; else s += 3;
  const h = v.heartRate;
  if (h <= 40) s += 3; else if (h <= 50) s += 1; else if (h <= 90) s += 0; else if (h <= 110) s += 1; else if (h <= 130) s += 2; else s += 3;
  const t = v.temperature;
  if (t <= 35.0) s += 3; else if (t <= 36.0) s += 1; else if (t <= 38.0) s += 0; else if (t <= 39.0) s += 1; else s += 2;

  const level = s >= 7 ? 'CRITICAL' : s >= 5 ? 'HIGH' : s >= 3 ? 'MEDIUM' : 'LOW';
  const abnormal = [];
  if (rr < 12 || rr > 20) abnormal.push(`Resp Rate: ${rr}/min`);
  if (o < 96) abnormal.push(`SpO2: ${o}%`);
  if (b < 111 || b > 219) abnormal.push(`BP: ${b}/${v.diastolic}mmHg`);
  if (h < 51 || h > 90) abnormal.push(`HR: ${h}bpm`);
  if (t < 36.1 || t > 38.0) abnormal.push(`Temp: ${t}°C`);
  return { total: s, level, abnormal };
}

module.exports = { calcNEWS2 };
