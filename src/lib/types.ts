// Core browsing pattern type
export interface BrowsingPattern {
  id: string;
  url: string;
  domain: string;
  title: string;
  timestamp: number;
  duration: number; // milliseconds
  category: string;
  sessionId: string;
}

// Intent detection
export interface Intent {
  type:
    | "research"
    | "entertainment"
    | "work"
    | "shopping"
    | "learning"
    | "social"
    | "other";
  confidence: number; // 0-1
  description: string;
  focus: string;
  timestamp: number;
  patternCount: number;
}

// Behavior anomaly
export interface BehaviorAnomaly {
  id: string;
  type:
    | "unusual_time"
    | "unusual_category"
    | "rapid_switching"
    | "long_session"
    | "new_pattern";
  severity: "low" | "medium" | "high";
  description: string;
  timestamp: number;
  pattern: BrowsingPattern;
}

// Session data
export interface SessionData {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  patternCount: number;
  categories: string[];
}

// Memory entry with embeddings
export interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    domain?: string;
    category?: string;
    timestamp?: number;
    duration?: number;
    [key: string]: any;
  };
  timestamp: number;
}

// Search result from memory system
export interface SearchResult {
  content: string;
  metadata: any;
  relevance: number;
  timestamp: number;
}

// Time window for analysis
export interface TimeWindow {
  start: number;
  end: number;
  label: string;
}

// AI client configuration
export interface AIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// Extension settings
export interface Settings {
  enableTracking: boolean;
  enableAnomalyDetection: boolean;
  enableNotifications: boolean;
  apiKey: string;
  analysisInterval: number; // minutes
  dataRetentionDays: number;
  excludedDomains: string[];
}

// Statistics
export interface BrowsingStats {
  totalTime: number;
  totalSites: number;
  avgSessionLength: number;
  topCategory: string;
  categoryBreakdown: CategoryStat[];
  dailyActivity: DailyActivity[];
}

export interface CategoryStat {
  category: string;
  time: number;
  count: number;
  percentage: number;
}

export interface DailyActivity {
  date: string;
  siteCount: number;
  totalTime: number;
  topCategories: string[];
}

// Goal tracking
export interface Goal {
  id: string;
  title: string;
  description: string;
  targetCategory?: string;
  targetTime?: number;
  progress: number;
  createdAt: number;
  deadline?: number;
}

// Notification
export interface NotificationData {
  title: string;
  message: string;
  type: "info" | "warning" | "anomaly" | "insight";
  timestamp: number;
  actionUrl?: string;
}

// Message types for Chrome extension messaging
export type MessageType =
  | "ANOMALY_DETECTED"
  | "SESSION_SUMMARY"
  | "SETTINGS_UPDATED"
  | "ANALYSIS_COMPLETE"
  | "INTENT_UPDATED";

export interface ExtensionMessage {
  type: MessageType;
  data?: any;
}

// Database schema
export interface DatabaseSchema {
  patterns: BrowsingPattern[];
  memories: MemoryEntry[];
  anomalies: BehaviorAnomaly[];
  sessions: SessionData[];
  goals: Goal[];
}

// API response types
export interface IntentAnalysisResponse {
  type: string;
  confidence: number;
  description: string;
  focus: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  tokens: number;
}

// Export types for external use
export type Category =
  | "social"
  | "news"
  | "shopping"
  | "entertainment"
  | "productivity"
  | "development"
  | "learning"
  | "other";

export type Severity = "low" | "medium" | "high";

export type IntentType = Intent["type"];

// Intervention types
export interface Intervention {
  id: string;
  type:
    | "focus_reminder"
    | "break_suggestion"
    | "goal_check"
    | "distraction_warning"
    | "productivity_tip";
  title: string;
  message: string;
  priority: Priority;
  timestamp: number;
  dismissed: boolean;
  action?: Action;
}

export interface UserState {
  focusLevel: number; // 0-100
  distractionScore: number; // 0-100
  currentActivity: string;
  sessionDuration: number;
  breaksSinceFocus: number;
  lastBreakTime: number;
}

export type Priority = "low" | "medium" | "high" | "critical";

export interface Action {
  type: "open_url" | "show_overlay" | "block_site" | "start_timer";
  payload: any;
}

// Task tracking
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: "active" | "completed" | "paused";
  createdAt: number;
  completedAt?: number;
  estimatedDuration?: number;
}

// Daily stats
export interface DailyStats {
  date: string;
  focusTime: number;
  distractionTime: number;
  breaksTaken: number;
  tasksCompleted: number;
  productivityScore: number;
}
