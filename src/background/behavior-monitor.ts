import type {
  BrowsingPattern,
  BehaviorAnomaly,
  SessionData,
} from "../lib/types";
import { db } from "../lib/db";
import { calculateBrowsingScore } from "../lib/utils";

export class BehaviorMonitor {
  private sessionStart: number = Date.now();
  private activeTab: number | null = null;
  private tabStartTime: number = 0;
  private sessionPatterns: BrowsingPattern[] = [];
  private historicalBaseline: {
    avgSessionDuration: number;
    avgSitesPerSession: number;
    topCategories: string[];
    typicalHours: number[];
  } | null = null;

  async initialize(): Promise<void> {
    await this.loadHistoricalBaseline();
    this.setupListeners();
  }

  private setupListeners(): void {
    // Track active tab changes
    chrome.tabs.onActivated.addListener(
      async (activeInfo: chrome.tabs.TabActiveInfo) => {
        await this.handleTabChange(activeInfo.tabId);
      }
    );

    // Track navigation events
    chrome.webNavigation.onCompleted.addListener(
      async (
        details: chrome.webNavigation.WebNavigationFramedCallbackDetails
      ) => {
        if (details.frameId === 0) {
          // Main frame only
          await this.handleNavigation(details.tabId, details.url);
        }
      }
    );

    // Track tab removals
    chrome.tabs.onRemoved.addListener(async (tabId: number) => {
      await this.handleTabClose(tabId);
    });

    // Periodic session summary
    setInterval(() => this.summarizeSession(), 15 * 60 * 1000); // Every 15 minutes
  }

  private async handleTabChange(tabId: number): Promise<void> {
    // Record time spent on previous tab
    if (this.activeTab !== null) {
      const duration = Date.now() - this.tabStartTime;
      await this.recordTabDuration(this.activeTab, duration);
    }

    // Set new active tab
    this.activeTab = tabId;
    this.tabStartTime = Date.now();
  }

  private async handleNavigation(tabId: number, url: string): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      const pattern: BrowsingPattern = {
        id: crypto.randomUUID(),
        url,
        domain: new URL(url).hostname,
        title: tab.title || "",
        timestamp: Date.now(),
        duration: 0,
        category: await this.categorizeUrl(url),
        sessionId: this.getSessionId(),
      };

      this.sessionPatterns.push(pattern);
      await db.addPattern(pattern);

