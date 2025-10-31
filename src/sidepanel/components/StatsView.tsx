// src/sidepanel/components/StatsView.tsx
// Beautiful redesigned stats view

import React, { useState, useEffect } from "react";
import { Card, CardBody } from "@heroui/react";
import { Button } from "@heroui/react";
import { statsDB, type DailyStats } from "../../lib/stats-db";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Clock,
  Zap,
  Award,
} from "lucide-react";

interface StatsViewProps {}

export const StatsView: React.FC<StatsViewProps> = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("today");
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
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
      const statsResponse = await chrome.runtime.sendMessage({
        type: "GET_STATS",
      });
      if (statsResponse?.success) setTodayStats(statsResponse.stats);

      const streakResponse = await chrome.runtime.sendMessage({
        type: "GET_STREAK",
      });
      if (streakResponse?.success) setStreak(streakResponse.streak);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getScoreGradient = (score: number): string => {
    if (score >= 70) return "from-green-500 to-emerald-600";
    if (score >= 40) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-600";
  };

  const addTestData = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "ADD_TEST_DATA",
      });
      if (response?.success) {
        console.log("✅ Test data added!");
        await loadStats();
      }
    } catch (error) {
      console.error("Failed to add test data:", error);
    }
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-ping opacity-75"></div>
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Loading your insights...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Header with Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 pb-32 pt-8">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6">
          {/* Streak Badge */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Your Stats</h1>
              <p className="text-blue-100">Track your productivity journey</p>
            </div>
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl px-4 py-2 border border-white/30">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-300" />
                <div>
                  <div className="text-2xl font-bold text-white">{streak}</div>
                  <div className="text-xs text-blue-100">day streak</div>
                </div>
              </div>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 bg-white/20 backdrop-blur-lg rounded-2xl p-1 border border-white/30">
            {["today", "week", "month"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as any)}
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-200 ${
                  selectedPeriod === period
                    ? "bg-white text-purple-600 shadow-lg"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative -mt-24 px-6 pb-8 space-y-4">
        {selectedPeriod === "today" && todayStats && (
          <>
            {/* Productivity Score - Hero Card */}
            <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-2xl bg-gradient-to-r ${getScoreGradient(
                        todayStats.productivityScore
                      )}`}
                    >
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Productivity Score
                      </h3>
                      <p className="text-sm text-gray-500">
                        Your performance today
                      </p>
                    </div>
                  </div>
                  {todayStats.productivityScore >= 70 ? (
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-500" />
                  )}
                </div>

                {/* Score Circle */}
                <div className="flex items-center justify-center my-6">
                  <div className="relative w-40 h-40">
                    <svg className="transform -rotate-90 w-40 h-40">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${
                          (todayStats.productivityScore / 100) * 440
                        } 440`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient
                          id="gradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            className={
                              todayStats.productivityScore >= 70
                                ? "text-green-400"
                                : todayStats.productivityScore >= 40
                                ? "text-yellow-400"
                                : "text-red-400"
                            }
                          />
                          <stop
                            offset="100%"
                            className={
                              todayStats.productivityScore >= 70
                                ? "text-emerald-600"
                                : todayStats.productivityScore >= 40
                                ? "text-orange-500"
                                : "text-pink-600"
                            }
                          />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {todayStats.productivityScore}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">
                        out of 100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                    <Clock className="w-5 h-5 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {formatTime(todayStats.focusTimeMs)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Focus</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-100">
                    <Clock className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-600">
                      {formatTime(todayStats.neutralTimeMs)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Neutral</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-red-50 to-pink-50 border border-red-100">
                    <Clock className="w-5 h-5 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">
                      {formatTime(todayStats.distractionTimeMs)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Distraction</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Interventions Card */}
            <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-xl">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Smart Interventions
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600">
                      {todayStats.interventionsTriggered}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">Triggered</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200">
                    <div className="text-3xl font-bold text-green-600">
                      {todayStats.interventionsAccepted}
                    </div>
                    <div className="text-sm text-green-700 mt-1">Accepted</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200">
                    <div className="text-3xl font-bold text-yellow-600">
                      {todayStats.interventionsSnoozed}
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">Snoozed</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
                    <div className="text-3xl font-bold text-red-600">
                      {todayStats.interventionsDismissed}
                    </div>
                    <div className="text-sm text-red-700 mt-1">Dismissed</div>
                  </div>
                </div>

                {todayStats.interventionsTriggered > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-purple-50 border border-purple-100">
                    <p className="text-sm text-gray-700 text-center">
                      Acceptance Rate:{" "}
                      <span className="font-bold text-purple-600">
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

            {/* Top Sites */}
            {todayStats.topFocusSites.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-xl">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Top Productive Sites
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {todayStats.topFocusSites.slice(0, 3).map((site, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {site.title || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {site.url}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          <p className="text-lg font-bold text-green-600">
                            {formatTime(site.timeMs)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onPress={addTestData}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            🧪 Test Data
          </Button>
          <Button
            onPress={exportStats}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            📥 Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatsView;
