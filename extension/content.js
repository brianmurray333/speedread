// SpeedRead Chrome Extension - Content Script

// Prevent duplicate initialization - wrap everything in the guard
if (!window._speedreadInitialized) {
  window._speedreadInitialized = true;

  // Listen for messages from background worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'speedread') {
      const selectedText = window.getSelection()?.toString().trim();
      
      if (!selectedText) {
        showNotification('Please select some text first');
        return;
      }
      
      // Parse text into words
      const words = parseTextToWords(selectedText);
      
      if (words.length === 0) {
        showNotification('No readable text found in selection');
        return;
      }
      
      // Launch the SpeedReader overlay
      launchSpeedReader(words, selectedText);
    }
  });
}

// These functions can be redefined safely

// Parse text into words (simplified version of pdfParser logic)
function parseTextToWords(text) {
  const rawWords = text
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 0);
  
  const words = [];
  
  for (const word of rawWords) {
    // Must contain at least one letter or number
    if (!/[a-zA-Z0-9]/.test(word)) continue;
    
    // Skip URLs
    if (isUrl(word)) continue;
    
    // Split hyphenated words
    if (word.includes('-') && word.length > 1) {
      const parts = word.split('-');
      if (parts.length > 1 && parts.every(p => p.length > 0)) {
        for (let i = 0; i < parts.length; i++) {
          words.push(i < parts.length - 1 ? parts[i] + '-' : parts[i]);
        }
        continue;
      }
    }
    
    words.push(word);
  }
  
  return words;
}

// Detect URLs
function isUrl(word) {
  const urlPatterns = [
    /^https?:\/\//i,
    /^www\./i,
    /\.(com|org|net|edu|gov|io|co|me|app|dev|ai)\b/i,
    /^[a-z0-9-]+\.[a-z]{2,}/i,
  ];
  return urlPatterns.some(pattern => pattern.test(word));
}

// Show a temporary notification
function showNotification(message) {
  // Remove any existing notification
  const existing = document.getElementById('speedread-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'speedread-notification';
  notification.textContent = message;
  notification.className = 'speedread-notification';
  document.body.appendChild(notification);
  
  // Fade out and remove
  setTimeout(() => {
    notification.classList.add('speedread-notification-fade');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Launch the SpeedReader overlay
function launchSpeedReader(words, selectedText) {
  // Remove any existing overlay
  const existing = document.getElementById('speedread-overlay');
  if (existing) existing.remove();
  
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'speedread-overlay';
  overlay.className = 'speedread-overlay';
  
  // Load saved preferences
  chrome.storage.sync.get(['wpm', 'theme'], (prefs) => {
    const initialWpm = prefs.wpm || 300;
    const initialTheme = prefs.theme || 'dark';
    
    // Initialize the SpeedReader
    const reader = new SpeedReader(overlay, words, {
      wpm: initialWpm,
      theme: initialTheme,
      originalText: selectedText, // Pass original text for sharing
      sourceUrl: window.location.href,
      onExit: () => {
        overlay.remove();
        document.body.style.overflow = '';
      },
      onPrefsChange: (newPrefs) => {
        chrome.storage.sync.set(newPrefs);
      }
    });
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    reader.start();
  });
}
