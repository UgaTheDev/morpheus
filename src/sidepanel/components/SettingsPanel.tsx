import React, { useEffect, useState } from "react";
import { db } from "../../lib/db";

interface Settings {
  enableTracking: boolean;
  enableAnomalyDetection: boolean;
  enableNotifications: boolean;
  apiKey: string;
  analysisInterval: number;
  dataRetentionDays: number;
  excludedDomains: string[];
}

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    enableTracking: true,
    enableAnomalyDetection: true,
    enableNotifications: true,
    apiKey: "",
    analysisInterval: 5,
    dataRetentionDays: 90,
    excludedDomains: [],
  });
  const [newDomain, setNewDomain] = useState("");
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({
    totalPatterns: 0,
    totalMemories: 0,
    dataSize: 0,
  });

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await chrome.storage.sync.get("settings");
      if (stored.settings) {
        setSettings(stored.settings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const loadStats = async () => {
    try {
      const patterns = await db.getAllPatterns();
      const memories = await db.getAllMemories();

      // Estimate data size (rough calculation)
      const dataSize = (patterns.length * 500 + memories.length * 1000) / 1024; // KB

      setStats({
        totalPatterns: patterns.length,
        totalMemories: memories.length,
        dataSize: Math.round(dataSize),
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleSave = async () => {
    try {
      await chrome.storage.sync.set({ settings });

      // Notify background script of settings change
      chrome.runtime.sendMessage({
        type: "SETTINGS_UPDATED",
        settings,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const handleAddDomain = () => {
    if (
      newDomain.trim() &&
      !settings.excludedDomains.includes(newDomain.trim())
    ) {
      setSettings({
        ...settings,
        excludedDomains: [...settings.excludedDomains, newDomain.trim()],
      });
      setNewDomain("");
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setSettings({
      ...settings,
      excludedDomains: settings.excludedDomains.filter((d) => d !== domain),
    });
  };

  const handleClearData = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all browsing data? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await db.clearAll();
      await loadStats();
      alert("All data cleared successfully");
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert("Failed to clear data");
    }
  };

  const handleExportData = async () => {
    try {
      const patterns = await db.getAllPatterns();
      const memories = await db.getAllMemories();

      const data = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        patterns,
        memories,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `browsing-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("Failed to export data");
    }
  };

  return (
    <div className="settings-panel">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Tracking</h3>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.enableTracking}
            onChange={(e) =>
              setSettings({ ...settings, enableTracking: e.target.checked })
            }
          />
          <span>Enable browsing tracking</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.enableAnomalyDetection}
            onChange={(e) =>
              setSettings({
                ...settings,
                enableAnomalyDetection: e.target.checked,
              })
            }
          />
          <span>Enable anomaly detection</span>
        </label>

        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.enableNotifications}
            onChange={(e) =>
              setSettings({
                ...settings,
                enableNotifications: e.target.checked,
              })
            }
          />
          <span>Enable notifications</span>
        </label>
      </section>

      <section className="settings-section">
        <h3>AI Configuration</h3>

        <div className="setting-item">
          <label>Google Gemini API Key</label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) =>
              setSettings({ ...settings, apiKey: e.target.value })
            }
            placeholder="AIza..."
          />
          <small>
            Required for AI-powered analysis and insights. Get your key at{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank">
              Google AI Studio
            </a>
          </small>
        </div>

        <div className="setting-item">
          <label>Analysis Interval (minutes)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={settings.analysisInterval}
            onChange={(e) =>
              setSettings({
                ...settings,
                analysisInterval: parseInt(e.target.value),
              })
            }
          />
        </div>
      </section>

      <section className="settings-section">
        <h3>Privacy</h3>

        <div className="setting-item">
          <label>Data Retention (days)</label>
          <input
            type="number"
            min="7"
            max="365"
            value={settings.dataRetentionDays}
            onChange={(e) =>
              setSettings({
                ...settings,
                dataRetentionDays: parseInt(e.target.value),
              })
            }
          />
          <small>Older data will be automatically deleted</small>
        </div>

        <div className="setting-item">
          <label>Excluded Domains</label>
          <div className="domain-input">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddDomain()}
              placeholder="example.com"
            />
            <button onClick={handleAddDomain}>Add</button>
          </div>
          <div className="domain-list">
            {settings.excludedDomains.map((domain) => (
              <div key={domain} className="domain-tag">
                <span>{domain}</span>
                <button onClick={() => handleRemoveDomain(domain)}>×</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>Data Management</h3>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Browsing Patterns</span>
            <span className="stat-value">
              {stats.totalPatterns.toLocaleString()}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Memory Entries</span>
            <span className="stat-value">
              {stats.totalMemories.toLocaleString()}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Storage Used</span>
            <span className="stat-value">{stats.dataSize} KB</span>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={handleExportData} className="btn-secondary">
            📥 Export Data
          </button>
          <button onClick={handleClearData} className="btn-danger">
            🗑️ Clear All Data
          </button>
        </div>
      </section>

      <div className="settings-footer">
        <button onClick={handleSave} className="btn-primary">
          {saved ? "✓ Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
};
