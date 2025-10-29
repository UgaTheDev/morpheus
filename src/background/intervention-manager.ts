import type {
  Intervention,
  UserState,
  Action,
  BrowsingPattern,
} from "../lib/types";
import { db } from "../lib/db";
import { getAIClient } from "../lib/ai-client";
import { behaviorMonitor } from "./behavior-monitor";

export class InterventionManager {
  private userState: UserState = {
    focusLevel: 50,
    distractionScore: 0,
    currentActivity: "unknown",
    sessionDuration: 0,
    breaksSinceFocus: 0,
    lastBreakTime: 0,
  };

  private interventionQueue: Intervention[] = [];
  private lastInterventionTime: number = 0;
  private minInterventionInterval: number = 10 * 60 * 1000; // 10 minutes

  async initialize(): Promise<void> {
    // Load saved state if exists
    const stored = await chrome.storage.local.get("userState");
    if (stored.userState) {
      this.userState = stored.userState;
    }

    // Set up periodic checks
    setInterval(() => this.checkAndIntervene(), 5 * 60 * 1000); // Every 5 minutes
  }

  async analyzeUserState(patterns: BrowsingPattern[]): Promise<UserState> {
    if (patterns.length === 0) {
      return this.userState;
    }

    // Calculate focus level based on recent activity
    const recentPatterns = patterns.slice(-20);
    const productiveCategories = ["productivity", "development", "learning"];
    const distractingCategories = ["social", "entertainment"];

    const productiveCount = recentPatterns.filter((p) =>
      productiveCategories.includes(p.category)
    ).length;

    const distractingCount = recentPatterns.filter((p) =>
      distractingCategories.includes(p.category)
    ).length;

    const focusLevel = Math.round(
      (productiveCount / recentPatterns.length) * 100
    );
    const distractionScore = Math.round(
      (distractingCount / recentPatterns.length) * 100
    );

    // Update session duration
    const sessionStats = await behaviorMonitor.getSessionStats();

    this.userState = {
      ...this.userState,
      focusLevel,
      distractionScore,
      sessionDuration: sessionStats.duration,
      currentActivity: this.determineCurrentActivity(recentPatterns),
    };

    // Save state
    await chrome.storage.local.set({ userState: this.userState });

    return this.userState;
  }

  private determineCurrentActivity(patterns: BrowsingPattern[]): string {
    if (patterns.length === 0) return "idle";

    const latestPattern = patterns[patterns.length - 1];
    return latestPattern.category;
  }

  async checkAndIntervene(): Promise<void> {
    const now = Date.now();

    // Don't intervene too frequently
    if (now - this.lastInterventionTime < this.minInterventionInterval) {
      return;
    }

    try {
      // Get recent patterns
      const patterns = await db.getPatternsSince(now - 60 * 60 * 1000); // Last hour

      // Analyze current state
      const state = await this.analyzeUserState(patterns);

      // Check if intervention is needed
      const intervention = await this.determineIntervention(state, patterns);

      if (intervention) {
        await this.queueIntervention(intervention);
        this.lastInterventionTime = now;
      }

      // Update daily stats
      await this.updateDailyStats(state);
    } catch (error) {
      console.error("Intervention check failed:", error);
    }
  }

  private async updateDailyStats(state: UserState): Promise<void> {
    try {
      const stats = (await db.getTodayStats()) || {
        focusTime: 0,
        distractionTime: 0,
        breaksTaken: 0,
        tasksCompleted: 0,
        productivityScore: 0,
      };

      // Update stats based on current state
      await db.updateTodayStats({
        ...stats,
        productivityScore: state.focusLevel,
      });
    } catch (error) {
      console.error("Failed to update daily stats:", error);
    }
  }

  private async determineIntervention(
    state: UserState,
    patterns: BrowsingPattern[]
  ): Promise<Intervention | null> {
    // High distraction score
    if (state.distractionScore > 70) {
      return {
        id: crypto.randomUUID(),
        type: "distraction_warning",
        title: "High Distraction Detected",
        message:
          "You've been browsing distracting content. Would you like to refocus?",
        priority: "high",
        timestamp: Date.now(),
        dismissed: false,
        action: {
          type: "show_overlay",
          payload: { suggestion: "Take a break or return to your task" },
        },
      };
    }

    // Long session without breaks
    if (
      state.sessionDuration > 90 * 60 * 1000 &&
      state.breaksSinceFocus === 0
    ) {
      return {
        id: crypto.randomUUID(),
        type: "break_suggestion",
        title: "Time for a Break",
        message:
          "You've been working for 90 minutes. Consider taking a 5-minute break.",
        priority: "medium",
        timestamp: Date.now(),
        dismissed: false,
        action: {
          type: "start_timer",
          payload: { duration: 5 * 60 * 1000 },
        },
      };
    }

    // Low focus level
    if (state.focusLevel < 30) {
      const suggestions = await this.getAISuggestions(patterns);

      return {
        id: crypto.randomUUID(),
        type: "focus_reminder",
        title: "Focus Level Low",
        message: suggestions || "Consider reviewing your goals or tasks.",
        priority: "medium",
        timestamp: Date.now(),
        dismissed: false,
      };
    }

    // Check if there's an active task
    const activeTask = await db.getActiveTask();
    if (activeTask) {
      const taskRelevant = this.isActivityRelevantToTask(patterns, activeTask);

      if (!taskRelevant) {
        return {
          id: crypto.randomUUID(),
          type: "goal_check",
          title: "Are you still working on your task?",
          message: `Your current activity doesn't seem related to: ${activeTask.title}`,
          priority: "medium",
          timestamp: Date.now(),
          dismissed: false,
        };
      }
    }

    return null;
  }

