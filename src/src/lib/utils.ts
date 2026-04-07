import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(p: number | null | undefined): string {
  if (p == null) return "—";
  if (p === 0) return "0.00";
  const a = Math.abs(p);
  if (a < 0.00001) return p.toFixed(8);
  if (a < 0.001) return p.toFixed(6);
  if (a < 0.1) return p.toFixed(5);
  if (a < 1) return p.toFixed(4);
  if (a < 100) return p.toFixed(2);
  if (a < 10000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatLargeNumber(n: number | null | undefined): string {
  if (!n || n <= 0) return "—";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}

export function getCoinColor(s: string): string {
  const cols = ["#f7931a", "#627eea", "#9945ff", "#0033ad", "#c2a633", "#00d4ff", "#ff6b35", "#00ff88", "#e84142", "#26a17b", "#2775ca", "#f0b90b"];
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) % cols.length;
  return cols[h];
}
