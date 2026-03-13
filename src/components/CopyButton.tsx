"use client";

import { useState } from "react";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`px-2 py-1 text-xs rounded transition-colors flex-shrink-0 ${
        copied ? "bg-green-700 text-green-200" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
      } ${className ?? ""}`}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
