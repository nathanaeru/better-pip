chrome.action.onClicked.addListener(async (tab) => {
  // Ensure we are only operating on YouTube
  if (!tab.url || !tab.url.includes("youtube.com")) {
    console.log("Better PiP is restricted to YouTube only.");
    return;
  }

  try {
    // Try sending a message first
    await chrome.tabs.sendMessage(tab.id, { action: "toggle_pip" });
  } catch (error) {
    // If message fails (script not loaded), inject it manually
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content.js"],
    });
    // Then send the message again
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "toggle_pip" });
    } catch (e) {
      console.error("Failed to toggle PiP after injection:", e);
    }
  }
});