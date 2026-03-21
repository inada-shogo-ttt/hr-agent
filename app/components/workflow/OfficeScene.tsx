"use client";

import { useMemo } from "react";
import { AgentStatus } from "@/lib/agents/types";

/* ===== 型 ===== */
export interface OfficeAgent {
  id: string;
  label: string;
  color: string; // hex body color
}

interface Props {
  agents: OfficeAgent[];
  statuses: Record<string, { status: AgentStatus; message?: string }>;
  progress: number;
}

/* ===== レイアウト定数 ===== */
const DESK_ROWS = 2;

function deskPos(index: number, total: number) {
  const cols = Math.ceil(total / DESK_ROWS);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const xStep = 80 / cols;
  return { x: 10 + xStep * col + xStep / 2, y: row === 0 ? 20 : 42 };
}

type IdleKind = "sofa" | "chat" | "coffee" | "stand";
const IDLE_KINDS: IdleKind[] = ["sofa", "sofa", "chat", "chat", "coffee", "stand", "sofa", "chat"];

function idlePos(index: number): { x: number; y: number; kind: IdleKind } {
  const kind = IDLE_KINDS[index % IDLE_KINDS.length];
  const positions: Record<IdleKind, { x: number; y: number }[]> = {
    sofa:   [{ x: 12, y: 76 }, { x: 22, y: 76 }, { x: 17, y: 76 }],
    chat:   [{ x: 40, y: 74 }, { x: 49, y: 74 }, { x: 56, y: 74 }],
    coffee: [{ x: 72, y: 74 }],
    stand:  [{ x: 84, y: 73 }],
  };
  const pool = positions[kind];
  const counts: Record<IdleKind, number> = { sofa: 0, chat: 0, coffee: 0, stand: 0 };
  // Simple round-robin within each kind
  for (let i = 0; i < index; i++) {
    const k = IDLE_KINDS[i % IDLE_KINDS.length];
    if (k === kind) counts[kind]++;
  }
  const p = pool[counts[kind] % pool.length];
  return { ...p, kind };
}

/* ===== CSS ===== */
const STYLES = `
@keyframes office-type {
  0%,100% { transform: translateY(0); }
  30% { transform: translateY(-1.5px); }
  60% { transform: translateY(0.5px); }
}
@keyframes office-idle {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes office-chat {
  0%,100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(-3deg) translateY(-1px); }
  75% { transform: rotate(3deg) translateY(-1px); }
}
@keyframes office-sip {
  0%,70%,100% { transform: translateY(0) rotate(0); }
  80% { transform: translateY(-2px) rotate(-8deg); }
}
@keyframes office-done {
  0%,100% { transform: translateY(0); }
  20% { transform: translateY(-5px); }
  40% { transform: translateY(0); }
  55% { transform: translateY(-3px); }
  70% { transform: translateY(0); }
}
@keyframes office-cursor {
  0%,49% { opacity: 1; }
  50%,100% { opacity: 0; }
}
@keyframes office-steam {
  0% { transform: translateY(0) scale(1); opacity: 0.7; }
  100% { transform: translateY(-8px) scale(1.3); opacity: 0; }
}
@keyframes office-zzz {
  0% { transform: translateY(0) scale(0.8); opacity: 0; }
  30% { opacity: 0.6; }
  100% { transform: translateY(-12px) scale(1); opacity: 0; }
}
@keyframes office-sparkle {
  0%,100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes office-error-shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-2px); }
  40% { transform: translateX(2px); }
  60% { transform: translateX(-1px); }
  80% { transform: translateX(1px); }
}

.ofc-char {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: left 0.9s cubic-bezier(.4,0,.2,1), top 0.9s cubic-bezier(.4,0,.2,1);
  z-index: 2;
  pointer-events: none;
}
.ofc-wrap-type  { animation: office-type 0.35s ease-in-out infinite; }
.ofc-wrap-idle  { animation: office-idle 3s ease-in-out infinite; }
.ofc-wrap-chat  { animation: office-chat 2s ease-in-out infinite; }
.ofc-wrap-sip   { animation: office-sip 4s ease-in-out infinite; }
.ofc-wrap-done  { animation: office-done 1.2s ease-out 1; }
.ofc-wrap-error { animation: office-error-shake 0.5s ease-in-out infinite; }
`;

