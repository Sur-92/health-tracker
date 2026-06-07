// Computed Brain & Heart daily indices (0–100).
//
// Philosophy: these are NOT summed editorial ratings. They are computed from the
// brain/heart-relevant nutrients you actually ate that day, against fixed,
// evidence-based daily targets. A whole-food diet can reach ~100 on its own;
// nootropic/compound supplements add a capped BONUS on top (so you're never
// penalized for not supplementing). Harmful items subtract points.
//
// How a score is built:
//   core      = weighted % of FOOD targets met (each capped at 100% so extra
//               doesn't inflate — this is why "3 eggs" plateaus instead of
//               exploding)
//   + bonus   = compounds/nootropics met, summed and capped
//   - penalty = trans fat (penalized from zero) + over-limit sugar/sodium/sat-fat
//
// Targets are daily reference intakes (adult). Compound "targets" are typical
// studied effective doses. Tune the numbers below; the structure stays the same.

const BRAIN = {
  foodPositives: [
    { key: 'omega3EPADHA', label: 'Omega-3 (EPA+DHA)', target: 300, weight: 20, sum: ['omega3EPA', 'omega3DHA'] },
    { key: 'choline', label: 'Choline', target: 550, weight: 16 },
    { key: 'fiber', label: 'Fiber', target: 30, weight: 9 },
    { key: 'magnesium', label: 'Magnesium', target: 420, weight: 8 },
    { key: 'b12', label: 'Vitamin B12', target: 2.4, weight: 7 },
    { key: 'folate', label: 'Folate', target: 400, weight: 7 },
    { key: 'b6', label: 'Vitamin B6', target: 1.7, weight: 6 },
    { key: 'vitE', label: 'Vitamin E', target: 15, weight: 6 },
    { key: 'vitD', label: 'Vitamin D', target: 20, weight: 6 },
    { key: 'zinc', label: 'Zinc', target: 11, weight: 5 },
    { key: 'omega3ALA', label: 'Omega-3 (ALA)', target: 1600, weight: 4 },
    { key: 'iron', label: 'Iron', target: 8, weight: 4 },
  ],
  bonus: {
    cap: 12,
    items: [
      { key: 'creatine', label: 'Creatine', target: 3000, weight: 4 },
      { key: 'lTheanine', label: 'L-Theanine', target: 200, weight: 2 },
      { key: 'citicoline', label: 'Citicoline', target: 250, weight: 2 },
      { key: 'alphaGPC', label: 'Alpha-GPC', target: 300, weight: 2 },
      { key: 'lionsMane', label: "Lion's Mane", target: 1000, weight: 2 },
      { key: 'uridine', label: 'Uridine', target: 250, weight: 1 },
      { key: 'rhodiola', label: 'Rhodiola', target: 200, weight: 1 },
      { key: 'ashwagandha', label: 'Ashwagandha', target: 300, weight: 1 },
      { key: 'taurine', label: 'Taurine', target: 500, weight: 1 },
      { key: 'nac', label: 'NAC', target: 600, weight: 1 },
      { key: 'glycine', label: 'Glycine', target: 3000, weight: 1 },
      { key: 'caffeine', label: 'Caffeine', target: 100, weight: 1 },
    ],
  },
  penalties: [
    { key: 'transFat', label: 'Trans fat', basis: 1.5, weight: 12, limit: 0.5 },
    { key: 'addedSugar', label: 'Added sugar', basis: 25, weight: 12, limit: 25 },
  ],
};

const HEART = {
  foodPositives: [
    { key: 'fiber', label: 'Fiber', target: 30, weight: 20 },
    { key: 'potassium', label: 'Potassium', target: 3500, weight: 16 },
    { key: 'omega3EPADHA', label: 'Omega-3 (EPA+DHA)', target: 300, weight: 10, sum: ['omega3EPA', 'omega3DHA'] },
    { key: 'magnesium', label: 'Magnesium', target: 420, weight: 9 },
    { key: 'calcium', label: 'Calcium', target: 1000, weight: 4 },
    { key: 'omega3ALA', label: 'Omega-3 (ALA)', target: 1600, weight: 4 },
    { key: 'vitD', label: 'Vitamin D', target: 20, weight: 3 },
  ],
  bonus: {
    cap: 6,
    items: [
      { key: 'taurine', label: 'Taurine', target: 500, weight: 2 },
      { key: 'lTheanine', label: 'L-Theanine', target: 200, weight: 1 },
      { key: 'nac', label: 'NAC', target: 600, weight: 1 },
      { key: 'rhodiola', label: 'Rhodiola', target: 200, weight: 1 },
      { key: 'creatine', label: 'Creatine', target: 3000, weight: 1 },
    ],
  },
  penalties: [
    { key: 'transFat', label: 'Trans fat', basis: 1.5, weight: 15, limit: 0.5 },
    { key: 'saturatedFat', label: 'Saturated fat', basis: 20, weight: 15, limit: 20 },
    { key: 'sodium', label: 'Sodium', basis: 2300, weight: 15, limit: 2300 },
    { key: 'addedSugar', label: 'Added sugar', basis: 36, weight: 10, limit: 36 },
  ],
};

