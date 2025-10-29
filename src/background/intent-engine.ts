import { getAIClient } from "../lib/ai-client";
import type { BrowsingPattern, Intent } from "../lib/types";

export class IntentEngine {
  private patterns: BrowsingPattern[] = [];
  private currentIntent: Intent | null = null;
  private analysisInterval: number = 5 * 60 * 1000; // 5 minutes
  private lastAnalysis: number = 0;

  async analyzeIntent(patterns: BrowsingPattern[]): Promise<Intent> {
    this.patterns = patterns;

    // Check if we need to run analysis
    const now = Date.now();
    if (now - this.lastAnalysis < this.analysisInterval && this.currentIntent) {
      return this.currentIntent;
    }

    try {
      const aiClient = getAIClient();
      const recentPatterns = this.getRecentPatterns(30 * 60 * 1000); // Last 30 minutes

      if (recentPatterns.length === 0) {
        return this.createIdleIntent();
      }

      const prompt = this.buildAnalysisPrompt(recentPatterns);
      const response = await aiClient.analyzeIntent(prompt);

      const intent = this.parseIntentResponse(response, recentPatterns);
      this.currentIntent = intent;
      this.lastAnalysis = now;

      return intent;
    } catch (error) {
      console.error("Intent analysis failed:", error);
      return this.createErrorIntent();
    }
  }

  async detectGoalProgress(
    patterns: BrowsingPattern[],
    goal: string
  ): Promise<number> {
    try {
      const aiClient = getAIClient();
      const relevantPatterns = patterns.filter((p) =>
        this.isRelevantToGoal(p, goal)
      );

      const prompt = `
Analyze the following browsing patterns to determine progress toward this goal: "${goal}"

Patterns:
${relevantPatterns
  .map((p) => `- ${p.domain}: ${p.category} (${p.duration}ms)`)
  .join("\n")}

Return a progress percentage (0-100) and brief explanation.
Format: {"progress": 75, "explanation": "User has completed research phase"}
`;

      const response = await aiClient.analyzeIntent(prompt);
      const result = JSON.parse(response);
      return result.progress || 0;
    } catch (error) {
      console.error("Goal progress detection failed:", error);
      return 0;
    }
  }

  async suggestNextAction(patterns: BrowsingPattern[]): Promise<string[]> {
    try {
      const aiClient = getAIClient();
      const recentPatterns = this.getRecentPatterns(60 * 60 * 1000); // Last hour
      const intent = await this.analyzeIntent(patterns);

      const prompt = `
Based on the user's current intent: "${intent.description}"
And recent browsing patterns:
${recentPatterns
  .slice(0, 10)
  .map((p) => `- ${p.domain}: ${p.category}`)
  .join("\n")}

Suggest 3-5 helpful next actions or resources.
Format as JSON array: ["action1", "action2", ...]
`;

      const response = await aiClient.analyzeIntent(prompt);
      const suggestions = JSON.parse(response);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      console.error("Next action suggestion failed:", error);
      return [];
    }
  }

  private buildAnalysisPrompt(patterns: BrowsingPattern[]): string {
    const categoryCounts = this.getCategoryCounts(patterns);
    const topDomains = this.getTopDomains(patterns, 5);
    const timeDistribution = this.getTimeDistribution(patterns);

    return `
Analyze the user's browsing intent based on recent activity:

Categories visited:
${Object.entries(categoryCounts)
  .map(([cat, count]) => `- ${cat}: ${count} visits`)
  .join("\n")}

Top domains:
${topDomains.map((d) => `- ${d.domain} (${d.count} visits)`).join("\n")}

Time distribution:
- Total time: ${this.formatDuration(timeDistribution.total)}
- Average per site: ${this.formatDuration(timeDistribution.average)}

Determine:
1. Primary intent (research, entertainment, work, shopping, learning, social, other)
2. Confidence level (0-1)
3. Brief description of what the user is trying to accomplish
4. Specific focus area or topic

Return JSON: {
  "type": "research|entertainment|work|shopping|learning|social|other",
  "confidence": 0.85,
  "description": "User is researching vacation destinations",
  "focus": "travel planning"
}
`;
  }

  private parseIntentResponse(
    response: string,
    patterns: BrowsingPattern[]
  ): Intent {
    try {
      const parsed = JSON.parse(response);
      return {
        type: parsed.type || "other",
        confidence: parsed.confidence || 0.5,
        description: parsed.description || "Unknown intent",
        focus: parsed.focus || "general",
        timestamp: Date.now(),
        patternCount: patterns.length,
      };
    } catch (error) {
      console.error("Failed to parse intent response:", error);
      return this.createErrorIntent();
    }
  }

  private getRecentPatterns(timeWindow: number): BrowsingPattern[] {
    const cutoff = Date.now() - timeWindow;
    return this.patterns.filter((p) => p.timestamp > cutoff);
  }

  private getCategoryCounts(
    patterns: BrowsingPattern[]
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    patterns.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }

  private getTopDomains(
    patterns: BrowsingPattern[],
    limit: number
  ): Array<{ domain: string; count: number }> {
    const domainCounts: Record<string, number> = {};
    patterns.forEach((p) => {
      domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1;
    });

    return Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private getTimeDistribution(patterns: BrowsingPattern[]): {
    total: number;
    average: number;
  } {
    const total = patterns.reduce((sum, p) => sum + p.duration, 0);
    const average = patterns.length > 0 ? total / patterns.length : 0;
    return { total, average };
  }

  private isRelevantToGoal(pattern: BrowsingPattern, goal: string): boolean {
    const goalLower = goal.toLowerCase();
    const domainLower = pattern.domain.toLowerCase();
    const categoryLower = pattern.category.toLowerCase();

    return (
      domainLower.includes(goalLower) ||
      categoryLower.includes(goalLower) ||
      goal
        .split(" ")
        .some(
          (word) =>
            word.length > 3 &&
            (domainLower.includes(word) || categoryLower.includes(word))
        )
    );
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private createIdleIntent(): Intent {
    return {
      type: "other",
      confidence: 1,
      description: "No recent activity",
      focus: "idle",
      timestamp: Date.now(),
      patternCount: 0,
    };
  }

  private createErrorIntent(): Intent {
    return {
      type: "other",
      confidence: 0,
      description: "Unable to determine intent",
      focus: "unknown",
      timestamp: Date.now(),
      patternCount: 0,
    };
  }
}

export const intentEngine = new IntentEngine();
