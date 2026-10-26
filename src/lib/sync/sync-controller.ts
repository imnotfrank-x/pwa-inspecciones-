import {
  cloneSyncSnapshot,
  createEmptySyncSnapshot,
  type OfflineInspectionDraft,
  type StoredInspection,
  type SyncOperation,
  type SyncSnapshot
} from "../storage/schema";
import type {
  EnqueueInspectionOptions,
  InspectionSyncQueue,
  RetryOptions,
  SyncSummary,
  SyncTransport
} from "./queue";

export type InspectionVisualSyncState =
  | "pending"
  | "syncing"
  | "retry"
  | "synced"
  | "failed"
  | "conflict";

export const INSPECTION_SYNC_LABELS: Record<InspectionVisualSyncState, string> = {
  pending: "Pendiente de sincronización",
  syncing: "Sincronizando…",
  retry: "Pendiente de reintento",
  synced: "Sincronizada",
  failed: "Error de sincronización",
  conflict: "Conflicto pendiente"
};

export type InspectionSyncItemView = {
  inspection: StoredInspection;
  operation?: SyncOperation;
  visualState: InspectionVisualSyncState;
  label: string;
  lastError?: string;
  nextAttemptAt: string | null;
};

export type SyncControllerState = {
  ready: boolean;
  online: boolean;
  syncing: boolean;
  snapshot: SyncSnapshot;
  items: InspectionSyncItemView[];
  pendingCount: number;
  lastSummary: SyncSummary | null;
  statusMessage: string;
  errorMessage: string;
};

export type ConnectivityEventTarget = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

export type SyncControllerOptions = {
  queue: InspectionSyncQueue;
  transport: SyncTransport;
  retryOptions?: RetryOptions;
  target?: ConnectivityEventTarget;
  isOnline?: () => boolean;
  now?: () => Date;
};

export type SaveInspectionResult = {
  operation: SyncOperation;
  summary: SyncSummary | null;
  state: SyncControllerState;
};

export function resolveInspectionVisualState(
  inspection: StoredInspection,
  operations: SyncOperation[]
): InspectionSyncItemView {
  const operation = operations.find((item) => item.entityId === inspection.id);

  let visualState: InspectionVisualSyncState;
  if (operation) {
    switch (operation.state) {
      case "syncing":
        visualState = "syncing";
        break;
      case "retry":
        visualState = "retry";
        break;
      case "failed":
        visualState = "failed";
        break;
      case "conflict":
        visualState = "conflict";
        break;
      default:
        visualState = "pending";
        break;
    }
  } else if (inspection.syncState === "synced") {
    visualState = "synced";
  } else if (inspection.syncState === "failed") {
    visualState = "failed";
  } else {
    visualState = "pending";
  }

  return {
    inspection,
    operation,
    visualState,
    label: INSPECTION_SYNC_LABELS[visualState],
    lastError: operation?.lastError,
    nextAttemptAt: operation?.nextAttemptAt ?? null
  };
}

export function buildInspectionItemViews(
  snapshot: SyncSnapshot
): InspectionSyncItemView[] {
  return snapshot.inspections.map((inspection) =>
    resolveInspectionVisualState(inspection, snapshot.operations)
  );
}

