"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTimeSafe } from "@/lib/format/date";

const PIPELINE_STEPS = [
  { id: "Input", label: "Input" },
  { id: "Intent_Detection", label: "Intent Detection" },
  { id: "Memory_Retrieval", label: "Memory Retrieval" },
  { id: "Vector_Search", label: "Vector Search" },
  { id: "Web_Search_Decision", label: "Web Search Decision" },
  { id: "Web_Source_Fetch", label: "Web Source Fetch" },
  { id: "Source_Summarization", label: "Source Summarization" },
  { id: "Learning_Pipeline", label: "Learning Pipeline" },
  { id: "Feedback_Signal", label: "Feedback Signal" },
  { id: "Prompt_Builder", label: "Prompt Builder" },
  { id: "LLM_Provider", label: "LLM Provider" },
  { id: "Final_Response", label: "Final Response" },
];

interface TraceStep {
  id: string;
  stepName: string;
  status: "RUNNING" | "COMPLETED" | "ERROR";
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  metadata: Record<string, unknown> | null;
}

interface Trace {
  id: string;
  userId: string;
  conversationId: string | null;
  status: "RUNNING" | "COMPLETED" | "ERROR";
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  totalDurationMs: number | null;
  stepsCount: number;
  _count?: { steps: number };
  steps?: TraceStep[];
}

interface Metrics {
  totalTraces: number;
  avgTotalDurationMs: number;
  avgStepTimes: Record<string, number>;
  recentTotalDurationMs: number[];
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}


function formatDate(iso: string | null | undefined): string {
  return formatDateTimeSafe(iso);
}

function stepStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED": return "#22c55e";
    case "ERROR": return "#ef4444";
    case "RUNNING": return "#f59e0b";
    default: return "#6b7280";
  }
}


function stepNameToLabel(id: string): string {
  const found = PIPELINE_STEPS.find((s) => s.id === id);
  return found?.label || id.replace(/_/g, " ");
}

