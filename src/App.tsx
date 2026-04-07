import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Chart } from './components/Chart';
import { Splash } from './components/Splash';
import { FearGreedWidget } from './components/FearGreedWidget';
import { TokenBrowser } from './components/TokenBrowser';
import { NewsSection } from './components/NewsSection';
import { LearnSection } from './components/LearnSection';
import { SettingsModal } from './components/SettingsModal';
import { Coin, Candle, Drawing, Indicator, Timeframe, ChartType, Alert } from './types';
import { fetchChartData, fetchCoinPrices, fetchTrending, fetchFearGreed, CC_SYM_MAP } from './services/api';
import { formatPrice, cn, safeStorage } from './lib/utils';
import { Clock, AlertCircle } from 'lucide-react';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('nosplash') !== 'true';
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState('chart');
  const [activeCoin, setActiveCoin] = useState<Coin>({
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    image: 'https://www.cryptocompare.com/media/19633/btc.png',
  });
  const [watchlist, setWatchlist] = useState<Coin[]>(() => {
    const saved = safeStorage.getItem('watchlist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse watchlist from local storage", e);
      }
    }
    return [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', image: 'https://www.cryptocompare.com/media/19633/btc.png' },
      { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', image: 'https://www.cryptocompare.com/media/37746238/eth.png' },
      { id: 'solana', name: 'Solana', symbol: 'SOL', image: 'https://www.cryptocompare.com/media/37747734/sol.png' },
    ];
  });
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('30');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [indicators, setIndicators] = useState<Set<Indicator>>(new Set());
  const [drawings, setDrawings] = useState<Drawing[]>(() => {
    const saved = safeStorage.getItem('drawings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse drawings from local storage", e);
      }
    }
    return [];
  });
  const [drawTool, setDrawTool] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState('#00d4ff');
  const [zoom, setZoom] = useState({ s: 0, r: 100 });
  const [trending, setTrending] = useState<any[]>([]);
  const [fearGreed, setFearGreed] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tmDate, setTmDate] = useState('');
  const [tmResult, setTmResult] = useState<any>(null);
  const [tmLoading, setTmLoading] = useState(false);

  useEffect(() => {
    if (showSplash) return;

    // Periodic price refresh for watchlist
    const interval = setInterval(async () => {
      if (watchlist.length > 0) {
        const symbols = watchlist.map(c => (CC_SYM_MAP[c.id] || c.symbol).toUpperCase());
        const prices = await fetchCoinPrices(symbols);
        setWatchlist(prev => prev.map(c => {
          const sym = (CC_SYM_MAP[c.id] || c.symbol).toUpperCase();
          const p = prices[sym]?.USD;
          if (p) {
            return { ...c, price: p.PRICE, change: p.CHANGEPCT24HOUR };
          }
          return c;
        }));
      }
    }, 15000); // Every 15 seconds for more responsiveness

    return () => clearInterval(interval);
  }, [showSplash, activeTab]);

  useEffect(() => {
    safeStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    safeStorage.setItem('drawings', JSON.stringify(drawings));
  }, [drawings]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [trendingData, fgData] = await Promise.all([
          fetchTrending(),
          fetchFearGreed()
        ]);
        setTrending(trendingData);
        setFearGreed(fgData);
        
        const symbols = watchlist.map(c => (CC_SYM_MAP[c.id] || c.symbol).toUpperCase());
        console.log("Fetching initial prices for:", symbols);
        const prices = await fetchCoinPrices(symbols);
        
        setWatchlist(prev => prev.map(c => {
          const sym = (CC_SYM_MAP[c.id] || c.symbol).toUpperCase();
          const p = prices[sym]?.USD;
          if (p) {
            console.log(`Price found for ${sym}: ${p.PRICE}`);
            return { ...c, price: p.PRICE, change: p.CHANGEPCT24HOUR };
          } else {
            console.warn(`No price found for ${sym}`);
            return c;
          }
        }));

        if (activeCoin) {
          const sym = (CC_SYM_MAP[activeCoin.id] || activeCoin.symbol).toUpperCase();
          const p = prices[sym]?.USD;
          if (p) setActiveCoin(prev => ({ ...prev, price: p.PRICE, change: p.CHANGEPCT24HOUR, mcap: p.MKTCAP, vol: p.VOLUME24HOURTO }));
        }
      } catch (e) {
        console.error("Initial data load error:", e);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadChart = async () => {
      if (!activeCoin) return;
      try {
        const sym = (CC_SYM_MAP[activeCoin.id] || activeCoin.symbol).toUpperCase();
        const data = await fetchChartData(sym, timeframe);
        setCandles(data);
        setZoom({ s: Math.max(0, data.length - 100), r: Math.min(100, data.length) });
      } catch (e) {
        console.error(e);
      }
    };
    loadChart();
  }, [activeCoin.id, timeframe]);

  const handleSelectCoin = async (coin: Coin) => {
    setActiveCoin(coin);
    
    // Fetch price for the selected coin immediately if missing
    const sym = (CC_SYM_MAP[coin.id] || coin.symbol).toUpperCase();
    const prices = await fetchCoinPrices([sym]);
    const p = prices[sym]?.USD;
    
    const updatedCoin = p ? { 
      ...coin, 
      price: p.PRICE, 
      change: p.CHANGEPCT24HOUR,
      mcap: p.MKTCAP,
      vol: p.VOLUME24HOURTO
    } : coin;

    if (p) setActiveCoin(updatedCoin);

    if (!watchlist.find(c => c.id === coin.id)) {
      setWatchlist(prev => [...prev, updatedCoin]);
    } else {
      // Update price in watchlist if it already exists
      setWatchlist(prev => prev.map(c => c.id === coin.id ? { ...c, ...updatedCoin } : c));
    }
  };

  const runTimeMachine = async () => {
    if (!tmDate) return;
    setTmLoading(true);
    setTmResult(null);
    try {
      const sym = (CC_SYM_MAP[activeCoin.id] || activeCoin.symbol).toUpperCase();
      const ts = Math.floor(new Date(tmDate).getTime() / 1000);
      const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${sym}&tsym=USD&limit=1&toTs=${ts}`);
      const json = await res.json();
      if (json.Data?.Data?.[0]) {
        const data = json.Data.Data[0];
        setTmResult({
          price: data.close,
          date: tmDate,
          change: activeCoin.price ? ((activeCoin.price - data.close) / data.close) * 100 : null
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTmLoading(false);
    }
  };

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden", isDarkMode ? "dark" : "")}>
      {showSplash && <Splash onComplete={() => setShowSplash(false)} />}

      <div className="md:hidden fixed top-0 left-0 right-0 z-[10000] bg-accent text-bg text-[10px] font-bold py-1 px-4 text-center tracking-widest uppercase shadow-lg">
        Best if used in browser / desktop
      </div>

      {!showSplash && (
        <>
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isDarkMode={isDarkMode}
            toggleTheme={() => setIsDarkMode(!isDarkMode)}
          />

          <div className="flex-1 flex overflow-hidden">
            <div className="flex flex-col">
              <Sidebar
                watchlist={watchlist}
                activeCoin={activeCoin}
                onSelectCoin={handleSelectCoin}
                onRemoveFromWatchlist={(id) => setWatchlist(prev => prev.filter(c => c.id !== id))}
                onOpenModal={() => setIsBrowserOpen(true)}
                trending={trending}
              />
              <FearGreedWidget data={fearGreed} />
            </div>

            <main className="flex-1 flex flex-col overflow-hidden">
              {activeTab === 'chart' ? (
                <>
                  <div className="px-4 py-2 bg-bg2 border-b border-border flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {activeCoin.image && <img src={activeCoin.image} className="w-8 h-8 rounded-full" alt="" />}
                      <div>
                        <div className="text-[10px] font-mono text-text3 leading-none uppercase">{activeCoin.symbol}/USD</div>
                        <div className="text-lg font-orbitron font-black leading-tight">{activeCoin.name}</div>
                      </div>
                      <div className="text-2xl font-mono text-accent ml-2">
                        {activeCoin.price ? `$${formatPrice(activeCoin.price)}` : '—'}
                      </div>
                      <div className={cn(
                        "font-mono text-xs font-bold px-2 py-1 rounded",
                        (activeCoin.change || 0) >= 0 ? "bg-green/10 text-green" : "bg-red/10 text-red"
                      )}>
                        {(activeCoin.change || 0) >= 0 ? '+' : ''}{(activeCoin.change || 0).toFixed(2)}%
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {(['1', '7', '30', '90', '365', 'max'] as Timeframe[]).map(tf => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-mono border border-border transition-all",
                            timeframe === tf ? "bg-accent/10 border-accent text-accent" : "text-text2 hover:border-accent/50"
                          )}
                        >
                          {tf === '365' ? '1y' : tf === 'max' ? 'MAX' : tf + 'd'}
                        </button>
                      ))}
                      <div className="w-px h-4 bg-border mx-1" />
                      <button
                        onClick={() => setChartType('candle')}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-semibold border border-border transition-all",
                          chartType === 'candle' ? "bg-accent2/10 border-accent2 text-accent2" : "text-text2 hover:border-accent2/50"
                        )}
                      >
                        Candle
                      </button>
                      <button
                        onClick={() => setChartType('line')}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-semibold border border-border transition-all",
                          chartType === 'line' ? "bg-accent2/10 border-accent2 text-accent2" : "text-text2 hover:border-accent2/50"
                        )}
                      >
                        Line
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                    <Chart
                      candles={candles}
                      drawings={drawings}
                      indicators={indicators}
                      chartType={chartType}
                      zoom={zoom}
                      onZoomChange={setZoom}
                      drawTool={drawTool}
                      drawColor={drawColor}
                      onDrawingComplete={(d) => {
                        if (d.type === 'note') {
                          // prompt is blocked in iframes, using default text
                          setDrawings(prev => [...prev, { ...d, text: 'New Note' }]);
                        } else {
                          setDrawings(prev => [...prev, d]);
                        }
                      }}
                    />
                    
                    <div className="w-16 bg-surface border-l border-border flex flex-col items-center py-4 gap-4 overflow-y-auto no-scrollbar">
                      <div className="text-[8px] font-mono text-text3 uppercase tracking-tighter">Tools</div>
                      <ToolButton icon="📏" active={drawTool === 'line'} onClick={() => setDrawTool(drawTool === 'line' ? null : 'line')} />
                      <ToolButton icon="↗" active={drawTool === 'ray'} onClick={() => setDrawTool(drawTool === 'ray' ? null : 'ray')} />
                      <ToolButton icon="──" active={drawTool === 'hline'} onClick={() => setDrawTool(drawTool === 'hline' ? null : 'hline')} />
                      <ToolButton icon="▭" active={drawTool === 'rect'} onClick={() => setDrawTool(drawTool === 'rect' ? null : 'rect')} />
                      <ToolButton icon="≡" active={drawTool === 'fib'} onClick={() => setDrawTool(drawTool === 'fib' ? null : 'fib')} />
                      <ToolButton icon="✎" active={drawTool === 'note'} onClick={() => setDrawTool(drawTool === 'note' ? null : 'note')} />
                      
                      <div className="w-8 h-px bg-border" />
                      <div className="text-[8px] font-mono text-text3 uppercase tracking-tighter">Ind</div>
                      <IndicatorButton 
                        label="MA" 
                        active={indicators.has('ma')} 
                        onClick={() => {
                          const next = new Set(indicators);
                          next.has('ma') ? next.delete('ma') : next.add('ma');
                          setIndicators(next);
                        }} 
                      />
                      <IndicatorButton 
                        label="EMA" 
                        active={indicators.has('ema')} 
                        onClick={() => {
                          const next = new Set(indicators);
                          next.has('ema') ? next.delete('ema') : next.add('ema');
                          setIndicators(next);
                        }} 
                      />
                      <IndicatorButton 
                        label="BB" 
                        active={indicators.has('bb')} 
                        onClick={() => {
                          const next = new Set(indicators);
                          next.has('bb') ? next.delete('bb') : next.add('bb');
                          setIndicators(next);
                        }} 
                      />
                      <IndicatorButton 
                        label="RSI" 
                        active={indicators.has('rsi')} 
                        onClick={() => {
                          const next = new Set(indicators);
                          next.has('rsi') ? next.delete('rsi') : next.add('rsi');
                          setIndicators(next);
                        }} 
                      />
                      <IndicatorButton 
                        label="MACD" 
                        active={indicators.has('macd')} 
                        onClick={() => {
                          const next = new Set(indicators);
                          next.has('macd') ? next.delete('macd') : next.add('macd');
                          setIndicators(next);
                        }} 
                      />

                      <div className="w-8 h-px bg-border" />
                      <div className="text-[8px] font-mono text-text3 uppercase tracking-tighter">Color</div>
                      <ColorButton color="#00d4ff" active={drawColor === '#00d4ff'} onClick={() => setDrawColor('#00d4ff')} />
                      <ColorButton color="#00ff88" active={drawColor === '#00ff88'} onClick={() => setDrawColor('#00ff88')} />
                      <ColorButton color="#ff3366" active={drawColor === '#ff3366'} onClick={() => setDrawColor('#ff3366')} />
                      <ColorButton color="#ffcc00" active={drawColor === '#ffcc00'} onClick={() => setDrawColor('#ffcc00')} />
                      
                      <div className="w-8 h-px bg-border mt-auto" />
                      <button 
                        onClick={() => setDrawings([])}
                        className="text-text3 hover:text-red transition-colors p-2"
                        title="Clear All Drawings"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-accent2/5 to-accent/5 border-t border-border p-3 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-accent2">
                      <Clock size={16} />
                      <span className="font-orbitron text-[10px] font-bold tracking-widest uppercase">Time Machine</span>
                    </div>
                    <input
                      type="date"
                      value={tmDate}
                      onChange={(e) => setTmDate(e.target.value)}
                      className="bg-bg border border-accent2/30 text-text text-xs px-3 py-1.5 rounded outline-none focus:border-accent2 transition-all"
                    />
                    <button
                      onClick={runTimeMachine}
                      disabled={tmLoading}
                      className="bg-gradient-to-r from-accent2 to-accent text-white font-orbitron text-[10px] font-bold px-4 py-2 rounded hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {tmLoading ? 'SEARCHING...' : 'LOOK UP PRICE'}
                    </button>
                    {tmResult && (
                      <div className="flex items-center gap-4 bg-surface border border-accent2/30 px-4 py-1.5 rounded animate-in fade-in slide-in-from-left-2">
                        <div className="text-xs font-mono">
                          <span className="text-text3 mr-2">{tmResult.date}:</span>
                          <span className="text-accent font-bold">${formatPrice(tmResult.price)}</span>
                        </div>
                        {tmResult.change !== null && (
                          <div className={cn("text-[10px] font-mono font-bold", tmResult.change >= 0 ? 'text-green' : 'text-red')}>
                            vs Today: {tmResult.change >= 0 ? '▲' : '▼'}{Math.abs(tmResult.change).toFixed(2)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab === 'learn' ? (
                <LearnSection />
              ) : (
                <NewsSection />
              )}
            </main>
          </div>

          <TokenBrowser
            isOpen={isBrowserOpen}
            onClose={() => setIsBrowserOpen(false)}
            onSelectCoin={handleSelectCoin}
            watchlist={watchlist}
          />

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onReset={() => {
              safeStorage.clear();
              window.location.reload();
            }}
            watchlistCount={watchlist.length}
            drawingsCount={drawings.length}
          />

          <div className="bg-bg2 border-t border-border shrink-0 min-h-[52px] flex items-center">
            <div 
              className="livecoinwatch-widget-5 w-full" 
              lcw-base="USD" 
              lcw-color-tx="#abb8c3" 
              lcw-marquee-1="coins" 
              lcw-marquee-2="movers" 
              lcw-marquee-items="15"
            ></div>
          </div>
        </>
      )}
    </div>
  );
}

const ToolButton: React.FC<{ icon: string; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 flex items-center justify-center rounded border border-border transition-all shrink-0",
      active ? "bg-accent2/20 border-accent2 text-accent2 shadow-[0_0_8px_rgba(123,47,255,0.25)]" : "text-text2 hover:border-accent2/50"
    )}
  >
    {icon}
  </button>
);

const IndicatorButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-7 flex items-center justify-center rounded border border-border transition-all text-[8px] font-mono font-bold shrink-0",
      active ? "bg-accent/20 border-accent text-accent" : "text-text2 hover:border-accent/50"
    )}
  >
    {label}
  </button>
);

const ColorButton: React.FC<{ color: string; active: boolean; onClick: () => void }> = ({ color, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-5 h-5 rounded-full border-2 border-border transition-all",
      active ? "scale-125 border-white" : "hover:scale-110"
    )}
    style={{ backgroundColor: color }}
  />
);

