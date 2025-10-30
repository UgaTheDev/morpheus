import type { BrowsingPattern, MemoryEntry, SearchResult } from "../lib/types";
import { db } from "../lib/db";
import { getChromeAI } from "../lib/chrome-ai-client";
import { cosineSimilarity } from "../lib/utils";

export class MemorySystem {
  private cache: Map<string, MemoryEntry> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();
  private maxCacheSize = 1000;

  async storePattern(pattern: BrowsingPattern): Promise<void> {
    try {
      // Create memory entry with embedding
      const embedding = await this.generateEmbedding(pattern);
      const memoryEntry: MemoryEntry = {
        id: pattern.id,
        content: this.createContent(pattern),
        embedding,
        metadata: {
          domain: pattern.domain,
          category: pattern.category,
          timestamp: pattern.timestamp,
          duration: pattern.duration,
        },
        timestamp: pattern.timestamp,
      };

      // Store in database
      await db.addMemory(memoryEntry);

      // Update cache
      this.updateCache(memoryEntry);
    } catch (error) {
      console.error("Failed to store pattern:", error);
    }
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.getEmbedding(query);
      const memories = await db.getAllMemories();

      // Calculate similarity scores
      const results = memories
        .map((memory) => ({
          memory,
          score: cosineSimilarity(queryEmbedding, memory.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return results.map((r) => ({
        content: r.memory.content,
        metadata: r.memory.metadata,
        relevance: r.score,
        timestamp: r.memory.timestamp,
      }));
    } catch (error) {
      console.error("Memory search failed:", error);
      return [];
    }
  }

  async findSimilarPatterns(
    pattern: BrowsingPattern,
    limit: number = 5
  ): Promise<BrowsingPattern[]> {
    try {
      const query = `${pattern.domain} ${pattern.category} ${pattern.title}`;
      const results = await this.search(query, limit);

      // Convert search results back to patterns
      const patternIds = results
        .map((r) => r.metadata.id)
        .filter((id) => id !== pattern.id);

      const patterns: BrowsingPattern[] = [];
      for (const id of patternIds) {
        const p = await db.getPattern(id as string);
        if (p) patterns.push(p);
      }

      return patterns;
    } catch (error) {
      console.error("Failed to find similar patterns:", error);
      return [];
    }
  }

  async getContextForIntent(
    intent: string,
    timeWindow: number = 3600000
  ): Promise<string> {
    try {
      const recentResults = await this.search(intent, 20);
      const cutoff = Date.now() - timeWindow;

      const relevantResults = recentResults
        .filter((r) => r.timestamp > cutoff)
        .slice(0, 10);

      if (relevantResults.length === 0) {
        return "No recent relevant browsing history found.";
      }

      return relevantResults
        .map((r) => `- ${r.content} (${this.formatTimestamp(r.timestamp)})`)
        .join("\n");
    } catch (error) {
      console.error("Failed to get context:", error);
      return "Error retrieving context.";
    }
  }

  async summarizeTimeWindow(start: number, end: number): Promise<string> {
    try {
      const patterns = await db.getPatternsInRange(start, end);

      if (patterns.length === 0) {
        return "No activity during this time period.";
      }

      const chromeAI = getChromeAI();
      const patternSummary = patterns
        .map(
          (p) =>
            `${p.domain} (${p.category}) - ${this.formatDuration(p.duration)}`
        )
        .join("\n");

      const prompt = `Summarize this browsing activity in 2-3 sentences:
${patternSummary}

Focus on main themes and activities.`;

      return await chromeAI.analyzeIntent(prompt);
    } catch (error) {
      console.error("Failed to summarize time window:", error);
      return "Unable to generate summary.";
    }
  }

  async getTopicsOverTime(
    days: number = 7
  ): Promise<Array<{ date: string; topics: string[] }>> {
    try {
      const topics: Array<{ date: string; topics: string[] }> = [];
      const now = Date.now();

      for (let i = 0; i < days; i++) {
        const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
        const dayEnd = now - i * 24 * 60 * 60 * 1000;

        const patterns = await db.getPatternsInRange(dayStart, dayEnd);
        const dayTopics = await this.extractTopics(patterns);

        topics.push({
          date: new Date(dayStart).toLocaleDateString(),
          topics: dayTopics,
        });
      }

      return topics.reverse();
    } catch (error) {
      console.error("Failed to get topics over time:", error);
      return [];
    }
  }

  private async extractTopics(patterns: BrowsingPattern[]): Promise<string[]> {
    if (patterns.length === 0) return [];

    try {
      const chromeAI = getChromeAI();
      const domains = [...new Set(patterns.map((p) => p.domain))].slice(0, 20);

      const prompt = `Extract 3-5 main topics from these browsing domains:
${domains.join("\n")}

Return as JSON array: ["topic1", "topic2", ...]`;

      const response = await chromeAI.analyzeIntent(prompt);
      const topics = JSON.parse(response);
      return Array.isArray(topics) ? topics : [];
    } catch (error) {
      // Fallback to category-based topics
      const categories = [...new Set(patterns.map((p) => p.category))];
      return categories.slice(0, 5);
    }
  }

  private async generateEmbedding(pattern: BrowsingPattern): Promise<number[]> {
    const content = this.createContent(pattern);
    return await this.getEmbedding(content);
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    try {
      const chromeAI = getChromeAI();
      const embedding = await chromeAI.generateEmbedding(text);

      // Cache the embedding
      this.embeddingCache.set(text, embedding);

      // Limit cache size
      if (this.embeddingCache.size > this.maxCacheSize) {
        const firstKey = this.embeddingCache.keys().next().value;
        if (firstKey !== undefined) {
          this.embeddingCache.delete(firstKey);
        }
      }

      return embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      // Return zero vector as fallback
      return new Array(768).fill(0);
    }
  }

  private createContent(pattern: BrowsingPattern): string {
    return `${pattern.title || pattern.domain} - ${pattern.category} - ${
      pattern.domain
    }`;
  }

  private updateCache(entry: MemoryEntry): void {
    this.cache.set(entry.id, entry);

    // Limit cache size
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  async clearOldMemories(days: number = 90): Promise<number> {
    try {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return await db.deleteMemoriesBefore(cutoff);
    } catch (error) {
      console.error("Failed to clear old memories:", error);
      return 0;
    }
  }

  async exportMemories(): Promise<MemoryEntry[]> {
    return await db.getAllMemories();
  }

  async importMemories(memories: MemoryEntry[]): Promise<void> {
    for (const memory of memories) {
      await db.addMemory(memory);
      this.updateCache(memory);
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.embeddingCache.clear();
  }
}

export const memorySystem = new MemorySystem();
