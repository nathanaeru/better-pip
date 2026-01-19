chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Try sending a message first (if content script is already loaded via manifest)
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
