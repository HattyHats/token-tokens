import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

export const Splash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEF$₿Ξ◈▲▼';
    const COL_W = 18;
    let cols = Math.floor(canvas.width / COL_W);
    let drops = Array.from({ length: cols }, () => Math.random() * -80);
    const colColors = Array.from({ length: cols }, () => {
      const r = Math.random();
      return r < 0.6 ? '#00d4ff' : r < 0.85 ? '#00ff88' : '#9664ff';
    });

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 8, 16, 0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drops.forEach((y, i) => {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * COL_W;
        const py = y * COL_W;

        ctx.font = `bold ${COL_W - 2}px 'Share Tech Mono', monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.95;
        ctx.fillText(char, x, py);

        ctx.fillStyle = colColors[i];
        ctx.globalAlpha = 0.55;
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, py - COL_W);

        ctx.globalAlpha = 1;

        if (py > canvas.height && Math.random() > 0.975) drops[i] = 0;
        else drops[i] += 0.4 + Math.random() * 0.3;
      });
    };

    const interval = setInterval(draw, 45);

    const timer = setTimeout(() => {
      onComplete();
    }, 4200);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.7 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-bg"
    >
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: 'url("/chart.jpeg")' }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 opacity-30" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,8,16,0.9)_80%)]" />
      <div className="absolute inset-0 z-10 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="relative z-20 text-center flex flex-col items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="font-orbitron text-lg md:text-2xl text-text2 tracking-[0.5em] uppercase"
        >
          Welcome To:
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="font-orbitron text-5xl md:text-8xl font-black tracking-wider bg-gradient-to-r from-accent via-accent2 to-accent bg-[length:200%] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,212,255,0.5)] animate-gradient-shift"
        >
          Token-Tokens
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1 }}
          className="font-mono text-sm md:text-lg text-text2 tracking-widest mt-1"
        >
          Created by <span className="text-accent">HattyHats</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          className="mt-8"
        >
          <div className="w-9 h-9 border-3 border-accent/20 border-t-accent rounded-full animate-spin shadow-[0_0_18px_rgba(0,212,255,0.4)]" />
        </motion.div>
      </div>
    </motion.div>
  );
};