  private async getAISuggestions(patterns: BrowsingPattern[]): Promise<string> {
    try {
      const aiClient = getAIClient();

      const recentActivity = patterns
        .slice(-10)
        .map((p) => `${p.domain} (${p.category})`)
        .join(", ");

      const prompt = `Based on this browsing activity: ${recentActivity}
      
Provide ONE brief, actionable suggestion to help the user regain focus. Keep it under 100 characters.`;

      const response = await aiClient.analyzeIntent(prompt);
      return response.trim();
    } catch (error) {
      console.error("AI suggestions failed:", error);
      return "Try focusing on one task at a time.";
    }
  }

  private isActivityRelevantToTask(
    patterns: BrowsingPattern[],
    task: any
  ): boolean {
    const recentPatterns = patterns.slice(-5);
    const taskKeywords = task.title.toLowerCase().split(" ");

    return recentPatterns.some((pattern) =>
      taskKeywords.some(
        (keyword: string) =>
          pattern.domain.toLowerCase().includes(keyword) ||
          pattern.category === "productivity" ||
          pattern.category === "development"
      )
    );
  }

  async queueIntervention(intervention: Intervention): Promise<void> {
    // Add to queue
    this.interventionQueue.push(intervention);

    // Save to database
    await db.addIntervention(intervention);

    // Trigger immediately if high priority
    if (
      intervention.priority === "high" ||
      intervention.priority === "critical"
    ) {
      await this.triggerIntervention(intervention);
    }
  }

  async triggerIntervention(intervention: Intervention): Promise<void> {
    try {
      // Send message to content script to show intervention
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SHOW_INTERVENTION",
          intervention,
        });
      }

      // Update intervention status
      await db.updateIntervention(intervention.id, {
        ...intervention,
        triggered: true,
      });
    } catch (error) {
      console.error("Failed to trigger intervention:", error);
    }
  }

  async dismissIntervention(interventionId: string): Promise<void> {
    const intervention = (await db.getInterventions()).find(
      (i) => i.id === interventionId
    );

    if (intervention) {
      await db.updateIntervention(interventionId, {
        ...intervention,
        dismissed: true,
        dismissedAt: Date.now(),
      });

      // Remove from queue
      this.interventionQueue = this.interventionQueue.filter(
        (i) => i.id !== interventionId
      );
    }
  }

  async executeAction(action: Action): Promise<void> {
    switch (action.type) {
      case "open_url":
        chrome.tabs.create({ url: action.payload.url });
        break;

      case "show_overlay":
        // Send to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "SHOW_OVERLAY",
              payload: action.payload,
            });
          }
        });
        break;

      case "block_site":
        // This would need additional implementation
        console.log("Block site:", action.payload);
        break;

      case "start_timer":
        // Create alarm for break timer
        chrome.alarms.create("break-timer", {
          delayInMinutes: action.payload.duration / (60 * 1000),
        });
        break;
    }
  }

  async getInterventionHistory(days: number = 7): Promise<Intervention[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const allInterventions = await db.getInterventions();

    return allInterventions
      .filter((i: any) => i.timestamp > cutoff)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
  }

  async getEffectivenessMetrics(): Promise<{
    totalInterventions: number;
    dismissalRate: number;
    averageFocusImprovement: number;
  }> {
    const interventions = await db.getInterventions();
    const total = interventions.length;
    const dismissed = interventions.filter((i: any) => i.dismissed).length;

    return {
      totalInterventions: total,
      dismissalRate: total > 0 ? (dismissed / total) * 100 : 0,
      averageFocusImprovement: 0, // Would need historical tracking
    };
  }

  getUserState(): UserState {
    return { ...this.userState };
  }
}

export const interventionManager = new InterventionManager();
