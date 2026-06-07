import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_FOOD_LIBRARY = [
  {"name":"Tomato - Grape","category":"Vegetable","calories":3,"carbs":0.6,"fiber":0.2,"vitC":2.4,"vitA":80,"potassium":36,"brain":0.1},
  {"name":"Lettuce - Romaine Leaf","category":"Vegetable","calories":3,"protein":0.2,"carbs":0.7,"fiber":0.3,"potassium":27,"vitA":833,"vitC":0.7,"vitK":17,"brain":0.3},
  {"name":"Greens - Spinach/Arugula Leaf","category":"Vegetable","calories":0.3,"protein":0.03,"fiber":0.03,"vitA":57,"vitC":0.3,"vitK":3,"magnesium":0.4,"brain":0.3},
  {"name":"Mushroom - Slice","category":"Vegetable","calories":1.5,"protein":0.1,"fiber":0.06,"potassium":19,"selenium":0.75,"brain":0.1},
  {"name":"Cucumber - Mini","category":"Vegetable","calories":16,"protein":0.7,"carbs":3.6,"fiber":0.5,"sugar":2,"potassium":150,"magnesium":13,"vitK":8,"brain":0.5},
  {"name":"Broccoli - Floret","category":"Vegetable","calories":5,"protein":0.4,"carbs":1,"fiber":0.4,"potassium":47,"magnesium":3,"calcium":7,"vitC":13,"vitK":15,"brain":0.7},
  {"name":"Celery - Stalk","category":"Vegetable","calories":6,"carbs":1,"fiber":0.6,"potassium":104,"vitK":12,"brain":0.3},
  {"name":"Carrot - Medium","category":"Vegetable","calories":25,"carbs":6,"fiber":1.7,"sugar":3,"potassium":195,"vitA":10190,"vitK":8,"brain":0.5},
  {"name":"Onion - White (1/8)","category":"Vegetable","calories":5,"carbs":1.2,"fiber":0.2,"potassium":18,"vitC":1,"brain":0.1},
  {"name":"Egg - Deviled Half","category":"Protein","calories":63,"protein":3,"carbs":0.5,"fat":5.5,"sodium":95,"calcium":13,"vitA":135,"vitD":0.3,"selenium":7.5,"iodine":12,"omega3DHA":0.025,"brain":1.5},
  {"name":"Egg - Hard Boiled","category":"Protein","calories":78,"protein":6,"fat":5,"calcium":25,"iron":0.9,"vitA":270,"vitD":0.5,"selenium":15,"iodine":24,"omega3DHA":0.05,"brain":3},
  {"name":"Shrimp - Large","category":"Protein","calories":12,"protein":2.3,"carbs":0.1,"fat":0.15,"iodine":5,"selenium":4.5,"zinc":0.15,"potassium":18,"magnesium":3.5,"omega3EPA":0.01,"omega3DHA":0.01,"brain":0.2},
  {"name":"Bacon - Strip","category":"Protein","calories":43,"protein":3,"fat":3.3,"sodium":137,"brain":-0.5},
  {"name":"Fruit - Banana","category":"Fruit","calories":105,"protein":1.3,"carbs":27,"fiber":3,"sugar":14,"potassium":422,"magnesium":32,"vitC":10,"brain":1},
  {"name":"Milk - 2% (8 oz)","category":"Dairy","servingSize":"8 oz","calories":122,"protein":8,"carbs":12,"fat":4.8,"sugar":12,"addedSugar":0,"sodium":120,"calcium":290,"potassium":360,"magnesium":27,"vitA":150,"vitD":3,"iodine":55,"brain":0},
  {"name":"Milk - Chocolate (8 oz)","category":"Dairy","servingSize":"8 oz","calories":187,"protein":5,"carbs":17,"fat":5,"sugar":16,"addedSugar":8,"calcium":200,"potassium":280,"vitD":1.7,"brain":0},
  {"name":"Cheese - Cheddar (1 oz)","category":"Dairy","servingSize":"1 oz","calories":113,"protein":7,"fat":9,"sodium":174,"calcium":200,"vitA":300,"brain":0.5},
  {"name":"Juice - Simply Orange w/ Calcium & D (8 oz)","category":"Beverage","servingSize":"8 fl oz","calories":110,"protein":2,"carbs":26,"sugar":23,"addedSugar":0,"vitD":2.5,"calcium":350,"potassium":450,"vitC":72,"thiamin":0.1,"niacin":0.3,"b6":0.07,"folate":40,"magnesium":25,"brain":1},
  {"name":"Soda - Pepsi (12 oz)","category":"Beverage","servingSize":"12 oz","calories":150,"carbs":41,"sugar":41,"addedSugar":41,"sodium":30,"brain":-3},
  {"name":"Beer - Modelo (12 oz)","category":"Alcohol","servingSize":"12 oz","calories":143,"carbs":13.6,"protein":1.1,"sodium":14,"potassium":90,"brain":-2},
  {"name":"Tea - Chamomile","category":"Beverage","servingSize":"1 cup","calories":2,"potassium":20,"magnesium":5,"brain":2},
  {"name":"Coffee - Black (8 oz)","category":"Beverage","servingSize":"8 oz","calories":2,"potassium":116,"magnesium":7,"caffeine":95,"brain":1},
  {"name":"Peanut Butter - 1 tbsp","category":"Protein","servingSize":"1 tbsp","calories":95,"protein":3.5,"carbs":3.5,"fat":8,"fiber":1,"sodium":70,"potassium":90,"magnesium":25,"vitE":1.25,"brain":0.5},
  {"name":"Chocolate - Ghirardelli 72% Dark Square","category":"Snack","calories":65,"fat":5.5,"carbs":5.5,"fiber":1.5,"sugar":3.5,"addedSugar":3,"protein":1,"calcium":5,"iron":0.45,"potassium":75,"magnesium":20,"brain":1},
  {"name":"Cereal - Life (1 cup)","category":"Grain","servingSize":"1 cup","calories":147,"protein":4,"carbs":30,"fat":2,"fiber":2.7,"sugar":8,"addedSugar":8,"sodium":200,"calcium":113,"iron":8.7,"brain":-0.7},
  {"name":"Soup - Turkey Rice (1 cup)","category":"Meal","servingSize":"1 cup","calories":107,"protein":7,"carbs":12,"fat":3,"fiber":1,"sodium":283,"potassium":150,"vitA":1000,"iron":0.7,"zinc":0.8,"brain":0.7},
  {"name":"Meal - Chipotle Bowl Chicken","category":"Meal","servingSize":"1 bowl","calories":805,"protein":58,"carbs":74,"fat":31,"saturatedFat":12,"fiber":11,"sugar":4,"sodium":2265,"potassium":650,"calcium":350,"iron":3.5,"vitC":12,"brain":1},
  {"name":"Dressing - Olive Garden (1 oz)","category":"Condiment","servingSize":"1 oz","calories":80,"fat":8.5,"carbs":1,"sodium":255,"addedSugar":0.5,"brain":-0.25},
  {"name":"Seasoning - Old Bay (1 tsp)","category":"Condiment","servingSize":"1 tsp","calories":1,"sodium":65,"brain":0},
  {"name":"Seasoning - Cracked Pepper (1 tsp)","category":"Condiment","servingSize":"1 tsp","calories":6,"fiber":0.5,"iron":0.3,"brain":0.1},
  {"name":"Supplement: Fiber - Metamucil Orange (1 tbsp)","category":"Supplement","servingSize":"1 tbsp","calories":40,"carbs":12,"fiber":3,"sugar":8,"addedSugar":8,"iron":0.4,"sodium":10,"potassium":30,"brain":-1},
  {"name":"Supplement: Multi - Centrum Gummy","category":"Supplement","servingSize":"1 gummy","calories":7.5,"carbs":1.5,"sugar":1,"addedSugar":1,"vitA":375,"vitC":22.5,"vitD":12.5,"vitE":9,"calcium":40,"iodine":40,"zinc":2.5,"brain":1},
  {"name":"Supplement: Vitamin D3 - Nature Made Gummy","category":"Supplement","servingSize":"1 gummy","calories":10,"sugar":2,"addedSugar":2,"vitD":50,"brain":1},
  {"name":"Supplement: Bone - Jarrow BoneUp (Grant)","category":"Supplement","servingSize":"1 capsule","calories":0,"vitC":33.35,"vitD":4.15,"vitK":7.5,"calcium":166.65,"magnesium":83.35,"zinc":1.65,"copper":0.167,"manganese":0.167,"potassium":16.5,"brain":0.5},
  {"name":"Supplement: Magnesium - Glycinate (Grant)","category":"Supplement","servingSize":"1 capsule","calories":0,"magnesium":100,"b6":1,"brain":1},
  {"name":"Supplement: Zinc - Picolinate 30mg (Grant)","category":"Supplement","servingSize":"1 tablet","calories":0,"zinc":30,"brain":0.5},
  {"name":"Supplement: NAC - 600mg (Grant)","category":"Amino Acid","servingSize":"1 capsule","calories":0,"nac":600,"brain":1},
  {"name":"Supplement: Lion's Mane - 500mg (Grant)","category":"Nootropic","servingSize":"1 capsule","calories":0,"lionsMane":500,"brain":2},
  {"name":"Supplement: Vitamin D3 - Etos (Grant)","category":"Supplement","servingSize":"1 tablet","calories":0,"vitD":10,"brain":0.5},
  {"name":"Supplement: Fish Oil - EPA/DHA (Grant)","category":"Supplement","servingSize":"1 softgel","calories":10,"omega3EPA":0.57,"omega3DHA":0.43,"brain":2},
  {"name":"Supplement: Creatine - 5g (Grant)","category":"Amino Acid","servingSize":"1 tsp","calories":0,"creatine":5000,"brain":1},
  {"name":"Supplement: L-Lysine - 1000mg (Grant)","category":"Amino Acid","servingSize":"1 tablet","calories":0,"lysine":1000,"brain":0.5},
  {"name":"Supplement: Shilajit - 500mg (Grant)","category":"Adaptogen","servingSize":"1 capsule","calories":0,"shilajit":500,"brain":1},
  {"name":"Supplement: L-Theanine - 200mg (Grant)","category":"Amino Acid","servingSize":"1 tablet","calories":0,"lTheanine":200,"brain":1.5},
  {"name":"Supplement: Ashwagandha - 300mg (Grant)","category":"Adaptogen","servingSize":"1 capsule","calories":0,"ashwagandha":300,"brain":1},
  {"name":"Supplement: Multi - HEMA Totaal (Grant)","category":"Supplement","servingSize":"1 tablet","calories":5,"vitA":400,"thiamin":1.1,"riboflavin":1.4,"niacin":16,"pantothenicAcid":6,"b6":1.4,"b12":2.5,"folate":200,"biotin":50,"vitC":80,"vitD":5,"vitE":9,"vitK":75,"calcium":300,"magnesium":56,"zinc":2.5,"iron":7,"iodine":50,"selenium":28,"copper":0.5,"manganese":1,"chromium":20,"molybdenum":50,"potassium":25,"brain":0.5}
];

