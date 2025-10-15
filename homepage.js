// homepage.js
(function () {
  const PIN_ROW_ID = "yt-pinned-row";
  let isRendering = false; // Prevent multiple simultaneous renders

  function removeExistingRow() {
    // Remove ALL instances of pinned rows to prevent duplicates
    const existingRows = document.querySelectorAll(`#${PIN_ROW_ID}`);
    existingRows.forEach(row => row.remove());
  }

  function buildRow(pinned) {
    if (!pinned || pinned.length === 0) return;

    // container analogous to other homepage rows
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
    // find main feed; try several selectors to be resilient to YouTube layout changes
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
      // fallback: insert at top of body
      document.body.insertBefore(wrapper, document.body.firstChild);
      return;
    }
    // insert before feed's first child
    feed.parentNode.insertBefore(wrapper, feed);
  }

  function renderPinnedRow() {
    // Prevent multiple simultaneous renders
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

  // initial render (delay a bit for feed)
  setTimeout(renderPinnedRow, 1500);

  // listen for messages (e.g., content script added a pin)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "pinned-updated") {
      setTimeout(renderPinnedRow, 500);
    }
  });

  // observe body changes and re-render if feed appears later
  let debounceTimer;
  const observer = new MutationObserver(() => {
    // debounce to avoid excessive calls and prevent duplicates
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!document.getElementById(PIN_ROW_ID)) renderPinnedRow();
    }, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // interval fallback for robustness (reduced frequency)
  setInterval(() => {
    if (!document.getElementById(PIN_ROW_ID)) renderPinnedRow();
  }, 5000);
})();
