import type { ExtensionMessage, MessageType } from "../lib/types";

/**
 * Send a message to the background script
 */
export async function sendToBackground(
  type: MessageType,
  data?: any
): Promise<any> {
  try {
    const message: ExtensionMessage = { type, data };
    const response = await chrome.runtime.sendMessage(message);
    return response;
  } catch (error) {
    console.error("Failed to send message to background:", error);
    throw error;
  }
}

/**
 * Send a message to a specific tab
 */
export async function sendToTab(
  tabId: number,
  type: MessageType,
  data?: any
): Promise<any> {
  try {
    const message: ExtensionMessage = { type, data };
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    console.error(`Failed to send message to tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Broadcast a message to all tabs
 */
export async function broadcastToTabs(
  type: MessageType,
  data?: any
): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    const message: ExtensionMessage = { type, data };

    await Promise.all(
      tabs.map((tab) =>
        tab.id
          ? chrome.tabs.sendMessage(tab.id, message).catch(() => {})
          : Promise.resolve()
      )
    );
  } catch (error) {
    console.error("Failed to broadcast message:", error);
  }
}

/**
 * Listen for messages
 */
export function onMessage(
  callback: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender
  ) => void | Promise<any>
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isValidMessage(message)) {
      const result = callback(message, sender);

      // Handle async callbacks
      if (result instanceof Promise) {
        result.then(sendResponse).catch((error) => {
          console.error("Message handler error:", error);
          sendResponse({ error: error.message });
        });
        return true; // Keep channel open for async response
      }
    }
    return false;
  });
}

/**
 * Validate message format
 */
function isValidMessage(message: any): message is ExtensionMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    typeof message.type === "string"
  );
}

/**
 * Message handlers registry
 */
type MessageHandler = (
  data: any,
  sender: chrome.runtime.MessageSender
) => void | Promise<any>;

class MessageRouter {
  private handlers: Map<MessageType, MessageHandler[]> = new Map();

  /**
   * Register a handler for a specific message type
   */
  on(type: MessageType, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * Remove a handler
   */
  off(type: MessageType, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle an incoming message
   */
  async handle(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<any> {
    const handlers = this.handlers.get(message.type);
    if (!handlers || handlers.length === 0) {
      return;
    }

    // Execute all handlers for this message type
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(message.data, sender))
    );

    // Return the first successful result
    const successResult = results.find((r) => r.status === "fulfilled");
    return successResult && successResult.status === "fulfilled"
      ? successResult.value
      : undefined;
  }

  /**
   * Initialize the router to listen for messages
   */
  initialize(): void {
    onMessage((message, sender) => this.handle(message, sender));
  }
}

// Singleton instance
export const messageRouter = new MessageRouter();

/**
 * Convenience functions for specific message types
 */

export async function notifyAnomalyDetected(anomaly: any): Promise<void> {
  await sendToBackground("ANOMALY_DETECTED", { anomaly });
}

export async function notifySessionSummary(
  session: any,
  score: number
): Promise<void> {
  await sendToBackground("SESSION_SUMMARY", { session, score });
}

export async function notifySettingsUpdated(settings: any): Promise<void> {
  await sendToBackground("SETTINGS_UPDATED", { settings });
}

export async function notifyAnalysisComplete(results: any): Promise<void> {
  await sendToBackground("ANALYSIS_COMPLETE", { results });
}

export async function notifyIntentUpdated(intent: any): Promise<void> {
  await sendToBackground("INTENT_UPDATED", { intent });
}

/**
 * Request handlers for sidepanel
 */

export function registerSidePanelHandlers(): void {
  messageRouter.on("ANOMALY_DETECTED", async (data) => {
    // Update UI to show anomaly notification
    console.log("Anomaly detected:", data.anomaly);
  });

  messageRouter.on("SESSION_SUMMARY", async (data) => {
    // Update UI to show session summary
    console.log("Session summary:", data);
  });

  messageRouter.on("INTENT_UPDATED", async (data) => {
    // Update UI to show new intent
    console.log("Intent updated:", data.intent);
  });
}

/**
 * Storage change listener
 */
export function onStorageChange(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" || areaName === "local") {
      callback(changes);
    }
  });
}

/**
 * Port-based communication for long-lived connections
 */

export class MessagePort {
  private port: chrome.runtime.Port | null = null;
  private handlers: Map<string, (data: any) => void> = new Map();

  connect(name: string): void {
    this.port = chrome.runtime.connect({ name });

    this.port.onMessage.addListener((message: any) => {
      if (message.type && this.handlers.has(message.type)) {
        this.handlers.get(message.type)!(message.data);
      }
    });

    this.port.onDisconnect.addListener(() => {
      console.log("Port disconnected");
      this.port = null;
    });
  }

  on(type: string, handler: (data: any) => void): void {
    this.handlers.set(type, handler);
  }

  send(type: string, data?: any): void {
    if (this.port) {
      this.port.postMessage({ type, data });
    } else {
      console.error("Port not connected");
    }
  }

  disconnect(): void {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
  }

  isConnected(): boolean {
    return this.port !== null;
  }
}
