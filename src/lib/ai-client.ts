import type { AIConfig } from "./types";

const DEFAULT_CONFIG: AIConfig = {
  apiKey: "",
  model: "gemini-1.5-flash",
  maxTokens: 1024,
  temperature: 0.7,
};

class AIClient {
  private config: AIConfig = DEFAULT_CONFIG;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  async initialize(): Promise<void> {
    // Load API key from storage
    const stored = await chrome.storage.sync.get("settings");
    if (stored.settings?.apiKey) {
      this.config.apiKey = stored.settings.apiKey;
    }
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  async analyzeIntent(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error("API key not configured");
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: this.config.temperature,
              maxOutputTokens: this.config.maxTokens,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `API error: ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Intent analysis failed:", error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.config.apiKey) {
      return this.createSimpleEmbedding(text);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/text-embedding-004:embedContent?key=${this.config.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: {
              parts: [{ text }],
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Embedding generation failed");
      }

      const data = await response.json();
      return data.embedding.values;
    } catch (error) {
      console.error("Embedding generation failed, using fallback:", error);
      return this.createSimpleEmbedding(text);
    }
  }

  private createSimpleEmbedding(text: string): number[] {
    // Simple embedding based on character frequencies and n-grams
    // This is a fallback - ideally use a proper embedding model
    const embedding = new Array(384).fill(0);

    // Character-level features
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const idx = charCode % embedding.length;
      embedding[idx] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  async summarizeContent(
    content: string,
    maxLength: number = 200
  ): Promise<string> {
    const prompt = `Summarize the following content in ${maxLength} characters or less:

${content}

Summary:`;

    try {
      return await this.analyzeIntent(prompt);
    } catch (error) {
      console.error("Summarization failed:", error);
      // Fallback to simple truncation
      return content.substring(0, maxLength) + "...";
    }
  }

  async extractKeywords(content: string, count: number = 5): Promise<string[]> {
    const prompt = `Extract the ${count} most important keywords from this content:

${content}

Return as a JSON array: ["keyword1", "keyword2", ...]`;

    try {
      const response = await this.analyzeIntent(prompt);
      const keywords = JSON.parse(response);
      return Array.isArray(keywords) ? keywords : [];
    } catch (error) {
      console.error("Keyword extraction failed:", error);
      return [];
    }
  }

  async categorizeDomain(
    domain: string,
    title: string,
    url: string
  ): Promise<string> {
    const prompt = `Categorize this website into one of these categories:
- social
- news
- shopping
- entertainment
- productivity
- development
- learning
- other

Domain: ${domain}
Title: ${title}
URL: ${url}

Return only the category name.`;

    try {
      const response = await this.analyzeIntent(prompt);
      return response.trim().toLowerCase();
    } catch (error) {
      console.error("Categorization failed:", error);
      return "other";
    }
  }

  async detectSentiment(
    text: string
  ): Promise<"positive" | "neutral" | "negative"> {
    const prompt = `Analyze the sentiment of this text. Respond with only one word: positive, neutral, or negative.

Text: ${text}`;

    try {
      const response = await this.analyzeIntent(prompt);
      const sentiment = response.trim().toLowerCase();

      if (sentiment.includes("positive")) return "positive";
      if (sentiment.includes("negative")) return "negative";
      return "neutral";
    } catch (error) {
      console.error("Sentiment detection failed:", error);
      return "neutral";
    }
  }

  async generateInsight(patterns: any[]): Promise<string> {
    const patternSummary = patterns
      .slice(0, 20)
      .map((p) => `${p.domain} (${p.category})`)
      .join(", ");

    const prompt = `Based on this browsing activity, provide one actionable insight:

${patternSummary}

Insight (one sentence):`;

    try {
      return await this.analyzeIntent(prompt);
    } catch (error) {
      console.error("Insight generation failed:", error);
      return "Unable to generate insight at this time.";
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AIConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Singleton instance
let aiClientInstance: AIClient | null = null;

export function getAIClient(): AIClient {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient();
    aiClientInstance.initialize().catch(console.error);
  }
  return aiClientInstance;
}

export { AIClient };
