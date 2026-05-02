/**

- NEWS2 Early Warning Score Calculator
- Based on NHS Royal College of Physicians NEWS2 table
*/

function scoreRespRate(rr) {
if (rr <= 8) return 3;
if (rr <= 11) return 1;
if (rr <= 20) return 0;
if (rr <= 24) return 2;
return 3;
}

function scoreSpO2(spo2) {
if (spo2 <= 91) return 3;
if (spo2 <= 93) return 2;
if (spo2 <= 95) return 1;
return 0;
}

function scoreSystolic(sbp) {
if (sbp <= 90) return 3;
if (sbp <= 100) return 2;
if (sbp <= 110) return 1;
if (sbp <= 219) return 0;
return 3;
}

function scoreHeartRate(hr) {
if (hr <= 40) return 3;
if (hr <= 50) return 1;
if (hr <= 90) return 0;
if (hr <= 110) return 1;
if (hr <= 130) return 2;
return 3;
}

function scoreTemperature(temp) {
if (temp <= 35.0) return 3;
if (temp <= 36.0) return 1;
if (temp <= 38.0) return 0;
if (temp <= 39.0) return 1;
return 2;
}

function getRiskLevel(score) {
if (score >= 7) return 'CRITICAL';
if (score >= 5) return 'HIGH';
if (score >= 3) return 'MEDIUM';
return 'LOW';
}

function calcNEWS2(vitals) {
const scores = {
respRate: scoreRespRate(vitals.respRate),
spo2: scoreSpO2(vitals.spo2),
systolic: scoreSystolic(vitals.systolic),
heartRate: scoreHeartRate(vitals.heartRate),
temperature: scoreTemperature(vitals.temperature),
};

const total = Object.values(scores).reduce((a, b) => a + b, 0);
const level = getRiskLevel(total);

// Identify which vitals are abnormal
const abnormal = [];
if (scores.respRate > 0) abnormal.push(`Resp Rate: ${vitals.respRate}/min (score ${scores.respRate})`);
if (scores.spo2 > 0) abnormal.push(`SpO2: ${vitals.spo2}% (score ${scores.spo2})`);
if (scores.systolic > 0) abnormal.push(`BP: ${vitals.systolic}/${vitals.diastolic} mmHg (score ${scores.systolic})`);
if (scores.heartRate > 0) abnormal.push(`Heart Rate: ${vitals.heartRate} bpm (score ${scores.heartRate})`);
if (scores.temperature > 0) abnormal.push(`Temp: ${vitals.temperature}°C (score ${scores.temperature})`);

return { total, level, scores, abnormal };
}

module.exports = { calcNEWS2, getRiskLevel };