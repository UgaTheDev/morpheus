// src/background/service-worker.ts
// Main background service worker with stats tracking

import { statsDB } from "../lib/stats-db";
import { getChromeAI } from "../lib/chrome-ai-client";

setInterval(() => {
  console.log("⏰ Keepalive:", new Date().toLocaleTimeString());
}, 20000);

const chromeAI = getChromeAI();

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("🎯 Morpheus installed");

  // Initialize stats database
  try {
    await statsDB.init();
    console.log("✅ Stats database initialized");
  } catch (error) {
    console.error("❌ Stats DB init failed:", error);
  }

  // Initialize Chrome AI
  try {
    const initialized = await chromeAI.initialize();
    if (initialized) {
      console.log("✅ Chrome AI initialized");
    } else {
      console.warn(
        "⚠️ Chrome AI not available (need Chrome 131+ or Canary with flags)"
      );
    }
  } catch (error) {
    console.error("❌ Chrome AI init failed:", error);
  }

  // Set up periodic updates
  chrome.alarms.create("updateStats", { periodInMinutes: 1 });
  chrome.alarms.create("cleanupOldData", { periodInMinutes: 1440 }); // Daily

  console.log("🚀 Morpheus ready!");
});

// Current tab tracking
let currentTab: chrome.tabs.Tab | null = null;
let tabStartTime: number = Date.now();

// Tab activated (user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // Record previous tab if it exists
    if (
      currentTab?.url &&
      !currentTab.url.startsWith("chrome://") &&
      !currentTab.url.startsWith("chrome-extension://")
    ) {
      const duration = Date.now() - tabStartTime;
      if (duration > 5000) {
        // Only record if > 5 seconds
        await recordTabVisit(currentTab, duration);
      }
    }

    // Update to new tab
    currentTab = await chrome.tabs.get(activeInfo.tabId);
    tabStartTime = Date.now();

    console.log(`📍 Switched to: ${currentTab.title}`);
  } catch (error) {
    console.error("Error in tab activated:", error);
  }
});

// Tab updated (URL changes or page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === "complete" && tab.url) {
      // If this is the current tab and URL changed, record old visit
      if (currentTab?.id === tabId && currentTab.url !== tab.url) {
        const duration = Date.now() - tabStartTime;
        if (
          duration > 5000 &&
          currentTab.url &&
          !currentTab.url.startsWith("chrome://")
        ) {
          await recordTabVisit(currentTab, duration);
        }
        tabStartTime = Date.now();
      }

      currentTab = tab;
      console.log(`🔄 Tab updated: ${tab.title}`);
    }
  } catch (error) {
    console.error("Error in tab updated:", error);
  }
});

// Window focus changed
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus - record current tab
    if (currentTab?.url && !currentTab.url.startsWith("chrome://")) {
      const duration = Date.now() - tabStartTime;
      if (duration > 5000) {
        await recordTabVisit(currentTab, duration);
      }
    }
  } else {
    // Browser gained focus - reset timer
    tabStartTime = Date.now();
  }
});

// Record tab visit in stats database
async function recordTabVisit(tab: chrome.tabs.Tab, durationMs: number) {
  try {
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://")
    ) {
      return;
    }

    // Categorize the URL
    const category = categorizeURL(tab.url);

    // Record in stats database
    await statsDB.recordSiteVisit({
      url: tab.url,
      title: tab.title || "Unknown",
      startTime: Date.now() - durationMs,
      endTime: Date.now(),
      durationMs,
      category: category.category,
      subcategory: category.subcategory,
      date: new Date().toISOString().split("T")[0],
    });

    console.log(
      `📊 Recorded: ${tab.title?.substring(0, 30) || "Unknown"} (${
        category.category
      }) - ${Math.round(durationMs / 1000)}s`
    );

    // Check if we should show an intervention
    if (category.category === "distraction") {
      await checkForIntervention(tab, durationMs);
    }
  } catch (error) {
    console.error("❌ Error recording tab visit:", error);
  }
}

// Simple URL categorization
function categorizeURL(url: string): {
  category: "productive" | "neutral" | "distraction";
  subcategory: string;
} {
  const lowerUrl = url.toLowerCase();

  // Distraction sites
  const distractionSites = [
    "youtube.com",
    "youtu.be",
    "netflix.com",
    "instagram.com",
    "tiktok.com",
    "facebook.com",
    "fb.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "twitch.tv",
    "discord.com",
    "snapchat.com",
    "pinterest.com",
    "tumblr.com",
  ];

  if (distractionSites.some((site) => lowerUrl.includes(site))) {
    return { category: "distraction", subcategory: "entertainment" };
  }

  // Productive sites
  const productiveSites = [
    "github.com",
    "gitlab.com",
    "stackoverflow.com",
    "stackexchange.com",
    "docs.",
    "documentation",
    "wikipedia.org",
    "coursera.org",
    "udemy.com",
    "khanacademy.org",
    "leetcode.com",
    "hackerrank.com",
    "codecademy.com",
    "freecodecamp.org",
    "medium.com",
    "dev.to",
  ];

  if (productiveSites.some((site) => lowerUrl.includes(site))) {
    return { category: "productive", subcategory: "learning" };
  }

  // Work-related
  const workSites = [
    "gmail.com",
    "outlook.com",
    "mail.google.com",
    "calendar.google.com",
    "drive.google.com",
    "notion.so",
    "slack.com",
    "trello.com",
    "asana.com",
    "figma.com",
    "canva.com",
  ];

  if (workSites.some((site) => lowerUrl.includes(site))) {
    return { category: "productive", subcategory: "work" };
  }

  // Everything else is neutral
  return { category: "neutral", subcategory: "general" };
}

