// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("list");
  const clearBtn = document.getElementById("clearAll");

  function render() {
    listEl.innerHTML = "";
    chrome.storage.sync.get({ pinned: [] }, (data) => {
      if (chrome.runtime.lastError) {
        listEl.innerHTML = "<div style='color:#f44'>Extension error. Please reload.</div>";
        return;
      }
      const pinned = data.pinned || [];
      if (pinned.length === 0) {
        listEl.innerHTML = "<div style='color:#444'>No pinned videos yet. Pin from any video's page.</div>";
        return;
      }

      pinned.slice().reverse().forEach((item) => {
        const itemEl = document.createElement("div");
        itemEl.className = "item";

        const img = document.createElement("img");
        img.src = item.thumbnail;

        const meta = document.createElement("div");
        meta.className = "meta";

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = item.title;

        const link = document.createElement("a");
        link.href = `https://www.youtube.com/watch?v=${item.id}`;
        link.textContent = "Open";
        link.target = "_blank";

        meta.appendChild(title);
        meta.appendChild(link);

        const unpinBtn = document.createElement("button");
        unpinBtn.className = "unpin";
        unpinBtn.title = "Unpin";
        unpinBtn.textContent = "❌";
        unpinBtn.addEventListener("click", () => {
          chrome.storage.sync.get({ pinned: [] }, (d) => {
            let arr = d.pinned || [];
            arr = arr.filter(v => v.id !== item.id);
            chrome.storage.sync.set({ pinned: arr }, () => {
              render();
              // notify homepage to update quickly if open
              try { 
                chrome.runtime.sendMessage({ type: "pinned-updated" }); 
              } catch (e) {
                console.warn('[YouTube Pinner] Could not notify homepage:', e);
              }
            });
          });
        });

        itemEl.appendChild(img);
        itemEl.appendChild(meta);
        itemEl.appendChild(unpinBtn);

        listEl.appendChild(itemEl);
      });
    });
  }

  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear all pinned videos?")) return;
    chrome.storage.sync.set({ pinned: [] }, () => {
      render();
      try { 
        chrome.runtime.sendMessage({ type: "pinned-updated" }); 
      } catch (e) {
        console.warn('[YouTube Pinner] Could not notify homepage:', e);
      }
    });
  });

  render();
});
