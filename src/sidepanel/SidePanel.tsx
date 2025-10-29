import React, { useState } from "react";
import { PatternHistory } from "./components/PatternHistory";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatsView } from "./components/StatsView";

type View = "stats" | "history" | "settings";

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
      default:
        return <StatsView />;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold">🧠 Morpheus</h1>
        <p className="text-sm text-gray-500">AI-powered browsing insights</p>
      </header>

      <nav className="flex border-b">
        <button
          className={`flex-1 py-3 ${
            currentView === "stats" ? "border-b-2 border-blue-500" : ""
          }`}
          onClick={() => setCurrentView("stats")}
        >
          📊 Stats
        </button>
        <button
          className={`flex-1 py-3 ${
            currentView === "history" ? "border-b-2 border-blue-500" : ""
          }`}
          onClick={() => setCurrentView("history")}
        >
          📜 History
        </button>
        <button
          className={`flex-1 py-3 ${
            currentView === "settings" ? "border-b-2 border-blue-500" : ""
          }`}
          onClick={() => setCurrentView("settings")}
        >
          ⚙️ Settings
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto">{renderView()}</main>

      <footer className="p-4 border-t text-center text-sm text-gray-500">
        Powered by Google Gemini AI
      </footer>
    </div>
  );
};