/* ===== サブコンポーネント ===== */

function Character({ agent, status, pos, idleKind }: {
  agent: OfficeAgent;
  status: AgentStatus | undefined;
  pos: { x: number; y: number };
  idleKind: IdleKind;
}) {
  const isWorking = status === "running";
  const isDone = status === "completed";
  const isError = status === "error";
  const isIdle = !isWorking && !isDone && !isError;

  let wrapClass = "ofc-wrap-idle";
  if (isWorking) wrapClass = "ofc-wrap-type";
  else if (isDone) wrapClass = "ofc-wrap-done";
  else if (isError) wrapClass = "ofc-wrap-error";
  else if (idleKind === "chat") wrapClass = "ofc-wrap-chat";
  else if (idleKind === "coffee") wrapClass = "ofc-wrap-sip";

  // Face expression
  const eyeStyle: React.CSSProperties = {
    position: "absolute", top: 9, left: 7,
    width: 3, height: isIdle && idleKind === "sofa" ? 1.5 : 3.5,
    background: "#444", borderRadius: isIdle && idleKind === "sofa" ? "50% 50% 50% 50% / 80% 80% 20% 20%" : "50%",
    boxShadow: `9px 0 0 #444`,
  };

  const mouthWidth = isDone ? 8 : isError ? 6 : 5;
  const mouthStyle: React.CSSProperties = {
    position: "absolute", bottom: 5, left: "50%",
    transform: "translateX(-50%)",
    width: mouthWidth, height: isDone ? 4 : 2.5,
    borderBottom: isError ? "1.5px solid #C4784A" : "none",
    borderTop: isError ? "none" : "none",
    borderRadius: isError ? "50% 50% 0 0 / 0 0 50% 50%" : "0 0 50% 50%",
    background: "transparent",
  };
  // Smile or frown
  if (!isError) {
    mouthStyle.borderBottom = `1.5px solid #C4784A`;
    mouthStyle.borderRadius = "0 0 50% 50%";
  } else {
    mouthStyle.borderTop = `1.5px solid #C4784A`;
    mouthStyle.borderBottom = "none";
    mouthStyle.borderRadius = "50% 50% 0 0";
  }

  return (
    <div
      className="ofc-char"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
    >
      {/* Indicator above head */}
      <div style={{ position: "relative", height: 14, width: 30, textAlign: "center", fontSize: 10, lineHeight: "14px" }}>
        {isWorking && (
          <span style={{ color: "#3B82F6", fontWeight: 700, fontSize: 9 }}>
            <span style={{ display: "inline-block", animation: "office-cursor 0.8s step-end infinite" }}>|</span>
          </span>
        )}
        {isDone && (
          <span style={{ color: "#22C55E", fontWeight: 700, animation: "office-sparkle 1.5s ease-in-out infinite" }}>&#10003;</span>
        )}
        {isError && (
          <span style={{ color: "#EF4444", fontWeight: 700 }}>!</span>
        )}
        {isIdle && idleKind === "sofa" && (
          <span style={{ color: "#94A3B8", fontSize: 8, animation: "office-zzz 2.5s ease-out infinite" }}>z</span>
        )}
        {isIdle && idleKind === "coffee" && (
          <span style={{ color: "#A3A3A3", fontSize: 7, animation: "office-steam 2s ease-out infinite" }}>~</span>
        )}
        {isIdle && idleKind === "chat" && (
          <span style={{ color: "#94A3B8", fontSize: 8 }}>...</span>
        )}
      </div>

      {/* Character body */}
      <div className={wrapClass}>
        {/* Head */}
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "radial-gradient(circle at 25% 55%, rgba(255,180,160,0.35) 0%, transparent 45%), radial-gradient(circle at 75% 55%, rgba(255,180,160,0.35) 0%, transparent 45%), #FFDCB8",
          position: "relative", zIndex: 1,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}>
          {/* Eyes */}
          <div style={eyeStyle} />
          {/* Mouth */}
          <div style={mouthStyle} />
        </div>

        {/* Body */}
        <div style={{
          width: 22, height: 14,
          background: agent.color,
          borderRadius: "6px 6px 2px 2px",
          marginTop: -3, position: "relative",
          boxShadow: `0 1px 2px rgba(0,0,0,0.1)`,
        }}>
          {/* Arms for typing */}
          {isWorking && (
            <>
              <div style={{
                position: "absolute", bottom: -1, left: -3,
                width: 5, height: 3, background: "#FFDCB8", borderRadius: 2,
              }} />
              <div style={{
                position: "absolute", bottom: -1, right: -3,
                width: 5, height: 3, background: "#FFDCB8", borderRadius: 2,
              }} />
            </>
          )}
          {/* Coffee cup for coffee idle */}
          {isIdle && idleKind === "coffee" && (
            <div style={{
              position: "absolute", top: -2, right: -8,
              width: 6, height: 7, background: "#fff",
              border: "1.5px solid #D4A373", borderRadius: "0 0 2px 2px",
            }} />
          )}
        </div>

        {/* Legs */}
        <div style={{ display: "flex", gap: 3, marginTop: 1 }}>
          <div style={{ width: 6, height: 6, background: "#8B9DAF", borderRadius: "0 0 2px 2px" }} />
          <div style={{ width: 6, height: 6, background: "#8B9DAF", borderRadius: "0 0 2px 2px" }} />
        </div>
      </div>

      {/* Label */}
      <div style={{
        marginTop: 3, fontSize: 8, fontWeight: 600,
        color: isWorking ? "#3B82F6" : isDone ? "#16A34A" : isError ? "#DC2626" : "#888",
        whiteSpace: "nowrap", textAlign: "center",
        maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis",
        background: "rgba(255,255,255,0.7)", borderRadius: 3,
        padding: "0 3px", lineHeight: "14px",
      }}>
        {agent.label}
      </div>
    </div>
  );
}

