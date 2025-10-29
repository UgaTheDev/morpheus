import React, { useState, useEffect } from "react";
import { Brain, Activity, Zap, BarChart3 } from "lucide-react";

export const Popup: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current state
      const stateResponse = await chrome.runtime.sendMessage({
        type: "GET_STATE",
      });
      setState(stateResponse.state);

      // Get stats
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

  const openSidePanel = () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  };

  const requestHelp = async () => {
    // Manually trigger intervention
    const response = await chrome.runtime.sendMessage({
      type: "MANUAL_INTERVENTION",
      state,
    });

    if (response.intervention) {
      // Intervention will be shown on the page
      window.close();
    }
  };

  if (loading) {
    return (
      <div className="w-80 p-6 bg-white">
        <div className="flex items-center justify-center">
          <div className="animate-spin">
            <Brain className="w-8 h-8 text-blue-500" />
          </div>
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

  return (
    <div className="w-80 bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Morpheus</h1>
            <p className="text-xs text-gray-500">Your intuitive AI assistant</p>
          </div>
        </div>
      </div>

      {/* Current State */}
      <div className="p-6 space-y-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Current State
            </span>
            <span className="text-2xl">
              {focusStateEmoji[
                state?.focusState as keyof typeof focusStateEmoji
              ] || "💭"}
            </span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {focusStateLabel[
              state?.focusState as keyof typeof focusStateLabel
            ] || "Unknown"}
          </div>

          {/* Frustration meter */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Frustration</span>
              <span>{((state?.frustration || 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                style={{ width: `${(state?.frustration || 0) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Today's Stats */}
        {stats?.today && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Today's Activity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.today.deepWorkTime || 0}m
                </div>
                <div className="text-xs text-gray-600">Deep Work</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.today.tasksCompleted || 0}
                </div>
                <div className="text-xs text-gray-600">Tasks Done</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.today.interventionsHelpful || 0}
                </div>
                <div className="text-xs text-gray-600">Helps Used</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.today.pagesVisited || 0}
                </div>
                <div className="text-xs text-gray-600">Pages</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={requestHelp}
            className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Need Help?
          </button>

          <button
            onClick={openSidePanel}
            className="w-full bg-white text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 border border-gray-200"
          >
            <BarChart3 className="w-4 h-4" />
            View Dashboard
          </button>
        </div>

        {/* AI Status */}
        <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              state?.aiReady ? "bg-green-500" : "bg-red-500"
            }`}
          />
          AI {state?.aiReady ? "Ready" : "Initializing"}
        </div>
      </div>
    </div>
  );
};
