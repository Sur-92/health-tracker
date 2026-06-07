# Exercise Library JSON

Source-of-truth for the exercises in the Health Tracker **Fitness** tab. Like the food library, this file is curated by hand and **not auto-loaded** — paste objects into the Fitness tab's "Add exercise" box to save them to the (shared) exercise library.

## Files
- **`exercises-data.json`** — one array of exercise objects. The working library.

## Schema
```json
{
  "name": "Barbell Bench Press",
  "category": "Chest",
  "equipment": "Barbell",
  "primaryMuscles": ["chest", "triceps"],
  "secondaryMuscles": ["front-deltoids"],
  "targetSets": 3,
  "targetReps": "5–8",
  "repGoal": "strength",
  "restSeconds": 120,
  "cooldownSeconds": 120,
  "intensity": "RPE 8",
  "tempo": "2-1-1",
  "notes": "Retract scapula; feet planted."
}
```

### Core fields (own DB columns)
- **`name`** — required, unique.
- **`category`** — one of the muscle-region buckets: **Chest, Back, Shoulders, Arms, Legs, Core** (Cardio/Other fine too). Groups + sorts the list and shows as a prefix.
- **`equipment`** — free text (Barbell, Dumbbell, Machine, Cable, Bodyweight…). Optional.
- **`primaryMuscles`** / **`secondaryMuscles`** — arrays of muscle IDs (below). Primary highlights brighter than secondary on the body map.

### Metric fields (stored flexibly in a `meta` JSON column — add new ones any time, no migration)
All optional; blanks are simply not shown.
- **`targetSets`** — suggested sets (number).
- **`targetReps`** — suggested reps; range or note (`"5–8"`, `"30–60s hold"`).
- **`repGoal`** — what the rep scheme is *for* (`strength` / `hypertrophy` / `endurance`).
- **`restSeconds`** — rest between sets.
- **`cooldownSeconds`** — cool-down after the exercise.
- **`durationMinutes`** — for timed/cardio work (used instead of sets×reps).
- **`intensity`** — suggested effort (`"RPE 8"`, `"heavy"`, `"moderate"`).
- **`tempo`** — lifting tempo (`"2-1-1"`).
- **`intensityFactor`** — scales how much a logged session contributes to the muscle heatmap (default `1`). Use `<1` for light activities so they don't wash out the recovery view — e.g. carted golf at `0.3`.
- **`notes`** — free-text cues.

`category` is free-form, so new buckets like **Activity** (golf, hiking, yard work) or **Cardio** just appear as new groups automatically — no code change.

Because metrics live in `meta`, you can invent new fields whenever — just include them in the paste and they'll be stored and shown.

## Valid muscle IDs
These must match `react-body-highlighter` exactly:

```
chest · biceps · triceps · forearm · front-deltoids · back-deltoids
abs · obliques · trapezius · upper-back · lower-back
quadriceps · hamstring · gluteal · adductor · abductors · calves
neck · head
```

Notes: lats read closest to `upper-back`; lower lats/spinal erectors → `lower-back`; "adductor" (inner thigh) is singular, "abductors" (outer hip) is plural.

## Phase status
Phase 1 = exercise library + muscle highlighting on select. Phase 2 will add per-day/person workout logging and a weekly muscle heatmap (reusing the same body model with accumulated `frequency`).
