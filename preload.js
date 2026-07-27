const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foto', {
  generateImage: (params) => ipcRenderer.invoke('generate-image', params),
  cancelGeneration: () => ipcRenderer.invoke('cancel-generation'),
  openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),
  deleteImage: (filePath) => ipcRenderer.invoke('delete-image', filePath),
  getGeneratedImages: () => ipcRenderer.invoke('get-generated-images'),
  checkPythonReady: () => ipcRenderer.invoke('check-python-ready'),
  checkModelsStatus: () => ipcRenderer.invoke('check-models-status'),
  downloadModel: (modelId, url) => ipcRenderer.invoke('download-model', { modelId, url }),
  deleteModel: (modelId) => ipcRenderer.invoke('delete-model', modelId),
  onProgress: (callback) => {
    ipcRenderer.on('generation-progress', (_event, data) => callback(data));
  },
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('generation-progress');
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data));
  },
  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners('download-progress');
  },
  getSystemSpecs: () => ipcRenderer.invoke('get-system-specs')
});
