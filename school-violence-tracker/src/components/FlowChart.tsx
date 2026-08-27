"use client";

import { FLOW_STEPS } from "@/lib/constants";
import type { Stage } from "@/lib/db";

export default function FlowChart({ currentStage }: { currentStage: Stage }) {
  const currentIndex = FLOW_STEPS.findIndex((s) => s.stage === currentStage);

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex min-w-max gap-2 py-2">
        {FLOW_STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <li key={step.stage} className="flex items-center gap-2">
              <div
                className={[
                  "flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-center text-xs w-28",
                  isCurrent
                    ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold"
                    : isDone
                    ? "border-slate-300 bg-slate-100 text-slate-500"
                    : "border-slate-200 bg-white text-slate-400",
                ].join(" ")}
                title={step.description}
              >
                <span>{step.label}</span>
              </div>
              {idx < FLOW_STEPS.length - 1 && <span className="text-slate-300">→</span>}
            </li>
          );
        })}
      </ol>
      {currentIndex >= 0 && (
        <p className="mt-2 text-sm text-slate-600">{FLOW_STEPS[currentIndex].description}</p>
      )}
    </div>
  );
}