function summarizeFeedback(
  items: InspectionSyncItemView[],
  summary: SyncSummary | null,
  syncing: boolean,
  previousStatus: string
): { statusMessage: string; errorMessage: string } {
  if (syncing) {
    return {
      statusMessage: "Sincronizando…",
      errorMessage: ""
    };
  }

  const failedItem = items.find((item) => item.visualState === "failed");
  const conflictItem = items.find((item) => item.visualState === "conflict");
  const retryItem = items.find((item) => item.visualState === "retry");

  let errorMessage = "";
  if (conflictItem) {
    errorMessage = "Conflicto pendiente: se conservaron la versión local y la remota.";
  } else if (failedItem) {
    errorMessage = failedItem.lastError
      ? `Error de sincronización: ${failedItem.lastError}`
      : "Error de sincronización.";
  } else if (retryItem?.lastError) {
    errorMessage = `Pendiente de reintento: ${retryItem.lastError}`;
  }

  const fallbackStatus =
    previousStatus === "Sincronizando…" ? "" : previousStatus;

  if (!summary) {
    return {
      statusMessage: fallbackStatus,
      errorMessage
    };
  }

  if (summary.conflicts > 0 || conflictItem) {
    return {
      statusMessage: "Conflicto pendiente",
      errorMessage
    };
  }

  if (summary.failed > 0 || failedItem) {
    return {
      statusMessage: "Error de sincronización",
      errorMessage
    };
  }

  if (summary.retried > 0 || retryItem) {
    return {
      statusMessage: "Pendiente de reintento",
      errorMessage
    };
  }

  if (summary.succeeded > 0) {
    return {
      statusMessage: "Sincronizada",
      errorMessage
    };
  }

  if (items.some((item) => item.visualState === "pending")) {
    return {
      statusMessage: "Pendiente de sincronización",
      errorMessage
    };
  }

  if (items.some((item) => item.visualState === "synced")) {
    return {
      statusMessage: "Sincronizada",
      errorMessage
    };
  }

  return {
    statusMessage: fallbackStatus,
    errorMessage
  };
}

export class SyncController {
  readonly queue: InspectionSyncQueue;
  private readonly transport: SyncTransport;
  private readonly retryOptions: RetryOptions;
  private readonly target?: ConnectivityEventTarget;
  private readonly onlineCheck: () => boolean;
  private readonly now: () => Date;
  private readonly subscribers = new Set<(state: SyncControllerState) => void>();
  private state: SyncControllerState;
  private activeSyncPromise: Promise<SyncSummary> | null = null;
  private listening = false;
  private disposed = false;

  constructor(options: SyncControllerOptions) {
    this.queue = options.queue;
    this.transport = options.transport;
    this.retryOptions = options.retryOptions ?? {};
    this.target = options.target;
    this.onlineCheck = options.isOnline ?? (() => true);
    this.now = options.now ?? (() => new Date());

    const empty = createEmptySyncSnapshot();
    this.state = {
      ready: false,
      online: this.onlineCheck(),
      syncing: false,
      snapshot: empty,
      items: [],
      pendingCount: 0,
      lastSummary: null,
      statusMessage: "",
      errorMessage: ""
    };
  }

  private readonly handleOnline = (): void => {
    if (this.disposed) return;
    this.state = {
      ...this.state,
      online: true
    };
    this.notify();
    void this.syncPending();
  };

  private readonly handleOffline = (): void => {
    if (this.disposed) return;
    this.state = {
      ...this.state,
      online: false
    };
    this.notify();
  };

