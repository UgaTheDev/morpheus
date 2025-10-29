import type {
  BrowsingPattern,
  MemoryEntry,
  BehaviorAnomaly,
  SessionData,
} from "./types";

class Database {
  private db: IDBDatabase | null = null;
  private readonly dbName = "morpheus-db";
  private readonly version = 1;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Patterns store
        if (!db.objectStoreNames.contains("patterns")) {
          const patternsStore = db.createObjectStore("patterns", {
            keyPath: "id",
          });
          patternsStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
          patternsStore.createIndex("domain", "domain", { unique: false });
          patternsStore.createIndex("category", "category", { unique: false });
          patternsStore.createIndex("sessionId", "sessionId", {
            unique: false,
          });
        }

        // Memories store
        if (!db.objectStoreNames.contains("memories")) {
          const memoriesStore = db.createObjectStore("memories", {
            keyPath: "id",
          });
          memoriesStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
        }

        // Anomalies store
        if (!db.objectStoreNames.contains("anomalies")) {
          const anomaliesStore = db.createObjectStore("anomalies", {
            keyPath: "id",
          });
          anomaliesStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
          anomaliesStore.createIndex("severity", "severity", { unique: false });
        }

        // Sessions store
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionsStore = db.createObjectStore("sessions", {
            keyPath: "id",
          });
          sessionsStore.createIndex("startTime", "startTime", {
            unique: false,
          });
        }

        // Interventions store
        if (!db.objectStoreNames.contains("interventions")) {
          const interventionsStore = db.createObjectStore("interventions", {
            keyPath: "id",
          });
          interventionsStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
          interventionsStore.createIndex("priority", "priority", {
            unique: false,
          });
        }

        // Tasks store
        if (!db.objectStoreNames.contains("tasks")) {
          const tasksStore = db.createObjectStore("tasks", { keyPath: "id" });
          tasksStore.createIndex("status", "status", { unique: false });
          tasksStore.createIndex("priority", "priority", { unique: false });
        }

        // Daily stats store
        if (!db.objectStoreNames.contains("dailyStats")) {
          db.createObjectStore("dailyStats", { keyPath: "date" });
        }
      };
    });
  }

  private async performTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T> | Promise<T> | T
  ): Promise<T> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      const result = operation(store);

      if (result instanceof IDBRequest) {
        result.onsuccess = () => resolve(result.result);
        result.onerror = () => reject(result.error);
      } else if (result instanceof Promise) {
        result.then(resolve).catch(reject);
      } else {
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
      }
    });
  }

  // Pattern operations
  async addPattern(pattern: BrowsingPattern): Promise<void> {
    await this.performTransaction("patterns", "readwrite", (store) => {
      return store.add(pattern);
    });
  }

  async getPattern(id: string): Promise<BrowsingPattern | null> {
    const result = await this.performTransaction<any>(
      "patterns",
      "readonly",
      (store) => {
        return store.get(id);
      }
    );
    return result || null;
  }

  async updatePattern(
    id: string,
    updates: Partial<BrowsingPattern>
  ): Promise<void> {
    await this.performTransaction("patterns", "readwrite", async (store) => {
      const request = store.get(id);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const pattern = request.result;
          if (pattern) {
            Object.assign(pattern, updates);
            const updateRequest = store.put(pattern);
            updateRequest.onsuccess = () => resolve(undefined);
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            resolve(undefined);
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Intervention operations
  async addIntervention(intervention: any): Promise<void> {
    await this.performTransaction("interventions", "readwrite", (store) => {
      return store.add(intervention);
    });
  }

  async getInterventions(): Promise<any[]> {
    return await this.performTransaction<any[]>(
      "interventions",
      "readonly",
      (store) => {
        return store.getAll();
      }
    );
  }

  async updateIntervention(id: string, updates: any): Promise<void> {
    await this.performTransaction(
      "interventions",
      "readwrite",
      async (store) => {
        const request = store.get(id);
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const intervention = request.result;
            if (intervention) {
              Object.assign(intervention, updates);
              const updateRequest = store.put(intervention);
              updateRequest.onsuccess = () => resolve(undefined);
              updateRequest.onerror = () => reject(updateRequest.error);
            } else {
              resolve(undefined);
            }
          };
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  // Task operations
  async getActiveTask(): Promise<any | null> {
    const tasks = await this.performTransaction<any[]>(
      "tasks",
      "readonly",
      (store) => {
        return store.getAll();
      }
    );
    return tasks.find((t: any) => t.status === "active") || null;
  }

  async addTask(task: any): Promise<void> {
    await this.performTransaction("tasks", "readwrite", (store) => {
      return store.add(task);
    });
  }

  // Daily stats operations
  async getTodayStats(): Promise<any | null> {
    const today = new Date().toISOString().split("T")[0];
    const result = await this.performTransaction<any>(
      "dailyStats",
      "readonly",
      (store) => {
        return store.get(today);
      }
    );
    return result || null;
  }

  async updateTodayStats(stats: any): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    await this.performTransaction("dailyStats", "readwrite", (store) => {
      return store.put({ ...stats, date: today });
    });
  }

  async getAllPatterns(): Promise<BrowsingPattern[]> {
    return await this.performTransaction<BrowsingPattern[]>(
      "patterns",
      "readonly",
      (store) => {
        return store.getAll();
      }
    );
  }

  async getPatternsSince(timestamp: number): Promise<BrowsingPattern[]> {
    return await this.performTransaction<BrowsingPattern[]>(
      "patterns",
      "readonly",
      (store) => {
        return store.getAll();
      }
    ).then((patterns) => patterns.filter((p) => p.timestamp > timestamp));
  }

  async getPatternsInRange(
    start: number,
    end: number
  ): Promise<BrowsingPattern[]> {
    return await this.performTransaction<BrowsingPattern[]>(
      "patterns",
      "readonly",
      (store) => {
        return store.getAll();
      }
    ).then((patterns) =>
      patterns.filter((p) => p.timestamp >= start && p.timestamp <= end)
    );
  }

  async getPatternsByDomain(domain: string): Promise<BrowsingPattern[]> {
    return await this.performTransaction<BrowsingPattern[]>(
      "patterns",
      "readonly",
      (store) => {
        return store.getAll();
      }
    ).then((patterns) => patterns.filter((p) => p.domain === domain));
  }

  // Memory operations
  async addMemory(memory: MemoryEntry): Promise<void> {
    await this.performTransaction("memories", "readwrite", (store) => {
      return store.add(memory);
    });
  }

  async getAllMemories(): Promise<MemoryEntry[]> {
    return await this.performTransaction<MemoryEntry[]>(
      "memories",
      "readonly",
      (store) => {
        return store.getAll();
      }
    );
  }

  async deleteMemoriesBefore(timestamp: number): Promise<number> {
    const memories = await this.getAllMemories();
    const toDelete = memories.filter((m) => m.timestamp < timestamp);

    await this.performTransaction("memories", "readwrite", async (store) => {
      for (const memory of toDelete) {
        store.delete(memory.id);
      }
      return Promise.resolve(undefined);
    });

    return toDelete.length;
  }

  // Anomaly operations
  async addAnomaly(anomaly: BehaviorAnomaly): Promise<void> {
    await this.performTransaction("anomalies", "readwrite", (store) => {
      return store.add(anomaly);
    });
  }

  async getAnomaliesSince(timestamp: number): Promise<BehaviorAnomaly[]> {
    return await this.performTransaction<BehaviorAnomaly[]>(
      "anomalies",
      "readonly",
      (store) => {
        return store.getAll();
      }
    ).then((anomalies) => anomalies.filter((a) => a.timestamp > timestamp));
  }

  async getAllAnomalies(): Promise<BehaviorAnomaly[]> {
    return await this.performTransaction<BehaviorAnomaly[]>(
      "anomalies",
      "readonly",
      (store) => {
        return store.getAll();
      }
    );
  }

  // Session operations
  async addSession(session: SessionData): Promise<void> {
    await this.performTransaction("sessions", "readwrite", (store) => {
      return store.add(session);
    });
  }

  async getAllSessions(): Promise<SessionData[]> {
    return await this.performTransaction<SessionData[]>(
      "sessions",
      "readonly",
      (store) => {
        return store.getAll();
      }
    );
  }

  // Clear operations
  async clearAll(): Promise<void> {
    const stores = [
      "patterns",
      "memories",
      "anomalies",
      "sessions",
      "interventions",
      "tasks",
      "dailyStats",
    ];

    for (const storeName of stores) {
      await this.performTransaction(storeName, "readwrite", (store) => {
        return store.clear();
      });
    }
  }

  async clearOldData(days: number): Promise<void> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Clear old patterns
    const patterns = await this.getAllPatterns();
    await this.performTransaction("patterns", "readwrite", async (store) => {
      for (const pattern of patterns) {
        if (pattern.timestamp < cutoff) {
          store.delete(pattern.id);
        }
      }
      return Promise.resolve(undefined);
    });

    // Clear old anomalies
    const anomalies = await this.getAllAnomalies();
    await this.performTransaction("anomalies", "readwrite", async (store) => {
      for (const anomaly of anomalies) {
        if (anomaly.timestamp < cutoff) {
          store.delete(anomaly.id);
        }
      }
      return Promise.resolve(undefined);
    });
  }
}

export const db = new Database();
