import type { BrowsingPattern, BehaviorAnomaly } from "./types";

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Analyze patterns to detect common behaviors
 */
export function analyzePatterns(patterns: BrowsingPattern[]): {
  topCategories: string[];
  avgDuration: number;
  peakHours: number[];
  diversityScore: number;
} {
  if (patterns.length === 0) {
    return {
      topCategories: [],
      avgDuration: 0,
      peakHours: [],
      diversityScore: 0,
    };
  }

  // Top categories
  const categoryCounts: Record<string, number> = {};
  patterns.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat);

  // Average duration
  const totalDuration = patterns.reduce((sum, p) => sum + p.duration, 0);
  const avgDuration = totalDuration / patterns.length;

  // Peak hours
  const hourCounts: Record<number, number> = {};
  patterns.forEach((p) => {
    const hour = new Date(p.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // Diversity score (Shannon entropy)
  const categoryProbs = Object.values(categoryCounts).map(
    (count) => count / patterns.length
  );
  const diversityScore = -categoryProbs.reduce(
    (sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0),
    0
  );

  return { topCategories, avgDuration, peakHours, diversityScore };
}

/**
 * Detect anomalies in browsing patterns
 */
export function detectAnomalies(
  patterns: BrowsingPattern[],
  baseline: any
): BehaviorAnomaly[] {
  const anomalies: BehaviorAnomaly[] = [];

  // This is a simplified version
  // Real implementation would use statistical methods

  patterns.forEach((pattern) => {
    // Check for unusual duration
    if (pattern.duration > baseline.avgDuration * 3) {
      anomalies.push({
        id: crypto.randomUUID(),
        type: "long_session",
        severity: "medium",
        description: `Unusually long session: ${formatDuration(
          pattern.duration
        )}`,
        timestamp: Date.now(),
        pattern,
      });
    }
  });

  return anomalies;
}

/**
 * Calculate a browsing quality score
 */
export function calculateBrowsingScore(patterns: BrowsingPattern[]): number {
  if (patterns.length === 0) return 0;

  let score = 50; // Start at neutral

  // Positive factors
  const productiveCategories = ["productivity", "development", "learning"];
  const productiveCount = patterns.filter((p) =>
    productiveCategories.includes(p.category)
  ).length;
  const productiveRatio = productiveCount / patterns.length;
  score += productiveRatio * 30;

  // Negative factors
  const distractingCategories = ["social", "entertainment"];
  const distractingCount = patterns.filter((p) =>
    distractingCategories.includes(p.category)
  ).length;
  const distractingRatio = distractingCount / patterns.length;
  score -= distractingRatio * 20;

  // Rapid switching penalty
  const rapidSwitching = detectRapidSwitching(patterns);
  score -= rapidSwitching * 10;

  // Focus bonus (fewer unique domains = more focus)
  const uniqueDomains = new Set(patterns.map((p) => p.domain)).size;
  const focusRatio = 1 - uniqueDomains / patterns.length;
  score += focusRatio * 20;

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Detect rapid switching behavior
 */
function detectRapidSwitching(patterns: BrowsingPattern[]): number {
  if (patterns.length < 2) return 0;

  let rapidSwitches = 0;
  const threshold = 10000; // 10 seconds

  for (let i = 1; i < patterns.length; i++) {
    const timeDiff = patterns[i].timestamp - patterns[i - 1].timestamp;
    if (timeDiff < threshold) {
      rapidSwitches++;
    }
  }

  return rapidSwitches / patterns.length;
}

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format timestamp relative to now
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Group patterns by time window
 */
export function groupByTimeWindow(
  patterns: BrowsingPattern[],
  windowSize: number
): Map<number, BrowsingPattern[]> {
  const groups = new Map<number, BrowsingPattern[]>();

  patterns.forEach((pattern) => {
    const windowStart = Math.floor(pattern.timestamp / windowSize) * windowSize;
    if (!groups.has(windowStart)) {
      groups.set(windowStart, []);
    }
    groups.get(windowStart)!.push(pattern);
  });

  return groups;
}

/**
 * Calculate statistics for a set of patterns
 */
export function calculateStats(patterns: BrowsingPattern[]): {
  totalTime: number;
  avgTime: number;
  medianTime: number;
  uniqueDomains: number;
  uniqueCategories: number;
} {
  if (patterns.length === 0) {
    return {
      totalTime: 0,
      avgTime: 0,
      medianTime: 0,
      uniqueDomains: 0,
      uniqueCategories: 0,
    };
  }

  const totalTime = patterns.reduce((sum, p) => sum + p.duration, 0);
  const avgTime = totalTime / patterns.length;

  // Calculate median
  const sortedDurations = patterns.map((p) => p.duration).sort((a, b) => a - b);
  const medianIndex = Math.floor(sortedDurations.length / 2);
  const medianTime =
    sortedDurations.length % 2 === 0
      ? (sortedDurations[medianIndex - 1] + sortedDurations[medianIndex]) / 2
      : sortedDurations[medianIndex];

  const uniqueDomains = new Set(patterns.map((p) => p.domain)).size;
  const uniqueCategories = new Set(patterns.map((p) => p.category)).size;

  return {
    totalTime,
    avgTime,
    medianTime,
    uniqueDomains,
    uniqueCategories,
  };
}

/**
 * Find patterns similar to a given pattern
 */
export function findSimilarPatterns(
  target: BrowsingPattern,
  candidates: BrowsingPattern[],
  limit: number = 5
): BrowsingPattern[] {
  const scored = candidates
    .filter((p) => p.id !== target.id)
    .map((pattern) => ({
      pattern,
      score: calculateSimilarityScore(target, pattern),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.pattern);
}

/**
 * Calculate similarity score between two patterns
 */
function calculateSimilarityScore(
  a: BrowsingPattern,
  b: BrowsingPattern
): number {
  let score = 0;

  // Same domain = high similarity
  if (a.domain === b.domain) score += 0.5;

  // Same category = medium similarity
  if (a.category === b.category) score += 0.3;

  // Similar duration = low similarity
  const durationRatio =
    Math.min(a.duration, b.duration) / Math.max(a.duration, b.duration);
  score += durationRatio * 0.2;

  return score;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  // Line 321: Change to:
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
