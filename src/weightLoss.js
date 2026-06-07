// Weight-loss engine: trend weight (EMA) + adaptive TDEE measured from intake
// vs. weight change. Everything is computed from data the app already collects:
// weight logged in Vitals, calories from daily logs, and the profile's
// height/age/sex/goal/activity from Settings. Nothing is hardcoded per person.

const CAL_PER_LB = 3500;
const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}
function addDays(date, n) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Exponentially-weighted trend over per-day average weights (kills daily noise).
export function trendSeries(weighIns, halfLifeDays = 10) {
  const byDate = {};
  for (const w of weighIns || []) {
    if (w && w.weight != null && w.date) (byDate[w.date] = byDate[w.date] || []).push(Number(w.weight));
  }
  const days = Object.keys(byDate).sort();
  const alpha = 1 - Math.pow(0.5, 1 / halfLifeDays);
  let ema = null;
  return days.map((d) => {
    const arr = byDate[d];
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length;
    ema = ema == null ? avg : ema + alpha * (avg - ema);
    return { date: d, weight: Math.round(avg * 100) / 100, trend: Math.round(ema * 100) / 100 };
  });
}

// Fallback TDEE from Mifflin–St Jeor BMR × activity multiplier.
function estimateTDEE(settings, weightLb, age) {
  if (!weightLb || !settings || !settings.height_inches || !age || !settings.sex) return null;
  const kg = weightLb * 0.453592;
  const cm = settings.height_inches * 2.54;
  const bmr = settings.sex === 'male'
    ? 10 * kg + 6.25 * cm - 5 * age + 5
    : 10 * kg + 6.25 * cm - 5 * age - 161;
  return Math.round(bmr * (ACTIVITY[settings.activity_level] || 1.375));
}

// Least-squares slope (lb/day) of weight vs. day offset. Robust to daily noise
// and to a noisy first reading, unlike differencing EMA endpoints.
function slopeLbPerDay(points) {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of points) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom;
}

// Regression slope over weigh-ins within the last `windowDays`.
function slopeOverWindow(series, windowDays) {
  if (!series || series.length < 2) return null;
  const t0 = series[0].date;
  const last = series[series.length - 1];
  const win = series.filter((s) => daysBetween(s.date, last.date) <= windowDays);
  if (win.length < 2) return null;
  return slopeLbPerDay(win.map((s) => ({ x: daysBetween(t0, s.date), y: s.weight })));
}

// Measured TDEE over the recent window: TDEE = mean daily intake − slope×3500.
// (slope in lb/day; losing weight → negative slope → adds calories back.)
function measuredTDEE(series, intakeByDate) {
  if (!series || series.length < 2) return null;
  const last = series[series.length - 1];
  const window = series.filter((s) => daysBetween(s.date, last.date) <= 28);
  if (window.length < 2) return null;
  const span = daysBetween(window[0].date, last.date);
  if (span < 7) return null;

  const slope = slopeOverWindow(series, 28);
  if (slope == null) return null;

  let total = 0, daysLogged = 0;
  for (let i = 0; i <= span; i++) {
    const d = addDays(window[0].date, i);
    if (intakeByDate[d] != null && intakeByDate[d] > 0) { total += intakeByDate[d]; daysLogged++; }
  }
  if (daysLogged < Math.max(5, Math.floor(span * 0.5))) return null; // need ~half the days logged
  const meanIntake = total / daysLogged;
  return {
    value: Math.round(meanIntake - slope * CAL_PER_LB),
    days: span,
    daysLogged,
    meanIntake: Math.round(meanIntake),
  };
}

export function computeWeightLoss({ weighIns, intakeByDate, settings, age, todayIntake, todayProtein }) {
  settings = settings || {};
  intakeByDate = intakeByDate || {};
  const series = trendSeries(weighIns);
  const n = series.length;
  const latest = n ? series[n - 1] : null;
  const trendWeight = latest ? latest.trend : null;
  const latestWeight = latest ? latest.weight : null;
  const goal = settings.goal_weight != null && settings.goal_weight !== '' ? Number(settings.goal_weight) : null;

  // Trend rate from least-squares slope over the last ~21 days
  let ratePerWeek = null;
  const rateSlope = slopeOverWindow(series, 21);
  if (rateSlope != null) ratePerWeek = Math.round(rateSlope * 7 * 100) / 100;

  const measured = measuredTDEE(series, intakeByDate);
  const estimated = estimateTDEE(settings, trendWeight || latestWeight, age);
  const tdee = measured ? measured.value : estimated;
  const tdeeSource = measured ? 'measured' : estimated ? 'estimated' : null;

  const balance = tdee != null && todayIntake != null ? Math.round(todayIntake - tdee) : null; // <0 = deficit
  const toGoal = trendWeight != null && goal != null ? Math.round((trendWeight - goal) * 10) / 10 : null;
  let etaWeeks = null;
  if (toGoal != null && toGoal > 0 && ratePerWeek != null && ratePerWeek < -0.05) {
    etaWeeks = Math.round(toGoal / -ratePerWeek);
  }
  const proteinTarget = goal ? Math.round(goal * 0.8) : null;

  let dataState = 'ok';
  if (n === 0) dataState = 'no_weight';
  else if (n < 2) dataState = 'need_more_weight';
  else if (!measured) dataState = 'learning_tdee';

  return {
    series, weighInDays: n, latestWeight, trendWeight, goal, ratePerWeek,
    tdee, tdeeSource, tdeeWindow: measured ? measured.days : null, meanIntake: measured ? measured.meanIntake : null,
    balance, toGoal, etaWeeks, proteinTarget, todayIntake, todayProtein, dataState,
  };
}
