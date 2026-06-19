(() => {
  if (window.betterPipInitialized) return;
  window.betterPipInitialized = true;

  const PIP_TITLE = "Picture-in-Picture Video";

  async function togglePiP(video) {
    if (!video) return alert("No video found!");
    if (!("documentPictureInPicture" in window)) return alert("Browser not supported.");
    if (window.documentPictureInPicture.window) {
      window.documentPictureInPicture.window.document.title = PIP_TITLE;
      return;
    }

    const originalTitle = document.title;
    document.title = PIP_TITLE;
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

    setTimeout(() => { document.title = originalTitle; }, 500);

    pipWindow.document.open();
    pipWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${PIP_TITLE}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@500&display=swap">
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #000; height: 100vh; width: 100vw; display: grid; grid-template-rows: 1fr auto; overflow: hidden; font-family: 'Roboto', sans-serif; user-select: none; }
          .video-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; display: flex; align-items: center; justify-content: center; background: #000; cursor: pointer; }
          video { width: 100% !important; height: 100% !important; object-fit: contain !important; pointer-events: none; }
          .subtitle-layer { position: absolute; bottom: 60px; left: 0; width: 100%; z-index: 9999; pointer-events: none; text-align: center; padding: 0 20px; }
          .subtitle-text { display: inline-block; background-color: rgba(0, 0, 0, 0.7); color: #fff; font-size: 20px; line-height: 1.4; padding: 4px 8px; border-radius: 4px; text-shadow: 0 0 2px black; white-space: pre-wrap; }
          .controls-layer { position: absolute; bottom: 0; left: 0; width: 100%; height: 48px; z-index: 10000; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); display: flex; align-items: center; padding: 0 12px; gap: 12px; opacity: 0; transition: opacity 0.2s; }
          body:hover .controls-layer { opacity: 1; }
          button { background: none; border: none; color: white; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 18px; padding: 0; padding-bottom: 2px; line-height: 0; transition: background 0.2s; }
          button:hover { background: rgba(255,255,255,0.2); }
          input[type=range] { -webkit-appearance: none; flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.3); cursor: pointer; position: relative; }
          input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%; background: #ff0000; box-shadow: 0 0 4px rgba(0,0,0,0.5); transition: transform 0.1s; margin-top: -5px; }
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

    const titleObserver = new MutationObserver(() => {
      if (pipWindow.document.title !== PIP_TITLE) pipWindow.document.title = PIP_TITLE;
    });
    titleObserver.observe(pipWindow.document.querySelector("title"), { subtree: true, characterData: true, childList: true });

    const originalParent = video.parentNode;
    const originalNextSibling = video.nextSibling;
    const originalClasses = video.className;
    const vidContainer = pipWindow.document.getElementById("vid-container");
    
    // Move Video
    video.className = "";
    vidContainer.appendChild(video);

    const playBtn = pipWindow.document.getElementById("play-btn");
    const seekBar = pipWindow.document.getElementById("seek-bar");
    const closeBtn = pipWindow.document.getElementById("close-btn");
    const currTimeEl = pipWindow.document.getElementById("curr-time");
    const durTimeEl = pipWindow.document.getElementById("dur-time");

    const togglePlay = () => (video.paused ? video.play() : video.pause());
    const updatePlayIcon = () => (playBtn.textContent = video.paused ? "▶" : "⏸");
    
    const fmt = (s, forceHours = false) => {
      if (isNaN(s)) return "0:00";
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60).toString().padStart(2, "0");
      return (forceHours || h > 0) ? `${h}:${m.toString().padStart(2, "0")}:${sec}` : `${m}:${sec}`;
    };
    
    const updateSliderStyle = (val, max) => {
      const percentage = (val / max) * 100;
      seekBar.style.background = `linear-gradient(to right, #ff0000 ${percentage}%, rgba(255,255,255,0.3) ${percentage}%)`;
    };

    playBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
    vidContainer.onclick = () => togglePlay();
    closeBtn.onclick = () => pipWindow.close();

    const timeUpdate = () => {
      if (!video.duration) return;
      seekBar.value = video.currentTime;
      currTimeEl.textContent = fmt(video.currentTime, video.duration >= 3600);
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
        durTimeEl.textContent = fmt(video.duration, video.duration >= 3600);
      }
    };

    video.addEventListener("timeupdate", timeUpdate);
    seekBar.addEventListener("input", seekInput);
    video.addEventListener("play", updatePlayIcon);
    video.addEventListener("pause", updatePlayIcon);
    video.addEventListener("loadedmetadata", loadedMeta);
    if (video.duration) loadedMeta();

    pipWindow.document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": case "j": e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10); updateSliderStyle(video.currentTime, video.duration); break;
        case "ArrowRight": case "l": e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 10); updateSliderStyle(video.currentTime, video.duration); break;
      }
    });

    // YouTube Only Subtitles
    const subTextEl = pipWindow.document.getElementById("sub-text");
    const subObserver = new MutationObserver(() => {
      let text = [];
      document.querySelectorAll(".ytp-caption-segment").forEach(el => {
        if (el.textContent.trim()) text.push(el.textContent.trim());
      });
      const uniqueText = [...new Set(text)].join("\n");
      subTextEl.textContent = uniqueText;
      subTextEl.style.display = uniqueText ? "inline-block" : "none";
    });
    subObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    pipWindow.addEventListener("pagehide", () => {
      subObserver.disconnect();
      titleObserver.disconnect();
      video.removeEventListener("timeupdate", timeUpdate);
      seekBar.removeEventListener("input", seekInput);
      video.removeEventListener("play", updatePlayIcon);
      video.removeEventListener("pause", updatePlayIcon);
      video.removeEventListener("loadedmetadata", loadedMeta);

      video.className = originalClasses;
      if (originalNextSibling) originalParent.insertBefore(video, originalNextSibling);
      else originalParent.appendChild(video);
    });
  }

  // YouTube Overlay Button Logic
  function addOverlay(video) {
    if (video.hasAttribute("data-better-pip-button")) return;
    video.setAttribute("data-better-pip-button", "true");

    // Explicitly target YouTube's player container
    const ytPlayer = video.closest('.html5-video-player') || video.parentNode;
    if (!ytPlayer) return;

    const btn = document.createElement("button");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
        <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
      </svg>
    `;
    
    // Bottom-right placement
    btn.style.cssText = `
      position: absolute;
      z-index: 99999;
      bottom: 20%;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s, transform 0.2s;
    `;
    btn.title = "Open Picture-in-Picture (Alt+P)";

    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.1)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; });

    // Show button when hovering over the video player
    ytPlayer.addEventListener("mouseenter", () => btn.style.opacity = "1");
    ytPlayer.addEventListener("mouseleave", () => btn.style.opacity = "0");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      togglePiP(video);
    });

    ytPlayer.appendChild(btn);
  }

  function observe() {
    document.querySelectorAll("video").forEach(addOverlay);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeName === "VIDEO") addOverlay(n);
          if (n.querySelectorAll) n.querySelectorAll("video").forEach(addOverlay);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  observe();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggle_pip") {
      const video = document.querySelector("video");
      if (video) togglePiP(video);
      else alert("No video found");
    }
  });
})();