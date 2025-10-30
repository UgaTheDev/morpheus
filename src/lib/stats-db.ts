// lib/stats-db.ts
// Database schema and operations for productivity stats tracking

export interface DailyStats {
  date: string; // YYYY-MM-DD
  focusTimeMs: number;
  distractionTimeMs: number;
  neutralTimeMs: number;
  interventionsTriggered: number;
  interventionsAccepted: number;
  interventionsDismissed: number;
  interventionsSnoozed: number;
  productivityScore: number; // 0-100
  topDistractions: Array<{ url: string; title: string; timeMs: number }>;
  topFocusSites: Array<{ url: string; title: string; timeMs: number }>;
  sitesByCategory: Record<string, number>; // category -> timeMs
  hourlyBreakdown: number[]; // 24 hours, timeMs per hour
  focusStreak: number; // consecutive days with >70% productivity
}

export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;
  totalFocusTimeMs: number;
  totalDistractionTimeMs: number;
  totalNeutralTimeMs: number;
  averageProductivityScore: number;
  bestDay: { date: string; score: number };
  worstDay: { date: string; score: number };
  totalInterventions: number;
  interventionAcceptanceRate: number; // 0-1
  topCategory: string;
  weekOverWeekChange: number; // percentage
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalFocusTimeMs: number;
  totalDistractionTimeMs: number;
  averageProductivityScore: number;
  bestWeek: { weekStart: string; score: number };
  totalInterventions: number;
  longestStreak: number;
  categoriesBreakdown: Record<string, number>;
}

export interface SiteVisit {
  id?: number;
  url: string;
  title: string;
  startTime: number; // timestamp
  endTime: number; // timestamp
  durationMs: number;
  category: "productive" | "neutral" | "distraction";
  subcategory: string;
  date: string; // YYYY-MM-DD
}

export interface InterventionEvent {
  id?: number;
  timestamp: number;
  site: string;
  message: string;
  outcome: "accepted" | "dismissed" | "snoozed";
  distractionTimeMs: number;
  date: string; // YYYY-MM-DD
}

export class StatsDatabase {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "MorpheusStats";
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Daily stats store
        if (!db.objectStoreNames.contains("dailyStats")) {
          const dailyStore = db.createObjectStore("dailyStats", {
            keyPath: "date",
          });
          dailyStore.createIndex("date", "date", { unique: true });
        }

        // Weekly stats store
        if (!db.objectStoreNames.contains("weeklyStats")) {
          const weeklyStore = db.createObjectStore("weeklyStats", {
            keyPath: "weekStart",
          });
          weeklyStore.createIndex("weekStart", "weekStart", { unique: true });
        }

        // Monthly stats store
        if (!db.objectStoreNames.contains("monthlyStats")) {
          const monthlyStore = db.createObjectStore("monthlyStats", {
            keyPath: "month",
          });
          monthlyStore.createIndex("month", "month", { unique: true });
        }

        // Site visits store
        if (!db.objectStoreNames.contains("siteVisits")) {
          const visitsStore = db.createObjectStore("siteVisits", {
            keyPath: "id",
            autoIncrement: true,
          });
          visitsStore.createIndex("date", "date", { unique: false });
          visitsStore.createIndex("url", "url", { unique: false });
          visitsStore.createIndex("category", "category", { unique: false });
        }

