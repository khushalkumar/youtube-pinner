// content.js
(function () {
  console.log('[YouTube Pinner] Content script loaded');
  let lastUrl = location.href;
  
  // Import homepage functionality for SPA navigation
  const PIN_ROW_ID = "yt-pinned-row";
  let isRendering = false;

  // Utility: get video id if on watch page
  function getVideoId() {
    const url = new URL(location.href);
    return url.searchParams.get("v");
  }

  // Check if we're on the homepage
  function isHomepage() {
    const url = new URL(location.href);
    return url.pathname === '/' && !url.searchParams.get("v");
  }

  // Homepage functionality (imported from homepage.js)
  function removeExistingRow() {
    const existingRows = document.querySelectorAll(`#${PIN_ROW_ID}`);
    existingRows.forEach(row => row.remove());
  }

  // Get video ID from YouTube video element
  function getVideoIdFromElement(element) {
    // Try to find video ID from various YouTube selectors
    const link = element.querySelector('a[href*="/watch?v="]');
    if (link) {
      const url = new URL(link.href);
      return url.searchParams.get('v');
    }
    return null;
  }

  // Add pin button to individual video thumbnails on homepage
  function addPinButtonToVideo(videoElement, videoId) {
    // Check if button already exists
    if (videoElement.querySelector('.ytp-homepage-pin-btn')) {
      return;
    }

    // Check if this video is already pinned
    chrome.storage.sync.get({ pinned: [] }, (data) => {
      const pinned = data.pinned || [];
      if (pinned.find(v => v.id === videoId)) {
        return; // Skip if already pinned
      }

      // Create pin button
      const pinBtn = document.createElement("button");
      pinBtn.className = "ytp-homepage-pin-btn";
      pinBtn.innerHTML = "📌";
      pinBtn.title = "Pin this video";
      pinBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
        background: rgba(0, 0, 0, 0.7);
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
        color: #fff;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        opacity: 0;
        transform: scale(0.8);
      `;

      // Add hover effect
      pinBtn.addEventListener("mouseenter", () => {
        pinBtn.style.background = "rgba(255, 0, 0, 0.8)";
        pinBtn.style.transform = "scale(1.1)";
      });

      pinBtn.addEventListener("mouseleave", () => {
        pinBtn.style.background = "rgba(0, 0, 0, 0.7)";
        pinBtn.style.transform = "scale(1)";
      });

      // Add click functionality
      pinBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Get video details
        const titleElement = videoElement.querySelector('#video-title, h3, [id*="title"]');
        const title = titleElement ? titleElement.textContent.trim() : 'Unknown Video';
        const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        // Add to pinned videos
        chrome.storage.sync.get({ pinned: [] }, (data) => {
          let pinned = data.pinned || [];
          pinned.push({ id: videoId, title, thumbnail });
          chrome.storage.sync.set({ pinned }, () => {
            // Show success message
            flashMessage("Video pinned!");
            // Re-render pinned videos section
            if (isHomepage()) {
              renderPinnedRow();
            }
            // Notify other parts
            try {
              chrome.runtime.sendMessage({ type: "pinned-updated" });
            } catch (e) {
              console.warn('[YouTube Pinner] Could not notify extension:', e);
            }
          });
        });
      });

      // Make video container relative positioned if not already
      const container = videoElement.closest('ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer');
      if (container) {
        container.style.position = 'relative';
        container.appendChild(pinBtn);

        // Animate button appearance
        setTimeout(() => {
          pinBtn.style.opacity = '1';
          pinBtn.style.transform = 'scale(1)';
        }, 100);
      }
    });
  }

  // Add pin buttons to all homepage videos
  function addPinButtonsToHomepageVideos() {
    if (!isHomepage()) return;

    // Find all video elements on homepage
    const videoSelectors = [
      'ytd-video-renderer',
      'ytd-rich-item-renderer', 
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer'
    ];

    let totalVideos = 0;
    let videosWithButtons = 0;

    videoSelectors.forEach(selector => {
      const videoElements = document.querySelectorAll(selector);
      totalVideos += videoElements.length;
      
      videoElements.forEach(videoElement => {
        const videoId = getVideoIdFromElement(videoElement);
        if (videoId) {
          const hasButton = videoElement.querySelector('.ytp-homepage-pin-btn');
          if (!hasButton) {
            addPinButtonToVideo(videoElement, videoId);
            videosWithButtons++;
          }
        }
      });
    });

    if (totalVideos > 0) {
      console.log(`[YouTube Pinner] Found ${totalVideos} videos, added ${videosWithButtons} new pin buttons`);
    }
  }

  function buildRow(pinned) {
    if (!pinned || pinned.length === 0) return;

    const wrapper = document.createElement("div");
    wrapper.id = PIN_ROW_ID;
    wrapper.style.cssText = "margin:18px 0;padding:0 16px;color:var(--ytd-masthead-button-color,#fff)";

    const title = document.createElement("h2");
    title.textContent = "📌 Your Pinned Videos";
    title.style.cssText = "font-size:18px;margin:8px 0";
    wrapper.appendChild(title);

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start";

    pinned.forEach(item => {
      // Create container for video with unpin button
      const videoContainer = document.createElement("div");
      videoContainer.style.cssText = "position:relative;width:220px;margin-bottom:20px";
      
      // Create unpin button
      const unpinBtn = document.createElement("button");
      unpinBtn.innerHTML = "❌";
      unpinBtn.title = "Unpin this video";
      unpinBtn.style.cssText = `
        position:absolute;
        top:8px;
        right:8px;
        z-index:10;
        background:rgba(0,0,0,0.7);
        border:none;
        border-radius:50%;
        width:24px;
        height:24px;
        cursor:pointer;
        color:#fff;
        font-size:12px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition:background 0.2s ease;
      `;
      
      // Add hover effect
      unpinBtn.addEventListener("mouseenter", () => {
        unpinBtn.style.background = "rgba(255,0,0,0.8)";
      });
      unpinBtn.addEventListener("mouseleave", () => {
        unpinBtn.style.background = "rgba(0,0,0,0.7)";
      });
      
      // Add unpin functionality
      unpinBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        chrome.storage.sync.get({ pinned: [] }, (data) => {
          let arr = data.pinned || [];
          arr = arr.filter(v => v.id !== item.id);
          chrome.storage.sync.set({ pinned: arr }, () => {
            // Re-render the pinned videos section
            renderPinnedRow();
            // Notify other parts of the extension
            try { 
              chrome.runtime.sendMessage({ type: "pinned-updated" }); 
            } catch (e) {
              console.warn('[YouTube Pinner] Could not notify extension:', e);
            }
          });
        });
      });

      const a = document.createElement("a");
      a.href = `https://www.youtube.com/watch?v=${item.id}`;
      a.style.cssText = "text-decoration:none;color:inherit;display:block";
      a.target = "_blank";

      const thumb = document.createElement("img");
      thumb.src = item.thumbnail;
      thumb.width = 220;
      thumb.alt = item.title;
      thumb.style.cssText = "display:block;border-radius:6px;width:100%";

      const t = document.createElement("div");
      t.textContent = item.title;
      t.style.cssText = "font-size:13px;margin-top:6px;line-height:1.2;max-height:2.4em;overflow:hidden;text-overflow:ellipsis";

      a.appendChild(thumb);
      a.appendChild(t);
      
      videoContainer.appendChild(a);
      videoContainer.appendChild(unpinBtn);
      row.appendChild(videoContainer);
    });

    wrapper.appendChild(row);
    return wrapper;
  }

  function insertRow(wrapper) {
    const anchors = [
      "ytd-browse[page-subtype='home'] #contents ytd-rich-grid-renderer",
      "ytd-two-column-browse-results-renderer #contents",
      "#contents ytd-rich-grid-renderer",
      "ytd-rich-grid-renderer"
    ];
    let feed = null;
    for (const sel of anchors) {
      feed = document.querySelector(sel);
      if (feed) break;
    }
    if (!feed) {
      document.body.insertBefore(wrapper, document.body.firstChild);
      return;
    }
    feed.parentNode.insertBefore(wrapper, feed);
  }

  function renderPinnedRow() {
    if (isRendering) return;
    isRendering = true;
    
    removeExistingRow();
    try {
      chrome.storage.sync.get({ pinned: [] }, (data) => {
        if (chrome.runtime.lastError) {
          console.warn('[YouTube Pinner] Extension context invalidated. Please reload the page.');
          isRendering = false;
          return;
        }
        const pinned = data.pinned || [];
        if (pinned.length === 0) {
          isRendering = false;
          return;
        }
        const wrapper = buildRow(pinned);
        if (wrapper) insertRow(wrapper);
        isRendering = false;
      });
    } catch (e) {
      console.warn('[YouTube Pinner] Extension context invalidated. Please reload the page.', e);
      isRendering = false;
    }
  }

  // Create and attach pin button to the action area
  function addPinButtonIfNeeded() {
    const videoId = getVideoId();
    if (!videoId) {
      console.log('[YouTube Pinner] Not on a video page');
      return;
    }

    // avoid adding multiple buttons
    if (document.getElementById("ytp-pin-button")) {
      console.log('[YouTube Pinner] Button already exists');
      return;
    }

    console.log('[YouTube Pinner] Attempting to add pin button for video:', videoId);

    // find YouTube action button container (updated selectors for modern YouTube)
    const selectors = [
      "ytd-watch-metadata #actions #top-level-buttons-computed",
      "#actions ytd-menu-renderer #top-level-buttons-computed",
      "#top-level-buttons-computed",
      "ytd-menu-renderer #top-level-buttons-computed",
      "#actions #menu-container #top-level-buttons-computed",
      "ytd-watch-metadata #menu-container",
      "#menu-container #top-level-buttons-computed",
      "#actions",
      "ytd-menu-renderer",
      "#owner"
    ];

    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        console.log('[YouTube Pinner] Found container with selector:', selector);
        break;
      }
    }

    if (!container) {
      console.log('[YouTube Pinner] Could not find container. Available elements:', {
        actions: !!document.querySelector("#actions"),
        topLevelButtons: !!document.querySelector("#top-level-buttons-computed"),
        menuRenderer: !!document.querySelector("ytd-menu-renderer"),
        watchMetadata: !!document.querySelector("ytd-watch-metadata")
      });
      return;
    }

    const btn = document.createElement("button");
    btn.id = "ytp-pin-button";
    btn.type = "button";
    btn.textContent = "📌 Pin Video";
    btn.className = "yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m";
    btn.style.cssText = `
      margin-left: 8px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-family: "Roboto","Arial",sans-serif;
      transition: background 0.1s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
    `;

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(255,255,255,0.2)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(255,255,255,0.1)";
    });

    btn.addEventListener("click", () => {
      const title = document.title.replace(" - YouTube", "").trim();
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      try {
        chrome.storage.sync.get({ pinned: [] }, (data) => {
          if (chrome.runtime.lastError) {
            flashMessage("Extension error - please reload page");
            console.error('[YouTube Pinner] Extension context invalidated');
            return;
          }

          let pinned = data.pinned || [];

          if (pinned.find(v => v.id === videoId)) {
            // already pinned: do nothing or show small feedback
            flashMessage("Already pinned");
            return;
          }

          // No limit on pinned videos - allow unlimited

          pinned.push({ id: videoId, title, thumbnail });
          chrome.storage.sync.set({ pinned }, () => {
            if (chrome.runtime.lastError) {
              flashMessage("Extension error - please reload page");
              return;
            }
            flashMessage("Pinned to homepage");
            // for immediate homepage update: send a message with debounce
            try { 
              chrome.runtime.sendMessage({ type: "pinned-updated" }); 
            } catch (e) {
              console.warn('[YouTube Pinner] Could not notify homepage:', e);
            }
          });
        });
      } catch (e) {
        flashMessage("Extension error - please reload page");
        console.error('[YouTube Pinner] Error:', e);
      }
    });

    container.appendChild(btn);
    console.log('[YouTube Pinner] Pin button successfully added!');
  }

  // small floating message for feedback
  function flashMessage(text) {
    const existing = document.getElementById("ytp-pin-msg");
    if (existing) existing.remove();
    const msg = document.createElement("div");
    msg.id = "ytp-pin-msg";
    msg.textContent = text;
    msg.style.cssText = "position:fixed;right:16px;top:80px;z-index:999999;background:#111;color:#fff;padding:8px 12px;border-radius:6px;opacity:0.95";
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 1600);
  }

  // monitor SPA navigation by checking URL changes
  function checkUrlChange() {
    if (lastUrl !== location.href) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      console.log('[YouTube Pinner] URL changed from', oldUrl, 'to:', location.href);
      
      // Handle homepage navigation
      if (isHomepage()) {
        console.log('[YouTube Pinner] Navigated to homepage, rendering pinned videos and adding pin buttons');
        setTimeout(() => {
          renderPinnedRow();
          addPinButtonsToHomepageVideos();
        }, 1000); // Wait for homepage elements to load
        return;
      }
      
      // Handle video page navigation
      const videoId = getVideoId();
      if (videoId) {
        console.log('[YouTube Pinner] Navigated to video page, restarting button monitoring');
        
        // remove old button so it can be re-inserted for new page
        const existing = document.getElementById("ytp-pin-button");
        if (existing) existing.remove();
        
        // Start fresh monitoring for the new video page
        startContinuousButtonMonitoring();
        
        // Wait for new page elements to load, then add button
        waitForVideoElements().then(() => {
          console.log('[YouTube Pinner] New video page elements ready, adding button');
          addPinButtonIfNeeded();
        });
        
        // Additional immediate attempts
        setTimeout(() => addPinButtonIfNeeded(), 500);
        setTimeout(() => addPinButtonIfNeeded(), 1000);
        setTimeout(() => addPinButtonIfNeeded(), 2000);
      }
    }
  }

  // Wait for YouTube's video page elements to be ready with more comprehensive checking
  function waitForVideoElements() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds total (50 * 100ms)
      
      const checkElements = () => {
        attempts++;
        
        // Check for multiple YouTube video page elements
        const elements = {
          watchMetadata: document.querySelector('ytd-watch-metadata'),
          actions: document.querySelector('#actions'),
          menuRenderer: document.querySelector('ytd-menu-renderer'),
          topLevelButtons: document.querySelector('#top-level-buttons-computed'),
          videoPrimaryInfo: document.querySelector('ytd-video-primary-info-renderer')
        };
        
        const hasVideoElements = Object.values(elements).some(el => el !== null);
        
        console.log(`[YouTube Pinner] Element check attempt ${attempts}:`, {
          found: hasVideoElements,
          elements: Object.fromEntries(
            Object.entries(elements).map(([key, el]) => [key, !!el])
          )
        });
        
        if (hasVideoElements) {
          console.log('[YouTube Pinner] Video elements found, proceeding with button insertion');
          resolve();
        } else if (attempts >= maxAttempts) {
          console.log('[YouTube Pinner] Max attempts reached, proceeding anyway');
          resolve();
        } else {
          // Keep checking every 100ms
          setTimeout(checkElements, 100);
        }
      };
      
      checkElements();
    });
  }

  // Initial setup - handle both homepage and video pages
  if (isHomepage()) {
    console.log('[YouTube Pinner] On homepage, rendering pinned videos and adding pin buttons');
    setTimeout(() => {
      renderPinnedRow();
      addPinButtonsToHomepageVideos();
    }, 1500);
  } else {
    // Video page setup with ultra-aggressive strategy
    console.log('[YouTube Pinner] On video page, setting up pin button with continuous monitoring');
    
    // Start continuous monitoring immediately
    startContinuousButtonMonitoring();
    
    // Primary attempt with element waiting
    waitForVideoElements().then(() => {
      console.log('[YouTube Pinner] Video elements detected, attempting button insertion');
      addPinButtonIfNeeded();
    });

    // Multiple fallback attempts at different intervals
    const retryIntervals = [200, 500, 800, 1200, 1500, 2000, 2500, 3000, 4000, 5000];
    retryIntervals.forEach(delay => {
      setTimeout(() => {
        if (!document.getElementById("ytp-pin-button")) {
          console.log(`[YouTube Pinner] Retry attempt at ${delay}ms`);
          addPinButtonIfNeeded();
        }
      }, delay);
    });
  }

  // Ultra-aggressive continuous monitoring for pin button insertion
  function startContinuousButtonMonitoring() {
    let monitoringActive = true;
    let attemptCount = 0;
    const maxAttempts = 100; // 100 seconds of monitoring
    
    const monitorInterval = setInterval(() => {
      if (!monitoringActive) {
        clearInterval(monitorInterval);
        return;
      }
      
      attemptCount++;
      
      // Check if we're still on a video page
      if (!getVideoId()) {
        console.log('[YouTube Pinner] No longer on video page, stopping monitoring');
        monitoringActive = false;
        clearInterval(monitorInterval);
        return;
      }
      
      // Check if button already exists
      if (document.getElementById("ytp-pin-button")) {
        console.log('[YouTube Pinner] Pin button found after', attemptCount, 'attempts, stopping monitoring');
        monitoringActive = false;
        clearInterval(monitorInterval);
        return;
      }
      
      // Check if we've exceeded max attempts
      if (attemptCount >= maxAttempts) {
        console.log('[YouTube Pinner] Max monitoring attempts reached, stopping');
        monitoringActive = false;
        clearInterval(monitorInterval);
        return;
      }
      
      // Attempt button insertion
      if (attemptCount % 10 === 0) { // Log every 10th attempt
        console.log(`[YouTube Pinner] Continuous monitoring attempt ${attemptCount}`);
      }
      addPinButtonIfNeeded();
      
    }, 1000); // Check every second
    
    // Stop monitoring after 2 minutes regardless
    setTimeout(() => {
      if (monitoringActive) {
        console.log('[YouTube Pinner] Monitoring timeout reached, stopping');
        monitoringActive = false;
        clearInterval(monitorInterval);
      }
    }, 120000); // 2 minutes
  }

  // Listen for messages (e.g., content script added a pin)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "pinned-updated") {
      if (isHomepage()) {
        setTimeout(renderPinnedRow, 500);
      }
    }
  });

  // observe body mutations for dynamic content load
  let debounceTimer;
  const observer = new MutationObserver((mutations) => {
    // Check for relevant mutations for both homepage and video pages
    const relevantMutation = mutations.some(mutation => {
      return Array.from(mutation.addedNodes).some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Video page elements - more comprehensive detection
          const videoElements = node.matches && (
            node.matches('ytd-watch-metadata, #actions, ytd-menu-renderer, #top-level-buttons-computed, ytd-video-primary-info-renderer') ||
            node.querySelector('ytd-watch-metadata, #actions, ytd-menu-renderer, #top-level-buttons-computed, ytd-video-primary-info-renderer')
          );
          
          // Homepage elements - more comprehensive detection
          const homepageElements = node.matches && (
            node.matches('ytd-rich-grid-renderer, ytd-browse, ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer') ||
            node.querySelector('ytd-rich-grid-renderer, ytd-browse, ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer')
          );
          
          return videoElements || homepageElements;
        }
        return false;
      });
    });
    
    if (relevantMutation) {
      // debounce to avoid excessive calls
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isHomepage()) {
          console.log('[YouTube Pinner] Homepage mutation detected, updating pinned videos and adding pin buttons');
          renderPinnedRow();
          addPinButtonsToHomepageVideos();
        } else {
          // For video pages, be more aggressive about button insertion
          if (!document.getElementById("ytp-pin-button")) {
            console.log('[YouTube Pinner] Mutation detected relevant video elements, attempting button insertion');
            addPinButtonIfNeeded();
          }
        }
      }, 200); // Slightly increased debounce for better performance
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // interval fallback for URL change detection
  setInterval(checkUrlChange, 1000);
  
  // Additional fallback specifically for homepage video detection
  if (isHomepage()) {
    let homepageCheckCount = 0;
    const maxHomepageChecks = 30; // 30 seconds of checking
    
    const homepageVideoInterval = setInterval(() => {
      if (!isHomepage()) {
        clearInterval(homepageVideoInterval);
        return;
      }
      
      homepageCheckCount++;
      if (homepageCheckCount >= maxHomepageChecks) {
        clearInterval(homepageVideoInterval);
        console.log('[YouTube Pinner] Max homepage video checks reached');
        return;
      }
      
      // Check for new videos and add pin buttons
      addPinButtonsToHomepageVideos();
      
    }, 1000); // Check every second

    // Add scroll event listener for infinite scroll detection
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (!isHomepage()) return;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        console.log('[YouTube Pinner] Scroll detected, checking for new videos');
        addPinButtonsToHomepageVideos();
      }, 500); // Wait 500ms after scroll stops
    });
  }
})();
