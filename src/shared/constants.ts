// Extension metadata
export const EXTENSION_NAME = "Browsing Insights";
export const EXTENSION_VERSION = "1.0.0";

// Database configuration
export const DB_NAME = "BrowsingInsightsDB";
export const DB_VERSION = 1;

// Analysis intervals (milliseconds)
export const ANALYSIS_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const SESSION_SUMMARY_INTERVAL = 15 * 60 * 1000; // 15 minutes
export const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Data retention
export const DEFAULT_RETENTION_DAYS = 90;
export const MIN_RETENTION_DAYS = 7;
export const MAX_RETENTION_DAYS = 365;

// Pattern thresholds
export const MIN_PATTERN_DURATION = 1000; // 1 second
export const RAPID_SWITCHING_THRESHOLD = 10000; // 10 seconds
export const LONG_SESSION_THRESHOLD = 3600000; // 1 hour

// Anomaly detection
export const ANOMALY_SEVERITY_THRESHOLDS = {
  low: 0.3,
  medium: 0.6,
  high: 0.9,
};

// Categories
export const CATEGORIES = [
  "social",
  "news",
  "shopping",
  "entertainment",
  "productivity",
  "development",
  "learning",
  "other",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  social: "#3b82f6",
  news: "#ef4444",
  shopping: "#10b981",
  entertainment: "#f59e0b",
  productivity: "#8b5cf6",
  development: "#06b6d4",
  learning: "#ec4899",
  other: "#6b7280",
};

export const CATEGORY_ICONS: Record<string, string> = {
  social: "👥",
  news: "📰",
  shopping: "🛒",
  entertainment: "🎬",
  productivity: "💼",
  development: "💻",
  learning: "📚",
  other: "🌐",
};

// Intent types
export const INTENT_TYPES = [
  "research",
  "entertainment",
  "work",
  "shopping",
  "learning",
  "social",
  "other",
] as const;

export const INTENT_EMOJIS: Record<string, string> = {
  research: "🔍",
  entertainment: "🎬",
  work: "💼",
  shopping: "🛒",
  learning: "📚",
  social: "👥",
  other: "🌐",
};

// AI configuration
export const AI_CONFIG = {
  model: "gemini-1.5-flash",
  embeddingModel: "text-embedding-004",
  maxTokens: 1024,
  temperature: 0.7,
  embeddingDimension: 768,
};

// Cache configuration
export const CACHE_CONFIG = {
  maxSize: 1000,
  ttl: 3600000, // 1 hour
};

// Notification settings
export const NOTIFICATION_DEFAULTS = {
  enabled: true,
  showAnomalies: true,
  showInsights: true,
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 8, // 8 AM
};

// UI configuration
export const UI_CONFIG = {
  defaultView: "stats" as const,
  defaultTimeRange: "day" as const,
  animationDuration: 300,
  debounceDelay: 500,
  throttleDelay: 1000,
};

// Storage keys
export const STORAGE_KEYS = {
  settings: "settings",
  apiKey: "apiKey",
  lastAnalysis: "lastAnalysis",
  sessionId: "sessionId",
};

// API endpoints
export const API_ENDPOINTS = {
  anthropic: "https://api.anthropic.com/v1",
  messages: "/messages",
};

// Error messages
export const ERROR_MESSAGES = {
  apiKeyMissing:
    "API key not configured. Please add your Anthropic API key in settings.",
  networkError: "Network error occurred. Please check your connection.",
  dbError: "Database error occurred. Please try again.",
  analysisError: "Analysis failed. Please try again later.",
  invalidData: "Invalid data format.",
  permissionDenied: "Permission denied. Please check extension permissions.",
};

// Success messages
export const SUCCESS_MESSAGES = {
  settingsSaved: "Settings saved successfully",
  dataClearedSuccess: "Data cleared successfully",
  dataExported: "Data exported successfully",
};

// Time windows
export const TIME_WINDOWS = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

// Productive categories (for scoring)
export const PRODUCTIVE_CATEGORIES = [
  "productivity",
  "development",
  "learning",
];

// Distracting categories (for scoring)
export const DISTRACTING_CATEGORIES = ["social", "entertainment"];

// Excluded domains (default)
export const DEFAULT_EXCLUDED_DOMAINS = [
  "chrome://extensions",
  "chrome://settings",
  "chrome-extension://",
  "about:blank",
];

// Chart colors
export const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#6b7280",
];

// Export formats
export const EXPORT_FORMATS = ["json", "csv"] as const;

// Feature flags
export const FEATURES = {
  anomalyDetection: true,
  intentAnalysis: true,
  memorySystem: true,
  notifications: true,
  dataExport: true,
  goalTracking: false, // Coming soon
};
