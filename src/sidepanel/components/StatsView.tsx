import React, { useEffect, useState } from "react";
import type { BrowsingPattern, Intent } from "../../lib/types";
import { db } from "../../lib/db";
import { intentEngine } from "../../background/intent-engine";
import { memorySystem } from "../../background/memory-system";

export const StatsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [topicsOverTime, setTopicsOverTime] = useState<
    Array<{ date: string; topics: string[] }>
  >([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const patterns = await db.getPatternsSince(weekAgo);

      // Get current intent
      const intent = await intentEngine.analyzeIntent(patterns);
      setCurrentIntent(intent);

      // Calculate weekly statistics
      const stats = calculateWeeklyStats(patterns);
      setWeeklyStats(stats);

      // Get topics over time
      const topics = await memorySystem.getTopicsOverTime(7);
      setTopicsOverTime(topics);

      // Get insights
      const suggestions = await intentEngine.suggestNextAction(patterns);
      setInsights(suggestions);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyStats = (patterns: BrowsingPattern[]) => {
    const totalTime = patterns.reduce((sum, p) => sum + p.duration, 0);
    const avgSessionLength =
      totalTime / Math.max(1, getUniqueSessions(patterns));

    const categoryTime: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};

    patterns.forEach((p) => {
      categoryTime[p.category] = (categoryTime[p.category] || 0) + p.duration;

      const date = new Date(p.timestamp).toLocaleDateString();
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    const topCategory = Object.entries(categoryTime).sort(
      ([, a], [, b]) => b - a
    )[0];

    const mostActiveDay = Object.entries(dailyActivity).sort(
      ([, a], [, b]) => b - a
    )[0];

    return {
      totalTime,
      totalSites: patterns.length,
      avgSessionLength,
      topCategory: topCategory ? topCategory[0] : "N/A",
      mostActiveDay: mostActiveDay ? mostActiveDay[0] : "N/A",
      categoryBreakdown: Object.entries(categoryTime)
        .map(([category, time]) => ({
          category,
          time,
          percentage: (time / totalTime) * 100,
        }))
        .sort((a, b) => b.time - a.time),
    };
  };

  const getUniqueSessions = (patterns: BrowsingPattern[]): number => {
    const sessions = new Set(patterns.map((p) => p.sessionId));
    return sessions.size;
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getIntentEmoji = (type: string): string => {
    const emojis: Record<string, string> = {
      research: "🔍",
      entertainment: "🎬",
      work: "💼",
      shopping: "🛒",
      learning: "📚",
      social: "👥",
      other: "🌐",
    };
    return emojis[type] || "🌐";
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      social: "#3b82f6",
      news: "#ef4444",
      shopping: "#10b981",
      entertainment: "#f59e0b",
      productivity: "#8b5cf6",
      development: "#06b6d4",
      learning: "#ec4899",
      other: "#6b7280",
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return (
      <div className="stats-view loading">
        <div className="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="stats-view">
      {currentIntent && (
        <section className="intent-section">
          <h2>Current Intent</h2>
          <div className="intent-card">
            <div className="intent-icon">
              {getIntentEmoji(currentIntent.type)}
            </div>
            <div className="intent-content">
              <div className="intent-type">{currentIntent.type}</div>
              <div className="intent-description">
                {currentIntent.description}
              </div>
              <div className="intent-meta">
                <span>Focus: {currentIntent.focus}</span>
                <span>
                  Confidence: {Math.round(currentIntent.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {weeklyStats && (
        <section className="weekly-stats">
          <h2>This Week</h2>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Time</span>
              <span className="stat-value">
                {formatDuration(weeklyStats.totalTime)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Sites Visited</span>
              <span className="stat-value">{weeklyStats.totalSites}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Avg Session</span>
              <span className="stat-value">
                {formatDuration(weeklyStats.avgSessionLength)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Top Category</span>
              <span className="stat-value">{weeklyStats.topCategory}</span>
            </div>
          </div>

          <div className="category-breakdown">
            <h3>Time Distribution</h3>
            {weeklyStats.categoryBreakdown.map((item: any) => (
              <div key={item.category} className="breakdown-item">
                <div className="breakdown-header">
                  <span className="breakdown-name">{item.category}</span>
                  <span className="breakdown-value">
                    {formatDuration(item.time)} ({Math.round(item.percentage)}%)
                  </span>
                </div>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: getCategoryColor(item.category),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {topicsOverTime.length > 0 && (
        <section className="topics-section">
          <h2>Topics Over Time</h2>
          <div className="topics-timeline">
            {topicsOverTime.map(({ date, topics }) => (
              <div key={date} className="topic-day">
                <div className="topic-date">{date}</div>
                <div className="topic-tags">
                  {topics.map((topic, idx) => (
                    <span key={idx} className="topic-tag">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {insights.length > 0 && (
        <section className="insights-section">
          <h2>💡 Personalized Insights</h2>
          <div className="insights-list">
            {insights.map((insight, idx) => (
              <div key={idx} className="insight-card">
                <div className="insight-number">{idx + 1}</div>
                <div className="insight-text">{insight}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <button onClick={loadStats} className="refresh-button">
        🔄 Refresh Stats
      </button>
    </div>
  );
};