// Check if we should show an intervention
async function checkForIntervention(tab: chrome.tabs.Tab, durationMs: number) {
  try {
    // Get today's stats
    const today = new Date().toISOString().split("T")[0];
    const stats = await statsDB.getDailyStatsForDate(today);

    // Only intervene if:
    // 1. Been on distraction site for > 5 minutes
    // 2. Total distraction time today > 30 minutes
    // 3. Haven't been interrupted recently (last intervention was > 10 min ago)

    const fiveMinutes = 5 * 60 * 1000;
    const thirtyMinutes = 30 * 60 * 1000;

    if (durationMs < fiveMinutes) return;
    if (stats.distractionTimeMs < thirtyMinutes) return;

    // Check last intervention time (you'd store this in chrome.storage)
    const lastIntervention = await chrome.storage.local.get(
      "lastInterventionTime"
    );
    const lastTime = lastIntervention.lastInterventionTime || 0;
    const tenMinutes = 10 * 60 * 1000;

    if (Date.now() - lastTime < tenMinutes) return;

    // Show intervention
    await showIntervention(tab);

    // Update last intervention time
    await chrome.storage.local.set({ lastInterventionTime: Date.now() });
  } catch (error) {
    console.error("Error checking intervention:", error);
  }
}

// Show intervention overlay
async function showIntervention(tab: chrome.tabs.Tab) {
  try {
    // Send message to content script to show overlay
    await chrome.tabs.sendMessage(tab.id!, {
      type: "SHOW_INTERVENTION",
      intervention: {
        message:
          "Taking a break? You've been browsing for a while. Time to refocus! 🎯",
        actions: [
          { label: "Back to work", action: "close_tab" },
          { label: "5 more minutes", action: "snooze" },
        ],
        urgency: "medium",
      },
    });

    console.log("🚨 Intervention shown");
  } catch (error) {
    console.error("Error showing intervention:", error);
  }
}

// Periodic stats update
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "updateStats") {
    // Update current tab if user is still on it
    if (currentTab?.url && !currentTab.url.startsWith("chrome://")) {
      const duration = Date.now() - tabStartTime;

      // Only update if been on page for > 1 minute
      if (duration > 60000) {
        await recordTabVisit(currentTab, duration);
        tabStartTime = Date.now(); // Reset timer
      }
    }
  } else if (alarm.name === "cleanupOldData") {
    // Clean up data older than 90 days
    console.log("🧹 Running daily cleanup...");
    // You can implement cleanup logic here
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      console.log("📨 Message received:", message.type);

      switch (message.type) {
        case "GET_STATS": {
          const today = new Date().toISOString().split("T")[0];
          const stats = await statsDB.getDailyStatsForDate(today);
          sendResponse({ success: true, stats });
          break;
        }

        case "GET_STREAK": {
          const streak = await statsDB.getCurrentStreak();
          sendResponse({ success: true, streak });
          break;
        }

        case "EXPORT_STATS": {
          const data = await statsDB.exportStats();
          sendResponse({ success: true, data });
          break;
        }

        case "INTERVENTION_RESPONSE": {
          await statsDB.recordIntervention({
            timestamp: Date.now(),
            site: message.site,
            message: message.interventionMessage,
            outcome: message.outcome,
            distractionTimeMs: message.distractionTime || 0,
            date: new Date().toISOString().split("T")[0],
          });

          console.log(`✅ Intervention ${message.outcome}`);
          sendResponse({ success: true });
          break;
        }

        case "GET_AI_STATUS": {
          const status = await chromeAI.getAPIStatus();
          sendResponse({ success: true, status });
          break;
        }

        case "ANALYZE_INTENT": {
          if (chromeAI.isAIAvailable()) {
            const result = await chromeAI.analyzeIntent(message.patterns);
            sendResponse({ success: true, result });
          } else {
            sendResponse({ success: false, error: "AI not available" });
          }
          break;
        }

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();

  return true; // Keep channel open for async response
});

// Log when service worker starts
console.log("🎯 Morpheus service worker loaded");

// Export for other files if needed
export {};

declare global {
  interface Window {
    statsDB: typeof statsDB;
  }
}

// Expose statsDB to global scope for console testing
(self as any).statsDB = statsDB;
console.log("🧪 statsDB exposed to console");