export function NeuralActivityClient() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [activeTab, setActiveTab] = useState<"pipeline" | "traces">("pipeline");

  const fetchData = useCallback(async () => {
    try {
      const [tracesRes, metricsRes] = await Promise.all([
        fetch("/api/activity-traces?limit=20"),
        fetch("/api/activity-traces/metrics"),
      ]);
      if (tracesRes.ok) {
        const data = await tracesRes.json();
        setTraces(data.traces || []);
        setTotal(data.total || 0);
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics || null);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchTraceDetail = useCallback(async (traceId: string) => {
    try {
      const res = await fetch(`/api/activity-traces/${traceId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTrace(data.trace || null);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => { fetchData(); }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Traces" value={metrics.totalTraces.toString()} />
          <MetricCard
            title="Avg Response Time"
            value={formatDuration(metrics.avgTotalDurationMs)}
          />
          <MetricCard
            title="Traces Today"
            value={metrics.recentTotalDurationMs.length.toString()}
          />
          <MetricCard
            title="Fastest Step"
            value={(() => {
              const entries = Object.entries(metrics.avgStepTimes);
              if (entries.length === 0) return "-";
              const fastest = entries.reduce((a, b) => (a[1] < b[1] ? a : b));
              return `${fastest[0].replace(/_/g, " ")} (${formatDuration(fastest[1])})`;
            })()}
          />
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-1 border-b pb-px" style={{ borderColor: "var(--sidebar-border)" }}>
        <TabButton active={activeTab === "pipeline"} onClick={() => setActiveTab("pipeline")}>
          Pipeline Flow
        </TabButton>
        <TabButton active={activeTab === "traces"} onClick={() => setActiveTab("traces")}>
          Recent Traces ({total})
        </TabButton>
      </div>

      {activeTab === "pipeline" && (
        <>
          {/* Pipeline Visualization */}
          <div
            className="rounded-lg border p-5"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--surface-text)" }}>
              Processing Pipeline
            </h3>
            <div className="relative">
              <PipelineVisualizer traces={traces} />
            </div>
          </div>

          {/* Per-Step Stats */}
          {metrics && Object.keys(metrics.avgStepTimes).length > 0 && (
            <div
              className="rounded-lg border p-5"
              style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--surface-text)" }}>
                Average Step Duration
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {PIPELINE_STEPS.map((step) => {
                  const avg = metrics.avgStepTimes[step.id];
                  return (
                    <div
                      key={step.id}
                      className="rounded px-3 py-2 text-xs"
                      style={{ backgroundColor: "var(--sidebar-hover-bg)" }}
                    >
                      <span style={{ color: "var(--sidebar-text-muted)" }}>{step.label}</span>
                      <div className="font-medium mt-0.5" style={{ color: "var(--surface-text)" }}>
                        {avg != null ? formatDuration(avg) : "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "traces" && (
        <div
          className="rounded-lg border"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          {/* Trace List */}
          <div className="p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surface-text)" }}>
              Trace History
            </h3>
            {traces.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--sidebar-text-muted)" }}>
                No traces yet. Send a message in Chat to see pipeline activity.
              </p>
            ) : (
              <div className="space-y-2">
                {traces.map((trace) => (
                  <TraceRow
                    key={trace.id}
                    trace={trace}
                    isSelected={selectedTrace?.id === trace.id}
                    onClick={() => {
                      if (selectedTrace?.id === trace.id) {
                        setSelectedTrace(null);
                      } else {
                        fetchTraceDetail(trace.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Trace Detail */}
          {selectedTrace && (
            <div
              className="border-t p-5"
              style={{ borderColor: "var(--card-border)" }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--surface-text)" }}>
                Trace Detail — {formatDate(selectedTrace.createdAt)}
              </h3>
              {selectedTrace.steps && selectedTrace.steps.length > 0 ? (
                <div className="space-y-1">
                  {selectedTrace.steps.map((step) => (
                    <StepRow key={step.id} step={step} />
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--sidebar-text-muted)" }}>
                  No step data available.
                </p>
              )}
              <div className="mt-3 flex gap-4 text-xs" style={{ color: "var(--sidebar-text-muted)" }}>
                <span>Status: <span style={{ color: stepStatusColor(selectedTrace.status) }}>{selectedTrace.status}</span></span>
                <span>Total: {formatDuration(selectedTrace.totalDurationMs)}</span>
                <span>Steps: {selectedTrace.steps?.length ?? selectedTrace.stepsCount}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <div className="text-xs" style={{ color: "var(--sidebar-text-muted)" }}>{title}</div>
      <div className="text-xl font-semibold mt-1" style={{ color: "var(--surface-text)" }}>{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm rounded-t-lg transition-colors"
      style={{
        color: active ? "var(--surface-text)" : "var(--sidebar-text-muted)",
        borderBottom: active ? "2px solid var(--surface-text)" : "2px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function PipelineVisualizer({ traces }: { traces: Trace[] }) {
  const latestTrace = traces[0];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:flex-wrap gap-x-6 gap-y-0">
        {PIPELINE_STEPS.map((step, idx) => {
          const latestStep = latestTrace?.steps?.find((s) => s.stepName === step.id);
          const status = latestStep?.status || (idx === 0 ? "RUNNING" : "COMPLETED");
          return (
            <div key={step.id} className="flex-1 min-w-[140px]">
              <div className="flex items-center gap-2 py-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: stepStatusColor(status),
                    boxShadow: status === "RUNNING" ? `0 0 6px ${stepStatusColor(status)}` : "none",
                    animation: status === "RUNNING" ? "pulse 1.5s infinite" : "none",
                  }}
                />
                <span className="text-xs" style={{ color: "var(--surface-text)" }}>
                  {step.label}
                </span>
                {latestStep?.durationMs != null && (
                  <span className="text-[10px] ml-auto" style={{ color: "var(--sidebar-text-muted)" }}>
                    {formatDuration(latestStep.durationMs)}
                  </span>
                )}
              </div>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="ml-[5px] h-3 w-px" style={{ backgroundColor: "var(--sidebar-border)" }} />
              )}
            </div>
          );
        })}
      </div>
      {latestTrace && (
        <p className="text-xs mt-3" style={{ color: "var(--sidebar-text-muted)" }}>
          Latest trace: {formatDate(latestTrace.createdAt)} — {formatDuration(latestTrace.totalDurationMs)} total
        </p>
      )}
    </div>
  );
}

function TraceRow({ trace, isSelected, onClick }: { trace: Trace; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left"
      style={{
        backgroundColor: isSelected ? "var(--sidebar-active-bg)" : "transparent",
        color: isSelected ? "var(--sidebar-active-text)" : "var(--surface-text)",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stepStatusColor(trace.status) }} />
      <span className="flex-1 truncate">{formatDate(trace.createdAt)}</span>
      <span className="text-xs" style={{ color: "var(--sidebar-text-muted)" }}>
        {formatDuration(trace.totalDurationMs)}
      </span>
      <span className="text-xs" style={{ color: "var(--sidebar-text-muted)" }}>
        {trace._count?.steps ?? trace.stepsCount ?? "?"} steps
      </span>
    </button>
  );
}

function StepRow({ step }: { step: TraceStep }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded text-sm"
      style={{ backgroundColor: "var(--sidebar-hover-bg)" }}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stepStatusColor(step.status) }} />
      <div className="flex-1">
        <span style={{ color: "var(--surface-text)" }}>{stepNameToLabel(step.stepName)}</span>
        <span className="ml-2 text-xs" style={{ color: "var(--sidebar-text-muted)" }}>
          {formatDuration(step.durationMs)}
        </span>
      </div>
      {step.metadata && Object.keys(step.metadata).length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(step.metadata).map(([key, val]) => {
            if (key === "error") {
              return (
                <span key={key} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--error-bg)", color: "var(--error-text)" }}>
                  {String(val)}
                </span>
              );
            }
            return (
              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--sidebar-active-bg)", color: "var(--sidebar-text-muted)" }}>
                {key.replace(/([A-Z])/g, " $1").trim()}: {String(val)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
