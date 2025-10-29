import { behaviorMonitor } from "./behavior-monitor";
import { intentEngine } from "./intent-engine";
import { db } from "../lib/db";

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Morpheus extension installed");
  await db.initialize();
  await behaviorMonitor.initialize();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("Morpheus extension started");
  await db.initialize();
  await behaviorMonitor.initialize();
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(
  message: any,
  _sender: chrome.runtime.MessageSender
) {
  switch (message.type) {
    case "GET_STATS":
      const patterns = await db.getPatternsSince(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      );
      const intent = await intentEngine.analyzeIntent(patterns);
      return { patterns, intent };

    case "SETTINGS_UPDATED":
      console.log("Settings updated:", message.settings);
      return { success: true };

    default:
      return { error: "Unknown message type" };
  }
}
