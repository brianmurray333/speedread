// SpeedRead Chrome Extension - SpeedReader Class

// SpeedRead API URL - your deployed app URL
const SPEEDREAD_API_URL = 'https://speedread-kappa.vercel.app';

class SpeedReader {
  constructor(container, words, options = {}) {
    this.container = container;
    this.words = words;
    this.originalText = options.originalText || words.join(' ');
    this.sourceUrl = options.sourceUrl || window.location.href;
    this.currentIndex = 0;
    this.isPlaying = false;
    this.wpm = options.wpm || 300;
    this.theme = options.theme || 'dark';
    this.onExit = options.onExit || (() => {});
    this.onPrefsChange = options.onPrefsChange || (() => {});
    this.showControls = true;
    this.hideControlsTimeout = null;
    this.playInterval = null;
    this.shareUrl = null; // Set after publishing
    this.isPublishing = false;
    this.showingPublishModal = false;
    this.isStarting = true; // Prevent actions during startup
    
    this.render();
    this.bindEvents();
    this.applyTheme();
    
    // Clear the starting flag after a short delay to prevent
    // the triggering keyboard shortcut from activating UI elements
    setTimeout(() => {
      this.isStarting = false;
    }, 500);
  }
  
  // Calculate Optimal Recognition Point
  calculateORP(word) {
    const length = word.length;
    if (length <= 1) return 0;
    if (length <= 5) return 1;
    if (length <= 9) return 2;
    if (length <= 13) return 3;
    return 4;
  }
  
  // Calculate interval from WPM
  get interval() {
    return Math.round(60000 / this.wpm);
  }
  
  // Calculate progress percentage
  get progress() {
    return this.words.length > 0 
      ? ((this.currentIndex + 1) / this.words.length) * 100 
      : 0;
  }
  
