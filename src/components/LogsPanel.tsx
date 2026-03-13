"use client";

import { useState, useEffect } from "react";
import type { LogEntry } from "@/types";

export function LogsPanel() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterListing, setFilterListing] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [revertStatus, setRevertStatus] = useState<Record<string, "reverting" | "done" | "error">>({});
  const [revertErrors, setRevertErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function revertEntry(entry: LogEntry) {
    setRevertStatus((prev) => ({ ...prev, [entry.id]: "reverting" }));
    setRevertErrors((prev) => { const next = { ...prev }; delete next[entry.id]; return next; });
    try {
      const res = await fetch(`/api/etsy/listings/${entry.listing_id}/images/${entry.image_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt_text: entry.old_value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error === "not_connected"
          ? "Not connected to Etsy — re-authorize at /api/etsy/connect"
          : (data.error || `Server error (${res.status})`);
        throw new Error(msg);
      }
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: entry.listing_id,
          listing_title: entry.listing_title,
          field: entry.field,
          image_index: entry.image_index,
          image_id: entry.image_id,
          old_value: entry.new_value,
          new_value: entry.old_value,
        }),
      });
      setRevertStatus((prev) => ({ ...prev, [entry.id]: "done" }));
      const updated = await fetch("/api/logs").then((r) => r.json());
      setEntries(updated.entries ?? []);
    } catch (err) {
      setRevertStatus((prev) => ({ ...prev, [entry.id]: "error" }));
      setRevertErrors((prev) => ({ ...prev, [entry.id]: err instanceof Error ? err.message : "Unknown error" }));
    }
  }

  function fieldLabel(entry: LogEntry) {
    return `Image ${entry.image_index + 1} Alt Text`;
  }

  const listingIds = [...new Set(entries.map((e) => e.listing_id))];
  const filtered = filterListing === "all" ? entries : entries.filter((e) => e.listing_id === Number(filterListing));

  const grouped: { listing_id: number; listing_title: string; entries: LogEntry[] }[] = [];
  const seen = new Set<number>();
  for (const entry of filtered) {
    if (!seen.has(entry.listing_id)) {
      seen.add(entry.listing_id);
      grouped.push({
        listing_id: entry.listing_id,
        listing_title: entry.listing_title,
        entries: filtered.filter((e) => e.listing_id === entry.listing_id),
      });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Change Logs</h2>
        {entries.length > 0 && (
          <select
            value={filterListing}
            onChange={(e) => setFilterListing(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
          >
            <option value="all">All listings</option>
            {listingIds.map((id) => {
              const title = entries.find((e) => e.listing_id === id)?.listing_title ?? String(id);
              return <option key={id} value={id}>{title.slice(0, 50)}{title.length > 50 ? "…" : ""}</option>;
            })}
          </select>
        )}
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading...</p>}

      {!loading && entries.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm">No changes logged yet.</p>
          <p className="text-xs mt-1 text-gray-600">Changes pushed live via &ldquo;Push Live&rdquo; will appear here.</p>
        </div>
      )}

      {!loading && grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map(({ listing_id, listing_title, entries: listingEntries }) => {
            const isCollapsed = collapsed[listing_id] ?? false;
            return (
              <div key={listing_id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCollapsed((prev) => ({ ...prev, [listing_id]: !isCollapsed }))}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-white truncate">{listing_title}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{listingEntries.length} change{listingEntries.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="text-gray-500 text-xs flex-shrink-0 ml-3">{isCollapsed ? "▶" : "▼"}</span>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-gray-800">
                    {listingEntries.map((entry) => {
                      const status = revertStatus[entry.id];
                      return (
                        <div key={entry.id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                              <span className="text-xs text-orange-400/80 bg-orange-900/20 px-2 py-0.5 rounded">{fieldLabel(entry)}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {status === "done" ? (
                                <span className="text-xs text-green-400">Reverted</span>
                              ) : (
                                <button
                                  onClick={() => revertEntry(entry)}
                                  disabled={status === "reverting"}
                                  className={`px-2 py-1 text-xs rounded transition-colors ${
                                    status === "reverting" ? "bg-gray-700 text-gray-400" :
                                    status === "error" ? "bg-red-700 hover:bg-red-600 text-white" :
                                    "bg-gray-700 hover:bg-gray-600 text-gray-300"
                                  }`}
                                >
                                  {status === "reverting" ? "Reverting..." : status === "error" ? "Retry" : "Revert"}
                                </button>
                              )}
                            </div>
                          </div>
                          {revertErrors[entry.id] && (
                            <p className="text-xs text-red-400">{revertErrors[entry.id]}</p>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-800 rounded-lg p-3">
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Before</p>
                              <p className="text-xs text-gray-300 break-words">{entry.old_value || "(empty)"}</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-3">
                              <p className="text-xs text-green-500 uppercase tracking-wider mb-1">After</p>
                              <p className="text-xs text-white break-words">{entry.new_value || "(empty)"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
