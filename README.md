# Better PiP

Better PiP is a Chromium-based browser (Google Chrome, Microsoft Edge, Brave, etc.) extension that enhances the Picture-in-Picture (PiP) experience. Inspired by latest Firefox's PiP implementation, this extension adds essential playback controls and subtitle support directly to the PiP window, making it a fully functional mini-player.

## Features

- **Enhanced Controls**: Unlike the standard PiP window, Better PiP includes:
  - Play/Pause button
  - Seek bar for easy navigation
  - Time display (Current Time / Duration)
  - Close button
- **Subtitle Support**: Automatically detects and displays subtitles from the main video player (optimized for YouTube) within the PiP window.
- **Keyboard Shortcuts**: Use familiar shortcuts to control playback without focusing the main window:
  - `Space` or `k`: Play/Pause
  - `ArrowLeft` or `j`: Rewind 10 seconds
  - `ArrowRight` or `l`: Fast Forward 10 seconds
- **Smart Restoration**: When you close the PiP window, the video seamlessly returns to its original position on the page.

## Installation

1.  Clone or download this repository to your local machine.
2.  Open your Chromium-based browser and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click on **Load unpacked**.
5.  Select the folder containing the extension files.

## Usage

1.  Navigate to any website with a video player (e.g., YouTube).
2.  Click the **Better PiP** extension icon in the browser toolbar (or use `Alt+P`).
3.  The video will pop out into a floating window with controls and subtitles.
4.  Resize and move the window as needed.
5.  Click the Close button or standard window controls to return the video to the page.

## Compatibility

- **Browser**: Most Chromium-based browser (Google Chrome, Microsoft Edge, Brave, etc.) that supports Manifest V3
- **Video Sites**: Works on most HTML5 video players. Subtitle features are optimized for YouTube but may work on other sites with similar structure.
