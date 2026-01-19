(() => {
  if (window.betterPipInitialized) return;
  window.betterPipInitialized = true;

  // Configuration
  const PIP_TITLE = "Picture-in-Picture Video";

  // PiP Logic
  async function togglePiP(video) {
    if (!video) return alert("No video found!");
    if (!("documentPictureInPicture" in window))
      return alert("Browser not supported.");
    if (window.documentPictureInPicture.window) {
      window.documentPictureInPicture.window.document.title = PIP_TITLE;
      return;
    }

    // Workaround: Title Swap
    const originalTitle = document.title;
    document.title = PIP_TITLE;

    // Delay for OS propagation
    await new Promise((r) => setTimeout(r, 200));

    let pipWindow;
    try {
      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: video.videoWidth || 640,
        height: video.videoHeight || 360,
      });
    } catch (err) {
      document.title = originalTitle;
      throw err;
    }

    // Restore title
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);

    // Initialize Document
    pipWindow.document.open();
    pipWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${PIP_TITLE}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@500&display=swap">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; background: #000; height: 100vh; width: 100vw;
      display: grid; grid-template-rows: 1fr auto; overflow: hidden;
      font-family: 'Roboto', sans-serif;
      user-select: none;
    }
    .video-layer {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 1; display: flex; align-items: center; justify-content: center;
      background: #000; cursor: pointer;
    }
    video {
      width: 100% !important; height: 100% !important;
      object-fit: contain !important; pointer-events: none;
    }
    .subtitle-layer {
      position: absolute; bottom: 60px; left: 0; width: 100%;
      z-index: 9999; pointer-events: none;
      text-align: center; padding: 0 20px;
    }
    .subtitle-text {
      display: inline-block; background-color: rgba(0, 0, 0, 0.7);
      color: #fff; font-size: 20px; line-height: 1.4;
      padding: 4px 8px; border-radius: 4px;
      text-shadow: 0 0 2px black; white-space: pre-wrap;
    }
    .controls-layer {
      position: absolute; bottom: 0; left: 0; width: 100%;
      height: 48px; z-index: 10000;
      background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
      display: flex; align-items: center; padding: 0 12px; gap: 12px;
      opacity: 0; transition: opacity 0.2s;
    }
    body:hover .controls-layer { opacity: 1; }
    button {
      background: none; border: none; color: white; cursor: pointer;
      width: 32px; height: 32px; 
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%; 
      font-size: 18px; 
      padding: 0;
      line-height: 1;
      transition: background 0.2s;
    }
    button:hover { background: rgba(255,255,255,0.2); }
    input[type=range] {
      -webkit-appearance: none; flex: 1; height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.3); cursor: pointer; position: relative;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; height: 14px; width: 14px;
      border-radius: 50%; background: #ff0000;
      box-shadow: 0 0 4px rgba(0,0,0,0.5); transition: transform 0.1s;
    }
    input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }
    .time-display { font-size: 12px; color: #eee; font-weight: 500; min-width: 40px; text-align: center; }
  </style>
</head>
<body>
  <div class="video-layer" id="vid-container"></div>
  <div class="subtitle-layer"><span class="subtitle-text" id="sub-text"></span></div>
  <div class="controls-layer">
    <button id="play-btn">⏸</button>
    <span class="time-display" id="curr-time">0:00</span>
    <input type="range" id="seek-bar" value="0" min="0" step="0.1">
    <span class="time-display" id="dur-time">0:00</span>
    <button id="close-btn" title="Close PiP">⤢</button>
  </div>
</body>
</html>
    `);
    pipWindow.document.close();

    // Re-attach observer logic
    const ensureTitle = () => {
      if (pipWindow.document.title !== PIP_TITLE) {
        pipWindow.document.title = PIP_TITLE;
      }
    };
    const titleObserver = new MutationObserver(ensureTitle);
    titleObserver.observe(pipWindow.document.querySelector("title"), {
      subtree: true,
      characterData: true,
      childList: true,
    });

    // Move video
    const originalParent = video.parentNode;
    const originalNextSibling = video.nextSibling;
    const originalClasses = video.className;
    const vidContainer = pipWindow.document.getElementById("vid-container");
    video.className = "";
    vidContainer.appendChild(video);

    // Elements
    const playBtn = pipWindow.document.getElementById("play-btn");
    const seekBar = pipWindow.document.getElementById("seek-bar");
    const closeBtn = pipWindow.document.getElementById("close-btn");
    const currTimeEl = pipWindow.document.getElementById("curr-time");
    const durTimeEl = pipWindow.document.getElementById("dur-time");

    // Functions
    const togglePlay = () => (video.paused ? video.play() : video.pause());
    const updatePlayIcon = () =>
      (playBtn.textContent = video.paused ? "▶" : "⏸");
    const fmt = (s) => {
      if (isNaN(s)) return "0:00";
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60)
        .toString()
        .padStart(2, "0");
      return `${m}:${sec}`;
    };
    const updateSliderStyle = (val, max) => {
      const percentage = (val / max) * 100;
      seekBar.style.background = `linear-gradient(to right, #ff0000 ${percentage}%, rgba(255,255,255,0.3) ${percentage}%)`;
    };

    // Listeners
    playBtn.onclick = (e) => {
      e.stopPropagation();
      togglePlay();
    };
    vidContainer.onclick = () => togglePlay();
    closeBtn.onclick = () => pipWindow.close();

    // Slider
    const timeUpdate = () => {
      if (!video.duration) return;
      seekBar.value = video.currentTime;
      seekBar.max = video.duration;
      currTimeEl.textContent = fmt(video.currentTime);
      updateSliderStyle(video.currentTime, video.duration);
    };
    const seekInput = (e) => {
      const time = parseFloat(e.target.value);
      video.currentTime = time;
      updateSliderStyle(time, video.duration);
    };
    const loadedMeta = () => {
      if (video.duration) {
        seekBar.max = video.duration;
        durTimeEl.textContent = fmt(video.duration);
      }
    };

    video.addEventListener("timeupdate", timeUpdate);
    seekBar.addEventListener("input", seekInput);
    video.addEventListener("play", updatePlayIcon);
    video.addEventListener("pause", updatePlayIcon);
    video.addEventListener("loadedmetadata", loadedMeta);
    if (video.duration) loadedMeta();

    // Keyboard
    pipWindow.document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" && e.target.type !== "range") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          updateSliderStyle(video.currentTime, video.duration);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          updateSliderStyle(video.currentTime, video.duration);
          break;
      }
    });

    // Subtitles (Simplified reuse)
    const subTextEl = pipWindow.document.getElementById("sub-text");
    const subSelectors = [
      ".ytp-caption-segment",
      ".caption-window .caption-visual-line",
      ".player-timedtext-text-container span",
    ];
    const subObserver = new MutationObserver(() => {
      let text = [];
      subSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          if (el.textContent.trim()) text.push(el.textContent.trim());
        });
      });
      const uniqueText = [...new Set(text)].join("\n");
      subTextEl.textContent = uniqueText;
      subTextEl.style.display = uniqueText ? "inline-block" : "none";
    });
    subObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Cleanup
    pipWindow.addEventListener("pagehide", () => {
      subObserver.disconnect();
      titleObserver.disconnect();
      video.removeEventListener("timeupdate", timeUpdate);
      seekBar.removeEventListener("input", seekInput);
      video.removeEventListener("play", updatePlayIcon);
      video.removeEventListener("pause", updatePlayIcon);
      video.removeEventListener("loadedmetadata", loadedMeta);

      video.className = originalClasses;
      if (originalNextSibling)
        originalParent.insertBefore(video, originalNextSibling);
      else originalParent.appendChild(video);
    });
  }

  // Overlay Button Logic
  function addOverlay(video) {
    if (video.hasAttribute("data-better-pip-button")) return;
    video.setAttribute("data-better-pip-button", "true");

    const parent = video.parentNode;
    if (!parent) return;

    // Check positioning
    if (window.getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }

    const btn = document.createElement("button");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
        <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
      </svg>
    `;
    btn.style.cssText = `
      position: absolute;
      z-index: 99999;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s;
      left: 10px;
      top: 10px !important;
    `;
    btn.title = "Open Picture-in-Picture (Alt+P)";

    // Simulating hover on parent
    parent.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
    parent.addEventListener("mouseleave", () => (btn.style.opacity = "0"));

    // Also show if video is paused?

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      togglePiP(video);
    });

    parent.appendChild(btn);
  }

  // Initial Observer
  function observe() {
    const selector = "video";
    document.querySelectorAll(selector).forEach(addOverlay);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeName === "VIDEO") addOverlay(n);
          if (n.querySelectorAll)
            n.querySelectorAll("video").forEach(addOverlay);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Start
  observe();

  // Listen for background messages
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "toggle_pip") {
      const video = document.querySelector("video");
      if (video) togglePiP(video);
      else alert("No video found");
    }
  });
})();
