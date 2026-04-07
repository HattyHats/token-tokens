import React, { useEffect, useRef, useState } from 'react';
import { Candle, Drawing, Indicator, ChartType } from '../types';
import { formatPrice, formatLargeNumber } from '../lib/utils';

interface ChartProps {
  candles: Candle[];
  drawings: Drawing[];
  indicators: Set<Indicator>;
  chartType: ChartType;
  zoom: { s: number; r: number };
  onZoomChange: (zoom: { s: number; r: number }) => void;
  drawTool: string | null;
  drawColor: string;
  onDrawingComplete: (drawing: Drawing) => void;
}

export const Chart: React.FC<ChartProps> = ({
  candles,
  drawings,
  indicators,
  chartType,
  zoom,
  onZoomChange,
  drawTool,
  drawColor,
  onDrawingComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const priceCanvasRef = useRef<HTMLCanvasElement>(null);
  const volCanvasRef = useRef<HTMLCanvasElement>(null);
  const rsiCanvasRef = useRef<HTMLCanvasElement>(null);
  const macdCanvasRef = useRef<HTMLCanvasElement>(null);

  const [hoverData, setHoverData] = useState<Candle | null>(null);
  const [pendingDrawing, setPendingDrawing] = useState<Drawing | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, s: 0 });

  // Helper functions for coordinate conversion
  const getCandleIdx = (mx: number, canvasW: number) => {
    const vis = candles.slice(zoom.s, zoom.s + zoom.r);
    if (!vis.length) return null;
    const cw = (canvasW - 8 - 82) / vis.length;
    const i = Math.max(0, Math.min(vis.length - 1, Math.floor((mx - 4) / cw)));
    return { visIdx: i, globalIdx: zoom.s + i, candle: vis[i] };
  };

  const getPriceAtY = (my: number, canvasH: number) => {
    const vis = candles.slice(zoom.s, zoom.s + zoom.r);
    if (!vis.length) return null;
    const allPx = vis.flatMap(c => [c.h, c.l]);
    const rawMn = Math.min(...allPx), rawMx = Math.max(...allPx);
    const rp = (rawMx - rawMn) * 0.06 || rawMn * 0.02 || 1;
    const minP = rawMn - rp, maxP = rawMx + rp, pRange = maxP - minP;
    const PAD_T = 18, PAD_B = 22, cH = canvasH - PAD_T - PAD_B;
    return maxP - ((my - PAD_T) / cH) * pRange;
  };

  const priceToY = (price: number, canvasH: number) => {
    const vis = candles.slice(zoom.s, zoom.s + zoom.r);
    if (!vis.length) return 0;
    const allPx = vis.flatMap(c => [c.h, c.l]);
    const rawMn = Math.min(...allPx), rawMx = Math.max(...allPx);
    const rp = (rawMx - rawMn) * 0.06 || rawMn * 0.02 || 1;
    const minP = rawMn - rp, maxP = rawMx + rp, pRange = maxP - minP;
    const PAD_T = 18, PAD_B = 22, cH = canvasH - PAD_T - PAD_B;
    return PAD_T + (1 - (price - minP) / pRange) * cH;
  };

  const candleToX = (globalIdx: number, canvasW: number) => {
    const visIdx = globalIdx - zoom.s;
    const cw = (canvasW - 8 - 82) / zoom.r;
    return 4 + (visIdx + 0.5) * cw;
  };

  // Indicator Calculations
  const calculateMA = (data: Candle[], period: number) => {
    return data.map((_, i) => {
      if (i < period - 1) return null;
      const slice = data.slice(i - period + 1, i + 1);
      return slice.reduce((sum, c) => sum + c.c, 0) / period;
    });
  };

  const calculateEMA = (data: Candle[], period: number) => {
    const k = 2 / (period + 1);
    let ema = data[0].c;
    return data.map((c, i) => {
      if (i === 0) return ema;
      ema = c.c * k + ema * (1 - k);
      return ema;
    });
  };

  const calculateRSI = (data: Candle[], period: number = 14) => {
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = data[i].c - data[i - 1].c;
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    let avgGain = gains / period, avgLoss = losses / period;
    const rsi = [null];
    for (let i = 1; i < data.length; i++) {
      if (i <= period) { rsi.push(null); continue; }
      const diff = data[i].c - data[i - 1].c;
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    return rsi;
  };

  const calculateBB = (data: Candle[], period: number = 20, stdDev: number = 2) => {
    return data.map((_, i) => {
      if (i < period - 1) return null;
      const slice = data.slice(i - period + 1, i + 1);
      const ma = slice.reduce((sum, c) => sum + c.c, 0) / period;
      const variance = slice.reduce((sum, c) => sum + Math.pow(c.c - ma, 2), 0) / period;
      const sd = Math.sqrt(variance);
      return { m: ma, u: ma + stdDev * sd, l: ma - stdDev * sd };
    });
  };

  const calculateMACD = (data: Candle[]) => {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calculateEMA(macdLine.map(v => ({ c: v } as any)), 9);
    const histogram = macdLine.map((v, i) => v - signalLine[i]);
    return { macd: macdLine, signal: signalLine, hist: histogram };
  };

  useEffect(() => {
    render();
  }, [candles, drawings, indicators, chartType, zoom, pendingDrawing]);

  const render = () => {
    const pc = priceCanvasRef.current;
    if (!pc || !candles.length) return;
    const ctx = pc.getContext('2d');
    if (!ctx) return;

    const W = pc.width;
    const H = pc.height;
    ctx.clearRect(0, 0, W, H);

    const vis = candles.slice(zoom.s, zoom.s + zoom.r);
    if (!vis.length) return;

    const PAD_T = 18, PAD_B = 22, PAD_L = 8, PAD_R = 82;
    const cW = W - PAD_L - PAD_R;
    const cH = H - PAD_T - PAD_B;
    const cw = cW / vis.length;
    const toX = (i: number) => PAD_L + (i + 0.5) * cw;

    const allPx = vis.flatMap(c => [c.h, c.l]);
    const rawMn = Math.min(...allPx), rawMx = Math.max(...allPx);
    const rp = (rawMx - rawMn) * 0.06 || rawMn * 0.02 || 1;
    const minP = rawMn - rp, maxP = rawMx + rp, pRange = maxP - minP;
    const toY = (v: number) => PAD_T + (1 - (v - minP) / pRange) * cH;

    // Grid
    ctx.strokeStyle = 'rgba(26, 45, 74, 0.2)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 5; g++) {
      const y = PAD_T + (g / 5) * cH;
      const p = maxP - (g / 5) * pRange;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(W - PAD_R, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(122, 156, 192, 0.55)';
      ctx.font = '9px Share Tech Mono';
      ctx.textAlign = 'left';
      ctx.fillText('$' + formatPrice(p), W - PAD_R + 5, y + 3.5);
    }

    // Chart
    if (chartType === 'line') {
      const up = vis[vis.length - 1].c >= vis[0].o;
      const color = up ? '#00ff88' : '#ff3366';
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(vis[0].c));
      for (let i = 1; i < vis.length; i++) ctx.lineTo(toX(i), toY(vis[i].c));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Fill
      ctx.lineTo(toX(vis.length - 1), H - PAD_B);
      ctx.lineTo(toX(0), H - PAD_B);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, PAD_T, 0, H - PAD_B);
      grad.addColorStop(0, color + '33');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      const bW = Math.max(1, Math.min(cw * 0.72, 14));
      vis.forEach((c, i) => {
        const x = toX(i);
        const up = c.c >= c.o;
        ctx.strokeStyle = up ? '#00ff88' : '#ff3366';
        ctx.beginPath();
        ctx.moveTo(x, toY(c.h));
        ctx.lineTo(x, toY(c.l));
        ctx.stroke();
        ctx.fillStyle = up ? '#00ff88' : '#ff3366';
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyH = Math.max(1, Math.abs(toY(c.o) - toY(c.c)));
        ctx.fillRect(x - bW / 2, bodyTop, bW, bodyH);
      });
    }

    // Indicators
    if (indicators.has('ma')) {
      const ma = calculateMA(candles, 20);
      const visMa = ma.slice(zoom.s, zoom.s + zoom.r);
      ctx.beginPath();
      visMa.forEach((v, i) => {
        if (v === null) return;
        const x = toX(i);
        const y = toY(v);
        if (i === 0 || visMa[i-1] === null) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (indicators.has('ema')) {
      const ema = calculateEMA(candles, 9);
      const visEma = ema.slice(zoom.s, zoom.s + zoom.r);
      ctx.beginPath();
      visEma.forEach((v, i) => {
        const x = toX(i);
        const y = toY(v);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (indicators.has('bb')) {
      const bb = calculateBB(candles);
      const visBb = bb.slice(zoom.s, zoom.s + zoom.r);
      ctx.beginPath();
      visBb.forEach((v, i) => {
        if (!v) return;
        const x = toX(i);
        const y = toY(v.u);
        if (i === 0 || !visBb[i-1]) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      visBb.reverse().forEach((v, i) => {
        if (!v) return;
        const x = toX(visBb.length - 1 - i);
        const y = toY(v.l);
        ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
      ctx.stroke();
    }

    // Drawings
    const allDrawings = pendingDrawing ? [...drawings, pendingDrawing] : drawings;
    allDrawings.forEach(d => {
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
      ctx.lineWidth = 1.5;
      if (d.type === 'hline') {
        const y = priceToY(d.p1.price, H);
        ctx.beginPath();
        ctx.moveTo(PAD_L, y);
        ctx.lineTo(W - PAD_R, y);
        ctx.stroke();
      } else if (d.type === 'line' && d.p2) {
        const x1 = candleToX(d.p1.gi, W);
        const y1 = priceToY(d.p1.price, H);
        const x2 = candleToX(d.p2.gi, W);
        const y2 = priceToY(d.p2.price, H);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (d.type === 'ray' && d.p2) {
        const x1 = candleToX(d.p1.gi, W);
        const y1 = priceToY(d.p1.price, H);
        const x2 = candleToX(d.p2.gi, W);
        const y2 = priceToY(d.p2.price, H);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.cos(angle) * 2000, y1 + Math.sin(angle) * 2000);
        ctx.stroke();
      } else if (d.type === 'rect' && d.p2) {
        const x1 = candleToX(d.p1.gi, W);
        const y1 = priceToY(d.p1.price, H);
        const x2 = candleToX(d.p2.gi, W);
        const y2 = priceToY(d.p2.price, H);
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        ctx.globalAlpha = 1.0;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      } else if (d.type === 'fib' && d.p2) {
        const x1 = candleToX(d.p1.gi, W);
        const y1 = priceToY(d.p1.price, H);
        const x2 = candleToX(d.p2.gi, W);
        const y2 = priceToY(d.p2.price, H);
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const diff = y2 - y1;
        levels.forEach(lvl => {
          const y = y1 + diff * lvl;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.strokeStyle = d.color + '88';
          ctx.stroke();
          ctx.font = '8px Share Tech Mono';
          ctx.fillText(lvl.toString(), x2 + 5, y + 3);
        });
      } else if (d.type === 'note') {
        const x = candleToX(d.p1.gi, W);
        const y = priceToY(d.p1.price, H);
        ctx.font = '10px Inter';
        ctx.fillStyle = d.color;
        ctx.fillText(d.text || 'Note', x + 5, y - 5);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Volume
    const vc = volCanvasRef.current;
    if (vc) {
      const vctx = vc.getContext('2d');
      if (vctx) {
        vctx.clearRect(0, 0, vc.width, vc.height);
        const maxV = Math.max(...vis.map(c => c.v));
        const vH = vc.height;
        vis.forEach((c, i) => {
          const x = toX(i);
          const h = (c.v / maxV) * (vH - 10);
          vctx.fillStyle = c.c >= c.o ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 51, 102, 0.3)';
          vctx.fillRect(x - (cw * 0.7) / 2, vH - h, cw * 0.7, h);
        });
      }
    }

    // RSI
    const rc = rsiCanvasRef.current;
    if (rc && indicators.has('rsi')) {
      const rctx = rc.getContext('2d');
      if (rctx) {
        rctx.clearRect(0, 0, rc.width, rc.height);
        const rsi = calculateRSI(candles);
        const visRsi = rsi.slice(zoom.s, zoom.s + zoom.r);
        const rH = rc.height;
        
        // Lines at 30, 70
        rctx.strokeStyle = 'rgba(122, 156, 192, 0.2)';
        rctx.beginPath();
        rctx.moveTo(0, rH * 0.3); rctx.lineTo(rc.width, rH * 0.3);
        rctx.moveTo(0, rH * 0.7); rctx.lineTo(rc.width, rH * 0.7);
        rctx.stroke();

        rctx.beginPath();
        visRsi.forEach((v, i) => {
          if (v === null) return;
          const x = toX(i);
          const y = rH - (v / 100) * rH;
          if (i === 0 || visRsi[i-1] === null) rctx.moveTo(x, y); else rctx.lineTo(x, y);
        });
        rctx.strokeStyle = '#ff3366';
        rctx.stroke();
      }
    }

    // MACD
    const mc = macdCanvasRef.current;
    if (mc && indicators.has('macd')) {
      const mctx = mc.getContext('2d');
      if (mctx) {
        mctx.clearRect(0, 0, mc.width, mc.height);
        const { macd, signal, hist } = calculateMACD(candles);
        const visMacd = macd.slice(zoom.s, zoom.s + zoom.r);
        const visSignal = signal.slice(zoom.s, zoom.s + zoom.r);
        const visHist = hist.slice(zoom.s, zoom.s + zoom.r);
        const mH = mc.height;
        const mid = mH / 2;
        const scale = mH / (Math.max(...visHist.map(Math.abs)) * 4 || 1);

        visHist.forEach((v, i) => {
          const x = toX(i);
          const h = v * scale;
          mctx.fillStyle = v >= 0 ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 51, 102, 0.4)';
          mctx.fillRect(x - (cw * 0.5) / 2, mid - h, cw * 0.5, h);
        });

        mctx.beginPath();
        visMacd.forEach((v, i) => {
          const x = toX(i);
          const y = mid - v * scale;
          if (i === 0) mctx.moveTo(x, y); else mctx.lineTo(x, y);
        });
        mctx.strokeStyle = '#00d4ff';
        mctx.stroke();

        mctx.beginPath();
        visSignal.forEach((v, i) => {
          const x = toX(i);
          const y = mid - v * scale;
          if (i === 0) mctx.moveTo(x, y); else mctx.lineTo(x, y);
        });
        mctx.strokeStyle = '#ffcc00';
        mctx.stroke();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = priceCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (!drawTool) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, s: zoom.s });
      return;
    }

    const ci = getCandleIdx(mx, rect.width);
    const price = getPriceAtY(my, rect.height);
    if (!ci || price === null) return;

    if (drawTool === 'hline') {
      onDrawingComplete({ type: 'hline', color: drawColor, p1: { gi: ci.globalIdx, price } });
      return;
    }

    if (!pendingDrawing) {
      setPendingDrawing({ type: drawTool as any, color: drawColor, p1: { gi: ci.globalIdx, price }, p2: { gi: ci.globalIdx, price } });
    } else {
      onDrawingComplete({ ...pendingDrawing, p2: { gi: ci.globalIdx, price } });
      setPendingDrawing(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = priceCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const ci = getCandleIdx(mx, rect.width);
    if (ci) setHoverData(ci.candle);

    if (isDragging) {
      const cw = (rect.width - 8 - 82) / zoom.r;
      const sh = Math.round(-(e.clientX - dragStart.x) / cw);
      onZoomChange({ ...zoom, s: Math.max(0, Math.min(candles.length - zoom.r, dragStart.s + sh)) });
    }

    if (pendingDrawing) {
      const price = getPriceAtY(my, rect.height);
      if (ci && price !== null) {
        setPendingDrawing({ ...pendingDrawing, p2: { gi: ci.globalIdx, price } });
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const d = e.deltaY > 0 ? 1.1 : 0.9;
    const newR = Math.min(candles.length, Math.max(10, Math.round(zoom.r * d)));
    onZoomChange({ s: Math.max(0, candles.length - newR), r: newR });
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden relative bg-bg">
      <div className="flex-1 relative min-h-0">
        <canvas
          ref={priceCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => { setIsDragging(false); setHoverData(null); }}
          onWheel={handleWheel}
          width={800}
          height={400}
          className="w-full h-full block cursor-crosshair"
        />
        {hoverData && (
          <div className="absolute top-2 left-2 bg-bg2/90 border border-border p-2 rounded text-[10px] font-mono z-50 pointer-events-none shadow-xl">
            <div className="text-accent mb-1 border-b border-border/30 pb-1">
              {new Date(hoverData.t).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div>O: {formatPrice(hoverData.o)}</div>
            <div className="text-green">H: {formatPrice(hoverData.h)}</div>
            <div className="text-red">L: {formatPrice(hoverData.l)}</div>
            <div>C: {formatPrice(hoverData.c)}</div>
            <div className="text-text3">V: {formatLargeNumber(hoverData.v)}</div>
          </div>
        )}
      </div>
      <div className="h-[60px] border-t border-border bg-bg2/50">
        <canvas ref={volCanvasRef} width={800} height={60} className="w-full h-full block" />
      </div>
      {indicators.has('rsi') && (
        <div className="h-[60px] border-t border-border bg-bg2/50 relative">
          <div className="absolute top-1 left-2 text-[8px] font-mono text-text3 uppercase">RSI (14)</div>
          <canvas ref={rsiCanvasRef} width={800} height={60} className="w-full h-full block" />
        </div>
      )}
      {indicators.has('macd') && (
        <div className="h-[80px] border-t border-border bg-bg2/50 relative">
          <div className="absolute top-1 left-2 text-[8px] font-mono text-text3 uppercase">MACD (12, 26, 9)</div>
          <canvas ref={macdCanvasRef} width={800} height={80} className="w-full h-full block" />
        </div>
      )}
    </div>
  );
};