function valueOf(totals, item) {
  if (item.sum) return item.sum.reduce((s, k) => s + (totals[k] || 0), 0);
  return totals[item.key] || 0;
}

function labelFor(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Low';
  return 'Poor';
}

export function scoreColor(score) {
  if (score >= 80) return 'text-green-700 bg-green-100';
  if (score >= 60) return 'text-emerald-700 bg-emerald-100';
  if (score >= 40) return 'text-yellow-700 bg-yellow-100';
  if (score >= 20) return 'text-orange-700 bg-orange-100';
  return 'text-red-700 bg-red-100';
}

function computeIndex(totals, model) {
  const foodWeight = model.foodPositives.reduce((s, i) => s + i.weight, 0);
  const contributions = model.foodPositives.map((i) => {
    const v = valueOf(totals, i);
    const fill = Math.min(v / i.target, 1);
    return { label: i.label, pct: Math.round(fill * 100), points: fill * i.weight, weight: i.weight, value: v, target: i.target };
  });
  const core = (contributions.reduce((s, c) => s + c.points, 0) / foodWeight) * 100;

  const bonusItems = model.bonus.items
    .map((i) => {
      const v = valueOf(totals, i);
      const fill = Math.min(v / i.target, 1);
      return { label: i.label, pct: Math.round(fill * 100), points: fill * i.weight, value: v, target: i.target };
    })
    .filter((b) => b.points > 0);
  const bonus = Math.min(bonusItems.reduce((s, b) => s + b.points, 0), model.bonus.cap);

  const penalties = model.penalties
    .map((p) => {
      const v = valueOf(totals, p);
      const frac = p.fromZero
        ? Math.min(v / p.basis, 1)
        : Math.min(Math.max(0, (v - p.limit) / p.basis), 1);
      return { label: p.label, points: frac * p.weight, value: v };
    })
    .filter((p) => p.points > 0.01);
  const penaltyTotal = penalties.reduce((s, p) => s + p.points, 0);

  const score = Math.max(0, Math.min(100, Math.round(core + bonus - penaltyTotal)));

  // Top contributors: highest actual points earned (food + bonus)
  const topContributors = [...contributions, ...bonusItems]
    .filter((c) => c.pct > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((c) => ({ label: c.label, pct: c.pct }));

  // Detractors: meaningful penalties first, then big unmet high-weight targets
  // (excluding anything already shown as a top contributor).
  const contribLabels = new Set(topContributors.map((c) => c.label));
  const gaps = contributions
    .filter((c) => c.weight >= 6 && c.pct < 50 && !contribLabels.has(c.label))
    .sort((a, b) => b.weight * (1 - b.pct / 100) - a.weight * (1 - a.pct / 100))
    .map((g) => ({ label: `low ${g.label}`, type: 'gap' }));
  const topDetractors = [
    ...penalties
      .filter((p) => p.points >= 1)
      .sort((a, b) => b.points - a.points)
      .map((p) => ({ label: p.label, type: 'penalty' })),
    ...gaps,
  ].slice(0, 3);

  return {
    score,
    label: labelFor(score),
    core: Math.round(core),
    bonus: Math.round(bonus),
    penalty: Math.round(penaltyTotal),
    bonusCap: model.bonus.cap,
    topContributors,
    topDetractors,
    // Full breakdown for the expanded view
    breakdown: {
      food: [...contributions].sort((a, b) => b.points - a.points),
      bonus: [...bonusItems].sort((a, b) => b.points - a.points),
      penalties: [...penalties].sort((a, b) => b.points - a.points),
    },
  };
}

export function computeBrainScore(totals) {
  return computeIndex(totals, BRAIN);
}

export function computeHeartScore(totals) {
  return computeIndex(totals, HEART);
}
