// SpeedRead Chrome Extension - Background Service Worker

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'speedread-selection',
    title: 'SpeedRead Selection',
    contexts: ['selection']
  });
});

// Inject scripts and trigger speedread
async function triggerSpeedRead(tabId) {
  try {
    // First inject the CSS
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['speedreader.css']
    });
    
    // Then inject the scripts
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['speedreader.js', 'content.js']
    });
    
    // Now send the message
    await chrome.tabs.sendMessage(tabId, { action: 'speedread' });
  } catch (error) {
    console.error('SpeedRead error:', error);
    // Show error to user - likely a restricted page
    if (error.message?.includes('Cannot access') || error.message?.includes('chrome://')) {
      // Can't show alert from background, but the error is logged
    }
  }
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'speedread-selection' && tab?.id) {
    triggerSpeedRead(tab.id);
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'speedread-selection' && tab?.id) {
    triggerSpeedRead(tab.id);
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) {
    triggerSpeedRead(tab.id);
  }
});
