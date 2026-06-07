import { useState, useEffect, useRef, Children } from 'react';
import { getAllFoods, addFood, deleteFood, saveDayLog, getDayLog, getAllDayLogs, addVital, getVitalsForDate, deleteVital, getAllVitals, getSettings, saveSettings, getNutritionConfig, saveNutritionConfig, backupData, restoreData, undoRestore, hasPreRestore, canBackup,
listPeople, getActivePerson, setActivePerson, addPerson } from './db';
import { defaultNutritionConfig, configToRda, getWaterTarget } from './defaultNutritionConfig';
import { computeBrainScore, computeHeartScore, scoreColor } from './brainHeartScore';
import { computeWeightLoss } from './weightLoss';

const NutrientRow = ({ label, value, unit }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{typeof value === 'number' ? value.toFixed(1) : value}{unit}</span>
    </div>
  );
};

const NutrientSection = ({ title, children }) => {
  const childArray = Children.toArray(children).filter(Boolean);
  if (childArray.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 border-b border-gray-200 pb-0.5">{title}</div>
      {children}
    </div>
  );
};

// Compact value formatter for breakdown rows (e.g. 146.9 -> 147, 2.4 -> 2.4)
const fmtAmt = (n) => (n >= 10 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString());

// One nutrient/contributor row with a fill bar.
const BreakdownRow = ({ label, pct, value, target, barClass = 'bg-green-400' }) => (
  <div className="flex items-center gap-1.5 text-[10px]" title={value != null ? `${fmtAmt(value)} / ${target}` : undefined}>
    <span className="w-24 truncate text-gray-600">{label}</span>
    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full ${barClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
    <span className="w-8 text-right tabular-nums text-gray-600">{pct}%</span>
  </div>
);

// Computed Brain/Heart daily index card (0–100). Click to expand the full breakdown.
const ScoreCard = ({ icon, name, data }) => {
  const [open, setOpen] = useState(false);
  const tone = data.score >= 60 ? 'bg-green-50 border-green-200'
    : data.score >= 40 ? 'bg-yellow-50 border-yellow-200'
    : 'bg-orange-50 border-orange-200';
  const { food, bonus, penalties } = data.breakdown;
  return (
    <div className={`rounded-lg p-3 border ${tone}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex justify-between items-center cursor-pointer text-left">
        <span className="font-bold text-sm">
          <span className="inline-block w-3 text-gray-400">{open ? '▾' : '▸'}</span> {icon} {name}
        </span>
        <span className={`text-lg font-bold px-2 py-0.5 rounded ${scoreColor(data.score)}`}>{data.score}<span className="text-xs font-medium opacity-70">/100</span></span>
      </button>
      <div className="text-xs font-semibold text-gray-600 mt-0.5 pl-3">{data.label}</div>

      {!open && (
        <>
          {data.topContributors.length > 0 && (
            <div className="text-[10px] text-green-700 mt-1 leading-tight">▲ {data.topContributors.map(c => `${c.label} ${c.pct}%`).join(' · ')}</div>
          )}
          {data.topDetractors.length > 0 && (
            <div className="text-[10px] text-orange-700 leading-tight">▼ {data.topDetractors.map(d => d.label).join(' · ')}</div>
          )}
        </>
      )}

      {open && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nutrients (% of target)</div>
          {food.map((c) => (
            <BreakdownRow key={c.label} label={c.label} pct={c.pct} value={c.value} target={c.target} />
          ))}

          {bonus.length > 0 && (
            <>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide pt-1">Supplement bonus (max +{data.bonusCap})</div>
              {bonus.map((b) => (
                <BreakdownRow key={b.label} label={b.label} pct={b.pct} value={b.value} target={b.target} barClass="bg-violet-400" />
              ))}
            </>
          )}

          {penalties.length > 0 && (
            <>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide pt-1">Penalties</div>
              {penalties.map((p) => (
                <div key={p.label} className="flex justify-between text-[10px] text-orange-700">
                  <span>{p.label} <span className="text-gray-400">({fmtAmt(p.value)})</span></span>
                  <span className="tabular-nums">−{p.points.toFixed(1)} pts</span>
                </div>
              ))}
            </>
          )}

          <div className="text-[10px] text-gray-500 mt-1 pt-1 border-t border-gray-200 tabular-nums">
            core {data.core} + bonus {data.bonus} − penalty {data.penalty} = <span className="font-bold">{data.score}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal to create a new profile (window.prompt is unsupported in Electron).
const AddProfileModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('nutrition_optimization');
  if (!isOpen) return null;
  const submit = () => { if (name.trim()) onCreate(name, goal); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-800 mb-3">Add profile</h3>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. Jess"
          className="w-full border border-gray-300 rounded px-2 py-1.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <label className="block text-xs font-semibold text-gray-500 mb-1">Goal</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setGoal('nutrition_optimization')}
            className={`px-2 py-2 rounded border text-sm ${goal === 'nutrition_optimization' ? 'bg-green-50 border-green-400 text-green-700 font-semibold' : 'border-gray-300 text-gray-600'}`}
          >🧠 Nutrition</button>
          <button
            onClick={() => setGoal('weight_loss')}
            className={`px-2 py-2 rounded border text-sm ${goal === 'weight_loss' ? 'bg-amber-50 border-amber-400 text-amber-700 font-semibold' : 'border-gray-300 text-gray-600'}`}
          >⚖️ Weight loss</button>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={submit} disabled={!name.trim()} className="px-3 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">Create</button>
        </div>
      </div>
    </div>
  );
};

const ageFromBirthdate = (bd) => {
  if (!bd) return null;
  const t = new Date(), b = new Date(bd);
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
};

// Sparkline of scale weight (dots) vs. EMA trend (line), with goal dashed line.
const TrendSparkline = ({ series, goal }) => {
  if (!series || series.length < 2) return null;
  const W = 280, H = 56, pad = 5;
  const ys = series.flatMap(s => [s.weight, s.trend]).concat(goal != null ? [goal] : []);
  const minY = Math.min(...ys), maxY = Math.max(...ys), range = (maxY - minY) || 1;
  const x = (i) => pad + (i / (series.length - 1)) * (W - 2 * pad);
  const y = (v) => pad + (1 - (v - minY) / range) * (H - 2 * pad);
  const trendPath = series.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(s.trend).toFixed(1)}`).join(' ');
  const goalIn = goal != null && goal >= minY && goal <= maxY;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
      {goalIn && <line x1={pad} x2={W - pad} y1={y(goal)} y2={y(goal)} stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" />}
      {series.map((s, i) => <circle key={i} cx={x(i)} cy={y(s.weight)} r="1.5" fill="#f59e0b" opacity="0.55" />)}
      <path d={trendPath} fill="none" stroke="#ea580c" strokeWidth="2" />
    </svg>
  );
};

// Weight-loss lens: trend weight, adaptive TDEE, energy balance, time-to-goal.
const WeightLossDashboard = ({ data }) => {
  if (!data) return null;
  const d = data;
  const fmt = (n, s = '') => (n == null ? '—' : `${n}${s}`);
  if (d.dataState === 'no_weight') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        ⚖️ Log your weight each morning (tap ❤️ Vitals) to start your trend. TDEE and rate appear after ~1–2 weeks.
      </div>
    );
  }
  const losing = d.ratePerWeek != null && d.ratePerWeek < 0;
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Trend weight</div>
            <div className="text-3xl font-bold text-gray-800">{fmt(d.trendWeight)} <span className="text-base font-medium text-gray-500">lb</span></div>
            <div className="text-xs text-gray-500">latest {fmt(d.latestWeight)} · goal {fmt(d.goal)}</div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${losing ? 'text-green-600' : 'text-orange-600'}`}>{d.ratePerWeek > 0 ? '+' : ''}{fmt(d.ratePerWeek)}<span className="text-xs"> lb/wk</span></div>
            {d.toGoal != null && <div className="text-xs text-gray-500">{d.toGoal > 0 ? `${d.toGoal} lb to goal` : 'at/under goal 🎉'}</div>}
          </div>
        </div>
        {d.series && d.series.length >= 2 && <div className="mt-2"><TrendSparkline series={d.series} goal={d.goal} /></div>}
      </div>

      {d.suggestedTarget != null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
          <div>
            <div className="text-xs font-semibold text-blue-700">🎯 Suggested daily target</div>
            <div className="text-[10px] text-gray-500">{d.targetRatePerWeek > 0 ? `to lose ~${d.targetRatePerWeek} lb/wk` : 'maintain — at/under goal'}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-700">{d.suggestedTarget}<span className="text-xs font-medium text-gray-500"> kcal</span></div>
            {d.todayIntake != null && <div className="text-[10px] text-gray-400">ate {Math.round(d.todayIntake)} today</div>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-500">TDEE {d.tdeeSource && <span className="text-[10px] font-normal text-gray-400">({d.tdeeSource}{d.tdeeWindow ? `, ${d.tdeeWindow}d` : ''})</span>}</div>
          <div className="text-2xl font-bold text-gray-800">{fmt(d.tdee)}<span className="text-xs font-medium text-gray-500"> kcal</span></div>
          {d.dataState === 'learning_tdee' && <div className="text-[10px] text-gray-400">estimate — learning your real TDEE…</div>}
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-500">Today vs TDEE</div>
          {d.balance == null
            ? <div className="text-sm text-gray-400 mt-1">log food to see balance</div>
            : <div className={`text-2xl font-bold ${d.balance < 0 ? 'text-green-600' : 'text-orange-600'}`}>{d.balance > 0 ? '+' : ''}{d.balance}<span className="text-xs font-medium text-gray-500"> kcal</span></div>}
          <div className="text-[10px] text-gray-400">{d.balance == null ? '' : (d.balance < 0 ? 'deficit' : 'surplus')}{d.todayIntake != null ? ` · ate ${Math.round(d.todayIntake)}` : ''}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-500">Est. time to goal</div>
          <div className="text-xl font-bold text-gray-800">{d.etaWeeks != null ? `~${d.etaWeeks} wk` : '—'}</div>
          <div className="text-[10px] text-gray-400">at current trend</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-500">Protein today</div>
          <div className="text-xl font-bold text-gray-800">{d.todayProtein != null ? Math.round(d.todayProtein) : '—'}<span className="text-xs text-gray-500"> / {fmt(d.proteinTarget)} g</span></div>
          <div className="text-[10px] text-gray-400">floor ~0.8 g/lb goal weight</div>
        </div>
      </div>
      {d.dataState === 'need_more_weight' && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Keep logging weight daily — the trend and TDEE sharpen with ~1–2 weeks of data.</div>
      )}
    </div>
  );
};

const QuickAddItem = ({ food, onAdd, onDelete }) => {
  const [qty, setQty] = useState(1);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-50 rounded text-sm">
      <div className="flex justify-between items-center p-2 group">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left truncate hover:text-blue-600 cursor-pointer flex items-center gap-1"
        >
          <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
          {food.name} <span className="text-gray-400">({food.calories} cal)</span>
        </button>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => onDelete(food)} className="text-red-400 hover:text-red-600 w-6 h-6 rounded flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} className="bg-gray-200 hover:bg-gray-300 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">−</button>
          <span className="w-6 text-center font-medium">{qty}</span>
          <button onClick={() => setQty(q => q + 1)} className="bg-gray-200 hover:bg-gray-300 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">+</button>
          <button onClick={() => { onAdd(food, qty); setQty(1); }} className="bg-green-500 text-white px-2 py-1 rounded text-xs ml-1">Add</button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-white border-t border-gray-200 rounded-b grid grid-cols-2 gap-x-4">
          <div>
            <NutrientSection title="Basic">
              <NutrientRow label="Serving" value={food.servingSize} unit="" />
              <NutrientRow label="Category" value={food.category} unit="" />
            </NutrientSection>

            <NutrientSection title="Macros">
              <NutrientRow label="Calories" value={food.calories} unit=" kcal" />
              <NutrientRow label="Protein" value={food.protein} unit="g" />
              <NutrientRow label="Carbs" value={food.carbs} unit="g" />
              <NutrientRow label="Fat" value={food.fat} unit="g" />
              <NutrientRow label="Saturated Fat" value={food.saturatedFat} unit="g" />
              <NutrientRow label="Trans Fat" value={food.transFat} unit="g" />
              <NutrientRow label="Fiber" value={food.fiber} unit="g" />
              <NutrientRow label="Sugar" value={food.sugar} unit="g" />
              <NutrientRow label="Added Sugar" value={food.addedSugar} unit="g" />
              <NutrientRow label="Sodium" value={food.sodium} unit="mg" />
              <NutrientRow label="Cholesterol" value={food.cholesterol} unit="mg" />
            </NutrientSection>

            <NutrientSection title="Vitamins">
              <NutrientRow label="Vitamin A" value={food.vitA} unit=" mcg" />
              <NutrientRow label="Vitamin C" value={food.vitC} unit=" mg" />
              <NutrientRow label="Vitamin D" value={food.vitD} unit=" mcg" />
              <NutrientRow label="Vitamin E" value={food.vitE} unit=" mg" />
              <NutrientRow label="Vitamin K" value={food.vitK} unit=" mcg" />
              <NutrientRow label="Thiamin (B1)" value={food.thiamin} unit=" mg" />
              <NutrientRow label="Riboflavin (B2)" value={food.riboflavin} unit=" mg" />
              <NutrientRow label="Niacin (B3)" value={food.niacin} unit=" mg" />
              <NutrientRow label="Pantothenic (B5)" value={food.pantothenicAcid} unit=" mg" />
              <NutrientRow label="Vitamin B6" value={food.b6} unit=" mg" />
              <NutrientRow label="Biotin (B7)" value={food.biotin} unit=" mcg" />
              <NutrientRow label="Folate (B9)" value={food.folate} unit=" mcg" />
              <NutrientRow label="Vitamin B12" value={food.b12} unit=" mcg" />
              <NutrientRow label="Choline" value={food.choline} unit=" mg" />
            </NutrientSection>
          </div>

          <div>
            <NutrientSection title="Minerals">
              <NutrientRow label="Calcium" value={food.calcium} unit=" mg" />
              <NutrientRow label="Iron" value={food.iron} unit=" mg" />
              <NutrientRow label="Magnesium" value={food.magnesium} unit=" mg" />
              <NutrientRow label="Phosphorus" value={food.phosphorus} unit=" mg" />
              <NutrientRow label="Potassium" value={food.potassium} unit=" mg" />
              <NutrientRow label="Zinc" value={food.zinc} unit=" mg" />
              <NutrientRow label="Copper" value={food.copper} unit=" mg" />
              <NutrientRow label="Manganese" value={food.manganese} unit=" mg" />
              <NutrientRow label="Selenium" value={food.selenium} unit=" mcg" />
              <NutrientRow label="Iodine" value={food.iodine} unit=" mcg" />
              <NutrientRow label="Chromium" value={food.chromium} unit=" mcg" />
              <NutrientRow label="Molybdenum" value={food.molybdenum} unit=" mcg" />
            </NutrientSection>

            <NutrientSection title="Omega-3">
              <NutrientRow label="ALA" value={food.omega3ALA} unit=" mg" />
              <NutrientRow label="EPA" value={food.omega3EPA} unit=" mg" />
              <NutrientRow label="DHA" value={food.omega3DHA} unit=" mg" />
            </NutrientSection>

            <NutrientSection title="Amino Acids">
              <NutrientRow label="Lysine" value={food.lysine} unit=" mg" />
              <NutrientRow label="Glycine" value={food.glycine} unit=" mg" />
              <NutrientRow label="Taurine" value={food.taurine} unit=" mg" />
            </NutrientSection>

            <NutrientSection title="Other">
              <NutrientRow label="Caffeine" value={food.caffeine} unit=" mg" />
              <NutrientRow label="Creatine" value={food.creatine} unit=" mg" />
              {food.brain !== 0 && <NutrientRow label="🧠 Brain Score" value={food.brain} unit="" />}
              {food.heart !== 0 && <NutrientRow label="🫀 Heart Score" value={food.heart} unit="" />}
            </NutrientSection>
          </div>
        </div>
      )}
    </div>
  );
};

// Vitals Panel Component
const VitalsPanel = ({ isOpen, onClose, selectedDate, vitals, onAddVital, onDeleteVital, formatTime }) => {
  const [weight, setWeight] = useState('');
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spO2, setSpO2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [addedMessage, setAddedMessage] = useState('');

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // At least one vital must be filled
    if (!weight && !systolicBP && !heartRate && !spO2 && !temperature) {
      return;
    }

    const vital = {
      date: selectedDate,
      time: getCurrentTime(),
      weight: weight ? parseFloat(weight) : null,
      systolicBP: systolicBP ? parseInt(systolicBP) : null,
      diastolicBP: diastolicBP ? parseInt(diastolicBP) : null,
      heartRate: heartRate ? parseInt(heartRate) : null,
      spO2: spO2 ? parseInt(spO2) : null,
      temperature: temperature ? parseFloat(temperature) : null,
      notes: notes || null
    };

    await onAddVital(vital);

    // Clear form
    setWeight('');
    setSystolicBP('');
    setDiastolicBP('');
    setHeartRate('');
    setSpO2('');
    setTemperature('');
    setNotes('');

    setAddedMessage('✓ Vitals recorded');
    setTimeout(() => setAddedMessage(''), 2000);
  };

  // Helper to get status color for SpO2
  const getSpO2Color = (val) => {
    if (val >= 95) return 'text-green-600';
    if (val >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper to get status color for BP
  const getBPColor = (sys, dia) => {
    if (sys < 120 && dia < 80) return 'text-green-600'; // Normal
    if (sys < 130 && dia < 80) return 'text-yellow-600'; // Elevated
    if (sys < 140 || dia < 90) return 'text-orange-600'; // High Stage 1
    return 'text-red-600'; // High Stage 2+
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-4 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>❤️</span> Vitals
              </h2>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 w-8 h-8 rounded flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-white/80 mt-1">{selectedDate}</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Success Message */}
            {addedMessage && (
              <div className="bg-green-100 border border-green-300 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
                {addedMessage}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-gray-700 text-sm mb-3">📝 Record Vitals</h3>

              {/* Weight */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">⚖️ Weight</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="lbs"
                  className="flex-1 border rounded px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-400 w-8">lbs</span>
              </div>

              {/* Blood Pressure */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">🩸 BP</label>
                <input
                  type="number"
                  value={systolicBP}
                  onChange={e => setSystolicBP(e.target.value)}
                  placeholder="sys"
                  className="w-16 border rounded px-2 py-1 text-sm text-center"
                />
                <span className="text-gray-400">/</span>
                <input
                  type="number"
                  value={diastolicBP}
                  onChange={e => setDiastolicBP(e.target.value)}
                  placeholder="dia"
                  className="w-16 border rounded px-2 py-1 text-sm text-center"
                />
                <span className="text-xs text-gray-400">mmHg</span>
              </div>

              {/* Heart Rate */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">💓 HR</label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={e => setHeartRate(e.target.value)}
                  placeholder="bpm"
                  className="flex-1 border rounded px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-400 w-8">bpm</span>
              </div>

              {/* SpO2 */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">🫁 SpO2</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={spO2}
                  onChange={e => setSpO2(e.target.value)}
                  placeholder="%"
                  className="flex-1 border rounded px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-400 w-8">%</span>
              </div>

              {/* Temperature */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 w-24">🌡️ Temp</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(e.target.value)}
                  placeholder="°F"
                  className="flex-1 border rounded px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-400 w-8">°F</span>
              </div>

              {/* Notes */}
              <div className="flex items-start gap-2">
                <label className="text-sm text-gray-600 w-24 pt-1">📋 Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className="flex-1 border rounded px-2 py-1 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2 rounded font-medium text-sm transition-colors"
              >
                Record Vitals
              </button>
            </form>

            {/* Today's Entries */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3">📊 Today's Readings ({vitals.length})</h3>

              {vitals.length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-sm">No vitals recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {vitals.map(v => (
                    <div key={v.id} className="bg-white rounded p-3 border text-sm group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-gray-400 text-xs">{formatTime(v.time)}</span>
                        <button
                          onClick={() => onDeleteVital(v.id)}
                          className="text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {v.weight && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Weight:</span>
                            <span className="font-medium">{v.weight} lbs</span>
                          </div>
                        )}
                        {v.systolicBP && v.diastolicBP && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">BP:</span>
                            <span className={`font-medium ${getBPColor(v.systolicBP, v.diastolicBP)}`}>
                              {v.systolicBP}/{v.diastolicBP}
                            </span>
                          </div>
                        )}
                        {v.heartRate && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">HR:</span>
                            <span className="font-medium">{v.heartRate} bpm</span>
                          </div>
                        )}
                        {v.spO2 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">SpO2:</span>
                            <span className={`font-medium ${getSpO2Color(v.spO2)}`}>{v.spO2}%</span>
                          </div>
                        )}
                        {v.temperature && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Temp:</span>
                            <span className="font-medium">{v.temperature}°F</span>
                          </div>
                        )}
                      </div>
                      {v.notes && (
                        <div className="mt-2 text-xs text-gray-500 italic border-t pt-1">
                          {v.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reference Guide */}
            <div className="bg-blue-50 rounded-lg p-4 text-xs">
              <h4 className="font-bold text-blue-700 mb-2">📖 Reference Ranges</h4>
              <div className="space-y-1 text-blue-600">
                <div><strong>BP:</strong> Normal &lt;120/80, Elevated 120-129/&lt;80, High ≥130/80</div>
                <div><strong>HR:</strong> Normal 60-100 bpm (lower = more fit)</div>
                <div><strong>SpO2:</strong> Normal 95-100%, Concern &lt;94%</div>
                <div><strong>Temp:</strong> Normal 97.8-99.1°F</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Settings Modal Component
const SettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [notes, setNotes] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings into form when modal opens
  useEffect(() => {
    if (isOpen && settings) {
      setName(settings.name || '');
      setBirthdate(settings.birthdate || '');
      setSex(settings.sex || '');
      if (settings.height_inches) {
        setHeightFeet(Math.floor(settings.height_inches / 12).toString());
        setHeightInches((settings.height_inches % 12).toString());
      } else {
        setHeightFeet('');
        setHeightInches('');
      }
      setGoalWeight(settings.goal_weight?.toString() || '');
      setActivityLevel(settings.activity_level || '');
      setNotes(settings.notes || '');
    }
  }, [isOpen, settings]);

  // Calculate age from birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate BMR using Mifflin-St Jeor equation
  const calculateBMR = (weight, heightIn, age, sex) => {
    if (!weight || !heightIn || !age || !sex) return null;
    const weightKg = weight * 0.453592;
    const heightCm = heightIn * 2.54;
    if (sex === 'male') {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    } else {
      return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }
  };

  const handleSave = async () => {
    const totalHeightInches = (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0);

    const newSettings = {
      name: name || null,
      birthdate: birthdate || null,
      sex: sex || null,
      height_inches: totalHeightInches || null,
      goal_weight: goalWeight ? parseFloat(goalWeight) : null,
      activity_level: activityLevel || null,
      notes: notes || null
    };

    await onSave(newSettings);
    setSaveMessage('✓ Settings saved!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const age = calculateAge(birthdate);
  const totalHeight = (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-4 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>⚙️</span> Settings
              </h2>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 w-8 h-8 rounded flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Success Message */}
            {saveMessage && (
              <div className="bg-green-100 border border-green-300 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
                {saveMessage}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">👤 Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Birthdate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🎂 Birthdate</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={birthdate}
                  onChange={e => setBirthdate(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                {age !== null && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {age} years old
                  </span>
                )}
              </div>
            </div>

            {/* Sex */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">⚥ Sex</label>
              <select
                value={sex}
                onChange={e => setSex(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📏 Height</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={heightFeet}
                  onChange={e => setHeightFeet(e.target.value)}
                  placeholder="ft"
                  min="0"
                  max="8"
                  className="w-20 border rounded-lg px-3 py-2 text-sm text-center"
                />
                <span className="text-gray-500">ft</span>
                <input
                  type="number"
                  value={heightInches}
                  onChange={e => setHeightInches(e.target.value)}
                  placeholder="in"
                  min="0"
                  max="11"
                  className="w-20 border rounded-lg px-3 py-2 text-sm text-center"
                />
                <span className="text-gray-500">in</span>
              </div>
            </div>

            {/* Goal Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Goal Weight</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={goalWeight}
                  onChange={e => setGoalWeight(e.target.value)}
                  placeholder="lbs"
                  step="0.1"
                  className="w-24 border rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-500">lbs</span>
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🏃 Activity Level</label>
              <select
                value={activityLevel}
                onChange={e => setActivityLevel(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="sedentary">Sedentary (little/no exercise)</option>
                <option value="light">Light (1-3 days/week)</option>
                <option value="moderate">Moderate (3-5 days/week)</option>
                <option value="active">Active (6-7 days/week)</option>
                <option value="very_active">Very Active (2x/day)</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📋 Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Health conditions, goals, etc..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* Calculated Stats */}
            {age && totalHeight > 0 && sex && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <h4 className="font-bold text-blue-700 mb-2">📊 Calculated Stats</h4>
                <div className="space-y-1 text-blue-600">
                  <div className="flex justify-between">
                    <span>Age:</span>
                    <span className="font-medium">{age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Height:</span>
                    <span className="font-medium">{Math.floor(totalHeight / 12)}'{totalHeight % 12}" ({totalHeight} in)</span>
                  </div>
                  {goalWeight && (
                    <div className="flex justify-between">
                      <span>Goal BMI:</span>
                      <span className="font-medium">
                        {((goalWeight / (totalHeight * totalHeight)) * 703).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded-lg font-medium text-sm transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Analytics Panel Component (Left Slide-in)
const AnalyticsPanel = ({ isOpen, onClose, allDaysData, allVitals, userSettings }) => {
  const [period, setPeriod] = useState('30');

  // Get date range based on selected period
  const getDateRange = () => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate;

    if (period === 'all') {
      startDate = '2000-01-01';
    } else {
      const daysAgo = parseInt(period);
      const start = new Date(today);
      start.setDate(start.getDate() - daysAgo);
      startDate = start.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Filter vitals by date range
  const filteredVitals = allVitals.filter(v => v.date >= startDate && v.date <= endDate);

  // Filter nutrition logs by date range
  const filteredDays = Object.entries(allDaysData)
    .filter(([date]) => date >= startDate && date <= endDate)
    .sort(([a], [b]) => a.localeCompare(b));

  // Calculate weight stats
  const weightReadings = filteredVitals
    .filter(v => v.weight)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const latestWeight = weightReadings.length > 0 ? weightReadings[weightReadings.length - 1].weight : null;
  const firstWeight = weightReadings.length > 0 ? weightReadings[0].weight : null;
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : null;
  const goalWeight = userSettings?.goal_weight;

  // Calculate vitals averages
  const bpReadings = filteredVitals.filter(v => v.systolicBP && v.diastolicBP);
  const hrReadings = filteredVitals.filter(v => v.heartRate);
  const spo2Readings = filteredVitals.filter(v => v.spO2);

  const avgSystolic = bpReadings.length > 0 ? Math.round(bpReadings.reduce((s, v) => s + v.systolicBP, 0) / bpReadings.length) : null;
  const avgDiastolic = bpReadings.length > 0 ? Math.round(bpReadings.reduce((s, v) => s + v.diastolicBP, 0) / bpReadings.length) : null;
  const avgHR = hrReadings.length > 0 ? Math.round(hrReadings.reduce((s, v) => s + v.heartRate, 0) / hrReadings.length) : null;
  const avgSpO2 = spo2Readings.length > 0 ? Math.round(spo2Readings.reduce((s, v) => s + v.spO2, 0) / spo2Readings.length) : null;

  // Calculate nutrition averages
  const calculateNutritionAverages = () => {
    if (filteredDays.length === 0) return null;

    const totals = {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      addedSugar: 0, sodium: 0, omega3EPADHA: 0
    };

    filteredDays.forEach(([, foods]) => {
      foods.forEach(food => {
        totals.calories += food.calories || 0;
        totals.protein += food.protein || 0;
        totals.carbs += food.carbs || 0;
        totals.fat += food.fat || 0;
        totals.fiber += food.fiber || 0;
        totals.addedSugar += food.addedSugar || 0;
        totals.sodium += food.sodium || 0;
        totals.omega3EPADHA += (food.omega3EPA || 0) + (food.omega3DHA || 0);
      });
    });

    const days = filteredDays.length;
    return {
      calories: Math.round(totals.calories / days),
      protein: Math.round(totals.protein / days),
      carbs: Math.round(totals.carbs / days),
      fat: Math.round(totals.fat / days),
      fiber: Math.round(totals.fiber / days),
      addedSugar: Math.round(totals.addedSugar / days),
      sodium: Math.round(totals.sodium / days),
      omega3EPADHA: Math.round(totals.omega3EPADHA / days) // mg EPA+DHA/day
    };
  };

  const nutritionAvg = calculateNutritionAverages();

  // Mini bar chart for weight trend
  const WeightChart = () => {
    if (weightReadings.length < 2) return <p className="text-gray-400 text-sm text-center py-4">Not enough data</p>;

    const weights = weightReadings.map(v => v.weight);
    const min = Math.min(...weights) - 2;
    const max = Math.max(...weights) + 2;
    const range = max - min;

    // Group by date, take latest per day
    const dailyWeights = {};
    weightReadings.forEach(v => {
      dailyWeights[v.date] = v.weight;
    });
    const dailyData = Object.entries(dailyWeights).slice(-14); // Last 14 days max

    return (
      <div className="flex items-end gap-1 h-24 mt-2">
        {dailyData.map(([date, weight], i) => {
          const height = ((weight - min) / range) * 100;
          const isLast = i === dailyData.length - 1;
          return (
            <div key={date} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full rounded-t ${isLast ? 'bg-blue-500' : 'bg-blue-300'}`}
                style={{ height: `${height}%` }}
                title={`${date}: ${weight} lbs`}
              />
              <span className="text-[8px] text-gray-400 mt-1">
                {new Date(date + 'T00:00:00').getDate()}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Progress bar helper
  const ProgressBar = ({ value, max, isLimit = false, color = 'blue' }) => {
    const pct = Math.min((value / max) * 100, 100);
    const bgColor = isLimit
      ? (pct > 100 ? 'bg-red-500' : 'bg-green-500')
      : (pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-gray-300');

    return (
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bgColor}`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel - slides from LEFT */}
      <div className={`fixed top-0 left-0 h-full w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>📊</span> Analytics
              </h2>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 w-8 h-8 rounded flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            {/* Period Selector */}
            <div className="flex gap-2 mt-3">
              {[
                { value: '7', label: '7D' },
                { value: '30', label: '30D' },
                { value: '90', label: '90D' },
                { value: 'all', label: 'All' }
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                    period === p.value
                      ? 'bg-white text-purple-600'
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Weight Trend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2">
                ⚖️ Weight Trend
              </h3>
              {weightReadings.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-white rounded p-2">
                      <div className="text-lg font-bold text-gray-800">{latestWeight}</div>
                      <div className="text-xs text-gray-500">Current (lbs)</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className={`text-lg font-bold ${weightChange < 0 ? 'text-green-600' : weightChange > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {weightChange > 0 ? '+' : ''}{weightChange?.toFixed(1) || '—'}
                      </div>
                      <div className="text-xs text-gray-500">Change</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="text-lg font-bold text-blue-600">{goalWeight || '—'}</div>
                      <div className="text-xs text-gray-500">Goal</div>
                    </div>
                  </div>
                  {goalWeight && latestWeight && (
                    <div className="text-xs text-center text-gray-500 mb-2">
                      {latestWeight > goalWeight
                        ? `${(latestWeight - goalWeight).toFixed(1)} lbs to goal`
                        : '🎉 At or below goal!'}
                    </div>
                  )}
                  <WeightChart />
                </>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No weight data recorded</p>
              )}
            </div>

            {/* Vitals Dashboard */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
                ❤️ Vitals Averages
              </h3>
              {filteredVitals.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {/* Blood Pressure */}
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">🩸 Blood Pressure</div>
                    <div className={`text-xl font-bold ${
                      avgSystolic && avgDiastolic
                        ? (avgSystolic < 120 && avgDiastolic < 80 ? 'text-green-600'
                          : avgSystolic < 130 ? 'text-yellow-600' : 'text-red-600')
                        : 'text-gray-400'
                    }`}>
                      {avgSystolic && avgDiastolic ? `${avgSystolic}/${avgDiastolic}` : '—'}
                    </div>
                    <div className="text-xs text-gray-400">{bpReadings.length} readings</div>
                  </div>

                  {/* Heart Rate */}
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">💓 Heart Rate</div>
                    <div className="text-xl font-bold text-gray-800">
                      {avgHR || '—'} <span className="text-sm font-normal text-gray-400">bpm</span>
                    </div>
                    <div className="text-xs text-gray-400">{hrReadings.length} readings</div>
                  </div>

                  {/* SpO2 */}
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">🫁 SpO2</div>
                    <div className={`text-xl font-bold ${
                      avgSpO2 ? (avgSpO2 >= 95 ? 'text-green-600' : avgSpO2 >= 90 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400'
                    }`}>
                      {avgSpO2 || '—'}<span className="text-sm font-normal">%</span>
                    </div>
                    <div className="text-xs text-gray-400">{spo2Readings.length} readings</div>
                  </div>

                  {/* Total Readings */}
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">📋 Total</div>
                    <div className="text-xl font-bold text-purple-600">{filteredVitals.length}</div>
                    <div className="text-xs text-gray-400">vitals logged</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No vitals data for this period</p>
              )}
            </div>

            {/* Nutrition Averages */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
                🍽️ Daily Nutrition Averages
                <span className="text-xs font-normal text-gray-400">({filteredDays.length} days)</span>
              </h3>
              {nutritionAvg ? (
                <div className="space-y-3">
                  {/* Calories */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Calories</span>
                      <span className="font-medium">{nutritionAvg.calories} / 2500</span>
                    </div>
                    <ProgressBar value={nutritionAvg.calories} max={2500} />
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-sm font-bold text-gray-800">{nutritionAvg.protein}g</div>
                      <div className="text-xs text-gray-500">Protein</div>
                      <div className="text-xs text-gray-400">{Math.round(nutritionAvg.protein/60*100)}%</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-sm font-bold text-gray-800">{nutritionAvg.carbs}g</div>
                      <div className="text-xs text-gray-500">Carbs</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="text-sm font-bold text-gray-800">{nutritionAvg.fat}g</div>
                      <div className="text-xs text-gray-500">Fat</div>
                    </div>
                  </div>

                  {/* Fiber */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Fiber</span>
                      <span className="font-medium">{nutritionAvg.fiber}g / 30g</span>
                    </div>
                    <ProgressBar value={nutritionAvg.fiber} max={30} />
                  </div>

                  {/* Added Sugar (limit) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Added Sugar</span>
                      <span className={`font-medium ${nutritionAvg.addedSugar > 36 ? 'text-red-600' : 'text-green-600'}`}>
                        {nutritionAvg.addedSugar}g / 36g
                      </span>
                    </div>
                    <ProgressBar value={nutritionAvg.addedSugar} max={36} isLimit />
                  </div>

                  {/* Sodium (limit) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Sodium</span>
                      <span className={`font-medium ${nutritionAvg.sodium > 2300 ? 'text-red-600' : 'text-green-600'}`}>
                        {nutritionAvg.sodium}mg / 2300mg
                      </span>
                    </div>
                    <ProgressBar value={nutritionAvg.sodium} max={2300} isLimit />
                  </div>

                  {/* Omega-3 (marine: EPA+DHA) */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Omega-3 (EPA+DHA)</span>
                      <span className="font-medium">{nutritionAvg.omega3EPADHA} mg / 500 mg</span>
                    </div>
                    <ProgressBar value={nutritionAvg.omega3EPADHA} max={500} />
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No nutrition data for this period</p>
              )}
            </div>

            {/* Summary Stats */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-bold text-purple-700 text-sm mb-2">📈 Period Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-600">Days Tracked:</span>
                  <span className="font-medium">{filteredDays.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Vitals Logged:</span>
                  <span className="font-medium">{filteredVitals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Weight Readings:</span>
                  <span className="font-medium">{weightReadings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Period:</span>
                  <span className="font-medium">{period === 'all' ? 'All Time' : `${period} Days`}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

// Fasting Panel Component (Right Slide-in)
const FastingPanel = ({ isOpen, onClose, fastingData, onStartFast, onEndFast, onUpdateNotes, onSetStartTime }) => {
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showTimeAdjust, setShowTimeAdjust] = useState(false);
  const [adjustHours, setAdjustHours] = useState('');
  const [adjustMinutes, setAdjustMinutes] = useState('');

  // Update timer every second when fasting is active
  useEffect(() => {
    if (fastingData?.isActive) {
      const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
      return () => clearInterval(timer);
    }
  }, [fastingData?.isActive]);

  // Load notes when panel opens
  useEffect(() => {
    if (isOpen && fastingData?.notes) {
      setNotes(fastingData.notes);
    }
  }, [isOpen, fastingData?.notes]);

  const TARGET_HOURS = 96; // 4 days

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!fastingData?.startTime) return { hours: 0, minutes: 0, seconds: 0, totalHours: 0 };
    const elapsed = currentTime - fastingData.startTime;
    const totalSeconds = Math.floor(elapsed / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds, totalHours: elapsed / (1000 * 60 * 60) };
  };

  const elapsed = getElapsedTime();
  const progressPercent = Math.min((elapsed.totalHours / TARGET_HOURS) * 100, 100);

  // Fasting phases based on hours
  const getPhase = (hours) => {
    if (hours < 12) return { name: 'Fed State', color: 'bg-gray-400', description: 'Glycogen stores being used' };
    if (hours < 18) return { name: 'Transition', color: 'bg-yellow-500', description: 'Entering fat burning mode' };
    if (hours < 24) return { name: 'Ketosis', color: 'bg-orange-500', description: 'Fat becoming primary fuel' };
    if (hours < 48) return { name: 'Autophagy', color: 'bg-blue-500', description: 'Cellular cleanup beginning' };
    if (hours < 72) return { name: 'Deep Autophagy', color: 'bg-purple-500', description: 'Enhanced cellular renewal' };
    return { name: 'Extended Fast', color: 'bg-indigo-600', description: 'Maximum autophagy & renewal' };
  };

  const currentPhase = getPhase(elapsed.totalHours);

  const phases = [
    { hours: 0, name: 'Fed', short: 'Fed' },
    { hours: 12, name: 'Transition', short: '12h' },
    { hours: 18, name: 'Ketosis', short: '18h' },
    { hours: 24, name: 'Autophagy', short: '24h' },
    { hours: 48, name: 'Deep Autophagy', short: '48h' },
    { hours: 72, name: 'Extended', short: '72h' },
    { hours: 96, name: 'Complete', short: '96h' },
  ];

  const handleSaveNotes = () => {
    onUpdateNotes(notes);
  };

  const formatDuration = (hours, minutes, seconds) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) {
      return `${days}d ${remainingHours}h ${minutes}m ${seconds}s`;
    }
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>🍃</span> Fasting Tracker
              </h2>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 w-8 h-8 rounded flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-white/80 mt-1">4-Day Extended Fast</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Main Timer Display */}
            <div className={`rounded-lg p-6 text-center ${fastingData?.isActive ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-gray-50'}`}>
              {fastingData?.isActive ? (
                <>
                  <div className="text-4xl font-bold text-emerald-700 font-mono">
                    {formatDuration(elapsed.hours, elapsed.minutes, elapsed.seconds)}
                  </div>
                  <div className="text-sm text-emerald-600 mt-2">
                    Started: {new Date(fastingData.startTime).toLocaleString()}
                  </div>
                  <div className={`inline-block mt-3 px-3 py-1 rounded-full text-white text-sm font-medium ${currentPhase.color}`}>
                    {currentPhase.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {currentPhase.description}
                  </div>
                  <button
                    onClick={() => setShowTimeAdjust(!showTimeAdjust)}
                    className="mt-2 text-xs text-emerald-500 hover:text-emerald-700 underline"
                  >
                    Adjust start time
                  </button>
                  {showTimeAdjust && (
                    <div className="mt-3 p-3 bg-white rounded-lg border">
                      <div className="text-xs text-gray-600 mb-2">I started fasting X hours ago:</div>
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="number"
                          value={adjustHours}
                          onChange={e => setAdjustHours(e.target.value)}
                          placeholder="hrs"
                          className="w-16 border rounded px-2 py-1 text-sm text-center"
                          min="0"
                          max="96"
                        />
                        <span className="text-gray-500">h</span>
                        <input
                          type="number"
                          value={adjustMinutes}
                          onChange={e => setAdjustMinutes(e.target.value)}
                          placeholder="min"
                          className="w-16 border rounded px-2 py-1 text-sm text-center"
                          min="0"
                          max="59"
                        />
                        <span className="text-gray-500">m ago</span>
                      </div>
                      <button
                        onClick={() => {
                          const h = parseInt(adjustHours) || 0;
                          const m = parseInt(adjustMinutes) || 0;
                          const newStart = Date.now() - (h * 60 + m) * 60 * 1000;
                          onSetStartTime(newStart);
                          setShowTimeAdjust(false);
                          setAdjustHours('');
                          setAdjustMinutes('');
                        }}
                        className="mt-2 bg-emerald-500 text-white px-3 py-1 rounded text-xs w-full"
                      >
                        Set Start Time
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-400">
                  <div className="text-6xl mb-2">🍃</div>
                  <div className="text-lg font-medium">Ready to fast?</div>
                  <div className="text-sm">Start your 4-day journey</div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Progress to 96 hours</span>
                <span className="text-emerald-600 font-bold">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0h</span>
                <span>24h</span>
                <span>48h</span>
                <span>72h</span>
                <span>96h</span>
              </div>
            </div>

            {/* Phase Timeline */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3">🎯 Fasting Phases</h3>
              <div className="space-y-2">
                {phases.slice(0, -1).map((phase, i) => {
                  const nextPhase = phases[i + 1];
                  const isComplete = elapsed.totalHours >= nextPhase.hours;
                  const isCurrent = elapsed.totalHours >= phase.hours && elapsed.totalHours < nextPhase.hours;
                  const progress = isCurrent
                    ? ((elapsed.totalHours - phase.hours) / (nextPhase.hours - phase.hours)) * 100
                    : isComplete ? 100 : 0;

                  return (
                    <div key={phase.hours} className="flex items-center gap-2">
                      <div className={`w-16 text-xs font-medium ${isComplete || isCurrent ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {phase.short}
                      </div>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : isCurrent ? 'bg-emerald-400' : 'bg-gray-200'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className={`w-20 text-xs ${isComplete ? 'text-emerald-600 font-medium' : isCurrent ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {phase.name}
                      </div>
                      {isComplete && <span className="text-emerald-500">✓</span>}
                      {isCurrent && <span className="text-emerald-400 animate-pulse">●</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 text-sm mb-2">📝 Notes & Symptoms</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Track how you're feeling, energy levels, symptoms..."
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              />
              <button
                onClick={handleSaveNotes}
                className="mt-2 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm text-gray-700"
              >
                Save Notes
              </button>
            </div>

            {/* Tips Section */}
            <div className="bg-teal-50 rounded-lg p-4 text-xs">
              <h4 className="font-bold text-teal-700 mb-2">💡 Fasting Tips</h4>
              <div className="space-y-1 text-teal-600">
                <div>• Stay hydrated - water, black coffee, plain tea are OK</div>
                <div>• Electrolytes help - sodium, potassium, magnesium</div>
                <div>• Light activity is beneficial, avoid intense exercise</div>
                <div>• Break fast gently with bone broth or light protein</div>
              </div>
            </div>

            {/* Start/End Button */}
            <div className="pt-2">
              {fastingData?.isActive ? (
                <button
                  onClick={onEndFast}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  🛑 End Fast
                </button>
              ) : (
                <button
                  onClick={onStartFast}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  🍃 Start 4-Day Fast
                </button>
              )}
            </div>

            {/* Last Fast Info */}
            {!fastingData?.isActive && fastingData?.lastEndTime && (
              <div className="bg-gray-100 rounded-lg p-3 text-center text-sm text-gray-600">
                <div>Last fast ended:</div>
                <div className="font-medium">{new Date(fastingData.lastEndTime).toLocaleString()}</div>
                {fastingData.lastDuration && (
                  <div className="text-xs text-gray-400 mt-1">
                    Duration: {Math.floor(fastingData.lastDuration / 24)}d {Math.floor(fastingData.lastDuration % 24)}h
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

const HealthTracker = () => {
  const VERSION = "2.0.0";
  const today = new Date().toLocaleDateString('en-CA');

  const [selectedDate, setSelectedDate] = useState(today);
  const [allDaysData, setAllDaysData] = useState({});
  const [foods, setFoods] = useState([]);
  const [foodLibrary, setFoodLibrary] = useState([]);
  const [foodInput, setFoodInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saveMessage, setSaveMessage] = useState('');
  const [backupWorking, setBackupWorking] = useState(false);
  const [preRestoreAvailable, setPreRestoreAvailable] = useState(false);
  const [people, setPeople] = useState([]);
  const [activePerson, setActivePersonId] = useState(1);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [addedMessage, setAddedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [waterOz, setWaterOz] = useState(0);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [vitals, setVitals] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userSettings, setUserSettings] = useState({});
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [allVitals, setAllVitals] = useState([]);
  const [fastingOpen, setFastingOpen] = useState(false);
  const [fastingData, setFastingData] = useState(null);
  const [nutritionConfig, setNutritionConfig] = useState(null);
  const fileInputRef = useRef(null);

  // Water tracked in ounces on a fixed 0–100 oz scale, stepped 2 oz at a time
  const WATER_MAX = 100;  // oz — full scale
  const WATER_STEP = 2;   // oz — increment per +/- press
  const WATER_GOAL = nutritionConfig ? getWaterTarget(nutritionConfig) : 0; // oz — optional goal marker
  const FASTING_KEY = 'health-tracker-fasting';

  // Water tracking helpers (stored in ounces)
  const getWaterKey = (date) => `health-tracker-water-oz-${date}`;

  const loadWater = (date) => {
    try {
      const saved = localStorage.getItem(getWaterKey(date));
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  };

  const saveWater = (date, oz) => {
    try {
      localStorage.setItem(getWaterKey(date), oz.toString());
    } catch (e) { console.error('Error saving water:', e); }
  };

  // Set water to an absolute oz amount, clamped to the 0–100 scale
  const setWater = (oz) => {
    const clamped = Math.max(0, Math.min(WATER_MAX, oz));
    setWaterOz(clamped);
    saveWater(selectedDate, clamped);
  };

  const addWater = () => setWater(waterOz + WATER_STEP);
  const removeWater = () => setWater(waterOz - WATER_STEP);

  // Fasting tracking helpers
  const loadFastingData = () => {
    try {
      const saved = localStorage.getItem(FASTING_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const saveFastingData = (data) => {
    try {
      localStorage.setItem(FASTING_KEY, JSON.stringify(data));
    } catch (e) { console.error('Error saving fasting data:', e); }
  };

  const handleStartFast = () => {
    const data = {
      isActive: true,
      startTime: Date.now(),
      notes: '',
      lastEndTime: fastingData?.lastEndTime || null,
      lastDuration: fastingData?.lastDuration || null
    };
    setFastingData(data);
    saveFastingData(data);
  };

  const handleEndFast = () => {
    if (!fastingData?.startTime) return;
    const duration = (Date.now() - fastingData.startTime) / (1000 * 60 * 60); // hours
    const data = {
      isActive: false,
      startTime: null,
      notes: '',
      lastEndTime: Date.now(),
      lastDuration: duration
    };
    setFastingData(data);
    saveFastingData(data);
  };

  const handleUpdateFastingNotes = (notes) => {
    if (!fastingData) return;
    const data = { ...fastingData, notes };
    setFastingData(data);
    saveFastingData(data);
  };

  const handleSetFastingStartTime = (startTime) => {
    const data = { ...fastingData, startTime };
    setFastingData(data);
    saveFastingData(data);
  };

  // Load food library and day logs from database on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [library, logs] = await Promise.all([
          getAllFoods(),
          getAllDayLogs()
        ]);
        setFoodLibrary(library);
        setAllDaysData(logs);
        // Load today's foods if available
        if (logs[today]) {
          setFoods(logs[today].map(f => ({ ...f, id: f.id || Date.now() + Math.random() })));
        }
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
    setWaterOz(loadWater(today));
    loadVitalsForDate(today);
    loadUserSettings();
    loadAllVitalsData();
    setFastingData(loadFastingData());
    loadNutritionConfig();
  }, []);

  // Load all vitals for analytics
  const loadAllVitalsData = async () => {
    try {
      const vitals = await getAllVitals();
      setAllVitals(vitals);
    } catch (e) {
      console.error('Error loading all vitals:', e);
    }
  };

  // Load user settings
  const loadUserSettings = async () => {
    try {
      const settings = await getSettings();
      setUserSettings(settings);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  // Load nutrition config (or initialize with defaults)
  const loadNutritionConfig = async () => {
    try {
      let config = await getNutritionConfig();
      if (!config) {
        // First run - initialize with default config
        await saveNutritionConfig(defaultNutritionConfig);
        config = defaultNutritionConfig;
        console.log('Initialized nutrition config with defaults');
      }
      setNutritionConfig(config);
    } catch (e) {
      console.error('Error loading nutrition config:', e);
      // Fallback to defaults if there's an error
      setNutritionConfig(defaultNutritionConfig);
    }
  };

  // Handle saving settings
  const handleSaveSettings = async (newSettings) => {
    await saveSettings(newSettings);
    setUserSettings(newSettings);
  };

  // Load water and vitals when date changes
  useEffect(() => {
    setWaterOz(loadWater(selectedDate));
    loadVitalsForDate(selectedDate);
  }, [selectedDate]);

  // Load vitals for a specific date
  const loadVitalsForDate = async (date) => {
    try {
      const dateVitals = await getVitalsForDate(date);
      setVitals(dateVitals);
    } catch (e) {
      console.error('Error loading vitals:', e);
      setVitals([]);
    }
  };

  // Handle adding a vital
  const handleAddVital = async (vital) => {
    await addVital(vital);
    await loadVitalsForDate(selectedDate);
    await loadAllVitalsData(); // Refresh analytics data
  };

  // Handle deleting a vital
  const handleDeleteVital = async (vitalId) => {
    await deleteVital(vitalId);
    await loadVitalsForDate(selectedDate);
    await loadAllVitalsData(); // Refresh analytics data
  };

  const getTodayString = () => new Date().toLocaleDateString('en-CA');
  const getCurrentTimeString = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${minutes} ${ampm}`;
  };

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    
    if (dateStr === today) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const navigateDate = async (direction) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + direction);
    const newDate = current.toLocaleDateString('en-CA');

    // Don't go into the future
    if (newDate > getTodayString()) return;

    setSelectedDate(newDate);

    // Load foods for new date from memory or database
    if (allDaysData[newDate]) {
      setFoods(allDaysData[newDate].map(f => ({ ...f, id: f.id || Date.now() + Math.random() })));
    } else {
      // Try loading from database
      const dayFoods = await getDayLog(newDate);
      setFoods(dayFoods.map(f => ({ ...f, id: f.id || Date.now() + Math.random() })));
    }
  };

  const isToday = selectedDate === getTodayString();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Show the "Undo restore" affordance only when a pre-restore safety copy exists
  useEffect(() => {
    if (canBackup) hasPreRestore().then(setPreRestoreAvailable).catch(() => {});
  }, []);

  // Save foods to database when foods change
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    // Update local state
    setAllDaysData(prev => ({ ...prev, [selectedDate]: foods }));

    // Save to database
    saveDayLog(selectedDate, foods).catch(console.error);
  }, [foods, selectedDate, isLoading]);

  // Dynamic RDA based on nutrition config (with fallback defaults)
  const rda = configToRda(nutritionConfig) || {
    calories: { max: 2100, unit: '' }, protein: { max: 135, unit: 'g' }, fiber: { max: 38, unit: 'g' },
    carbs: { max: 225, unit: 'g' }, fat: { max: 70, unit: 'g' },
    saturatedFat: { max: 13, unit: 'g', isLimit: true }, cholesterol: { max: 200, unit: 'mg', isLimit: true },
    addedSugar: { max: 25, unit: 'g', isLimit: true }, sodium: { max: 1500, unit: 'mg', isLimit: true },
    omega3EPA: { max: 1.0, unit: 'g' }, omega3DHA: { max: 0.75, unit: 'g' },
    calcium: { max: 1000, unit: 'mg' }, iron: { max: 8, unit: 'mg' }, potassium: { max: 4000, unit: 'mg' },
    magnesium: { max: 420, unit: 'mg' }, zinc: { max: 11, unit: 'mg' },
    vitD: { max: 25, unit: 'mcg' }, vitK: { max: 120, unit: 'mcg' },
    vitE: { max: 15, unit: 'mg' }, vitC: { max: 90, unit: 'mg' }, vitA: { max: 900, unit: 'mcg' },
    choline: { max: 550, unit: 'mg' }, b12: { max: 2.4, unit: 'mcg' }, folate: { max: 400, unit: 'mcg' }
  };

  const calculateTotals = (arr) => {
    const t = {};
    const allKeys = [
      // Macros
      'calories','protein','carbs','fat','saturatedFat','transFat','fiber','sugar','addedSugar','sodium','cholesterol',
      // Vitamins
      'vitA','vitC','vitD','vitE','vitK','thiamin','riboflavin','niacin','pantothenicAcid','b6','biotin','folate','b12','choline',
      // Minerals
      'calcium','iron','magnesium','phosphorus','potassium','zinc','copper','manganese','selenium','iodine','chromium','molybdenum',
      // Omega-3s
      'omega3ALA','omega3EPA','omega3DHA',
      // Compounds
      'nac','lionsMane','creatine','lTheanine','ashwagandha','shilajit','lysine','glycine','taurine','rhodiola','caffeine','citicoline','alphaGPC','uridine'
    ];
    allKeys.forEach(k => t[k] = 0);
    arr.forEach(f => {
      allKeys.forEach(k => t[k] += (f[k] || 0));
    });
    return t;
  };

  const totals = calculateTotals(foods);
  const brainScore = computeBrainScore(totals);
  const heartScore = computeHeartScore(totals);

  // Which lens to show, and the weight-loss metrics for the active profile
  const activeGoalType = (people.find(p => p.id === activePerson) || {}).goal_type || 'nutrition_optimization';
  const weightLoss = activeGoalType === 'weight_loss'
    ? computeWeightLoss({
        weighIns: (allVitals || []).filter(v => v.weight != null).map(v => ({ date: v.date, weight: v.weight })),
        intakeByDate: Object.fromEntries(Object.entries(allDaysData || {}).map(([dt, arr]) => [dt, (arr || []).reduce((s, f) => s + (f.calories || 0), 0)])),
        settings: userSettings,
        age: ageFromBirthdate(userSettings && userSettings.birthdate),
        todayIntake: totals.calories,
        todayProtein: totals.protein,
      })
    : null;

  const handleAddFood = async () => {
    setInputError('');
    try {
      const trimmed = foodInput.trim();
      if (!trimmed) return;
      let parsed = trimmed.startsWith('[') ? JSON.parse(trimmed) : [JSON.parse(trimmed)];
      const newFoods = parsed.map(f => ({
        id: Date.now() + Math.random(),
        time: f.time || getCurrentTimeString(),
        name: f.name || 'Unknown',
        ...f
      }));
      setFoods(prev => [...prev, ...newFoods].sort((a, b) => a.time.localeCompare(b.time)));
      setFoodInput('');

      // Add new foods to library if they don't exist
      let addedToLibrary = [];
      for (const food of parsed) {
        if (food.name) {
          const wasAdded = await addFood(food);
          if (wasAdded) {
            addedToLibrary.push(food.name);
          }
        }
      }

      // Refresh library if new foods were added
      if (addedToLibrary.length > 0) {
        const updatedLibrary = await getAllFoods();
        setFoodLibrary(updatedLibrary);
      }

      // Show confirmation
      const names = newFoods.map(f => f.name).join(', ');
      const libraryMsg = addedToLibrary.length > 0 ? ` (+ saved to Quick Add)` : '';
      setAddedMessage(`✓ Added: ${names}${libraryMsg}`);
      setTimeout(() => setAddedMessage(''), 3000);
    } catch (e) {
      setInputError('Invalid JSON');
    }
  };
  
  // Multi-person: load profiles, switch, add
  const refreshPeople = async () => {
    try {
      const [list, active] = await Promise.all([listPeople(), getActivePerson()]);
      setPeople(list || []);
      setActivePersonId(active || 1);
    } catch { /* single-person fallback */ }
  };

  const switchPerson = async (id) => {
    if (id === activePerson) return;
    await setActivePerson(id);
    window.location.reload(); // reload all per-person data for the new profile
  };

  const handleAddProfile = () => setAddProfileOpen(true);

  const createProfile = async (name, goalType) => {
    const id = await addPerson({ name: (name || '').trim() || 'New profile', goal_type: goalType });
    if (id) { await setActivePerson(id); window.location.reload(); }
  };

  useEffect(() => { refreshPeople(); }, []);

  const handleBackup = async () => {
    if (backupWorking) return;
    setBackupWorking(true);
    setSaveMessage('☁️ Backing up…');
    try {
      const res = await backupData();
      if (res?.ok) setPreRestoreAvailable(false); // restored state committed; undo no longer applies
      setSaveMessage((res?.ok ? '✓ ' : '⚠️ ') + (res?.message || (res?.ok ? 'Backed up' : 'Backup failed')));
    } catch {
      setSaveMessage('⚠️ Backup failed');
    } finally {
      setBackupWorking(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  const handleRestore = async () => {
    if (backupWorking) return;
    if (!window.confirm('Restore replaces your current local data with the latest cloud backup. This cannot be undone. Continue?')) return;
    setBackupWorking(true);
    setSaveMessage('☁️ Restoring…');
    try {
      const res = await restoreData();
      if (res?.ok) {
        setSaveMessage('✓ ' + (res.message || 'Restored'));
        setTimeout(() => window.location.reload(), 900); // reload to pick up the swapped DB
      } else {
        setSaveMessage('⚠️ ' + (res?.message || 'Restore failed'));
        setBackupWorking(false);
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch {
      setSaveMessage('⚠️ Restore failed');
      setBackupWorking(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  const handleRestoreUndo = async () => {
    if (backupWorking) return;
    if (!window.confirm('Undo the last restore? This puts back the data you had right before restoring.')) return;
    setBackupWorking(true);
    setSaveMessage('↩️ Undoing restore…');
    try {
      const res = await undoRestore();
      if (res?.ok) {
        setSaveMessage('✓ ' + (res.message || 'Reverted'));
        setTimeout(() => window.location.reload(), 900);
      } else {
        setSaveMessage('⚠️ ' + (res?.message || 'Undo failed'));
        setBackupWorking(false);
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch {
      setSaveMessage('⚠️ Undo failed');
      setBackupWorking(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  const saveDay = () => {
    try {
      const exportData = {
        date: selectedDate,
        version: VERSION,
        foods: foods.map(f => {
          const clean = {};
          Object.keys(f).forEach(k => {
            if (f[k] !== undefined && f[k] !== null && k !== 'id') {
              clean[k] = f[k];
            }
          });
          return clean;
        }),
        totals: {
          calories: totals.calories || 0,
          protein: totals.protein || 0,
          carbs: totals.carbs || 0,
          fat: totals.fat || 0,
          fiber: totals.fiber || 0,
          addedSugar: totals.addedSugar || 0,
          sodium: totals.sodium || 0,
          brain: brainScore.score,
          heart: heartScore.score
        }
      };
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      
      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(jsonStr).catch(() => {});
      }
      
      // Download file
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `health-${selectedDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveMessage('Error saving');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.foods) {
          setFoods(data.foods.map(f => ({ ...f, id: Date.now() + Math.random() })));
          if (data.date) setSelectedDate(data.date);
          if (data.allDays) setAllDaysData(prev => ({ ...prev, ...data.allDays }));
          setSaveMessage('Imported!');
          setTimeout(() => setSaveMessage(''), 2000);
        }
      } catch (err) {}
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  const getStatusColor = (current, max, isLimit) => {
    const pct = (current / max) * 100;
    if (isLimit) return pct > 100 ? 'bg-red-500' : 'bg-green-500';
    return pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400';
  };

  if (isLoading) {
    return (
      <div className="w-full p-4 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-gray-100 min-h-screen">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-4 py-2 mb-4 text-white">
        <div className="flex items-center gap-4">
          {/* Analytics Button */}
          <button
            onClick={() => setAnalyticsOpen(true)}
            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-all shrink-0"
            title="Analytics & Reports"
          >
            📊
          </button>

          {/* Title */}
          <div className="shrink-0">
            <h1 className="text-lg font-bold">Health Tracker</h1>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigateDate(-1)}
              className="bg-white/20 hover:bg-white/30 w-7 h-7 rounded flex items-center justify-center text-sm transition-all"
            >
              ←
            </button>
            <div className="bg-white/10 rounded px-3 py-1 min-w-[100px] text-center text-sm">
              {formatDateDisplay(selectedDate)}
            </div>
            <button
              onClick={() => navigateDate(1)}
              disabled={isToday}
              className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-all ${isToday ? 'bg-white/10 opacity-50 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30'}`}
            >
              →
            </button>
          </div>

          {/* Water Tracker — 0–100 oz scale, ±2 oz */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2">
              <span className="text-xl">💧</span>
              <button
                onClick={removeWater}
                className="bg-white/20 hover:bg-white/30 px-4 py-1 rounded flex items-center justify-center text-lg font-bold transition-all"
                title="−2 oz"
              >
                −
              </button>
              <div className="flex flex-col items-center">
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    setWater(Math.round((pct * WATER_MAX) / WATER_STEP) * WATER_STEP);
                  }}
                  className="relative w-48 h-4 bg-white/20 rounded-full cursor-pointer overflow-hidden"
                  title="Click to set"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-cyan-400 rounded-full shadow-md shadow-cyan-400/40 transition-all"
                    style={{ width: `${(waterOz / WATER_MAX) * 100}%` }}
                  />
                  {WATER_GOAL > 0 && WATER_GOAL <= WATER_MAX && (
                    <div
                      className="absolute inset-y-0 w-0.5 bg-white/80"
                      style={{ left: `${(WATER_GOAL / WATER_MAX) * 100}%` }}
                      title={`Goal: ${WATER_GOAL} oz`}
                    />
                  )}
                </div>
                <div className="flex justify-between w-48 text-[9px] opacity-70 leading-none mt-0.5">
                  <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                </div>
              </div>
              <button
                onClick={addWater}
                className="bg-white/20 hover:bg-white/30 px-4 py-1 rounded flex items-center justify-center text-lg font-bold transition-all"
                title="+2 oz"
              >
                +
              </button>
              <span className="text-sm font-bold ml-1">{waterOz}/{WATER_MAX} oz</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 shrink-0 items-center">
            {canBackup && people.length > 0 && (
              <select
                value={activePerson}
                onChange={(e) => { const v = e.target.value; v === '__add__' ? handleAddProfile() : switchPerson(Number(v)); }}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded text-sm transition-all cursor-pointer focus:outline-none"
                title="Switch profile"
              >
                {people.map(p => (
                  <option key={p.id} value={p.id} className="text-gray-800">
                    {p.goal_type === 'weight_loss' ? '⚖️ ' : '🧠 '}{p.name}
                  </option>
                ))}
                <option value="__add__" className="text-gray-800">➕ Add profile…</option>
              </select>
            )}
            <button
              onClick={() => setFastingOpen(true)}
              className={`px-2 py-1 rounded text-sm transition-all flex items-center gap-1 ${fastingData?.isActive ? 'bg-emerald-400 hover:bg-emerald-500' : 'bg-white/20 hover:bg-white/30'}`}
              title="Fasting Tracker"
            >
              🍃 {fastingData?.isActive && <span className="text-xs animate-pulse">●</span>}
            </button>
            <button
              onClick={() => setVitalsOpen(true)}
              className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-all flex items-center gap-1"
              title="Track Vitals"
            >
              ❤️ {vitals.length > 0 && <span className="text-xs">({vitals.length})</span>}
            </button>
            <button onClick={saveDay} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-all" title="Export Day">💾</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-all" title="Import">📂</button>
            {canBackup && (
              <button onClick={handleBackup} disabled={backupWorking} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-all disabled:opacity-50" title="Backup to cloud">
                {backupWorking ? '⏳' : '☁️'}
              </button>
            )}
            {canBackup && (
              <button onClick={handleRestore} disabled={backupWorking} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-all disabled:opacity-50" title="Restore from cloud">
                ☁️↓
              </button>
            )}
            {canBackup && preRestoreAvailable && (
              <button onClick={handleRestoreUndo} disabled={backupWorking} className="bg-amber-400/30 hover:bg-amber-400/40 px-2 py-1 rounded text-sm transition-all disabled:opacity-50" title="Undo last restore">
                ↩️
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-sm transition-all"
              title="Settings"
            >
              ⚙️
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
          </div>
        </div>
        {saveMessage && <p className="text-xs mt-1 text-center">{saveMessage}</p>}
      </div>

      {/* 3-Panel Layout */}
      <div className="grid grid-cols-3 gap-4">

        {/* LEFT PANEL: Food */}
        <div className="bg-white rounded-lg border p-4 space-y-4 overflow-y-auto" style={{maxHeight: 'calc(100vh - 140px)'}}>
          <h2 className="font-bold text-lg text-gray-700 border-b pb-2">🍽️ Food</h2>
          {activeGoalType === 'weight_loss' && <WeightLossDashboard data={weightLoss} />}
          {foods.length > 0 && activeGoalType !== 'weight_loss' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <ScoreCard icon="🧠" name="Brain" data={brainScore} />
                <ScoreCard icon="🫀" name="Heart" data={heartScore} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <div className="flex justify-between"><span className="text-red-700 font-bold text-sm">🍬 Sugar</span><span className="text-lg font-bold">{Math.round((totals.addedSugar/36)*100)}%</span></div>
                  <div className="text-xs text-red-600">{totals.addedSugar?.toFixed(0)}g / 36g</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex justify-between"><span className="text-blue-700 font-bold text-sm">🐟 Omega-3</span><span className="text-lg font-bold">{Math.round((((totals.omega3EPA||0)+(totals.omega3DHA||0))/500)*100)}%</span></div>
                  <div className="text-xs text-blue-600">{Math.round((totals.omega3EPA||0)+(totals.omega3DHA||0))} mg EPA+DHA / 500 mg</div>
                </div>
              </div>
            </>
          )}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">{formatDateDisplay(selectedDate)} ({foods.length} items)</span>
              {foods.length > 0 && <button onClick={() => setFoods([])} className="text-red-500 text-xs">Clear</button>}
            </div>
            {foods.length === 0 ? (
              <p className="text-gray-400 text-center py-4 text-sm">No foods logged yet</p>
            ) : (
              <div className="space-y-1">
                {foods.map(f => {
                  const hasBrain = f.brain && f.brain !== 0;
                  const hasHeart = f.heart && f.heart !== 0;
                  const bgColor = (f.heart < 0 || f.brain < 0) ? 'bg-orange-50' :
                                  (f.heart > 0 || f.brain > 0) ? 'bg-green-50' : 'bg-white';
                  return (
                    <div key={f.id} className={`p-2 rounded text-sm ${bgColor}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="text-gray-400 mr-2 text-xs">{formatTime(f.time)}</span>
                          <span className="font-medium text-sm">{f.name}</span>
                          {hasBrain && <span className={`ml-1 text-xs ${f.brain > 0 ? 'text-green-600' : 'text-orange-600'}`}>🧠{f.brain > 0 ? '+' : ''}{f.brain}</span>}
                          {hasHeart && <span className={`ml-1 text-xs ${f.heart > 0 ? 'text-rose-600' : 'text-red-600'}`}>🫀{f.heart > 0 ? '+' : ''}{f.heart}</span>}
                        </div>
                        <span className="flex gap-2 items-center">
                          <span className="text-gray-500 text-xs">{f.calories || 0} cal</span>
                          <button onClick={() => setFoods(prev => prev.filter(x => x.id !== f.id))} className="text-red-400 text-xs">✕</button>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: Nutrients */}
        <div className="bg-white rounded-lg border p-4 space-y-4 overflow-y-auto" style={{maxHeight: 'calc(100vh - 140px)'}}>
          <h2 className="font-bold text-lg text-gray-700 border-b pb-2">📊 Nutrients</h2>
          {foods.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No foods logged yet</p>
          ) : (
            <>
              {/* MACROS */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">🍽️ Macros</h4>
                <div className="space-y-2">
                  {[
                    ['calories','Calories'],['protein','Protein (g)'],['carbs','Carbs (g)'],
                    ['fat','Fat (g)'],['saturatedFat','Sat Fat (g)'],['fiber','Fiber (g)'],['addedSugar','Added Sugar (g)'],
                    ['cholesterol','Cholesterol (mg)']
                  ].map(([k,l]) => {
                    const val = totals[k]||0;
                    const target = rda[k]?.max;
                    const isLimit = rda[k]?.isLimit || false;
                    if (!target || (val === 0 && k !== 'calories')) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-xs">
                          <span>{l}</span>
                          <span>{val.toFixed(0)} / {target} ({Math.round(val/target*100)}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getStatusColor(val, target, isLimit)}`} style={{width: `${Math.min(val/target*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VITAMINS */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">💊 Vitamins</h4>
                <div className="space-y-2">
                  {[
                    ['vitA','Vit A (mcg)'],['vitC','Vit C (mg)'],['vitD','Vit D (mcg)'],
                    ['vitE','Vit E (mg)'],['vitK','Vit K (mcg)'],['b6','B6 (mg)'],
                    ['folate','Folate (mcg)'],['b12','B12 (mcg)'],['choline','Choline (mg)']
                  ].map(([k,l]) => {
                    const val = totals[k]||0;
                    const target = rda[k]?.max;
                    if (!target || val === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-xs">
                          <span>{l}</span>
                          <span>{val.toFixed(1)} / {target} ({Math.round(val/target*100)}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getStatusColor(val, target, false)}`} style={{width: `${Math.min(val/target*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MINERALS & ELECTROLYTES */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">⚡ Electrolytes & Minerals</h4>
                <div className="space-y-2">
                  {[
                    ['sodium','Sodium (mg)'],['potassium','Potassium (mg)'],['magnesium','Magnesium (mg)'],
                    ['calcium','Calcium (mg)'],['iron','Iron (mg)'],['zinc','Zinc (mg)'],['iodine','Iodine (mcg)'],
                    ['selenium','Selenium (mcg)'],['phosphorus','Phosphorus (mg)']
                  ].map(([k,l]) => {
                    const val = totals[k]||0;
                    const target = rda[k]?.max;
                    const isLimit = rda[k]?.isLimit || false;
                    if (!target || val === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-xs">
                          <span>{l}</span>
                          <span>{val.toFixed(0)} / {target} ({Math.round(val/target*100)}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getStatusColor(val, target, isLimit)}`} style={{width: `${Math.min(val/target*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OMEGA-3s */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">🐟 Omega-3s</h4>
                <div className="space-y-2">
                  {[
                    ['omega3ALA','ALA (g)'],
                    ['omega3EPA','EPA (g)'],
                    ['omega3DHA','DHA (g)']
                  ].map(([k,l]) => {
                    const valMg = totals[k]||0;
                    const valG = valMg / 1000; // Convert mg to g for display
                    const target = rda[k]?.max || (k === 'omega3ALA' ? 1.6 : 1.0);
                    if (valMg === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-xs">
                          <span>{l}</span>
                          <span>{valG.toFixed(2)} / {target} ({Math.round(valG/target*100)}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getStatusColor(valG, target, false)}`} style={{width: `${Math.min(valG/target*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COMPOUNDS */}
              <div className="bg-purple-50 rounded-lg p-3">
                <h4 className="font-bold text-purple-700 mb-2 text-sm">🧠 Compounds</h4>
                <div className="space-y-2">
                  {[
                    ['caffeine','Caffeine (mg)',400],
                    ['nac','NAC (mg)',600],
                    ['lionsMane','Lion\'s Mane (mg)',500],
                    ['creatine','Creatine (mg)',5000],
                    ['lTheanine','L-Theanine (mg)',200],
                    ['ashwagandha','Ashwagandha (mg)',300],
                    ['rhodiola','Rhodiola (mg)',500],
                    ['shilajit','Shilajit (mg)',500],
                    ['citicoline','Citicoline (mg)',500],
                    ['alphaGPC','Alpha-GPC (mg)',600],
                    ['uridine','Uridine (mg)',300],
                    ['lysine','Lysine (mg)',1000],
                    ['glycine','Glycine (mg)',3000],
                    ['taurine','Taurine (mg)',2000]
                  ].map(([k,l,typical]) => {
                    const val = totals[k]||0;
                    if (val === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-xs">
                          <span>{l}</span>
                          <span>{val.toFixed(0)} / {typical}</span>
                        </div>
                        <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500" style={{width: `${Math.min(val/typical*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL: Add */}
        <div className="bg-white rounded-lg border p-4 space-y-4 overflow-y-auto" style={{maxHeight: 'calc(100vh - 140px)'}}>
          <h2 className="font-bold text-lg text-gray-700 border-b pb-2">➕ Add Food</h2>

          {/* Confirmation Toast */}
          {addedMessage && (
            <div className="bg-green-100 border border-green-300 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
              {addedMessage}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-bold text-gray-700 mb-2 text-sm">Paste JSON</h4>
            <textarea value={foodInput} onChange={e => setFoodInput(e.target.value)} placeholder='{"name":"Salmon","calories":280,"heart":3,"brain":2}' className="w-full border rounded p-2 text-xs font-mono h-16" />
            {inputError && <p className="text-red-500 text-xs">{inputError}</p>}
            <button onClick={handleAddFood} className="mt-2 bg-blue-600 text-white px-3 py-1.5 rounded text-sm w-full">Add</button>
          </div>

          {/* Quick Add from Library */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-bold text-gray-700 mb-2 text-sm">⚡ Quick Add ({foodLibrary.length})</h4>
            <div className="space-y-1 overflow-y-auto" style={{maxHeight: 'calc(100vh - 400px)'}}>
              {[...foodLibrary].sort((a,b) => a.name.localeCompare(b.name)).map((f, i) => (
                <QuickAddItem key={f.id || i} food={f} onAdd={(food, qty) => {
                  const multiplied = { ...food };
                  const numericKeys = [
                    'calories','protein','carbs','fat','saturatedFat','transFat','fiber','sugar','addedSugar','sodium','cholesterol',
                    'vitA','vitC','vitD','vitE','vitK','thiamin','riboflavin','niacin','pantothenicAcid','b6','biotin','folate','b12','choline',
                    'calcium','iron','magnesium','phosphorus','potassium','zinc','copper','manganese','selenium','iodine','chromium','molybdenum',
                    'omega3ALA','omega3EPA','omega3DHA',
                    'nac','lionsMane','creatine','lTheanine','ashwagandha','shilajit','lysine','glycine','taurine','rhodiola','caffeine','citicoline','alphaGPC','uridine',
                    'brain','heart'
                  ];
                  numericKeys.forEach(k => {
                    if (multiplied[k]) multiplied[k] = multiplied[k] * qty;
                  });
                  const displayName = qty > 1 ? `${food.name} x${qty}` : food.name;
                  const newFood = {
                    ...multiplied,
                    id: Date.now() + Math.random(),
                    time: getCurrentTimeString(),
                    name: displayName
                  };
                  setFoods(prev => [...prev, newFood].sort((a, b) => a.time.localeCompare(b.time)));
                  setAddedMessage(`✓ Added: ${displayName}`);
                  setTimeout(() => setAddedMessage(''), 3000);
                }} onDelete={async (food) => {
                  if (confirm(`Remove "${food.name}" from your food library?`)) {
                    await deleteFood(food.id);
                    setFoodLibrary(prev => prev.filter(f => f.id !== food.id));
                  }
                }} />
              ))}
            </div>
          </div>
        </div>

      </div>{/* End 3-Panel Grid */}

      {/* Vitals Slide-in Panel */}
      <VitalsPanel
        isOpen={vitalsOpen}
        onClose={() => setVitalsOpen(false)}
        selectedDate={selectedDate}
        vitals={vitals}
        onAddVital={handleAddVital}
        onDeleteVital={handleDeleteVital}
        formatTime={formatTime}
      />

      {/* Add Profile Modal */}
      <AddProfileModal
        isOpen={addProfileOpen}
        onClose={() => setAddProfileOpen(false)}
        onCreate={createProfile}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={userSettings}
        onSave={handleSaveSettings}
      />

      {/* Analytics Panel (Left Slide-in) */}
      <AnalyticsPanel
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        allDaysData={allDaysData}
        allVitals={allVitals}
        userSettings={userSettings}
      />

      {/* Fasting Panel (Right Slide-in) */}
      <FastingPanel
        isOpen={fastingOpen}
        onClose={() => setFastingOpen(false)}
        fastingData={fastingData}
        onStartFast={handleStartFast}
        onEndFast={handleEndFast}
        onUpdateNotes={handleUpdateFastingNotes}
        onSetStartTime={handleSetFastingStartTime}
      />

      {/* Reference panel commented out for now
      <div className="bg-gray-50 rounded-lg border p-4">
        <h3 className="font-bold text-gray-700 mb-3">📋 JSON Fields Reference</h3>
        ...
      </div>
      */}
    </div>
  );
};

export default HealthTracker;
