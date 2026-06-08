const { contextBridge, ipcRenderer } = require('electron');

// Expose database API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Food library
  getAllFoods: () => ipcRenderer.invoke('db:getAllFoods'),
  foodExists: (name) => ipcRenderer.invoke('db:foodExists', name),
  addFood: (food) => ipcRenderer.invoke('db:addFood', food),
  deleteFood: (foodId) => ipcRenderer.invoke('db:deleteFood', foodId),
  updateFood: (foodId, updates) => ipcRenderer.invoke('db:updateFood', foodId, updates),

  // Exercise library
  getExercises: () => ipcRenderer.invoke('db:getExercises'),
  addExercise: (ex) => ipcRenderer.invoke('db:addExercise', ex),
  deleteExercise: (id) => ipcRenderer.invoke('db:deleteExercise', id),
  updateExercise: (id, updates) => ipcRenderer.invoke('db:updateExercise', id, updates),

  // Workout logs
  saveWorkout: (date, entries) => ipcRenderer.invoke('db:saveWorkout', date, entries),
  getWorkout: (date) => ipcRenderer.invoke('db:getWorkout', date),
  getWorkoutRange: (startDate, endDate) => ipcRenderer.invoke('db:getWorkoutRange', startDate, endDate),

  // Time logs (sleep + driving)
  saveTimeLog: (date, entries) => ipcRenderer.invoke('db:saveTimeLog', date, entries),
  getTimeLog: (date) => ipcRenderer.invoke('db:getTimeLog', date),

  // Daily logs
  saveDayLog: (date, foods) => ipcRenderer.invoke('db:saveDayLog', date, foods),
  getDayLog: (date) => ipcRenderer.invoke('db:getDayLog', date),
  getAllDayLogs: () => ipcRenderer.invoke('db:getAllDayLogs'),

  // Vitals
  addVital: (vital) => ipcRenderer.invoke('db:addVital', vital),
  getVitalsForDate: (date) => ipcRenderer.invoke('db:getVitalsForDate', date),
  getAllVitals: () => ipcRenderer.invoke('db:getAllVitals'),
  deleteVital: (vitalId) => ipcRenderer.invoke('db:deleteVital', vitalId),
  getVitalsRange: (startDate, endDate) => ipcRenderer.invoke('db:getVitalsRange', startDate, endDate),

  // Water (per-person daily ounces)
  getWater: (date) => ipcRenderer.invoke('db:getWater', date),
  setWater: (date, oz) => ipcRenderer.invoke('db:setWater', date, oz),

  // Settings
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('db:saveSettings', settings),

  // Nutrition config
  getNutritionConfig: () => ipcRenderer.invoke('db:getNutritionConfig'),
  saveNutritionConfig: (config) => ipcRenderer.invoke('db:saveNutritionConfig', config),

  // People / profiles
  listPeople: () => ipcRenderer.invoke('people:list'),
  getActivePerson: () => ipcRenderer.invoke('people:getActive'),
  setActivePerson: (id) => ipcRenderer.invoke('people:setActive', id),
  addPerson: (person) => ipcRenderer.invoke('people:add', person),

  // Cloud backup / restore
  backup: () => ipcRenderer.invoke('backup:run'),
  restore: () => ipcRenderer.invoke('restore:run'),
  restoreUndo: () => ipcRenderer.invoke('restore:undo'),
  hasPreRestore: () => ipcRenderer.invoke('restore:hasPrev'),

  // Platform info
  isElectron: true
});