  // Calculate time remaining
  get timeRemaining() {
    const wordsRemaining = this.words.length - this.currentIndex - 1;
    const minutesRemaining = wordsRemaining / this.wpm;
    const totalSeconds = Math.ceil(minutesRemaining * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Render the UI
  render() {
    this.container.innerHTML = `
      <div class="speedread-reader ${this.theme}">
        <!-- Top right buttons -->
        <div class="speedread-top-buttons">
          <!-- Share button -->
          <button class="speedread-share-btn" aria-label="Share">
            <svg class="speedread-share-icon" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" x2="12" y1="2" y2="15"/>
            </svg>
            <svg class="speedread-check-icon" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:none">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          
          <!-- Exit button -->
          <button class="speedread-exit" aria-label="Exit">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Publish Modal -->
        <div class="speedread-publish-modal" style="display:none">
          <div class="speedread-publish-content">
            <h2>Share to SpeedRead Library</h2>
            <p class="speedread-publish-subtitle">Create a shareable link for this content</p>
            
            <div class="speedread-publish-field">
              <label>Title</label>
              <input type="text" class="speedread-publish-title" placeholder="Enter a title..." />
            </div>
            
            <div class="speedread-publish-info">
              <span>${this.words.length.toLocaleString()} words</span>
            </div>
            
            <!-- Lightning Paywall Toggle -->
            <div class="speedread-paywall-section">
              <div class="speedread-paywall-toggle">
                <div class="speedread-paywall-label">
                  <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <div class="speedread-paywall-title">Add Lightning Paywall</div>
                    <div class="speedread-paywall-desc">Earn sats when people read</div>
                  </div>
                </div>
                <button class="speedread-toggle-btn" data-enabled="false">
                  <span class="speedread-toggle-knob"></span>
                </button>
              </div>
              
              <!-- Paywall Options (hidden by default) -->
              <div class="speedread-paywall-options" style="display:none">
                <div class="speedread-publish-field">
                  <label>Price (sats)</label>
                  <input type="number" class="speedread-publish-price" placeholder="100" min="1" />
                  <span class="speedread-field-hint">Suggested: 10-500 sats</span>
                </div>
                
                <div class="speedread-publish-field">
                  <label>Your Lightning Address</label>
                  <input type="text" class="speedread-publish-lnaddress" placeholder="you@getalby.com" />
                  <span class="speedread-field-hint">Get one free at getalby.com</span>
                </div>
              </div>
            </div>
            
            <div class="speedread-publish-error" style="display:none"></div>
            
            <div class="speedread-publish-buttons">
              <button class="speedread-publish-cancel">Cancel</button>
              <button class="speedread-publish-submit">
                <span class="speedread-publish-submit-text">Publish & Copy Link</span>
                <span class="speedread-publish-submit-loading" style="display:none">Publishing...</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Time remaining -->
        <div class="speedread-time"></div>
        
        <!-- Word display -->
        <div class="speedread-word-container">
          <div class="speedread-guide-top"></div>
          <div class="speedread-guide-bottom"></div>
          <div class="speedread-word"></div>
          <div class="speedread-fade-left"></div>
          <div class="speedread-fade-right"></div>
        </div>
        
        <!-- Controls -->
        <div class="speedread-controls">
          <!-- Progress bar -->
          <div class="speedread-progress-container">
            <div class="speedread-progress-bar">
              <div class="speedread-progress-fill"></div>
            </div>
          </div>
          
          <!-- Control buttons -->
          <div class="speedread-buttons">
            <!-- WPM control -->
            <div class="speedread-wpm-control">
              <button class="speedread-wpm-btn speedread-wpm-down" aria-label="Decrease speed">−</button>
              <span class="speedread-wpm-display"></span>
              <button class="speedread-wpm-btn speedread-wpm-up" aria-label="Increase speed">+</button>
            </div>
            
            <!-- Play/Pause -->
            <button class="speedread-play-btn" aria-label="Play/Pause">
              <svg class="speedread-play-icon" width="24" height="24" fill="white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <svg class="speedread-pause-icon" width="24" height="24" fill="white" viewBox="0 0 24 24" style="display:none">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
            
            <!-- Restart -->
            <button class="speedread-restart-btn" aria-label="Restart">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <!-- Theme toggle -->
            <button class="speedread-theme-btn" aria-label="Toggle theme">
              <svg class="speedread-sun-icon" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <path stroke-linecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <svg class="speedread-moon-icon" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:none">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </button>
          </div>
          
          <!-- Keyboard hints -->
          <p class="speedread-hints">
            Space: play/pause • ←→: navigate • ↑↓: speed • Esc: exit
          </p>
          
          <!-- Word count -->
          <p class="speedread-word-count"></p>
        </div>
      </div>
    `;
    
    // Cache DOM references
    this.readerEl = this.container.querySelector('.speedread-reader');
    this.wordEl = this.container.querySelector('.speedread-word');
    this.timeEl = this.container.querySelector('.speedread-time');
    this.progressFill = this.container.querySelector('.speedread-progress-fill');
    this.wpmDisplay = this.container.querySelector('.speedread-wpm-display');
    this.wordCount = this.container.querySelector('.speedread-word-count');
    this.controlsEl = this.container.querySelector('.speedread-controls');
    this.playIcon = this.container.querySelector('.speedread-play-icon');
    this.pauseIcon = this.container.querySelector('.speedread-pause-icon');
    this.sunIcon = this.container.querySelector('.speedread-sun-icon');
    this.moonIcon = this.container.querySelector('.speedread-moon-icon');
  }
  
  // Bind event handlers
  bindEvents() {
    // Exit button
    this.container.querySelector('.speedread-exit').addEventListener('click', () => this.exit());
    
    // Share button
    this.container.querySelector('.speedread-share-btn').addEventListener('click', () => this.handleShare());
    
    // Publish modal
    this.container.querySelector('.speedread-publish-cancel').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hidePublishModal();
    });
    this.container.querySelector('.speedread-publish-submit').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlePublish();
    });
    this.container.querySelector('.speedread-publish-title').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handlePublish();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hidePublishModal();
      }
    });
    // Click backdrop to close modal
    this.container.querySelector('.speedread-publish-modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('speedread-publish-modal')) {
        this.hidePublishModal();
      }
    });
    
    // Paywall toggle
    this.container.querySelector('.speedread-toggle-btn').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const enabled = btn.dataset.enabled === 'true';
      btn.dataset.enabled = !enabled;
      this.container.querySelector('.speedread-paywall-options').style.display = !enabled ? 'block' : 'none';
    });
    
    // WPM controls
    this.container.querySelector('.speedread-wpm-down').addEventListener('click', () => this.adjustWpm(-50));
    this.container.querySelector('.speedread-wpm-up').addEventListener('click', () => this.adjustWpm(50));
    
    // Play/Pause
    this.container.querySelector('.speedread-play-btn').addEventListener('click', () => this.togglePlay());
    
    // Restart
    this.container.querySelector('.speedread-restart-btn').addEventListener('click', () => this.restart());
    
    // Theme toggle
    this.container.querySelector('.speedread-theme-btn').addEventListener('click', () => this.toggleTheme());
    
    // Progress bar click to seek
    this.container.querySelector('.speedread-progress-container').addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const percentage = (e.clientX - rect.left) / rect.width;
      this.seekTo(Math.floor(percentage * this.words.length));
    });
    
    // Keyboard controls
    this.keyHandler = (e) => this.handleKeyboard(e);
    document.addEventListener('keydown', this.keyHandler);
    
    // Mouse movement to show controls
    this.container.addEventListener('mousemove', () => this.resetControlsTimeout());
    this.container.addEventListener('click', () => this.resetControlsTimeout());
    
    // Cache modal elements
    this.publishModal = this.container.querySelector('.speedread-publish-modal');
    this.publishTitleInput = this.container.querySelector('.speedread-publish-title');
    this.publishError = this.container.querySelector('.speedread-publish-error');
    this.publishSubmitText = this.container.querySelector('.speedread-publish-submit-text');
    this.publishSubmitLoading = this.container.querySelector('.speedread-publish-submit-loading');
    this.shareIcon = this.container.querySelector('.speedread-share-icon');
    this.checkIcon = this.container.querySelector('.speedread-check-icon');
  }
  
  // Handle keyboard input
  handleKeyboard(e) {
    // Ignore keyboard during startup to prevent trigger shortcut from affecting UI
    if (this.isStarting) return;
    
    this.resetControlsTimeout();
    
    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowRight':
        this.pause();
        this.navigate(1);
        break;
      case 'ArrowLeft':
        this.pause();
        this.navigate(-1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.adjustWpm(50);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.adjustWpm(-50);
        break;
      case 'Escape':
        this.exit();
        break;
      case 'r':
      case 'R':
        this.restart();
        break;
    }
  }
  
  // Start the reader
  start() {
    this.updateDisplay();
    // Auto-start with a brief delay
    setTimeout(() => this.play(), 500);
  }
  
  // Play
  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.updatePlayButton();
    this.resetControlsTimeout();
    
    this.playInterval = setInterval(() => {
      if (this.currentIndex >= this.words.length - 1) {
        this.pause();
        return;
      }
      this.currentIndex++;
      this.updateDisplay();
    }, this.interval);
  }
  
  // Pause
  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.updatePlayButton();
    this.setControlsVisible(true);
    
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }
  
  // Toggle play/pause
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  // Navigate by offset
  navigate(offset) {
    this.currentIndex = Math.max(0, Math.min(this.currentIndex + offset, this.words.length - 1));
    this.updateDisplay();
  }
  
  // Seek to specific index
  seekTo(index) {
    this.pause();
    this.currentIndex = Math.max(0, Math.min(index, this.words.length - 1));
    this.updateDisplay();
  }
  
  // Restart
  restart() {
    this.pause();
    this.currentIndex = 0;
    this.updateDisplay();
  }
  
  // Adjust WPM
  adjustWpm(delta) {
    this.wpm = Math.max(50, Math.min(1000, this.wpm + delta));
    this.updateDisplay();
    this.onPrefsChange({ wpm: this.wpm });
    
    // If playing, restart the interval with new speed
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }
  
  // Toggle theme
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.onPrefsChange({ theme: this.theme });
  }
  
  // Apply theme
  applyTheme() {
    this.readerEl.classList.remove('light', 'dark');
    this.readerEl.classList.add(this.theme);
    
    // Update theme icons
    if (this.theme === 'dark') {
      this.sunIcon.style.display = 'block';
      this.moonIcon.style.display = 'none';
    } else {
      this.sunIcon.style.display = 'none';
      this.moonIcon.style.display = 'block';
    }
  }
  
  // Update play/pause button
  updatePlayButton() {
    if (this.isPlaying) {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
    } else {
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
    }
  }
  
  // Update display
  updateDisplay() {
    const word = this.words[this.currentIndex] || '';
    const orpIndex = this.calculateORP(word);
    const before = word.slice(0, orpIndex);
    const orp = word[orpIndex] || '';
    const after = word.slice(orpIndex + 1);
    
    // Render word with ORP highlighting and invisible padding for centering
    this.wordEl.innerHTML = `
      <span class="speedread-invisible">${this.escapeHtml(after)}</span>
      <span class="speedread-before">${this.escapeHtml(before)}</span>
      <span class="speedread-orp">${this.escapeHtml(orp)}</span>
      <span class="speedread-after">${this.escapeHtml(after)}</span>
      <span class="speedread-invisible">${this.escapeHtml(before)}</span>
    `;
    
    // Update time
    this.timeEl.textContent = this.timeRemaining;
    
    // Update progress bar
    this.progressFill.style.width = `${this.progress}%`;
    
    // Update WPM display
    this.wpmDisplay.textContent = `${this.wpm} WPM`;
    
    // Update word count
    this.wordCount.textContent = `Word ${this.currentIndex + 1} of ${this.words.length}`;
  }
  
  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Reset controls hide timeout
  resetControlsTimeout() {
    this.setControlsVisible(true);
    
    if (this.hideControlsTimeout) {
      clearTimeout(this.hideControlsTimeout);
    }
    
    if (this.isPlaying) {
      this.hideControlsTimeout = setTimeout(() => {
        this.setControlsVisible(false);
      }, 1500);
    }
  }
  
  // Set controls visibility
  setControlsVisible(visible) {
    this.showControls = visible;
    const topButtons = this.container.querySelector('.speedread-top-buttons');
    if (visible) {
      this.controlsEl.classList.remove('speedread-controls-hidden');
      topButtons.classList.remove('speedread-controls-hidden');
      this.timeEl.classList.remove('speedread-controls-hidden');
    } else {
      this.controlsEl.classList.add('speedread-controls-hidden');
      topButtons.classList.add('speedread-controls-hidden');
      this.timeEl.classList.add('speedread-controls-hidden');
    }
  }
  
  // Exit the reader
  exit() {
    this.pause();
    document.removeEventListener('keydown', this.keyHandler);
    this.onExit();
  }
  
  // Handle share button click
  handleShare() {
    // Prevent accidental trigger during startup (from keyboard shortcut propagation)
    if (this.isStarting) return;
    
    if (this.shareUrl) {
      // Already published - copy the link
      this.copyToClipboard(this.shareUrl);
      this.showCopiedFeedback();
    } else {
      // Show publish modal
      this.showPublishModal();
    }
  }
  
  // Show the publish modal
  showPublishModal() {
    this.pause();
    this.showingPublishModal = true;
    this.publishModal.style.display = 'flex';
    this.publishTitleInput.value = this.generateDefaultTitle();
    this.publishError.style.display = 'none';
    setTimeout(() => {
      this.publishTitleInput.focus();
      this.publishTitleInput.select();
    }, 100);
  }
  
  // Hide the publish modal
  hidePublishModal() {
    this.showingPublishModal = false;
    this.publishModal.style.display = 'none';
  }
  
  // Generate a default title from the content
  generateDefaultTitle() {
    // Try to get a title from the source URL or first few words
    try {
      const url = new URL(this.sourceUrl);
      const hostname = url.hostname.replace('www.', '');
      const firstWords = this.words.slice(0, 5).join(' ');
      return `${firstWords}... (${hostname})`;
    } catch {
      return this.words.slice(0, 8).join(' ') + '...';
    }
  }
  
  // Handle publish button click
  async handlePublish() {
    if (this.isPublishing) return;
    
    const title = this.publishTitleInput.value.trim();
    if (!title) {
      this.showPublishError('Please enter a title');
      return;
    }
    
    // Check paywall settings
    const toggleBtn = this.container.querySelector('.speedread-toggle-btn');
    const isPaid = toggleBtn.dataset.enabled === 'true';
    let priceSats = 0;
    let lightningAddress = '';
    
    if (isPaid) {
      const priceInput = this.container.querySelector('.speedread-publish-price');
      const lnInput = this.container.querySelector('.speedread-publish-lnaddress');
      
      priceSats = parseInt(priceInput.value) || 0;
      lightningAddress = lnInput.value.trim();
      
      if (priceSats < 1) {
        this.showPublishError('Price must be at least 1 sat');
        return;
      }
      
      if (!lightningAddress) {
        this.showPublishError('Lightning Address is required for paid content');
        return;
      }
      
      // Basic Lightning Address format validation
      if (!lightningAddress.includes('@') || !lightningAddress.includes('.')) {
        this.showPublishError('Invalid Lightning Address format (e.g., you@getalby.com)');
        return;
      }
    }
    
    this.isPublishing = true;
    this.publishSubmitText.style.display = 'none';
    this.publishSubmitLoading.style.display = 'inline';
    this.publishError.style.display = 'none';
    
    try {
      const response = await fetch(`${SPEEDREAD_API_URL}/api/documents/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          textContent: this.originalText,
          source: this.sourceUrl,
          priceSats: isPaid ? priceSats : 0,
          lightningAddress: isPaid ? lightningAddress : null,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish');
      }
      
      const data = await response.json();
      this.shareUrl = data.shareUrl;
      
      // Copy link to clipboard
      await this.copyToClipboard(this.shareUrl);
      
      // Hide modal and show success
      this.hidePublishModal();
      this.showCopiedFeedback();
      
    } catch (error) {
      console.error('Publish error:', error);
      this.showPublishError(error.message || 'Failed to publish. Please try again.');
    } finally {
      this.isPublishing = false;
      this.publishSubmitText.style.display = 'inline';
      this.publishSubmitLoading.style.display = 'none';
    }
  }
  
  // Show error in publish modal
  showPublishError(message) {
    this.publishError.textContent = message;
    this.publishError.style.display = 'block';
  }
  
  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
  
  // Show copied feedback on share button
  showCopiedFeedback() {
    this.shareIcon.style.display = 'none';
    this.checkIcon.style.display = 'block';
    this.checkIcon.style.color = '#22c55e'; // green
    
    setTimeout(() => {
      this.shareIcon.style.display = 'block';
      this.checkIcon.style.display = 'none';
    }, 2000);
  }
}