function Desk({ x, y, isActive }: { x: number; y: number; isActive: boolean }) {
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y - 8}%`,
      transform: "translate(-50%, 0)", zIndex: 1,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Monitor */}
      <div style={{
        width: 24, height: 18, background: isActive ? "#1E293B" : "#334155",
        borderRadius: 2, border: "1.5px solid #475569",
        position: "relative", overflow: "hidden",
      }}>
        {isActive && (
          <div style={{
            position: "absolute", inset: 2,
            background: "#0F172A",
            borderRadius: 1,
          }}>
            {/* Screen content lines */}
            <div style={{ padding: 2 }}>
              <div style={{ width: "80%", height: 1.5, background: "#38BDF8", borderRadius: 1, marginBottom: 2 }} />
              <div style={{ width: "60%", height: 1.5, background: "#34D399", borderRadius: 1, marginBottom: 2 }} />
              <div style={{ width: "70%", height: 1.5, background: "#38BDF8", borderRadius: 1 }} />
            </div>
          </div>
        )}
      </div>
      {/* Monitor stand */}
      <div style={{ width: 4, height: 3, background: "#64748B" }} />
      {/* Table */}
      <div style={{
        width: 52, height: 6, background: "#D4A574",
        borderRadius: 2, boxShadow: "0 2px 0 #B8895C",
      }} />
    </div>
  );
}

function Sofa() {
  return (
    <div style={{
      position: "absolute", left: "5%", top: "78%", zIndex: 0,
    }}>
      {/* Back rest */}
      <div style={{
        width: 76, height: 10,
        background: "#E8B4B8", borderRadius: "8px 8px 0 0",
      }} />
      {/* Seat */}
      <div style={{
        width: 80, height: 10,
        background: "#F0C4C8", borderRadius: "0 0 6px 6px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
      }} />
      {/* Legs */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 6px" }}>
        <div style={{ width: 4, height: 4, background: "#A87B7E", borderRadius: "0 0 2px 2px" }} />
        <div style={{ width: 4, height: 4, background: "#A87B7E", borderRadius: "0 0 2px 2px" }} />
      </div>
    </div>
  );
}

function CoffeeMachine() {
  return (
    <div style={{
      position: "absolute", left: "68%", top: "76%", zIndex: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Machine body */}
      <div style={{
        width: 18, height: 22, background: "#78716C",
        borderRadius: "3px 3px 2px 2px", position: "relative",
      }}>
        {/* Button */}
        <div style={{
          position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)",
          width: 4, height: 4, background: "#EF4444", borderRadius: "50%",
        }} />
        {/* Dispenser */}
        <div style={{
          position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
          width: 10, height: 4, background: "#44403C", borderRadius: 1,
        }} />
      </div>
      {/* Table */}
      <div style={{
        width: 26, height: 4, background: "#D4A574",
        borderRadius: 1, boxShadow: "0 1px 0 #B8895C",
      }} />
    </div>
  );
}

function Plant() {
  return (
    <div style={{
      position: "absolute", right: "5%", top: "70%", zIndex: 0,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Leaves */}
      <div style={{
        width: 20, height: 16,
        background: "radial-gradient(ellipse at 50% 80%, #4ADE80 0%, #22C55E 60%, transparent 70%)",
        borderRadius: "50% 50% 30% 30%",
      }} />
      {/* Pot */}
      <div style={{
        width: 14, height: 10,
        background: "#D4845A", borderRadius: "2px 2px 4px 4px",
        marginTop: -2,
      }} />
    </div>
  );
}

function WindowEl({ x }: { x: string }) {
  return (
    <div style={{
      position: "absolute", left: x, top: "4%",
      width: 44, height: 36,
      background: "linear-gradient(180deg, #E0F2FE 0%, #BAE6FD 100%)",
      border: "2px solid #D6D3D1", borderRadius: 3,
    }}>
      {/* Cross bar */}
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#D6D3D1" }} />
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "#D6D3D1" }} />
    </div>
  );
}

/* ===== メインコンポーネント ===== */

export function OfficeScene({ agents, statuses, progress }: Props) {
  const agentCount = agents.length;

  const positions = useMemo(() => {
    return agents.map((agent, i) => {
      const status = statuses[agent.id]?.status;
      const isAtDesk = status === "running" || status === "completed" || status === "error";
      const desk = deskPos(i, agentCount);
      const idle = idlePos(i);
      return {
        agent,
        pos: isAtDesk ? { x: desk.x, y: desk.y + 12 } : { x: idle.x, y: idle.y },
        deskPos: desk,
        idleKind: idle.kind,
        status,
        isAtDesk,
      };
    });
  }, [agents, agentCount, statuses]);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: 12, border: "1px solid #E7E5E4", userSelect: "none" }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ===== 背景: 壁 ===== */}
      <div style={{
        position: "absolute", inset: 0, bottom: "30%",
        background: "linear-gradient(180deg, #FDF8F0 0%, #F5EDE3 100%)",
      }} />

      {/* ===== 背景: 床 ===== */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "32%",
        background: "linear-gradient(180deg, #D4A574 0%, #C49464 20%, #B8895C 100%)",
      }}>
        {/* 床の木目ライン */}
        {[18, 40, 62, 84].map((x) => (
          <div key={x} style={{
            position: "absolute", left: `${x}%`, top: 0, bottom: 0,
            width: 1, background: "rgba(0,0,0,0.05)",
          }} />
        ))}
      </div>

      {/* 壁と床の境界線 */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "68%",
        height: 3, background: "#C9B89A",
      }} />

      {/* ===== 窓 ===== */}
      <WindowEl x="8%" />
      <WindowEl x="78%" />

      {/* ===== 時計（進捗表示） ===== */}
      <div style={{
        position: "absolute", left: "50%", top: "3%",
        transform: "translateX(-50%)",
        width: 32, height: 32, borderRadius: "50%",
        background: "#FFF", border: "2px solid #D6D3D1",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 700, color: "#78716C",
      }}>
        {progress}%
      </div>

      {/* ===== 家具: ソファ ===== */}
      <Sofa />

      {/* ===== 家具: コーヒーマシン ===== */}
      <CoffeeMachine />

      {/* ===== 家具: 植物 ===== */}
      <Plant />

      {/* ===== デスク ===== */}
      {positions.map(({ agent, deskPos: dp, isAtDesk }) => (
        <Desk key={`desk-${agent.id}`} x={dp.x} y={dp.y} isActive={isAtDesk} />
      ))}

      {/* ===== キャラクター ===== */}
      {positions.map(({ agent, pos, idleKind, status }) => (
        <Character
          key={agent.id}
          agent={agent}
          status={status}
          pos={pos}
          idleKind={idleKind}
        />
      ))}

      {/* ===== カーペット（ソファ前） ===== */}
      <div style={{
        position: "absolute", left: "3%", top: "82%",
        width: 90, height: 10,
        background: "rgba(232,180,184,0.2)",
        borderRadius: "50%",
      }} />
    </div>
  );
}
