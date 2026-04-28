const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  pickFiles: () => ipcRenderer.invoke("pick-files"),
  openFile: (filePath) => ipcRenderer.invoke("open-file", filePath),
  getAttachmentPath: (filename) => ipcRenderer.invoke("get-attachment-path", filename),
});
