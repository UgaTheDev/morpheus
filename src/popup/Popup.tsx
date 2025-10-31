// src/popup/Popup.tsx
// Premium redesigned popup

import React, { useState, useEffect } from "react";
import {
  Brain,
  TrendingUp,
  Zap,
  BarChart3,
  Sparkles,
  Target,
} from "lucide-react";

export const Popup: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stateResponse = await chrome.runtime.sendMessage({
        type: "GET_STATE",
      });
      setState(stateResponse.state);

      const statsResponse = await chrome.runtime.sendMessage({
        type: "GET_STATS",
      });
      setStats(statsResponse.stats);

      setLoading(false);
    } catch (error) {
      console.error("Failed to load data:", error);
      setLoading(false);
    }
  };

  const openSidePanel = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        window.close();
      }
    } catch (error) {
      console.error("Failed to open side panel:", error);
    }
  };

  const requestHelp = async () => {
    const response = await chrome.runtime.sendMessage({
      type: "MANUAL_INTERVENTION",
      state,
    });

    if (response.intervention) {
      window.close();
    }
  };

  if (loading) {
    return (
      <div className="w-96 h-64 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-white/30 animate-ping"></div>
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur">
              <Brain className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-white font-medium">Loading Morpheus...</p>
        </div>
      </div>
    );
  }

  const focusStateEmoji = {
    deep_work: "🎯",
    browsing: "👀",
    stuck: "😤",
    learning: "📚",
    distracted: "😵",
  };

  const focusStateLabel = {
    deep_work: "Deep Work",
    browsing: "Browsing",
    stuck: "Stuck",
    learning: "Learning",
    distracted: "Distracted",
  };

  const productivityScore = stats?.productivityScore || 0;

  return (
    <div className="w-96 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-6 pb-20">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-3xl"></div>

        <div className="relative flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-lg border border-white/30">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Morpheus</h1>
            <p className="text-sm text-blue-100">AI Productivity Coach</p>
          </div>
        </div>

        {/* AI Status Badge */}
        <div className="relative flex items-center gap-2 px-3 py-2 rounded-full bg-white/20 backdrop-blur-lg border border-white/30 w-fit">
          <div
            className={`w-2 h-2 rounded-full ${
              state?.aiReady ? "bg-green-400 animate-pulse" : "bg-yellow-400"
            }`}
          ></div>
          <span className="text-sm text-white font-medium">
            {state?.aiReady ? "AI Active" : "Initializing..."}
          </span>
          <Sparkles className="w-4 h-4 text-yellow-300" />
        </div>
      </div>

      {/* Floating Score Card */}
      <div className="relative -mt-12 mx-4 mb-4">
        <div className="bg-white rounded-2xl shadow-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-semibold text-gray-700">
                Today's Score
              </span>
            </div>
            {productivityScore >= 70 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <span className="text-xs text-gray-500">Keep going!</span>
            )}
          </div>

          {/* Score Display */}
          <div className="flex items-end gap-2 mb-3">
            <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {productivityScore}
            </span>
            <span className="text-2xl text-gray-400 mb-2">/100</span>
          </div>

          {/* Mini Progress Bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${productivityScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Current State */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Current State</p>
              <p className="text-lg font-semibold text-gray-900">
                {focusStateLabel[
                  state?.focusState as keyof typeof focusStateLabel
                ] || "Unknown"}
              </p>
            </div>
            <span className="text-4xl">
              {focusStateEmoji[
                state?.focusState as keyof typeof focusStateEmoji
              ] || "💭"}
            </span>
          </div>

          {/* Frustration Meter */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>Frustration Level</span>
              <span className="font-semibold">
                {((state?.frustration || 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full transition-all duration-500"
                style={{ width: `${(state?.frustration || 0) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-6 space-y-2">
        <button
          onClick={openSidePanel}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
          <BarChart3 className="w-5 h-5" />
          Open Dashboard
        </button>

        <button
          onClick={requestHelp}
          className="w-full bg-white text-gray-700 py-3.5 rounded-xl font-semibold border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5 text-purple-600" />
          Need Help?
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 text-center text-xs text-gray-400">
        Powered by Chrome Built-in AI
      </div>
    </div>
  );
};
