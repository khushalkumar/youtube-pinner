// background.js - minimal worker (keeps extension lifecycle typical for MV3)
chrome.runtime.onInstalled.addListener(() => {
  // initialize storage if absent
  chrome.storage.sync.get({ pinned: [] }, (res) => {
    if (!res.pinned) chrome.storage.sync.set({ pinned: [] });
  });
});
