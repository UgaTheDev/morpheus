import React, { useState } from "react";
import { PatternHistory } from "./components/PatternHistory";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatsView } from "./components/StatsView";
import { APIStatus } from "./components/APIStatus";

type View = "stats" | "history" | "settings" | "api";

export const SidePanel: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>("stats");

  const renderView = () => {
    switch (currentView) {
      case "stats":
        return <StatsView />;
      case "history":
        return <PatternHistory />;
      case "settings":
        return <SettingsPanel />;
      case "api":
        return <APIStatus />;
      default:
        return <StatsView />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white border-b shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Morpheus</h1>
            <p className="text-sm text-gray-500">AI-powered browsing coach</p>
          </div>
        </div>
      </header>

      <nav className="flex bg-white border-b">
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            currentView === "stats"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setCurrentView("stats")}
        >
          📊 Stats
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            currentView === "history"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setCurrentView("history")}
        >
          📜 History
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            currentView === "api"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setCurrentView("api")}
        >
          🤖 AI
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            currentView === "settings"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setCurrentView("settings")}
        >
          ⚙️ Settings
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4">{renderView()}</main>

      <footer className="p-4 bg-white border-t text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Powered by Chrome Built-in AI</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Privacy-first • On-device processing
        </p>
      </footer>
    </div>
  );
};
