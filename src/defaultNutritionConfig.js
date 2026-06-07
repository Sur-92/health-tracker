// Default nutrition configuration
// Personalized targets for Steve (male, 54, heart health focus)

export const defaultNutritionConfig = {
  "profile": {
    "name": "Steve",
    "age": 54,
    "sex": "male",
    "height_ft": 5,
    "height_in": 10,
    "weight_lbs": 195,
    "activity_level": "moderate",
    "health_focus": ["heart_health", "blood_pressure", "weight_management"],
    "family_history": ["heart_disease"]
  },
  "macronutrients": {
    "calories": {
      "target": 2100,
      "min": 2000,
      "max": 2200,
      "unit": "kcal"
    },
    "protein": {
      "target": 135,
      "min": 120,
      "max": 150,
      "unit": "g",
      "notes": "0.6-0.8g per lb for muscle retention"
    },
    "carbs": {
      "target": 225,
      "min": 200,
      "max": 250,
      "unit": "g"
    },
    "fat": {
      "target": 70,
      "min": 65,
      "max": 75,
      "unit": "g"
    },
    "saturatedFat": {
      "target": 13,
      "max": 13,
      "unit": "g",
      "notes": "Strict limit for heart health"
    },
    "fiber": {
      "target": 38,
      "min": 30,
      "unit": "g"
    },
    "sugar": {
      "max": 50,
      "unit": "g",
      "notes": "Total sugars"
    },
    "addedSugar": {
      "target": 25,
      "max": 25,
      "unit": "g",
      "notes": "Strict limit for heart health"
    },
    "cholesterol": {
      "target": 200,
      "max": 200,
      "unit": "mg",
      "notes": "Strict limit due to family history"
    },
    "sodium": {
      "target": 1500,
      "max": 1500,
      "unit": "mg",
      "notes": "Strict limit for blood pressure"
    },
    "water": {
      "target": 112,
      "min": 100,
      "max": 125,
      "unit": "oz"
    }
  },
  "minerals": {
    "calcium": {
      "target": 1000,
      "min": 1000,
      "max": 1200,
      "unit": "mg",
      "notes": "Bone health"
    },
    "magnesium": {
      "target": 420,
      "min": 400,
      "max": 450,
      "unit": "mg",
      "notes": "Heart rhythm, blood pressure"
    },
    "potassium": {
      "target": 4000,
      "min": 3400,
      "unit": "mg",
      "notes": "Blood pressure, offsets sodium"
    },
    "zinc": {
      "target": 11,
      "min": 8,
      "max": 40,
      "unit": "mg",
      "notes": "Upper limit 40mg - avoid excess"
    },
    "iron": {
      "target": 8,
      "max": 18,
      "unit": "mg",
      "notes": "Lower need for men over 50"
    },
    "selenium": {
      "target": 55,
      "max": 400,
      "unit": "mcg"
    },
    "phosphorus": {
      "target": 700,
      "unit": "mg"
    },
    "copper": {
      "target": 0.9,
      "max": 10,
      "unit": "mg"
    },
    "manganese": {
      "target": 2.3,
      "max": 11,
      "unit": "mg"
    },
    "chromium": {
      "target": 35,
      "unit": "mcg"
    },
    "molybdenum": {
      "target": 45,
      "max": 2000,
      "unit": "mcg"
    },
    "iodine": {
      "target": 150,
      "max": 1100,
      "unit": "mcg"
    }
  },
  "vitamins": {
    "vitA": {
      "target": 900,
      "max": 3000,
      "unit": "mcg RAE",
      "notes": "Upper limit from preformed vitamin A"
    },
    "vitC": {
      "target": 90,
      "min": 90,
      "max": 2000,
      "unit": "mg"
    },
    "vitD": {
      "target": 25,
      "min": 15,
      "max": 100,
      "unit": "mcg",
      "iu_equivalent": 1000,
      "notes": "15-20mcg RDA, many benefit from 25-50mcg"
    },
    "vitE": {
      "target": 15,
      "max": 1000,
      "unit": "mg"
    },
    "vitK": {
      "target": 120,
      "unit": "mcg",
      "notes": "Bone and heart health"
    },
    "thiamin": {
      "target": 1.2,
      "unit": "mg"
    },
    "riboflavin": {
      "target": 1.3,
      "unit": "mg"
    },
    "niacin": {
      "target": 16,
      "max": 35,
      "unit": "mg"
    },
    "b6": {
      "target": 1.7,
      "max": 100,
      "unit": "mg"
    },
    "folate": {
      "target": 400,
      "max": 1000,
      "unit": "mcg DFE"
    },
    "b12": {
      "target": 2.4,
      "unit": "mcg",
      "notes": "Absorption decreases with age"
    },
    "biotin": {
      "target": 30,
      "unit": "mcg"
    },
    "pantothenicAcid": {
      "target": 5,
      "unit": "mg"
    },
    "choline": {
      "target": 550,
      "max": 3500,
      "unit": "mg",
      "notes": "Brain health"
    }
  },
  "specialTargets": {
    "omega3_EPA_DHA": {
      "target": 1750,
      "min": 1500,
      "max": 2000,
      "unit": "mg",
      "notes": "Heart health priority - combined EPA + DHA"
    },
    "omega3_EPA": {
      "target": 1000,
      "unit": "mg"
    },
    "omega3_DHA": {
      "target": 750,
      "unit": "mg"
    }
  },
  "limits": {
    "sodium": {
      "max": 1500,
      "unit": "mg",
      "priority": "high",
      "reason": "Blood pressure control"
    },
    "saturatedFat": {
      "max": 13,
      "unit": "g",
      "priority": "high",
      "reason": "Heart health, LDL control"
    },
    "cholesterol": {
      "max": 200,
      "unit": "mg",
      "priority": "high",
      "reason": "Family heart history"
    },
    "addedSugar": {
      "max": 25,
      "unit": "g",
      "priority": "medium",
      "reason": "Weight management, heart health"
    },
    "zinc": {
      "max": 40,
      "unit": "mg",
      "priority": "medium",
      "reason": "Excess causes copper deficiency"
    },
    "vitA_preformed": {
      "max": 3000,
      "unit": "mcg",
      "priority": "low",
      "reason": "Toxicity risk"
    }
  },
  "metadata": {
    "created": "2024-12-29",
    "source": "RDA for males 51+, personalized for heart health focus",
    "notes": "Strict sodium, sat fat, cholesterol limits due to family heart history and BP goals"
  }
};

