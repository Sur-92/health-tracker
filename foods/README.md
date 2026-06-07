# Food Library JSON

Source-of-truth nutrition data for the foods added to Health Tracker.

## Files
- **`foods-data.json`** — one combined array of food objects. This is the working library.
- **`_template.json`** — the complete, current field schema (all 60 fields, including `brain` and `heart`). Copy it as a starting point for a new food.

## Conventions
- **Serving basis:** per-item — use the natural unit for each food (a typical serving for discrete items like "1 medium banana (118g)"; per 100g for bulk/raw ingredients). Always state the unit in `servingSize`.
- **Units:** grams for macros, mg/mcg for micros (see `_template.json` comments in `JSON-TEMPLATE.md`).
- **Precision:** nutrient values to two decimal places (e.g. `6.28`, `15.35`). The `brain`/`heart` scores stay whole numbers (−10…+10).
- **`brain` / `heart`:** −10…+10 subjective impact scores. Positive = protective, negative = harmful. Leave 0 if neutral/unknown.
- Include every field; use `0` for unknown/trace.

## Loading into the app
Open Health Tracker → **Add Food** box → paste either a single `{ ... }` object or the whole `[ ... ]` array → it logs the food for the day **and** saves it to the Quick Add library.

(Note: `scripts/import-foods.js` writes to `public/food.db`, which is the *web build's* seed DB — the Electron app uses its own `~/Library/Application Support/health-tracker/health-tracker.db`, so use the Add Food paste flow for the desktop app.)
