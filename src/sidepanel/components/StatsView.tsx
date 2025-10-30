// src/sidepanel/components/StatsView.tsx
// Using Hero UI components

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/react";
import { Tabs, Tab } from "@heroui/react";
import { Progress } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Button } from "@heroui/react";
import { statsDB, type DailyStats, type WeeklyStats } from "../../lib/stats-db";

interface StatsViewProps {}

export const StatsView: React.FC<StatsViewProps> = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("today");
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [weekStats, setWeekStats] = useState<WeeklyStats | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get today's stats from background
      const statsResponse = await chrome.runtime.sendMessage({
        type: "GET_STATS",
      });
      if (statsResponse?.success) {
        setTodayStats(statsResponse.stats);
      }

      // Get streak
      const streakResponse = await chrome.runtime.sendMessage({
        type: "GET_STREAK",
      });
      if (streakResponse?.success) {
        setStreak(streakResponse.streak);
      }

      // Get weekly stats if needed
      if (selectedPeriod === "week" || selectedPeriod === "month") {
        const weekStart = getWeekStart(new Date());
        const weekly = await statsDB.calculateWeeklyStats(weekStart);
        setWeekStats(weekly);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split("T")[0];
  };

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getScoreColor = (
    score: number
  ): "success" | "warning" | "danger" | "default" => {
    if (score >= 70) return "success";
    if (score >= 40) return "warning";
    return "danger";
  };

  const getStreakMessage = (streak: number): string => {
    if (streak === 0) return "Start your streak today! 💪";
    if (streak === 1) return "Great start! Keep it going! 🔥";
    if (streak < 7) return `${streak} days strong! 🎯`;
    if (streak < 30) return `${streak} days! You're on fire! 🔥🔥`;
    return `${streak} days! Incredible! 🌟🔥`;
  };

  const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const getTotalTime = (stats: DailyStats): number => {
    return stats.focusTimeMs + stats.neutralTimeMs + stats.distractionTimeMs;
  };

  const exportStats = async () => {
    try {
      const data = await statsDB.exportStats();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `morpheus-stats-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export stats:", error);
    }
  };

  if (loading && !todayStats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morpheus-blue mx-auto mb-4"></div>
          <p className="text-gray-500">Loading stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Stats 📊</h1>
        <Chip
          color={streak > 0 ? "warning" : "default"}
          variant="flat"
          size="lg"
        >
          🔥 {streak} day streak
        </Chip>
      </div>

      {/* Streak Message */}
      <Card>
        <CardBody className="text-center py-4">
          <p className="text-lg font-medium">{getStreakMessage(streak)}</p>
        </CardBody>
      </Card>

      {/* Period Tabs */}
      <Tabs
        selectedKey={selectedPeriod}
        onSelectionChange={(key) => setSelectedPeriod(key as any)}
        aria-label="Stats period"
        color="primary"
        variant="underlined"
        fullWidth
      >
        <Tab key="today" title="Today" />
        <Tab key="week" title="This Week" />
        <Tab key="month" title="This Month" />
      </Tabs>

      {/* Today's Stats */}
      {selectedPeriod === "today" && todayStats && (
        <div className="space-y-4 animate-slide-up">
          {/* Productivity Score */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Productivity Score</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-4xl font-bold">
                    {todayStats.productivityScore}
                  </span>
                  <span className="text-sm text-gray-500">/ 100</span>
                </div>
                <Progress
                  value={todayStats.productivityScore}
                  color={getScoreColor(todayStats.productivityScore)}
                  size="lg"
                  className="max-w-full"
                />
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-gray-500">Focus</p>
                    <p className="font-semibold text-green-600">
                      {formatTime(todayStats.focusTimeMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Neutral</p>
                    <p className="font-semibold">
                      {formatTime(todayStats.neutralTimeMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Distraction</p>
                    <p className="font-semibold text-red-600">
                      {formatTime(todayStats.distractionTimeMs)}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Time Distribution */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Time Distribution</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Productive</span>
                    <span className="text-sm font-medium">
                      {formatTime(todayStats.focusTimeMs)}
                    </span>
                  </div>
                  <Progress
                    value={calculatePercentage(
                      todayStats.focusTimeMs,
                      getTotalTime(todayStats)
                    )}
                    color="success"
                    size="sm"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Neutral</span>
                    <span className="text-sm font-medium">
                      {formatTime(todayStats.neutralTimeMs)}
                    </span>
                  </div>
                  <Progress
                    value={calculatePercentage(
                      todayStats.neutralTimeMs,
                      getTotalTime(todayStats)
                    )}
                    color="default"
                    size="sm"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Distraction</span>
                    <span className="text-sm font-medium">
                      {formatTime(todayStats.distractionTimeMs)}
                    </span>
                  </div>
                  <Progress
                    value={calculatePercentage(
                      todayStats.distractionTimeMs,
                      getTotalTime(todayStats)
                    )}
                    color="danger"
                    size="sm"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Interventions */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Interventions</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-100 rounded-lg">
                  <p className="text-2xl font-bold">
                    {todayStats.interventionsTriggered}
                  </p>
                  <p className="text-sm text-gray-500">Triggered</p>
                </div>
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {todayStats.interventionsAccepted}
                  </p>
                  <p className="text-sm text-gray-500">Accepted</p>
                </div>
                <div className="text-center p-3 bg-yellow-100 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {todayStats.interventionsSnoozed}
                  </p>
                  <p className="text-sm text-gray-500">Snoozed</p>
                </div>
                <div className="text-center p-3 bg-red-100 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {todayStats.interventionsDismissed}
                  </p>
                  <p className="text-sm text-gray-500">Dismissed</p>
                </div>
              </div>
              {todayStats.interventionsTriggered > 0 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Acceptance Rate:{" "}
                    <span className="font-semibold">
                      {Math.round(
                        (todayStats.interventionsAccepted /
                          todayStats.interventionsTriggered) *
                          100
                      )}
                      %
                    </span>
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Top Distractions */}
          {todayStats.topDistractions.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Top Distractions</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {todayStats.topDistractions.slice(0, 5).map((site, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {site.title || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {site.url}
                        </p>
                      </div>
                      <div className="ml-2 text-right">
                        <p className="text-sm font-semibold text-red-600">
                          {formatTime(site.timeMs)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Top Focus Sites */}
          {todayStats.topFocusSites.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Top Productive Sites</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {todayStats.topFocusSites.slice(0, 5).map((site, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {site.title || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {site.url}
                        </p>
                      </div>
                      <div className="ml-2 text-right">
                        <p className="text-sm font-semibold text-green-600">
                          {formatTime(site.timeMs)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Weekly Stats */}
      {selectedPeriod === "week" && weekStats && (
        <div className="space-y-4 animate-slide-up">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Weekly Overview</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {Math.round(weekStats.averageProductivityScore)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Average Productivity Score
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {formatTime(weekStats.totalFocusTimeMs)}
                    </p>
                    <p className="text-sm text-gray-500">Focus Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {formatTime(weekStats.totalDistractionTimeMs)}
                    </p>
                    <p className="text-sm text-gray-500">Distraction Time</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Best Day</p>
                    <Chip color="success" variant="flat">
                      {new Date(weekStats.bestDay.date).toLocaleDateString(
                        "en-US",
                        { weekday: "short" }
                      )}{" "}
                      - {weekStats.bestDay.score}
                    </Chip>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Needs Work</p>
                    <Chip color="warning" variant="flat">
                      {new Date(weekStats.worstDay.date).toLocaleDateString(
                        "en-US",
                        { weekday: "short" }
                      )}{" "}
                      - {weekStats.worstDay.score}
                    </Chip>
                  </div>
                </div>

                <div className="pt-4 border-t text-center">
                  <p className="text-sm text-gray-500">
                    Intervention Acceptance Rate:{" "}
                    <span className="font-semibold">
                      {Math.round(weekStats.interventionAcceptanceRate * 100)}%
                    </span>
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Export Stats */}
      <Card className="bg-gray-50">
        <CardBody className="py-3">
          <Button
            onPress={exportStats}
            color="primary"
            variant="light"
            fullWidth
          >
            📥 Export Stats as JSON
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

export default StatsView;