        // Intervention events store
        if (!db.objectStoreNames.contains("interventionEvents")) {
          const eventsStore = db.createObjectStore("interventionEvents", {
            keyPath: "id",
            autoIncrement: true,
          });
          eventsStore.createIndex("date", "date", { unique: false });
          eventsStore.createIndex("outcome", "outcome", { unique: false });
        }
      };
    });
  }

  /**
   * Record a site visit
   */
  async recordSiteVisit(visit: Omit<SiteVisit, "id">): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["siteVisits"], "readwrite");
      const store = transaction.objectStore("siteVisits");
      const request = store.add(visit);

      request.onsuccess = () => {
        // Update daily stats
        this.updateDailyStats(visit.date, visit.category, visit.durationMs);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Record an intervention event
   */
  async recordIntervention(
    event: Omit<InterventionEvent, "id">
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ["interventionEvents"],
        "readwrite"
      );
      const store = transaction.objectStore("interventionEvents");
      const request = store.add(event);

      request.onsuccess = () => {
        this.updateDailyStatsWithIntervention(event.date, event.outcome);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get or create daily stats
   */
  private async getDailyStats(date: string): Promise<DailyStats> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["dailyStats"], "readonly");
      const store = transaction.objectStore("dailyStats");
      const request = store.get(date);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Create new daily stats
          const newStats: DailyStats = {
            date,
            focusTimeMs: 0,
            distractionTimeMs: 0,
            neutralTimeMs: 0,
            interventionsTriggered: 0,
            interventionsAccepted: 0,
            interventionsDismissed: 0,
            interventionsSnoozed: 0,
            productivityScore: 0,
            topDistractions: [],
            topFocusSites: [],
            sitesByCategory: {},
            hourlyBreakdown: new Array(24).fill(0),
            focusStreak: 0,
          };
          resolve(newStats);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update daily stats with site visit
   */
  private async updateDailyStats(
    date: string,
    category: string,
    durationMs: number
  ): Promise<void> {
    const stats = await this.getDailyStats(date);

    // Update time by category
    if (category === "productive") {
      stats.focusTimeMs += durationMs;
    } else if (category === "distraction") {
      stats.distractionTimeMs += durationMs;
    } else {
      stats.neutralTimeMs += durationMs;
    }

    // Calculate productivity score
    const totalTime =
      stats.focusTimeMs + stats.distractionTimeMs + stats.neutralTimeMs;
    if (totalTime > 0) {
      const focusRatio = stats.focusTimeMs / totalTime;
      const distractionPenalty = (stats.distractionTimeMs / totalTime) * 30;
      const interventionBonus = Math.min(
        (stats.interventionsAccepted /
          Math.max(stats.interventionsTriggered, 1)) *
          10,
        10
      );

      stats.productivityScore = Math.round(
        Math.max(
          0,
          Math.min(
            100,
            focusRatio * 100 - distractionPenalty + interventionBonus
          )
        )
      );
    }

    // Save updated stats
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["dailyStats"], "readwrite");
      const store = transaction.objectStore("dailyStats");
      const request = store.put(stats);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update daily stats with intervention
   */
  private async updateDailyStatsWithIntervention(
    date: string,
    outcome: "accepted" | "dismissed" | "snoozed"
  ): Promise<void> {
    const stats = await this.getDailyStats(date);

    stats.interventionsTriggered++;
    if (outcome === "accepted") stats.interventionsAccepted++;
    else if (outcome === "dismissed") stats.interventionsDismissed++;
    else if (outcome === "snoozed") stats.interventionsSnoozed++;

    // Recalculate productivity score
    const totalTime =
      stats.focusTimeMs + stats.distractionTimeMs + stats.neutralTimeMs;
    if (totalTime > 0) {
      const focusRatio = stats.focusTimeMs / totalTime;
      const distractionPenalty = (stats.distractionTimeMs / totalTime) * 30;
      const interventionBonus = Math.min(
        (stats.interventionsAccepted / stats.interventionsTriggered) * 10,
        10
      );

      stats.productivityScore = Math.round(
        Math.max(
          0,
          Math.min(
            100,
            focusRatio * 100 - distractionPenalty + interventionBonus
          )
        )
      );
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["dailyStats"], "readwrite");
      const store = transaction.objectStore("dailyStats");
      const request = store.put(stats);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get daily stats for a specific date
   */
  async getDailyStatsForDate(date: string): Promise<DailyStats> {
    return this.getDailyStats(date);
  }

  /**
   * Get stats for a date range
   */
  async getStatsForRange(
    startDate: string,
    endDate: string
  ): Promise<DailyStats[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["dailyStats"], "readonly");
      const store = transaction.objectStore("dailyStats");
      const index = store.index("date");
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get top distractions for a date
   */
  async getTopDistractions(
    date: string,
    limit: number = 5
  ): Promise<Array<{ url: string; title: string; timeMs: number }>> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["siteVisits"], "readonly");
      const store = transaction.objectStore("siteVisits");
      const index = store.index("date");
      const request = index.getAll(date);

      request.onsuccess = () => {
        const visits = request.result as SiteVisit[];
        const distractions = visits.filter((v) => v.category === "distraction");

        // Aggregate by URL
        const urlMap = new Map<
          string,
          { url: string; title: string; timeMs: number }
        >();
        distractions.forEach((v) => {
          if (urlMap.has(v.url)) {
            urlMap.get(v.url)!.timeMs += v.durationMs;
          } else {
            urlMap.set(v.url, {
              url: v.url,
              title: v.title,
              timeMs: v.durationMs,
            });
          }
        });

        // Sort and limit
        const sorted = Array.from(urlMap.values())
          .sort((a, b) => b.timeMs - a.timeMs)
          .slice(0, limit);

        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Calculate weekly stats
   */
  async calculateWeeklyStats(weekStart: string): Promise<WeeklyStats> {
    const weekEnd = this.addDays(weekStart, 6);
    const dailyStats = await this.getStatsForRange(weekStart, weekEnd);

    const weeklyStats: WeeklyStats = {
      weekStart,
      weekEnd,
      totalFocusTimeMs: 0,
      totalDistractionTimeMs: 0,
      totalNeutralTimeMs: 0,
      averageProductivityScore: 0,
      bestDay: { date: "", score: 0 },
      worstDay: { date: "", score: 100 },
      totalInterventions: 0,
      interventionAcceptanceRate: 0,
      topCategory: "",
      weekOverWeekChange: 0,
    };

    dailyStats.forEach((day) => {
      weeklyStats.totalFocusTimeMs += day.focusTimeMs;
      weeklyStats.totalDistractionTimeMs += day.distractionTimeMs;
      weeklyStats.totalNeutralTimeMs += day.neutralTimeMs;
      weeklyStats.totalInterventions += day.interventionsTriggered;

      if (day.productivityScore > weeklyStats.bestDay.score) {
        weeklyStats.bestDay = { date: day.date, score: day.productivityScore };
      }
      if (day.productivityScore < weeklyStats.worstDay.score) {
        weeklyStats.worstDay = { date: day.date, score: day.productivityScore };
      }
    });

    weeklyStats.averageProductivityScore =
      dailyStats.reduce((sum, day) => sum + day.productivityScore, 0) /
      dailyStats.length;

    const totalAccepted = dailyStats.reduce(
      (sum, day) => sum + day.interventionsAccepted,
      0
    );
    weeklyStats.interventionAcceptanceRate =
      weeklyStats.totalInterventions > 0
        ? totalAccepted / weeklyStats.totalInterventions
        : 0;

    return weeklyStats;
  }

  /**
   * Get current streak
   */
  async getCurrentStreak(): Promise<number> {
    const today = this.formatDate(new Date());
    let streak = 0;
    let currentDate = new Date();

    while (true) {
      const dateStr = this.formatDate(currentDate);
      const stats = await this.getDailyStatsForDate(dateStr);

      if (stats.productivityScore >= 70) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }

      // Limit to 365 days
      if (streak > 365) break;
    }

    return streak;
  }

  /**
   * Helper: Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Helper: Add days to date string
   */
  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return this.formatDate(date);
  }

  /**
   * Export all stats as JSON
   */
  async exportStats(): Promise<string> {
    if (!this.db) await this.init();

    const allStats = {
      dailyStats: await this.getAllFromStore("dailyStats"),
      siteVisits: await this.getAllFromStore("siteVisits"),
      interventionEvents: await this.getAllFromStore("interventionEvents"),
    };

    return JSON.stringify(allStats, null, 2);
  }

  private async getAllFromStore(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton
export const statsDB = new StatsDatabase();
