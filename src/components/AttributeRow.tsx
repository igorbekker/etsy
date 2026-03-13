"use client";

import React from "react";
import type { AttributeGap } from "@/types";

interface AttributeRowProps {
  gap: AttributeGap;
  status: "applying" | "done" | "error" | undefined;
  error: string | undefined;
  onApply: (gap: AttributeGap, valueId: number, valueName: string) => void;
}

export function AttributeRow({ gap, status, error, onApply }: AttributeRowProps) {
  const defaultValue = gap.suggested_values[0] ?? gap.available_values[0];
  const [selected, setSelected] = React.useState<{ value_id: number; name: string } | null>(defaultValue ?? null);

  return (
    <div className="bg-gray-750 border border-gray-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">{gap.name}</p>
        {gap.suggested_values.length > 0 && (
          <span className="text-xs text-indigo-400">Suggestion available</span>
        )}
      </div>

      {gap.available_values.length > 0 ? (
        <select
          value={selected?.value_id ?? ""}
          onChange={(e) => {
            const v = gap.available_values.find((av) => av.value_id === Number(e.target.value));
            setSelected(v ?? null);
          }}
          className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
        >
          <option value="">Select a value…</option>
          {gap.available_values.map((v) => (
            <option key={v.value_id} value={v.value_id}>{v.name}</option>
          ))}
        </select>
      ) : (
        <p className="text-xs text-gray-500">No predefined values — set manually in Etsy</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {gap.available_values.length > 0 && (
        <button
          disabled={!selected || status === "applying" || status === "done"}
          onClick={() => selected && onApply(gap, selected.value_id, selected.name)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            status === "done" ? "bg-green-700 text-green-200" :
            status === "error" ? "bg-red-700 text-red-200 hover:bg-red-600" :
            status === "applying" ? "bg-gray-600 text-gray-400" :
            !selected ? "bg-gray-700 text-gray-500 cursor-not-allowed" :
            "bg-orange-700 hover:bg-orange-600 text-white"
          }`}
        >
          {status === "done" ? "Applied!" : status === "applying" ? "Applying…" : status === "error" ? "Retry" : "Apply"}
        </button>
      )}
    </div>
  );
}
