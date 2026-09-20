'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function normalizeCount(value) {
  const count = Math.floor(Number(value) || 0);
  return Math.max(0, count);
}

window.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type !== 'kaoru:task-count') return;
  if (!Object.prototype.hasOwnProperty.call(data, 'attentionCount')) return;

  ipcRenderer.send(
    'kaoru:set-pending-badge',
    normalizeCount(data.attentionCount)
  );
});

contextBridge.exposeInMainWorld('kaoruDesktop', {
  setPendingBadge(count) {
    ipcRenderer.send(
      'kaoru:set-pending-badge',
      normalizeCount(count)
    );
  }
});
