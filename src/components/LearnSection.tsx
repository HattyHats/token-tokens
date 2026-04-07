import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, BookOpen, Target, TrendingUp, BarChart2, Zap, Layout } from 'lucide-react';
import { cn } from '../lib/utils';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  summary: string;
  content: React.ReactNode;
}

export const LearnSection: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>('basics');

  const sections: Section[] = [
    {
      id: 'basics',
      title: 'The Basics',
      icon: <Layout size={20} />,
      summary: 'Understanding the axes, timeframes, and chart types.',
      content: (
        <div className="space-y-4">
          <p>Every price chart has two primary axes that tell you the story of an asset's history:</p>
          <ul className="list-disc pl-5 space-y-2 text-text2">
            <li><strong className="text-accent">Vertical Axis (Y):</strong> Shows the price in USD. Higher up means a higher price.</li>
            <li><strong className="text-accent">Horizontal Axis (X):</strong> Shows time. Further right means more recent.</li>
          </ul>
          <div className="bg-bg2 p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-accent2">Timeframes Explained</h4>
            <p className="text-sm">A timeframe determines how much history you see and how each data point is grouped. On a 1D chart, each candle represents 5 minutes. On a 1Y chart, each candle represents one full day. Always check the weekly/monthly chart before making short-term decisions.</p>
          </div>
        </div>
      )
    },
    {
      id: 'candles',
      title: 'Candlesticks',
      icon: <TrendingUp size={20} />,
      summary: 'How to read the "story" each candle tells.',
      content: (
        <div className="space-y-4">
          <p>A candlestick chart shows four prices per period: Open, High, Low, and Close (OHLC). This gives you far more information than a simple line chart.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green/5 border border-green/20 p-4 rounded-lg">
              <h4 className="text-green font-bold mb-2">Bullish Candle (Green)</h4>
              <p className="text-sm text-text2">Price went UP. The "Close" price is higher than the "Open" price. The body shows the range between open and close, while the wicks show the extremes.</p>
            </div>
            <div className="bg-red/5 border border-red/20 p-4 rounded-lg">
              <h4 className="text-red font-bold mb-2">Bearish Candle (Red)</h4>
              <p className="text-sm text-text2">Price went DOWN. The "Close" price is lower than the "Open" price. This indicates selling pressure during that period.</p>
            </div>
          </div>
          <p className="text-sm italic text-text3">Pro Tip: Long wicks at the bottom of a candle often indicate a "rejection" of lower prices, suggesting buyers are stepping in.</p>
        </div>
      )
    },
    {
      id: 'sr',
      title: 'Support & Resistance',
      icon: <Target size={20} />,
      summary: 'Identifying the floors and ceilings of price action.',
      content: (
        <div className="space-y-4">
          <p>Price has "memory". Support and Resistance are levels where the price has historically struggled to break through.</p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-1 bg-green rounded-full shrink-0" />
              <div>
                <h4 className="font-bold text-green">Support (The Floor)</h4>
                <p className="text-sm text-text2">A price level where a downtrend tends to pause due to a concentration of demand (buying interest).</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-1 bg-red rounded-full shrink-0" />
              <div>
                <h4 className="font-bold text-red">Resistance (The Ceiling)</h4>
                <p className="text-sm text-text2">A price level where an uptrend tends to pause due to a concentration of supply (selling interest).</p>
              </div>
            </div>
          </div>
          <p className="bg-accent/5 p-3 rounded border border-accent/20 text-sm">
            <strong>Role Reversal:</strong> Once a resistance level is broken, it often becomes a new support level, and vice versa.
          </p>
        </div>
      )
    },
    {
      id: 'indicators',
      title: 'Technical Indicators',
      icon: <Zap size={20} />,
      summary: 'Using math to find trends and momentum.',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-surface p-4 rounded-lg border border-border">
              <h4 className="font-bold text-yellow mb-1">Moving Averages (MA)</h4>
              <p className="text-sm text-text2">Smooths out price action to show the trend. MA20 (short term) and EMA50 (medium term) are common benchmarks.</p>
            </div>
            <div className="bg-surface p-4 rounded-lg border border-border">
              <h4 className="font-bold text-orange mb-1">RSI (Relative Strength Index)</h4>
              <p className="text-sm text-text2">Measures momentum on a 0-100 scale. Above 70 is "Overbought" (caution), below 30 is "Oversold" (opportunity).</p>
            </div>
            <div className="bg-surface p-4 rounded-lg border border-border">
              <h4 className="font-bold text-purple mb-1">MACD</h4>
              <p className="text-sm text-text2">Shows changes in the strength, direction, momentum, and duration of a trend. Crossovers are key signals.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sentiment',
      title: 'Market Sentiment',
      icon: <BarChart2 size={20} />,
      summary: 'Understanding Fear & Greed.',
      content: (
        <div className="space-y-4">
          <p>The crypto market is highly emotional. People tend to get greedy when the market is rising (FOMO) and fearful when it's falling.</p>
          <div className="bg-bg2 p-4 rounded-lg border border-border">
            <h4 className="font-bold mb-2 text-orange">Fear & Greed Index</h4>
            <ul className="space-y-2 text-sm">
              <li><strong className="text-red">Extreme Fear:</strong> Can be a sign that investors are too worried. That could be a buying opportunity.</li>
              <li><strong className="text-green">Extreme Greed:</strong> When investors are getting too greedy, that means the market is due for a correction.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'risk',
      title: 'Risk Management',
      icon: <Target size={20} />,
      summary: 'Protecting your capital.',
      content: (
        <div className="space-y-4">
          <p>The most important part of trading is not how much you make, but how much you don't lose.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface p-4 rounded-lg border border-border">
              <h4 className="font-bold text-accent mb-1">Stop Loss</h4>
              <p className="text-sm text-text2">An order placed to sell an asset when it reaches a certain price. It limits your loss on a trade.</p>
            </div>
            <div className="bg-surface p-4 rounded-lg border border-border">
              <h4 className="font-bold text-accent mb-1">Position Sizing</h4>
              <p className="text-sm text-text2">Never put all your money into one trade. Professional traders often risk only 1-2% of their total capital per trade.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-orbitron font-black bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent mb-4">
            Master the Charts
          </h1>
          <p className="text-text2 text-lg">
            Click any section below to dive deep into technical analysis.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className={cn(
                "border rounded-2xl transition-all duration-300 overflow-hidden",
                expandedId === section.id 
                  ? "bg-surface border-accent shadow-[0_0_30px_rgba(0,212,255,0.1)]" 
                  : "bg-bg2 border-border hover:border-accent/50"
              )}
            >
              <button
                onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    expandedId === section.id ? "bg-accent text-bg" : "bg-surface text-accent"
                  )}>
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="font-orbitron font-bold text-lg">{section.title}</h3>
                    <p className="text-xs text-text3 font-mono uppercase tracking-wider">{section.summary}</p>
                  </div>
                </div>
                <ChevronDown 
                  className={cn("text-text3 transition-transform duration-300", expandedId === section.id && "rotate-180")} 
                  size={20} 
                />
              </button>

              {expandedId === section.id && (
                <div className="px-5 pb-6 pt-2 border-t border-border/30">
                  <div className="text-text2 leading-relaxed">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-accent/5 border border-accent/20 rounded-2xl text-center">
          <BookOpen className="mx-auto text-accent mb-3" size={32} />
          <h3 className="font-orbitron font-bold text-accent mb-2">Keep Learning</h3>
          <p className="text-sm text-text2 max-w-md mx-auto">
            Technical analysis is a skill that takes time to master. Use the Token-Tokens chart to practice identifying these patterns in real-time.
          </p>
        </div>
      </div>
    </div>
  );
};
