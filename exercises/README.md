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
  "secondaryMuscles": ["front-deltoids"]
}
```
- **`name`** — required, unique.
- **`category`** — one of the muscle-region buckets: **Chest, Back, Shoulders, Arms, Legs, Core** (Cardio/Other fine too). Groups + sorts the list and shows as a prefix.
- **`equipment`** — free text (Barbell, Dumbbell, Machine, Cable, Bodyweight…). Optional.
- **`primaryMuscles`** / **`secondaryMuscles`** — arrays of muscle IDs (below). Primary highlight brighter than secondary on the body map.

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
