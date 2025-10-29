import React, { useEffect, useState } from "react";
import type { BrowsingPattern } from "../../lib/types";
import { db } from "../../lib/db";
import { memorySystem } from "../../background/memory-system";

export const PatternHistory: React.FC = () => {
  const [patterns, setPatterns] = useState<BrowsingPattern[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPatterns();
  }, [selectedDate]);

  const loadPatterns = async () => {
    setLoading(true);
    try {
      const date = new Date(selectedDate);
      const start = date.setHours(0, 0, 0, 0);
      const end = date.setHours(23, 59, 59, 999);

      const data = await db.getPatternsInRange(start, end);
      setPatterns(data);
    } catch (error) {
      console.error("Failed to load patterns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await memorySystem.search(searchQuery, 20);
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupByHour = () => {
    const groups: Record<number, BrowsingPattern[]> = {};

    patterns.forEach((pattern) => {
      const hour = new Date(pattern.timestamp).getHours();
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(pattern);
    });

    return groups;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
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

  const hourGroups = groupByHour();
  const displayData = searchResults.length > 0 ? searchResults : null;

  return (
    <div className="pattern-history">
      <div className="history-header">
        <div className="date-selector">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getTodayString()}
          />
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search browsing history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading}>
            🔍 Search
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
        </div>
      )}

      {displayData ? (
        <div className="search-results">
          <div className="results-header">
            <h3>Search Results</h3>
            <button
              onClick={() => {
                setSearchResults([]);
                setSearchQuery("");
              }}
            >
              Clear
            </button>
          </div>
          <div className="results-list">
            {searchResults.map((result, idx) => (
              <div key={idx} className="result-item">
                <div className="result-content">{result.content}</div>
                <div className="result-meta">
                  <span className="result-relevance">
                    {Math.round(result.relevance * 100)}% match
                  </span>
                  <span className="result-time">
                    {formatTime(result.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="timeline">
          {Object.keys(hourGroups).length === 0 ? (
            <div className="empty-state">
              <p>No browsing activity on this date</p>
            </div>
          ) : (
            Object.entries(hourGroups)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([hour, patterns]) => (
                <div key={hour} className="hour-group">
                  <div className="hour-label">{formatHour(parseInt(hour))}</div>
                  <div className="hour-patterns">
                    {patterns.map((pattern) => (
                      <div key={pattern.id} className="pattern-card">
                        <div className="pattern-header">
                          <div className="pattern-title">
                            {pattern.title || pattern.domain}
                          </div>
                          <div className="pattern-time">
                            {formatTime(pattern.timestamp)}
                          </div>
                        </div>
                        <div className="pattern-body">
                          <div className="pattern-domain">{pattern.domain}</div>
                          <div className="pattern-meta">
                            <span
                              className="pattern-category"
                              style={{
                                backgroundColor: getCategoryColor(
                                  pattern.category
                                ),
                                color: "white",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "12px",
                              }}
                            >
                              {pattern.category}
                            </span>
                            {pattern.duration > 0 && (
                              <span className="pattern-duration">
                                ⏱️ {formatDuration(pattern.duration)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}
