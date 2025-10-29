import type { BrowsingPattern, BehaviorAnomaly } from "../lib/types";
import { db } from "../lib/db";
import { intentEngine } from "../background/intent-engine";

export interface BehaviorStats {
  totalTime: number;
  sitesVisited: number;
  categories: string[];
  score: number;
  topDomains: Array<{ domain: string; time: number }>;
  categoryStats: Array<{
    category: string;
    time: number;
    percentage: number;
  }>;
  anomalies: BehaviorAnomaly[];
  insights: string[];
}

export class BehaviorTracker {
  async getStats(timeRange: "day" | "week" | "month"): Promise<BehaviorStats> {
    const since = this.getTimestamp(timeRange);
    const [patterns, anomalies] = await Promise.all([
      db.getPatternsSince(since),
      db.getAnomaliesSince(since),
    ]);

    const totalTime = patterns.reduce((sum, p) => sum + p.duration, 0);
    const categoryStats = this.getCategoryStats(patterns, totalTime);
    const topDomains = this.getTopDomains(patterns);
    const score = this.calculateScore(patterns);

    let insights: string[] = [];
    if (patterns.length > 0) {
      insights = await intentEngine.suggestNextAction(patterns);
    }

    return {
      totalTime,
      sitesVisited: patterns.length,
      categories: [...new Set(patterns.map((p) => p.category))],
      score,
      topDomains,
      categoryStats,
      anomalies,
      insights,
    };
  }

  private getTimestamp(range: string): number {
    const now = Date.now();
    switch (range) {
      case "day":
        return now - 24 * 60 * 60 * 1000;
      case "week":
        return now - 7 * 24 * 60 * 60 * 1000;
      case "month":
        return now - 30 * 24 * 60 * 60 * 1000;
      default:
        return now - 24 * 60 * 60 * 1000;
    }
  }

  private getCategoryStats(patterns: BrowsingPattern[], totalTime: number) {
    const categoryTime: Record<string, number> = {};
    patterns.forEach((p) => {
      categoryTime[p.category] = (categoryTime[p.category] || 0) + p.duration;
    });

    return Object.entries(categoryTime)
      .map(([category, time]) => ({
        category,
        time,
        percentage: (time / totalTime) * 100,
      }))
      .sort((a, b) => b.time - a.time);
  }

  private getTopDomains(patterns: BrowsingPattern[], limit: number = 5) {
    const domainTime: Record<string, number> = {};
    patterns.forEach((p) => {
      domainTime[p.domain] = (domainTime[p.domain] || 0) + p.duration;
    });

    return Object.entries(domainTime)
      .map(([domain, time]) => ({ domain, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }

  private calculateScore(patterns: BrowsingPattern[]): number {
    if (patterns.length === 0) return 0;
    let score = 50;

    const productiveCategories = ["productivity", "development", "learning"];
    const productiveRatio =
      patterns.filter((p) => productiveCategories.includes(p.category)).length /
      patterns.length;
    score += productiveRatio * 30;

    const distractingCategories = ["social", "entertainment"];
    const distractingRatio =
      patterns.filter((p) => distractingCategories.includes(p.category))
        .length / patterns.length;
    score -= distractingRatio * 20;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

export const behaviorTracker = new BehaviorTracker();