      // Check for anomalies
      await this.checkForAnomalies(pattern);
    } catch (error) {
      console.error("Navigation handling failed:", error);
    }
  }

  private async handleTabClose(tabId: number): Promise<void> {
    if (this.activeTab === tabId) {
      const duration = Date.now() - this.tabStartTime;
      await this.recordTabDuration(tabId, duration);
      this.activeTab = null;
    }
  }

  private async recordTabDuration(
    _tabId: number,
    duration: number
  ): Promise<void> {
    // Find the most recent pattern for this tab and update duration
    const recentPattern = this.sessionPatterns
      .filter((p) => p.duration === 0)
      .pop();

    if (recentPattern && duration > 1000) {
      // Only record if > 1 second
      recentPattern.duration = duration;
      await db.updatePattern(recentPattern.id, { duration });
    }
  }

  private async checkForAnomalies(pattern: BrowsingPattern): Promise<void> {
    if (!this.historicalBaseline) return;

    const anomalies: BehaviorAnomaly[] = [];
    const now = new Date();
    const hour = now.getHours();

    // Check unusual browsing time
    if (!this.historicalBaseline.typicalHours.includes(hour)) {
      anomalies.push({
        id: crypto.randomUUID(),
        type: "unusual_time",
        severity: "low",
        description: `Browsing at unusual hour: ${hour}:00`,
        timestamp: Date.now(),
        pattern,
      });
    }

    // Check unusual category
    if (!this.historicalBaseline.topCategories.includes(pattern.category)) {
      anomalies.push({
        id: crypto.randomUUID(),
        type: "unusual_category",
        severity: "medium",
        description: `Unusual category: ${pattern.category}`,
        timestamp: Date.now(),
        pattern,
      });
    }

    // Check rapid navigation (potential distraction)
    const recentCount = this.sessionPatterns.filter(
      (p) => Date.now() - p.timestamp < 60000 // Last minute
    ).length;

    if (recentCount > 10) {
      anomalies.push({
        id: crypto.randomUUID(),
        type: "rapid_switching",
        severity: "high",
        description: `Rapid tab switching: ${recentCount} sites in 1 minute`,
        timestamp: Date.now(),
        pattern,
      });
    }

    // Store anomalies
    for (const anomaly of anomalies) {
      await db.addAnomaly(anomaly);
    }

    // Notify if high severity
    if (anomalies.some((a) => a.severity === "high")) {
      await this.notifyAnomaly(anomalies.find((a) => a.severity === "high")!);
    }
  }

  private async notifyAnomaly(anomaly: BehaviorAnomaly): Promise<void> {
    chrome.runtime.sendMessage({
      type: "ANOMALY_DETECTED",
      anomaly,
    });
  }

  private async categorizeUrl(url: string): Promise<string> {
    try {
      const domain = new URL(url).hostname;

      // Simple categorization based on domain patterns
      const categories: Record<string, string[]> = {
        social: [
          "facebook",
          "twitter",
          "instagram",
          "linkedin",
          "reddit",
          "tiktok",
        ],
        news: ["news", "cnn", "bbc", "nytimes", "reuters", "bloomberg"],
        shopping: ["amazon", "ebay", "shop", "store", "buy"],
        entertainment: ["youtube", "netflix", "spotify", "twitch", "hulu"],
        productivity: ["docs.google", "notion", "asana", "trello", "slack"],
        development: ["github", "stackoverflow", "gitlab", "dev.to"],
        learning: ["coursera", "udemy", "khan", "edx", "learning"],
      };

      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some((keyword) => domain.includes(keyword))) {
          return category;
        }
      }

      return "other";
    } catch {
      return "other";
    }
  }

  private async loadHistoricalBaseline(): Promise<void> {
    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const patterns = await db.getPatternsSince(thirtyDaysAgo);

      if (patterns.length < 10) {
        // Not enough data yet
        return;
      }

      // Calculate average session duration
      const sessions = this.groupBySession(patterns);
      const avgSessionDuration =
        sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length;

      // Calculate average sites per session
      const avgSitesPerSession =
        sessions.reduce((sum, s) => sum + s.patternCount, 0) / sessions.length;

      // Get top categories
      const categoryCounts: Record<string, number> = {};
      patterns.forEach((p) => {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      });
      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat]) => cat);

      // Get typical browsing hours
      const hourCounts: Record<number, number> = {};
      patterns.forEach((p) => {
        const hour = new Date(p.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const typicalHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([hour]) => parseInt(hour));

      this.historicalBaseline = {
        avgSessionDuration,
        avgSitesPerSession,
        topCategories,
        typicalHours,
      };
    } catch (error) {
      console.error("Failed to load historical baseline:", error);
    }
  }

  private groupBySession(patterns: BrowsingPattern[]): SessionData[] {
    const sessions: Record<string, SessionData> = {};

    patterns.forEach((pattern) => {
      if (!sessions[pattern.sessionId]) {
        sessions[pattern.sessionId] = {
          id: pattern.sessionId,
          startTime: pattern.timestamp,
          endTime: pattern.timestamp,
          duration: 0,
          patternCount: 0,
          categories: [],
        };
      }

      const session = sessions[pattern.sessionId];
      session.endTime = Math.max(session.endTime, pattern.timestamp);
      session.duration = session.endTime - session.startTime;
      session.patternCount++;
      if (!session.categories.includes(pattern.category)) {
        session.categories.push(pattern.category);
      }
    });

    return Object.values(sessions);
  }

  private getSessionId(): string {
    return `session_${this.sessionStart}`;
  }

  private async summarizeSession(): Promise<void> {
    const session = this.groupBySession(this.sessionPatterns)[0];
    if (session) {
      await db.addSession(session);
    }

    // Calculate browsing score
    const score = calculateBrowsingScore(this.sessionPatterns);
    chrome.runtime.sendMessage({
      type: "SESSION_SUMMARY",
      session,
      score,
    });
  }

  async getSessionStats(): Promise<{
    duration: number;
    sitesVisited: number;
    categories: string[];
    score: number;
  }> {
    const duration = Date.now() - this.sessionStart;
    const sitesVisited = this.sessionPatterns.length;
    const categories = [
      ...new Set(this.sessionPatterns.map((p) => p.category)),
    ];
    const score = calculateBrowsingScore(this.sessionPatterns);

    return { duration, sitesVisited, categories, score };
  }

  resetSession(): void {
    this.sessionStart = Date.now();
    this.sessionPatterns = [];
  }
}

export const behaviorMonitor = new BehaviorMonitor();
