// src/sidepanel/SidePanel.tsx
// Premium side panel with beautiful tab navigation

import React, { useState } from "react";
import { StatsView } from "./components/StatsView";
import { BarChart3, History, Brain, Settings, Sparkles } from "lucide-react";

export const SidePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "stats" | "history" | "ai" | "settings"
  >("stats");

  const tabs = [
    {
      id: "stats",
      label: "Stats",
      icon: BarChart3,
      gradient: "from-blue-500 to-purple-600",
    },
    {
      id: "history",
      label: "History",
      icon: History,
      gradient: "from-purple-500 to-pink-600",
    },
    {
      id: "ai",
      label: "AI",
      icon: Brain,
      gradient: "from-pink-500 to-orange-500",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      gradient: "from-gray-500 to-gray-700",
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-xl">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-lg border border-white/30">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Morpheus</h1>
              <p className="text-sm text-blue-100">AI-powered browsing coach</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-3 pb-0 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-all duration-200 relative ${
                  isActive ? "text-white" : "text-blue-100 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "scale-110" : "scale-100"
                  } transition-transform`}
                />
                <span className="text-xs font-medium">{tab.label}</span>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-t-full shadow-lg"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "stats" && <StatsView />}

        {activeTab === "history" && (
          <div className="p-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 mb-4">
                <History className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Browsing History
              </h2>
              <p className="text-gray-600 mb-6">
                See your browsing patterns and insights
              </p>
              <div className="space-y-3">
                {[
                  { time: "11:00 PM", site: "Extensions", category: "other" },
                  {
                    time: "10:00 PM",
                    site: "YouTube",
                    category: "distraction",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{item.site}</p>
                      <p className="text-sm text-gray-500">{item.time}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.category === "distraction"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="p-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-r from-pink-100 to-orange-100 mb-4 relative">
                <Brain className="w-12 h-12 text-pink-600" />
                <Sparkles className="w-4 h-4 text-orange-500 absolute -top-1 -right-1" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Chrome Built-in AI
              </h2>
              <p className="text-gray-600 mb-6">Powered by Gemini Nano</p>

              <div className="space-y-3 text-left">
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-semibold text-gray-900">
                      Prompt API
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Intent analysis & suggestions
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="font-semibold text-gray-900">
                      Summarization API
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Coming soon: Session summaries
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-pink-50 to-pink-100 border border-pink-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="font-semibold text-gray-900">
                      Translation API
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Coming soon: Multi-language support
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  ✨ Privacy-first • On-device processing • No cloud needed
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200">
                  <Settings className="w-6 h-6 text-gray-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded text-blue-600"
                      defaultChecked
                    />
                    <div>
                      <div className="font-semibold text-gray-900">
                        Enable tracking
                      </div>
                      <div className="text-sm text-gray-600">
                        Monitor browsing patterns
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded text-purple-600"
                      defaultChecked
                    />
                    <div>
                      <div className="font-semibold text-gray-900">
                        Smart interventions
                      </div>
                      <div className="text-sm text-gray-600">
                        Get AI-powered productivity nudges
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-pink-50 to-pink-100 border border-pink-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded text-pink-600"
                      defaultChecked
                    />
                    <div>
                      <div className="font-semibold text-gray-900">
                        Notifications
                      </div>
                      <div className="text-sm text-gray-600">
                        Daily summaries and streak reminders
                      </div>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      <span className="font-semibold">Data Retention:</span> 90
                      days
                    </p>
                    <p>
                      <span className="font-semibold">Storage Used:</span> 37 KB
                    </p>
                    <p>
                      <span className="font-semibold">Version:</span> 1.0.0
                    </p>
                  </div>
                </div>

                <button className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold hover:shadow-lg transition-all">
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidePanel;
