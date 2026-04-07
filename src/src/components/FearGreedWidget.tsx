import React, { useEffect, useRef } from 'react';

interface FearGreedWidgetProps {
  data: any[];
}

export const FearGreedWidget: React.FC<FearGreedWidgetProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data || !data[0]) return;
    const score = parseInt(data[0].value);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 160, H = 90;
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H - 14, R = 62, arcW = 10;
    const col = score <= 25 ? '#ff3366' : score <= 45 ? '#ff9600' : score <= 55 ? '#ffc800' : score <= 75 ? '#a8e063' : '#00ff88';

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, 0, false);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = arcW;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Colored segments
    const zones = [
      { from: 0, to: 25, col: '#ff3366' },
      { from: 25, to: 47, col: '#ff9600' },
      { from: 47, to: 53, col: '#ffc800' },
      { from: 53, to: 75, col: '#a8e063' },
      { from: 75, to: 100, col: '#00ff88' },
    ];

    zones.forEach(z => {
      const a1 = Math.PI + (z.from / 100) * Math.PI;
      const a2 = Math.PI + (z.to / 100) * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a1, a2, false);
      ctx.strokeStyle = z.col;
      ctx.lineWidth = arcW;
      ctx.stroke();
    });

    // Needle
    const needleAngle = Math.PI + (score / 100) * Math.PI;
    const needleLen = R - 6;
    const nx = cx + needleLen * Math.cos(needleAngle);
    const ny = cy + needleLen * Math.sin(needleAngle);

    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();

  }, [data]);

  if (!data || !data[0]) return null;

  const cur = data[0];
  const score = parseInt(cur.value);
  const col = score <= 25 ? '#ff3366' : score <= 45 ? '#ff9600' : score <= 55 ? '#ffc800' : score <= 75 ? '#a8e063' : '#00ff88';

  return (
    <div className="bg-surface border border-border rounded-xl p-3 my-2 mx-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-mono text-text3 tracking-widest uppercase">😱 Fear & Greed Index</span>
      </div>
      <div className="flex items-center gap-3">
        <canvas ref={canvasRef} />
        <div className="flex flex-col">
          <div className="text-2xl font-orbitron font-bold leading-none" style={{ color: col }}>{score}</div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-tight" style={{ color: col }}>{cur.value_classification}</div>
          <div className="text-[9px] font-mono text-text3 mt-1">Updates daily</div>
        </div>
      </div>
    </div>
  );
};
