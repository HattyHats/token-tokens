export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Coin {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price?: number;
  change?: number;
  mcap?: number;
  vol?: number;
  ath?: number;
}

export interface Alert {
  id: number;
  coinId: string;
  symbol: string;
  name: string;
  dir: "above" | "below";
  price: number;
  active: boolean;
  triggered: boolean;
}

export interface Drawing {
  type: "line" | "hline" | "ray" | "rect" | "fib" | "note";
  color: string;
  p1: { gi: number; price: number };
  p2?: { gi: number; price: number };
  text?: string;
}

export type Timeframe = "1" | "7" | "30" | "90" | "365" | "1825" | "max";
export type ChartType = "candle" | "line";
export type Indicator = "ma" | "ema" | "bb" | "vwap" | "rsi" | "macd";
