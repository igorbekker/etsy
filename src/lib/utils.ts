import type { Listing } from "@/types";

export function formatPrice(price: Listing["price"]) {
  return `$${(price.amount / price.divisor).toFixed(2)}`;
}

export function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function scoreColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

export function scoreBadge(score: number) {
  if (score >= 70) return "text-green-400 bg-green-400/10 border-green-500/30";
  if (score >= 40) return "text-yellow-400 bg-yellow-400/10 border-yellow-500/30";
  return "text-red-400 bg-red-400/10 border-red-500/30";
}

export function scoreBar(ratio: number) {
  if (ratio >= 0.7) return "bg-green-500";
  if (ratio >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}
