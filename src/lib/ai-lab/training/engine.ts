import { Network, type NetworkConfig, validateArchitecture } from "../neural/network";
import { getDataset } from "../datasets/index";

export type TrainingStatus = "idle" | "running" | "paused" | "completed" | "error";

export interface TrainingProgress {
  epoch: number;
  maxEpochs: number;
  loss: number;
  accuracy?: number;
  status: TrainingStatus;
  elapsedMs: number;
}

export interface TrainingMetrics {
  epochs: number[];
  losses: number[];
  accuracies: number[];
  architecture: NetworkConfig;
  datasetName: string;
  timestamp: string;
}

export class TrainingSession {
  private network: Network;
  private config: NetworkConfig;
  private datasetName: string;
  private maxEpochs: number;
  private learningRate: number;
  private _status: TrainingStatus = "idle";
  private currentEpoch = 0;
  private lossHistory: number[] = [];
  private accuracyHistory: number[] = [];
  private logs: string[] = [];
  private pausedResolve: (() => void) | null = null;
  private pausedPromise: Promise<void> | null = null;
  private stopped = false;
  private startTime = 0;
  private readonly MAX_EPOCHS = 1000;
  private readonly MAX_LEARNING_RATE = 2.0;

  constructor(datasetName: string, architecture: NetworkConfig, maxEpochs: number, learningRate: number) {
    const archError = validateArchitecture(architecture);
    if (archError) throw new Error(archError);

    const dataset = getDataset(datasetName);
    if (!dataset) throw new Error(`Unknown dataset: ${datasetName}`);

    const clampedEpochs = Math.min(Math.max(1, maxEpochs), this.MAX_EPOCHS);
    const clampedLR = Math.min(Math.max(0.001, learningRate), this.MAX_LEARNING_RATE);

    this.datasetName = datasetName;
    this.config = architecture;
    this.network = new Network(architecture);
    this.maxEpochs = clampedEpochs;
    this.learningRate = clampedLR;
  }

  get status(): TrainingStatus { return this._status; }
  get epoch(): number { return this.currentEpoch; }
  get lossHistoryData(): number[] { return [...this.lossHistory]; }
  get accuracyHistoryData(): number[] { return [...this.accuracyHistory]; }
  get logsData(): string[] { return [...this.logs]; }
  get networkState() { return this.network.getState(); }
  get configData() { return this.config; }

  async start(onProgress?: (progress: TrainingProgress) => void | Promise<void>): Promise<void> {
    const dataset = getDataset(this.datasetName);
    if (!dataset) throw new Error(`Unknown dataset: ${this.datasetName}`);

    this._status = "running";
    this.stopped = false;
    this.startTime = Date.now();
    this.addLog("Training started");

    const inputs = dataset.inputs;
    const targets = dataset.targets;

    for (let epoch = 0; epoch < this.maxEpochs; epoch++) {
      if (this.stopped) {
        this.addLog("Training stopped");
        this._status = "completed";
        return;
      }

      while ((this._status as TrainingStatus) === "paused") {
        if (!this.pausedPromise) {
          this.pausedPromise = new Promise((resolve) => {
            this.pausedResolve = resolve;
          });
        }
        await this.pausedPromise;
        this.pausedPromise = null;
        this.pausedResolve = null;
        if (this.stopped) {
          this.addLog("Training stopped");
          this._status = "completed";
          return;
        }
      }

      this.currentEpoch = epoch + 1;

      const result = this.network.train(inputs, targets, this.learningRate);
      this.lossHistory.push(result.loss);
      if (result.accuracy !== undefined) {
        this.accuracyHistory.push(result.accuracy);
      }

      if (epoch % 5 === 0 || epoch === 0 || epoch === this.maxEpochs - 1) {
        const accStr = result.accuracy !== undefined ? `, accuracy=${result.accuracy.toFixed(4)}` : "";
        this.addLog(`Epoch ${this.currentEpoch}/${this.maxEpochs}: loss=${result.loss.toFixed(6)}${accStr}`);
      }

      if (onProgress) {
        await onProgress({
          epoch: this.currentEpoch,
          maxEpochs: this.maxEpochs,
          loss: result.loss,
          accuracy: result.accuracy,
          status: this._status,
          elapsedMs: Date.now() - this.startTime,
        });
      }

      if ((this._status as TrainingStatus) === "paused") {
        this.addLog("Training paused");
      }
    }

    if (!this.stopped) {
      this._status = "completed";
      this.addLog("Training completed");
    }
  }

  pause(): void {
    if (this._status === "running") {
      this._status = "paused";
      this.addLog("Training paused");
    }
  }

  resume(): void {
    if (this._status === "paused") {
      this._status = "running";
      this.addLog("Training resumed");
      if (this.pausedResolve) {
        this.pausedResolve();
      }
    }
  }

  stop(): void {
    this.stopped = true;
    if (this._status === "paused" && this.pausedResolve) {
      this.pausedResolve();
    }
    this.addLog("Training stop requested");
  }

  reset(): void {
    this.stopped = true;
    if (this._status === "paused" && this.pausedResolve) {
      this.pausedResolve();
    }
    this.currentEpoch = 0;
    this.lossHistory = [];
    this.accuracyHistory = [];
    this.logs = [];
    this._status = "idle";
    this.network = new Network(this.config);
    this.addLog("Training reset");
  }

  getMetrics(): TrainingMetrics {
    return {
      epochs: Array.from({ length: this.lossHistory.length }, (_, i) => i + 1),
      losses: [...this.lossHistory],
      accuracies: [...this.accuracyHistory],
      architecture: this.config,
      datasetName: this.datasetName,
      timestamp: new Date().toISOString(),
    };
  }

  private addLog(message: string): void {
    const timestamp = new Date().toISOString().slice(11, 19);
    this.logs.push(`[${timestamp}] ${message}`);
  }
}

const activeSessions = new Map<string, TrainingSession>();

export function getActiveSession(userId: string): TrainingSession | undefined {
  return activeSessions.get(userId);
}

export function setActiveSession(userId: string, session: TrainingSession): void {
  activeSessions.set(userId, session);
}

export function removeActiveSession(userId: string): void {
  activeSessions.delete(userId);
}

export function hasActiveSession(userId: string): boolean {
  return activeSessions.has(userId);
}