  isOnline(): boolean {
    const current = this.onlineCheck();
    this.state = {
      ...this.state,
      online: current
    };
    return current;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  getState(): SyncControllerState {
    const snapshot = cloneSyncSnapshot(this.state.snapshot);
    return {
      ...this.state,
      snapshot,
      items: buildInspectionItemViews(snapshot),
      lastSummary: this.state.lastSummary ? { ...this.state.lastSummary } : null
    };
  }

  subscribe(listener: (state: SyncControllerState) => void): () => void {
    if (this.disposed) {
      return () => undefined;
    }
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notify(): void {
    if (this.disposed) return;
    const current = this.getState();
    for (const listener of Array.from(this.subscribers)) {
      if (this.disposed) break;
      listener(current);
    }
  }

  private applySnapshot(
    snapshot: SyncSnapshot,
    options: {
      syncing?: boolean;
      summary?: SyncSummary | null;
      statusMessage?: string;
      errorMessage?: string;
    } = {}
  ): void {
    const cloned = cloneSyncSnapshot(snapshot);
    const items = buildInspectionItemViews(cloned);
    const syncing = options.syncing ?? this.state.syncing;
    const summary =
      options.summary !== undefined ? options.summary : this.state.lastSummary;
    const feedback = summarizeFeedback(
      items,
      options.summary ?? null,
      syncing,
      options.statusMessage ?? this.state.statusMessage
    );

    this.state = {
      ready: true,
      online: this.state.online,
      syncing,
      snapshot: cloned,
      items,
      pendingCount: cloned.operations.length,
      lastSummary: summary ? { ...summary } : null,
      statusMessage: options.statusMessage ?? feedback.statusMessage,
      errorMessage: options.errorMessage ?? feedback.errorMessage
    };
    this.notify();
  }

  async start(): Promise<SyncControllerState> {
    const snapshot = await this.queue.getSnapshot();
    this.state = {
      ...this.state,
      online: this.onlineCheck()
    };

    if (!this.disposed && !this.listening && this.target) {
      this.target.addEventListener("online", this.handleOnline);
      this.target.addEventListener("offline", this.handleOffline);
      this.listening = true;
    }

    this.applySnapshot(snapshot, { syncing: false });

    const hasSendableWork = snapshot.operations.some(
      (op) => op.state === "pending" || op.state === "retry" || op.state === "syncing"
    );
    if (!this.disposed && this.state.online && hasSendableWork) {
      await this.syncPending();
    }

    return this.getState();
  }

  async refresh(): Promise<SyncControllerState> {
    const snapshot = await this.queue.getSnapshot();
    this.applySnapshot(snapshot);
    return this.getState();
  }

  async enqueueDraft(
    draft: OfflineInspectionDraft,
    options: EnqueueInspectionOptions
  ): Promise<SyncOperation> {
    const operation = await this.queue.enqueueInspection(draft, options);
    const snapshot = await this.queue.getSnapshot();
    this.state = {
      ...this.state,
      online: this.onlineCheck()
    };
    this.applySnapshot(snapshot, {
      statusMessage: "Inspección guardada en este dispositivo. Pendiente de sincronización.",
      errorMessage: ""
    });
    return operation;
  }

  async saveInspection(
    draft: OfflineInspectionDraft,
    options: EnqueueInspectionOptions
  ): Promise<SaveInspectionResult> {
    const operation = await this.enqueueDraft(draft, options);
    let summary: SyncSummary | null = null;
    if (this.isOnline()) {
      summary = await this.syncPending();
    }
    return {
      operation,
      summary,
      state: this.getState()
    };
  }

  syncPending(): Promise<SyncSummary> {
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    const execution = this.runSyncLoop();
    this.activeSyncPromise = execution.finally(() => {
      this.activeSyncPromise = null;
    });
    return this.activeSyncPromise;
  }

  private async runSyncLoop(): Promise<SyncSummary> {
    const combined: SyncSummary = {
      processed: 0,
      succeeded: 0,
      retried: 0,
      failed: 0,
      conflicts: 0,
      skipped: 0
    };
    const seenOperationIds = new Set<string>();

    while (true) {
      const preSyncSnapshot = await this.queue.getSnapshot();
      this.applySnapshot(preSyncSnapshot, {
        syncing: true,
        statusMessage: "Sincronizando…"
      });

      const batchSummary = await this.queue.syncPending(async (operation) => {
        seenOperationIds.add(operation.id);
        const syncingSnapshot = await this.queue.getSnapshot();
        this.applySnapshot(syncingSnapshot, {
          syncing: true,
          statusMessage: "Sincronizando…"
        });
        return this.transport(operation);
      }, this.retryOptions);

      combined.processed += batchSummary.processed;
      combined.succeeded += batchSummary.succeeded;
      combined.retried += batchSummary.retried;
      combined.failed += batchSummary.failed;
      combined.conflicts += batchSummary.conflicts;
      combined.skipped += batchSummary.skipped;

      const postSyncSnapshot = await this.queue.getSnapshot();
      const nowMs = this.now().getTime();
      const hasNewPendingOperation = postSyncSnapshot.operations.some(
        (op) =>
          op.state === "pending" &&
          !seenOperationIds.has(op.id) &&
          (op.nextAttemptAt === null || Date.parse(op.nextAttemptAt) <= nowMs)
      );

      if (!hasNewPendingOperation || !this.state.online) {
        this.applySnapshot(postSyncSnapshot, {
          syncing: false,
          summary: combined
        });
        break;
      }
    }

    return combined;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.listening && this.target) {
      this.target.removeEventListener("online", this.handleOnline);
      this.target.removeEventListener("offline", this.handleOffline);
      this.listening = false;
    }
    this.subscribers.clear();
  }
}

export function createSyncController(
  options: SyncControllerOptions
): SyncController {
  return new SyncController(options);
}