// Helper to convert config to the rda format used by progress bars
export function configToRda(config) {
  if (!config) return null;

  const rda = {};

  // Macronutrients
  const macros = config.macronutrients || {};
  Object.entries(macros).forEach(([key, value]) => {
    if (key === 'water') return; // Water tracked separately
    rda[key] = {
      max: value.target || value.max,
      unit: value.unit === 'kcal' ? '' : value.unit,
      isLimit: ['sodium', 'addedSugar', 'saturatedFat', 'cholesterol', 'sugar'].includes(key)
    };
  });

  // Minerals
  const minerals = config.minerals || {};
  Object.entries(minerals).forEach(([key, value]) => {
    rda[key] = {
      max: value.target || value.max,
      unit: value.unit
    };
  });

  // Vitamins
  const vitamins = config.vitamins || {};
  Object.entries(vitamins).forEach(([key, value]) => {
    rda[key] = {
      max: value.target || value.max,
      unit: value.unit?.split(' ')[0] || value.unit // Remove "RAE", "DFE" suffixes for display
    };
  });

  // Special targets (omega-3s)
  const special = config.specialTargets || {};
  if (special.omega3_ALA) {
    rda.omega3ALA = { max: special.omega3_ALA.target / 1000, unit: 'g' }; // Convert mg to g
  }
  if (special.omega3_EPA) {
    rda.omega3EPA = { max: special.omega3_EPA.target / 1000, unit: 'g' }; // Convert mg to g
  }
  if (special.omega3_DHA) {
    rda.omega3DHA = { max: special.omega3_DHA.target / 1000, unit: 'g' };
  }

  return rda;
}

// Helper to get water target from config
export function getWaterTarget(config) {
  return config?.macronutrients?.water?.target || 112;
}
