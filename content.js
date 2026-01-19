(async () => {
  // Safety checks
  const video = document.querySelector("video");
  if (!video) return alert("No video found!");
  if (!("documentPictureInPicture" in window))
    return alert("Browser not supported.");
  if (window.documentPictureInPicture.window) {
    window.documentPictureInPicture.window.document.title =
      "Picture-in-Picture Video";
    return;
  }

  // Open PiP window
  // Workaround: Some browsers take a snapshot of the main page title when opening PiP.
  // We temporarily swap the main page title to force the PiP window to pick it up.
  const originalTitle = document.title;
  document.title = "Picture-in-Picture Video";

  // Give the browser event loop a moment to propagate the title change to the OS/UI
  await new Promise((r) => setTimeout(r, 200));

  let pipWindow;
  try {
    // Open PiP window
    pipWindow = await window.documentPictureInPicture.requestWindow({
      width: video.videoWidth || 640,
      height: video.videoHeight || 360,
    });
  } catch (err) {
    document.title = originalTitle; // Restore if failed
    throw err;
  }

  // Restore original title after a delay to ensure OS captures it
  setTimeout(() => {
    document.title = originalTitle;
  }, 500);
  // Initialize PiP window using document.write to firmly establish the title
  pipWindow.document.open();
  pipWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Picture-in-Picture Video</title>
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

  // Force title persistence (still good to have)
  const ensureTitle = () => {
    if (pipWindow.document.title !== "Picture-in-Picture Video") {
      pipWindow.document.title = "Picture-in-Picture Video";
    }
  };
  // Re-attach observer to the NEW document
  const titleObserver = new MutationObserver(ensureTitle);
  titleObserver.observe(pipWindow.document.querySelector("title"), {
    subtree: true,
    characterData: true,
    childList: true,
  });

  // Logic & moving video
  const originalParent = video.parentNode;
  const originalNextSibling = video.nextSibling;
  const originalClasses = video.className;
  const vidContainer = pipWindow.document.getElementById("vid-container");
  video.className = "";
  vidContainer.appendChild(video);

  // Core logic
  const playBtn = pipWindow.document.getElementById("play-btn");
  const seekBar = pipWindow.document.getElementById("seek-bar");
  const closeBtn = pipWindow.document.getElementById("close-btn");
  const currTimeEl = pipWindow.document.getElementById("curr-time");
  const durTimeEl = pipWindow.document.getElementById("dur-time");

  // Unified Functions
  const togglePlay = () => (video.paused ? video.play() : video.pause());
  const updatePlayIcon = () => (playBtn.textContent = video.paused ? "▶" : "⏸");
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

  // Event listeners

  // Mouse Controls
  playBtn.onclick = (e) => {
    e.stopPropagation();
    togglePlay();
  };
  vidContainer.onclick = () => togglePlay();
  closeBtn.onclick = () => pipWindow.close();

  // Slider Logic
  video.addEventListener("timeupdate", () => {
    if (!video.duration) return;
    seekBar.value = video.currentTime;
    seekBar.max = video.duration;
    currTimeEl.textContent = fmt(video.currentTime);
    updateSliderStyle(video.currentTime, video.duration);
  });
  seekBar.addEventListener("input", (e) => {
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    updateSliderStyle(time, video.duration);
  });

  video.addEventListener("play", updatePlayIcon);
  video.addEventListener("pause", updatePlayIcon);
  video.addEventListener("loadedmetadata", () => {
    if (video.duration) {
      seekBar.max = video.duration;
      durTimeEl.textContent = fmt(video.duration);
    }
  });
  // Trigger initially
  if (video.duration) durTimeEl.textContent = fmt(video.duration);

  // Keyboard shortcuts
  pipWindow.document.addEventListener("keydown", (e) => {
    // Ignore shortcuts if user is typing in an input (rare in PiP, but good practice)
    if (e.target.tagName === "INPUT" && e.target.type !== "range") return;

    switch (e.key) {
      case " ":
      case "k": // YouTube standard
        e.preventDefault(); // Stop scrolling/button press
        togglePlay();
        break;

      case "ArrowLeft":
      case "j": // YouTube standard
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        updateSliderStyle(video.currentTime, video.duration);
        break;

      case "ArrowRight":
      case "l": // YouTube standard
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        updateSliderStyle(video.currentTime, video.duration);
        break;
    }
  });

  // Subtitles
  const subTextEl = pipWindow.document.getElementById("sub-text");
  const subSelectors = [
    ".ytp-caption-segment",
    ".caption-window .caption-visual-line",
    ".player-timedtext-text-container span",
  ];

  const observer = new MutationObserver(() => {
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
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Cleanup
  pipWindow.addEventListener("pagehide", () => {
    observer.disconnect();
    titleObserver.disconnect();
    video.className = originalClasses;
    if (originalNextSibling)
      originalParent.insertBefore(video, originalNextSibling);
    else originalParent.appendChild(video);
  });
})();
