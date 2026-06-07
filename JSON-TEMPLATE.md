# AI Prompt Template for Food Nutrition Data

Copy and paste this prompt to any AI, replacing [FOOD NAME] with the food you want data for.

---

## The Prompt

```
Provide scientific-grade nutrition data for [FOOD NAME] in JSON format.

Use this exact structure with these units:

{
  "name": "Food Name (with serving description)",
  "category": "Category",
  "servingSize": "amount with unit (e.g., 100g, 1 cup)",

  // MACRONUTRIENTS
  "calories": 0,        // kcal
  "protein": 0,         // grams
  "carbs": 0,           // grams
  "fat": 0,             // grams
  "saturatedFat": 0,    // grams
  "transFat": 0,        // grams
  "fiber": 0,           // grams
  "sugar": 0,           // grams
  "addedSugar": 0,      // grams
  "sodium": 0,          // milligrams
  "cholesterol": 0,     // milligrams

  // VITAMINS
  "vitA": 0,            // mcg RAE (retinol activity equivalents)
  "vitC": 0,            // mg
  "vitD": 0,            // mcg (micrograms)
  "vitE": 0,            // mg alpha-tocopherol
  "vitK": 0,            // mcg
  "thiamin": 0,         // mg (Vitamin B1)
  "riboflavin": 0,      // mg (Vitamin B2)
  "niacin": 0,          // mg NE (Vitamin B3)
  "pantothenicAcid": 0, // mg (Vitamin B5)
  "b6": 0,              // mg (pyridoxine)
  "biotin": 0,          // mcg (Vitamin B7)
  "folate": 0,          // mcg DFE (Vitamin B9)
  "b12": 0,             // mcg (cobalamin)
  "choline": 0,         // mg

  // MINERALS
  "calcium": 0,         // mg
  "iron": 0,            // mg
  "magnesium": 0,       // mg
  "phosphorus": 0,      // mg
  "potassium": 0,       // mg
  "zinc": 0,            // mg
  "copper": 0,          // mg
  "manganese": 0,       // mg
  "selenium": 0,        // mcg
  "iodine": 0,          // mcg
  "chromium": 0,        // mcg
  "molybdenum": 0,      // mcg

  // OMEGA-3 FATTY ACIDS
  "omega3ALA": 0,       // mg (alpha-linolenic acid)
  "omega3EPA": 0,       // mg (eicosapentaenoic acid)
  "omega3DHA": 0,       // mg (docosahexaenoic acid)

  // SUPPLEMENTS/NOOTROPICS (set to 0 for whole foods)
  "nac": 0,             // mg (N-Acetyl Cysteine)
  "lionsMane": 0,       // mg
  "creatine": 0,        // mg
  "lTheanine": 0,       // mg
  "ashwagandha": 0,     // mg
  "shilajit": 0,        // mg
  "lysine": 0,          // mg (amino acid)
  "glycine": 0,         // mg (amino acid)
  "taurine": 0,         // mg (amino acid)
  "rhodiola": 0,        // mg
  "caffeine": 0,        // mg
  "citicoline": 0,      // mg
  "alphaGPC": 0,        // mg
  "uridine": 0,         // mg

  // BRAIN & HEART SCORES
  "brain": 0,           // -10 to +10 scale based on cognitive impact
  "heart": 0            // -10 to +10 scale based on cardiovascular impact
}

IMPORTANT:
- Use USDA FoodData Central or peer-reviewed sources
- Return ONLY valid JSON (no comments in actual output)
- Use 0 for unknown/trace amounts
- Include all fields even if 0
- For "brain" score: positive = neuroprotective/cognitive enhancing, negative = potentially harmful (e.g., high added sugar, trans fats)
- For "heart" score: positive = cardioprotective (e.g., omega-3s, fiber, potassium), negative = cardio-harmful (e.g., trans fat, high sodium, added sugar)

Categories: Fruit, Vegetable, Meat, Poultry, Seafood, Dairy, Grain, Legume, Nut, Seed, Oil, Beverage, Supplement, Condiment, Snack, Prepared Food
```

---

## Example Output (Salmon)

```json
{
  "name": "Atlantic Salmon (cooked)",
  "category": "Seafood",
  "servingSize": "100g",
  "calories": 208,
  "protein": 20.4,
  "carbs": 0,
  "fat": 13.4,
  "saturatedFat": 3.0,
  "transFat": 0,
  "fiber": 0,
  "sugar": 0,
  "addedSugar": 0,
  "sodium": 59,
  "cholesterol": 55,
  "vitA": 12,
  "vitC": 0,
  "vitD": 11.0,
  "vitE": 3.6,
  "vitK": 0.5,
  "thiamin": 0.23,
  "riboflavin": 0.38,
  "niacin": 8.0,
  "pantothenicAcid": 1.6,
  "b6": 0.6,
  "biotin": 5.0,
  "folate": 25,
  "b12": 2.8,
  "choline": 91,
  "calcium": 12,
  "iron": 0.8,
  "magnesium": 29,
  "phosphorus": 252,
  "potassium": 363,
  "zinc": 0.6,
  "copper": 0.25,
  "manganese": 0.02,
  "selenium": 36.5,
  "iodine": 35,
  "chromium": 0,
  "molybdenum": 0,
  "omega3ALA": 86,
  "omega3EPA": 862,
  "omega3DHA": 1104,
  "nac": 0,
  "lionsMane": 0,
  "creatine": 450,
  "lTheanine": 0,
  "ashwagandha": 0,
  "shilajit": 0,
  "lysine": 1870,
  "glycine": 980,
  "taurine": 70,
  "rhodiola": 0,
  "caffeine": 0,
  "citicoline": 0,
  "alphaGPC": 0,
  "uridine": 0,
  "brain": 8,
  "heart": 8
}
```

---

## Quick Single-Line Prompt

For faster queries, use:

```
Give me JSON nutrition data for [FOOD] using these fields: name, category, servingSize, calories, protein, carbs, fat, saturatedFat, transFat, fiber, sugar, addedSugar, sodium, cholesterol, vitA, vitC, vitD, vitE, vitK, thiamin, riboflavin, niacin, pantothenicAcid, b6, biotin, folate, b12, choline, calcium, iron, magnesium, phosphorus, potassium, zinc, copper, manganese, selenium, iodine, chromium, molybdenum, omega3ALA, omega3EPA, omega3DHA, caffeine, lysine, glycine, taurine, brain (-10 to +10 cognitive score), heart (-10 to +10 cardiovascular score). Use USDA data, mg/mcg units. JSON only.
```

---

## Batch Request (Multiple Foods)

```
Provide nutrition JSON array for these foods: [FOOD1], [FOOD2], [FOOD3]

Return as: [{ food1 }, { food2 }, { food3 }]

Use the standard fields: name, category, servingSize, calories, protein, carbs, fat, saturatedFat, transFat, fiber, sugar, addedSugar, sodium, cholesterol, vitA, vitC, vitD, vitE, vitK, thiamin, riboflavin, niacin, pantothenicAcid, b6, biotin, folate, b12, choline, calcium, iron, magnesium, phosphorus, potassium, zinc, copper, manganese, selenium, iodine, chromium, molybdenum, omega3ALA, omega3EPA, omega3DHA, caffeine, brain, heart
```
