// Chrome Built-in AI APIs Client
// Uses on-device AI models - no API key needed!

interface AICapabilities {
  available: "readily" | "after-download" | "no";
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): ReadableStream;
  destroy(): void;
}

interface SummarizerSession {
  summarize(text: string): Promise<string>;
  destroy(): void;
}

interface TranslatorSession {
  translate(text: string): Promise<string>;
  destroy(): void;
}

// Extend Window interface for Chrome AI APIs
declare global {
  interface Window {
    ai?: {
      languageModel: {
        capabilities(): Promise<AICapabilities>;
        create(options?: {
          systemPrompt?: string;
          temperature?: number;
          topK?: number;
        }): Promise<LanguageModelSession>;
      };
      summarizer?: {
        capabilities(): Promise<AICapabilities>;
        create(options?: {
          type?: "tl;dr" | "key-points" | "teaser" | "headline";
          format?: "plain-text" | "markdown";
          length?: "short" | "medium" | "long";
        }): Promise<SummarizerSession>;
      };
      translator?: {
        capabilities(): Promise<{ available: string }>;
        create(options: {
          sourceLanguage: string;
          targetLanguage: string;
        }): Promise<TranslatorSession>;
      };
    };
  }
}

class ChromeAIClient {
  private promptSession: LanguageModelSession | null = null;
  private summarizerSession: SummarizerSession | null = null;
  private isAvailable: boolean = false;

  async initialize(): Promise<boolean> {
    try {
      // Check if Chrome AI APIs are available
      if (!window.ai?.languageModel) {
        console.warn("Chrome Built-in AI not available");
        return false;
      }

      const capabilities = await window.ai.languageModel.capabilities();

      if (capabilities.available === "readily") {
        this.isAvailable = true;
        console.log("Chrome Built-in AI is ready!");
        return true;
      } else if (capabilities.available === "after-download") {
        console.log("Chrome Built-in AI available after download");
        this.isAvailable = true;
        return true;
      } else {
        console.warn("Chrome Built-in AI not available on this device");
        return false;
      }
    } catch (error) {
      console.error("Failed to initialize Chrome AI:", error);
      return false;
    }
  }

  private async ensureSession(): Promise<void> {
    if (!this.promptSession) {
      if (!window.ai?.languageModel) {
        throw new Error("Chrome AI not available");
      }

      this.promptSession = await window.ai.languageModel.create({
        systemPrompt: `You are a productivity assistant analyzing browsing behavior. 
Provide brief, actionable insights. Keep responses under 100 words.
Return data as JSON when requested.`,
        temperature: 0.7,
        topK: 3,
      });
    }
  }

  async analyzeIntent(patterns: string): Promise<string> {
    try {
      await this.ensureSession();

      const prompt = `Analyze these browsing patterns and determine the user's intent:

${patterns}

Return ONLY a JSON object with this exact format:
{
  "type": "work" | "entertainment" | "learning" | "research" | "shopping" | "social" | "other",
  "confidence": 0.85,
  "description": "brief description",
  "focus": "main topic"
}`;

      const response = await this.promptSession!.prompt(prompt);
      return response;
    } catch (error) {
      console.error("Intent analysis failed:", error);
      // Fallback response
      return JSON.stringify({
        type: "other",
        confidence: 0.5,
        description: "Unable to analyze intent",
        focus: "general browsing",
      });
    }
  }

  async generateSuggestions(context: string): Promise<string> {
    try {
      await this.ensureSession();

      const prompt = `Based on this browsing context:
${context}

Provide ONE brief, actionable suggestion to help the user be more productive.
Keep it under 100 characters.`;

      const response = await this.promptSession!.prompt(prompt);
      return response.trim();
    } catch (error) {
      console.error("Suggestion generation failed:", error);
      return "Try focusing on one task at a time.";
    }
  }

  async summarizeSession(patterns: string): Promise<string> {
    try {
      // Try to use Summarizer API if available
      if (window.ai?.summarizer) {
        if (!this.summarizerSession) {
          const capabilities = await window.ai.summarizer.capabilities();

          if (
            capabilities.available === "readily" ||
            capabilities.available === "after-download"
          ) {
            this.summarizerSession = await window.ai.summarizer.create({
              type: "key-points",
              format: "plain-text",
              length: "short",
            });
          }
        }

        if (this.summarizerSession) {
          return await this.summarizerSession.summarize(patterns);
        }
      }

      // Fallback to Prompt API
      await this.ensureSession();

      const prompt = `Summarize this browsing session in 2-3 sentences:

${patterns}

Focus on: main activities, time spent, and productivity level.`;

      const response = await this.promptSession!.prompt(prompt);
      return response;
    } catch (error) {
      console.error("Session summarization failed:", error);
      return "Unable to summarize session.";
    }
  }

  async translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      if (window.ai?.translator) {
        const capabilities = await window.ai.translator.capabilities();

        if (
          capabilities.available === "readily" ||
          capabilities.available === "after-download"
        ) {
          const translator = await window.ai.translator.create({
            sourceLanguage: "en",
            targetLanguage: targetLanguage,
          });

          return await translator.translate(text);
        }
      }

      // Fallback to Prompt API
      await this.ensureSession();

      const prompt = `Translate this text to ${targetLanguage}:

${text}

Provide ONLY the translation, no explanations.`;

      const response = await this.promptSession!.prompt(prompt);
      return response.trim();
    } catch (error) {
      console.error("Translation failed:", error);
      return text; // Return original if translation fails
    }
  }

  async getAPIStatus(): Promise<{
    promptAPI: boolean;
    summarizerAPI: boolean;
    translatorAPI: boolean;
  }> {
    const status = {
      promptAPI: false,
      summarizerAPI: false,
      translatorAPI: false,
    };

    try {
      if (window.ai?.languageModel) {
        const capabilities = await window.ai.languageModel.capabilities();
        status.promptAPI = capabilities.available !== "no";
      }

      if (window.ai?.summarizer) {
        const capabilities = await window.ai.summarizer.capabilities();
        status.summarizerAPI = capabilities.available !== "no";
      }

      if (window.ai?.translator) {
        const capabilities = await window.ai.translator.capabilities();
        status.translatorAPI = capabilities.available !== "no";
      }
    } catch (error) {
      console.error("Failed to check API status:", error);
    }

    return status;
  }

  isAIAvailable(): boolean {
    return this.isAvailable;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Chrome Built-in AI doesn't have embeddings yet
    // For now, use a simple hash-based approach for semantic search
    // In production, you might want to use a lightweight embedding model
    console.warn(
      "Embeddings not available in Chrome Built-in AI, using fallback"
    );

    // Simple fallback: convert text to normalized vector
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(768).fill(0);

    words.forEach((word, _idx) => {
      const hash = this.simpleHash(word);
      vector[hash % 768] += 1;
    });

    // Normalize
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    return vector.map((v) => v / (magnitude || 1));
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  destroy(): void {
    if (this.promptSession) {
      this.promptSession.destroy();
      this.promptSession = null;
    }
    if (this.summarizerSession) {
      this.summarizerSession.destroy();
      this.summarizerSession = null;
    }
  }
}

// Singleton instance
let chromeAIInstance: ChromeAIClient | null = null;

export function getChromeAI(): ChromeAIClient {
  if (!chromeAIInstance) {
    chromeAIInstance = new ChromeAIClient();
  }
  return chromeAIInstance;
}

export { ChromeAIClient };
