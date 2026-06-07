const { contextBridge, ipcRenderer } = require('electron');

// Expose database API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Food library
  getAllFoods: () => ipcRenderer.invoke('db:getAllFoods'),
  foodExists: (name) => ipcRenderer.invoke('db:foodExists', name),
  addFood: (food) => ipcRenderer.invoke('db:addFood', food),
  deleteFood: (foodId) => ipcRenderer.invoke('db:deleteFood', foodId),

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

  // Settings
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('db:saveSettings', settings),

  // Nutrition config
  getNutritionConfig: () => ipcRenderer.invoke('db:getNutritionConfig'),
  saveNutritionConfig: (config) => ipcRenderer.invoke('db:saveNutritionConfig', config),

  // Cloud backup / restore
  backup: () => ipcRenderer.invoke('backup:run'),
  restore: () => ipcRenderer.invoke('restore:run'),
  restoreUndo: () => ipcRenderer.invoke('restore:undo'),
  hasPreRestore: () => ipcRenderer.invoke('restore:hasPrev'),

  // Platform info
  isElectron: true
});