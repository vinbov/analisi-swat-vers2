
// preload.js

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the Node.js 'process.versions' object without exposing the entire object.
contextBridge.exposeInMainWorld('electronVersions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  // You can also expose other Electron APIs or Node modules here if needed
  // For example, if you needed to use 'ipcRenderer' to communicate with main.js:
  // send: (channel, data) => ipcRenderer.send(channel, data),
  // on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});

window.addEventListener('DOMContentLoaded', () => {
  // You can put code here that needs to run after the DOM is fully loaded
  // in the renderer process, but before other scripts in renderer.js might run.
  // For instance, if you were dynamically creating elements or something
  // more complex than just exposing versions.
  // For this specific case of just exposing versions, it's not strictly
  // necessary to wait for DOMContentLoaded for the contextBridge part,
  // as contextBridge makes the APIs available on window as soon as preload executes.
});