const QuickAddItem = ({ food, onAdd }) => {
  const [qty, setQty] = useState(1);
  return (
    <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
      <span className="flex-1 truncate">{food.name} <span className="text-gray-400">({food.calories} cal)</span></span>
      <div className="flex items-center gap-1 ml-2">
        <button onClick={() => setQty(q => Math.max(1, q - 1))} className="bg-gray-200 hover:bg-gray-300 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">−</button>
        <span className="w-6 text-center font-medium">{qty}</span>
        <button onClick={() => setQty(q => q + 1)} className="bg-gray-200 hover:bg-gray-300 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">+</button>
        <button onClick={() => { onAdd(food, qty); setQty(1); }} className="bg-green-500 text-white px-2 py-1 rounded text-xs ml-1">Add</button>
      </div>
    </div>
  );
};

const HealthTracker = () => {
  const VERSION = "1.4.0";
  const [activeTab, setActiveTab] = useState('today');
  const [foods, setFoods] = useState([]);
  const [foodInput, setFoodInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saveMessage, setSaveMessage] = useState('');
  const [addedMessage, setAddedMessage] = useState('');
  const fileInputRef = useRef(null);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [allDaysData, setAllDaysData] = useState({});
  
  // Use the default food library directly
  const foodLibrary = DEFAULT_FOOD_LIBRARY;





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

  const navigateDate = (direction) => {
    // Save current day's foods before navigating
    setAllDaysData(prev => ({ ...prev, [selectedDate]: foods }));
    
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + direction);
    const newDate = current.toLocaleDateString('en-CA');
    
    // Don't go into the future
    if (newDate > getTodayString()) return;
    
    setSelectedDate(newDate);
    // Load foods for new date
    setFoods(allDaysData[newDate] || []);
  };

  const isToday = selectedDate === getTodayString();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save foods to allDaysData when foods change
  useEffect(() => {
    if (foods.length > 0 || allDaysData[selectedDate]) {
      setAllDaysData(prev => ({ ...prev, [selectedDate]: foods }));
    }
  }, [foods]);

  const rda = {
    calories: { max: 2500, unit: '' }, protein: { max: 60, unit: 'g' }, fiber: { max: 30, unit: 'g' },
    addedSugar: { max: 36, unit: 'g', isLimit: true }, sodium: { max: 2300, unit: 'mg', isLimit: true },
    omega3ALA: { max: 1.6, unit: 'g' }, omega3EPA: { max: 0.5, unit: 'g' }, omega3DHA: { max: 0.5, unit: 'g' },
    calcium: { max: 1000, unit: 'mg' }, iron: { max: 18, unit: 'mg' }, potassium: { max: 3400, unit: 'mg' },
    magnesium: { max: 420, unit: 'mg' }, vitD: { max: 15, unit: 'mcg' }, vitK: { max: 120, unit: 'mcg' },
    vitE: { max: 15, unit: 'mg' }, vitC: { max: 90, unit: 'mg' }, vitA: { max: 3000, unit: 'IU' }
  };

  const calculateTotals = (arr) => {
    const t = { brain: 0 };
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
      t.brain += (f.brain || 0);
    });
    t.omega3Total = (t.omega3ALA || 0) + (t.omega3EPA || 0) + (t.omega3DHA || 0);
    return t;
  };

  const totals = calculateTotals(foods);

  const handleAddFood = () => {
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
      
      // Show confirmation
      const names = newFoods.map(f => f.name).join(', ');
      setAddedMessage(`✓ Added: ${names}`);
      setTimeout(() => setAddedMessage(''), 3000);
    } catch (e) {
      setInputError('Invalid JSON');
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
          brain: totals.brain || 0
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

  const getBrainColor = (s) => s >= 5 ? 'text-green-600 bg-green-100' : s >= 0 ? 'text-gray-600 bg-gray-100' : 'text-orange-600 bg-orange-100';

  const getStatusColor = (current, max, isLimit) => {
    const pct = (current / max) * 100;
    if (isLimit) return pct > 100 ? 'bg-red-500' : 'bg-green-500';
    return pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400';
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white min-h-screen">
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 mb-4 text-white">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-xl font-bold">Health Tracker <span className="text-xs opacity-75">v{VERSION}</span></h1>
            {/* DATE NAVIGATION */}
            <div className="flex items-center gap-2 mt-1">
              <button 
                onClick={() => navigateDate(-1)} 
                className="bg-white/20 hover:bg-white/30 w-8 h-8 rounded flex items-center justify-center text-lg"
              >
                ←
              </button>
              <span className="text-blue-100 text-sm min-w-[120px] text-center font-medium">
                {formatDateDisplay(selectedDate)}
                {!isToday && <span className="block text-xs opacity-75">{selectedDate}</span>}
              </span>
              <button 
                onClick={() => navigateDate(1)} 
                disabled={isToday}
                className={`w-8 h-8 rounded flex items-center justify-center text-lg ${isToday ? 'bg-white/10 opacity-50 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30'}`}
              >
                →
              </button>
            </div>
            {isToday && (
              <p className="text-blue-100 text-xs mt-1">{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={saveDay} className="bg-white/20 px-3 py-1 rounded text-sm">💾</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white/20 px-3 py-1 rounded text-sm">📂</button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
          </div>
        </div>
        {saveMessage && <p className="text-sm mt-1">{saveMessage}</p>}
      </div>

      <div className="flex gap-1 mb-4 border-b overflow-x-auto text-sm">
        {['today', 'nutrients', 'add', 'reference'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 capitalize ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
            {tab === 'add' ? '➕' : tab === 'reference' ? '📋' : ''} {tab === 'today' ? 'food' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'today' && (
        <div className="space-y-4">
          {foods.length > 0 && (
            <>
              <div className={`rounded-lg p-3 border ${totals.brain >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold">{totals.brain >= 0 ? '🧠 Brain' : '🌫️ Fog Risk'}</span>
                  <span className={`text-xl font-bold px-2 py-1 rounded ${getBrainColor(totals.brain)}`}>{totals.brain > 0 ? '+' : ''}{totals.brain}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <div className="flex justify-between"><span className="text-red-700 font-bold">🍬 Sugar</span><span className="text-xl font-bold">{Math.round((totals.addedSugar/36)*100)}%</span></div>
                  <div className="text-sm text-red-600">{totals.addedSugar?.toFixed(0)}g / 36g</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex justify-between"><span className="text-blue-700 font-bold">🐟 Omega-3</span><span className="text-xl font-bold">{Math.round((totals.omega3Total/2.1)*100)}%</span></div>
                  <div className="text-sm text-blue-600">{totals.omega3Total?.toFixed(2)}g / 2.1g</div>
                </div>
              </div>
            </>
          )}
          <div className="bg-white rounded-lg border p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">{formatDateDisplay(selectedDate)} ({foods.length} items)</span>
              {foods.length > 0 && <button onClick={() => setFoods([])} className="text-red-500 text-xs">Clear</button>}
            </div>
            {foods.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No foods. <button onClick={() => setActiveTab('add')} className="text-blue-500">Add</button></p>
            ) : (
              <div className="space-y-1 overflow-y-auto" style={{maxHeight: '600px'}}>
                {foods.map(f => (
                  <div key={f.id} className={`p-2 rounded text-sm ${f.brain > 0 ? 'bg-green-50' : f.brain < 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-gray-400 mr-2">{formatTime(f.time)}</span>
                        <span className="font-medium">{f.name}</span>
                        {f.brain ? <span className={`ml-1 text-xs ${f.brain > 0 ? 'text-green-600' : 'text-orange-600'}`}>({f.brain > 0 ? '+' : ''}{f.brain})</span> : ''}
                        {f.category && <span className="ml-2 text-xs text-purple-500 bg-purple-100 px-1 rounded">{f.category}</span>}
                        {f.servingSize && <span className="ml-1 text-xs text-gray-400">({f.servingSize})</span>}
                      </div>
                      <span className="flex gap-2 items-center">
                        <span className="text-gray-500">{f.calories || 0} cal</span>
                        <button onClick={() => setFoods(prev => prev.filter(x => x.id !== f.id))} className="text-red-400">✕</button>
                      </span>
                    </div>
                    {f.notes && <p className="text-xs text-gray-500 mt-1 ml-12">{f.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'nutrients' && (
        <div className="space-y-4">
          {foods.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No foods yet. <button onClick={() => setActiveTab('add')} className="text-blue-500">Add some</button></p>
          ) : (
            <>
              {/* MACROS */}
              <div className="bg-white rounded-lg border p-3">
                <h4 className="font-bold text-gray-700 mb-2">🍽️ Macros</h4>
                <div className="space-y-2">
                  {[
                    ['calories','Calories',2500,false],['protein','Protein (g)',60,false],['carbs','Carbs (g)',300,false],
                    ['fat','Fat (g)',78,false],['saturatedFat','Saturated Fat (g)',20,true],['transFat','Trans Fat (g)',0,true],
                    ['fiber','Fiber (g)',30,false],['sugar','Sugar (g)',50,true],['addedSugar','Added Sugar (g)',36,true],
                    ['cholesterol','Cholesterol (mg)',300,true],['sodium','Sodium (mg)',2300,true]
                  ].map(([k,l,m,isLimit]) => {
                    const val = totals[k]||0;
                    if (val === 0 && k !== 'calories') return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm">
                          <span>{l}</span>
                          <span>{val.toFixed(1)} / {m} ({Math.round(val/m*100)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getStatusColor(val, m, isLimit)}`} style={{width: `${Math.min(val/m*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VITAMINS */}
              <div className="bg-white rounded-lg border p-3">
                <h4 className="font-bold text-gray-700 mb-2">💊 Vitamins</h4>
                <div className="space-y-2">
                  {[
                    ['vitA','Vitamin A (mcg)',900,false],['vitC','Vitamin C (mg)',90,false],['vitD','Vitamin D (mcg)',20,false],
                    ['vitE','Vitamin E (mg)',15,false],['vitK','Vitamin K (mcg)',120,false],['thiamin','B1 Thiamin (mg)',1.2,false],
                    ['riboflavin','B2 Riboflavin (mg)',1.3,false],['niacin','B3 Niacin (mg)',16,false],['pantothenicAcid','B5 Pantothenic (mg)',5,false],
                    ['b6','B6 (mg)',1.7,false],['biotin','B7 Biotin (mcg)',30,false],['folate','B9 Folate (mcg)',400,false],
                    ['b12','B12 (mcg)',2.4,false],['choline','Choline (mg)',550,false]
                  ].map(([k,l,m,isLimit]) => {
                    const val = totals[k]||0;
                    if (val === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm">
                          <span>{l}</span>
                          <span>{val.toFixed(1)} / {m} ({Math.round(val/m*100)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getStatusColor(val, m, isLimit)}`} style={{width: `${Math.min(val/m*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MINERALS */}
              <div className="bg-white rounded-lg border p-3">
                <h4 className="font-bold text-gray-700 mb-2">💎 Minerals</h4>
                <div className="space-y-2">
                  {[
                    ['calcium','Calcium (mg)',1000,false],['iron','Iron (mg)',18,false],['magnesium','Magnesium (mg)',420,false],
                    ['phosphorus','Phosphorus (mg)',700,false],['potassium','Potassium (mg)',3400,false],['zinc','Zinc (mg)',11,false],
                    ['copper','Copper (mg)',0.9,false],['manganese','Manganese (mg)',2.3,false],['selenium','Selenium (mcg)',55,false],
                    ['iodine','Iodine (mcg)',150,false],['chromium','Chromium (mcg)',35,false],['molybdenum','Molybdenum (mcg)',45,false]
                  ].map(([k,l,m,isLimit]) => {
                    const val = totals[k]||0;
                    if (val === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm">
                          <span>{l}</span>
                          <span>{val.toFixed(1)} / {m} ({Math.round(val/m*100)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getStatusColor(val, m, isLimit)}`} style={{width: `${Math.min(val/m*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OMEGA-3s */}
              <div className="bg-white rounded-lg border p-3">
                <h4 className="font-bold text-gray-700 mb-2">🐟 Omega-3s</h4>
                <div className="space-y-2">
                  {[
                    ['omega3ALA','ALA (g)',1.6,false],['omega3EPA','EPA (g)',0.5,false],['omega3DHA','DHA (g)',0.5,false],['omega3Total','Total Omega-3 (g)',2.1,false]
                  ].map(([k,l,m,isLimit]) => {
                    const val = totals[k]||0;
                    if (val === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm">
                          <span>{l}</span>
                          <span>{val.toFixed(2)} / {m} ({Math.round(val/m*100)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getStatusColor(val, m, isLimit)}`} style={{width: `${Math.min(val/m*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COMPOUNDS */}
              <div className="bg-purple-50 rounded-lg border border-purple-200 p-3">
                <h4 className="font-bold text-purple-700 mb-2">🧠 Compounds</h4>
                <div className="space-y-2">
                  {[
                    ['nac','NAC (mg)',600],['lionsMane','Lion\'s Mane (mg)',500],['creatine','Creatine (mg)',5000],
                    ['lTheanine','L-Theanine (mg)',200],['ashwagandha','Ashwagandha (mg)',300],['shilajit','Shilajit (mg)',500],
                    ['lysine','L-Lysine (mg)',1000],['glycine','Glycine (mg)',3000],['taurine','Taurine (mg)',1000],
                    ['rhodiola','Rhodiola (mg)',150],['caffeine','Caffeine (mg)',400],['citicoline','Citicoline (mg)',500],
                    ['alphaGPC','Alpha-GPC (mg)',300],['uridine','Uridine (mg)',250]
                  ].map(([k,l,typical]) => {
                    const val = totals[k]||0;
                    if (val === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm">
                          <span>{l}</span>
                          <span>{val.toFixed(0)} / {typical} typical ({Math.round(val/typical*100)}%)</span>
                        </div>
                        <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500" style={{width: `${Math.min(val/typical*100, 100)}%`}} />
                        </div>
                      </div>
                    );
                  })}
                  {[['nac'],['lionsMane'],['creatine'],['lTheanine'],['ashwagandha'],['shilajit'],['lysine'],['glycine'],['taurine'],['rhodiola'],['caffeine'],['citicoline'],['alphaGPC'],['uridine']].every(([k]) => (totals[k]||0) === 0) && (
                    <p className="text-purple-400 text-sm">No compounds logged yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}



      {activeTab === 'add' && (
        <div className="space-y-4">
          {/* Confirmation Toast */}
          {addedMessage && (
            <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm font-medium animate-pulse">
              {addedMessage}
            </div>
          )}
          
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-bold mb-2">Paste Food JSON <span className="font-normal text-gray-500 text-sm">→ {formatDateDisplay(selectedDate)}</span></h3>
            <textarea value={foodInput} onChange={e => setFoodInput(e.target.value)} placeholder='{"name":"Banana","calories":105,"brain":1}' className="w-full border rounded p-2 text-sm font-mono h-24" />
            {inputError && <p className="text-red-500 text-sm">{inputError}</p>}
            <button onClick={handleAddFood} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">Add to {formatDateDisplay(selectedDate)}</button>
          </div>
          
          {/* Quick Add from Library */}
          <div className="bg-white rounded-lg border p-3">
            <h4 className="font-bold text-gray-700 mb-2">⚡ Quick Add ({foodLibrary.length} items)</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {[...foodLibrary].sort((a,b) => a.name.localeCompare(b.name)).map((f, i) => (
                <QuickAddItem key={i} food={f} onAdd={(food, qty) => {
                  const multiplied = { ...food };
                  // Multiply all numeric nutrient/compound fields
                  const numericKeys = [
                    'calories','protein','carbs','fat','saturatedFat','transFat','fiber','sugar','addedSugar','sodium','cholesterol',
                    'vitA','vitC','vitD','vitE','vitK','thiamin','riboflavin','niacin','pantothenicAcid','b6','biotin','folate','b12','choline',
                    'calcium','iron','magnesium','phosphorus','potassium','zinc','copper','manganese','selenium','iodine','chromium','molybdenum',
                    'omega3ALA','omega3EPA','omega3DHA',
                    'nac','lionsMane','creatine','lTheanine','ashwagandha','shilajit','lysine','glycine','taurine','rhodiola','caffeine','citicoline','alphaGPC','uridine',
                    'brain'
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
                  
                  // Show confirmation
                  setAddedMessage(`✓ Added: ${displayName}`);
                  setTimeout(() => setAddedMessage(''), 3000);
                }} />
              ))}
            </div>
          </div>
          
        </div>
      )}

      {activeTab === 'reference' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg border p-4">
            <h3 className="font-bold text-gray-700 mb-3">📋 JSON Fields Reference</h3>
            <div className="text-sm text-gray-600 space-y-3">
              <div>
                <p className="font-semibold text-gray-700">Basic:</p>
                <p><code className="bg-gray-200 px-1 rounded text-xs">name, time, servingSize, servingsPerContainer, category, notes</code></p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Macros:</p>
                <p><code className="bg-gray-200 px-1 rounded text-xs">calories, protein, carbs, fat, saturatedFat, transFat, fiber, sugar, addedSugar, cholesterol, sodium</code></p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Vitamins:</p>
                <p><code className="bg-gray-200 px-1 rounded text-xs">vitA, vitC, vitD, vitE, vitK, thiamin, riboflavin, niacin, pantothenicAcid, b6, biotin, folate, b12, choline</code></p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Minerals:</p>
                <p><code className="bg-gray-200 px-1 rounded text-xs">calcium, iron, magnesium, phosphorus, potassium, zinc, copper, manganese, selenium, iodine, chromium, molybdenum</code></p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Omega-3s:</p>
                <p><code className="bg-gray-200 px-1 rounded text-xs">omega3ALA, omega3EPA, omega3DHA</code></p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Compounds:</p>
                <p><code className="bg-gray-200 px-1 rounded text-xs">nac, lionsMane, creatine, lTheanine, ashwagandha, shilajit, lysine, glycine, taurine, rhodiola, caffeine, citicoline, alphaGPC, uridine</code></p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Scoring:</p>
                <p><code className="bg-gray-200 px-1 rounded text-xs">brain</code> (-5 fog to +5 enhancer)</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h4 className="font-bold text-blue-700 mb-2">💡 Example JSON</h4>
            <pre className="bg-white rounded p-2 text-xs overflow-x-auto border">{`{
  "name": "Banana",
  "category": "Fruit",
  "calories": 105,
  "carbs": 27,
  "fiber": 3,
  "sugar": 14,
  "potassium": 422,
  "brain": 1
}`}</pre>
          </div>

          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
            <h4 className="font-bold text-purple-700 mb-2">🧠 Brain Score Guide</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-semibold text-green-600">+3 to +5:</span> Strong cognitive enhancers (fish oil, lion's mane)</p>
              <p><span className="font-semibold text-green-600">+1 to +2:</span> Mild brain benefit (eggs, berries, leafy greens)</p>
              <p><span className="font-semibold text-gray-600">0:</span> Neutral (most whole foods)</p>
              <p><span className="font-semibold text-orange-600">-1 to -2:</span> Mild negative (processed foods, alcohol)</p>
              <p><span className="font-semibold text-red-600">-3 to -5:</span> Brain fog triggers (high sugar, excessive alcohol)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthTracker;
