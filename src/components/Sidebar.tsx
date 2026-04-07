import React, { useState, useEffect } from 'react';
import { Search, X, RefreshCw, Flame, ChevronDown, ChevronRight } from 'lucide-react';
import { Coin } from '../types';
import { formatPrice, formatLargeNumber, getCoinColor, cn } from '../lib/utils';
import { fetchCoinPrices, CC_SYM_MAP } from '../services/api';

interface SidebarProps {
  watchlist: Coin[];
  activeCoin: Coin;
  onSelectCoin: (coin: Coin) => void;
  onRemoveFromWatchlist: (id: string) => void;
  onOpenModal: () => void;
  trending: any[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  watchlist,
  activeCoin,
  onSelectCoin,
  onRemoveFromWatchlist,
  onOpenModal,
  trending,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isTrendingOpen, setIsTrendingOpen] = useState(false);
  const [isCardanoOpen, setIsCardanoOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://min-api.cryptocompare.com/data/all/coinlist?summary=true`);
        const json = await res.json();
        const qlo = searchQuery.toLowerCase();
        const all = Object.values(json.Data || {});
        const matched = all
          .filter((c: any) => 
            c.Symbol?.toLowerCase().includes(qlo) || 
            c.CoinName?.toLowerCase().includes(qlo)
          )
          .slice(0, 10);
        setSearchResults(matched);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <aside className="w-[295px] bg-surface border-r border-border flex flex-col overflow-y-auto hidden lg:flex">
      <div className="p-2.5 border-b border-border relative">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg border-1.5 border-border text-text px-3 py-2 rounded-md text-sm outline-none focus:border-accent transition-all"
              placeholder="🔍 Search any token..."
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text3 hover:text-red"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {searchQuery.length >= 2 && (
          <div className="absolute top-full left-2.5 right-2.5 bg-bg2 border-1.5 border-accent rounded-md z-50 shadow-2xl max-h-[380px] overflow-y-auto mt-0.5">
            <div className="p-2 text-[10px] font-mono text-text3 border-b border-border flex justify-between">
              <span>{searchResults.length} results</span>
              <span>Click to view</span>
            </div>
            {isSearching ? (
              <div className="p-4 text-center text-text3 font-mono text-xs">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((c: any) => (
                <div
                  key={c.Symbol}
                  onClick={() => {
                    onSelectCoin({
                      id: c.Symbol.toLowerCase(),
                      name: c.CoinName,
                      symbol: c.Symbol,
                      image: c.ImageUrl ? `https://www.cryptocompare.com${c.ImageUrl}` : '',
                    });
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-2 p-2.5 border-b border-border/30 hover:bg-accent/10 cursor-pointer transition-colors"
                >
                  {c.ImageUrl ? (
                    <img src={`https://www.cryptocompare.com${c.ImageUrl}`} className="w-6 h-6 rounded-full" alt="" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[8px] font-bold">
                      {c.Symbol.slice(0, 3)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{c.CoinName}</div>
                    <div className="text-[10px] font-mono text-text2">{c.Symbol}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-text3 font-mono text-xs">No results</div>
            )}
          </div>
        )}

        <button
          onClick={onOpenModal}
          className="w-full mt-2 bg-gradient-to-br from-accent2/10 to-accent/5 border border-accent2/40 text-accent2 font-orbitron text-[10px] font-bold tracking-wider py-2 rounded hover:bg-accent2/20 transition-all shadow-lg"
        >
          ⊞ BROWSE ALL TOKENS
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 text-[10px] font-mono text-text3 uppercase tracking-widest shrink-0">
          <span>◈ My Watchlist</span>
          <button 
            onClick={() => window.location.reload()}
            className="hover:text-accent transition-colors flex items-center gap-1"
            title="Refresh Prices"
          >
            <RefreshCw size={12} />
            <span>SYNC</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {watchlist.map((coin) => (
            <div
              key={coin.id}
              onClick={() => onSelectCoin(coin)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 border-b border-border/30 cursor-pointer relative group transition-colors hover:bg-accent/5",
                activeCoin.id === coin.id && "bg-accent/10 border-l-2 border-l-accent"
              )}
            >
              {coin.image ? (
                <img src={coin.image} className="w-7 h-7 rounded-full" alt="" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${getCoinColor(coin.symbol)}22`, color: getCoinColor(coin.symbol) }}>
                  {coin.symbol.slice(0, 3)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{coin.name}</div>
                <div className="text-[10px] font-mono text-text2">{coin.symbol}/USD</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-mono">{coin.price ? `$${formatPrice(coin.price)}` : '—'}</div>
                <div className={cn("text-[10px] font-mono font-bold", (coin.change || 0) >= 0 ? 'text-green' : 'text-red')}>
                  {coin.change ? `${(coin.change >= 0 ? '+' : '')}${coin.change.toFixed(2)}%` : '—'}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromWatchlist(coin.id);
                }}
                className="absolute right-1 top-1 text-text3 hover:text-red opacity-0 group-hover:opacity-100 transition-all"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border mt-auto">
          <div 
            className="flex items-center justify-between px-3 py-2 text-[10px] font-mono text-text3 uppercase tracking-widest cursor-pointer hover:bg-accent/5"
            onClick={() => setIsTrendingOpen(!isTrendingOpen)}
          >
            <span>🔥 Trending</span>
            {isTrendingOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </div>
          {isTrendingOpen && (
            <div className="max-h-[200px] overflow-y-auto">
              {trending.map((item, i) => {
                const info = item.CoinInfo || {};
                const raw = item.RAW?.USD || {};
                const ch = raw.CHANGEPCT24HOUR;
                return (
                  <div
                    key={info.Name}
                    onClick={() => onSelectCoin({
                      id: info.Name.toLowerCase(),
                      name: info.FullName,
                      symbol: info.Name,
                      image: `https://www.cryptocompare.com${info.ImageUrl}`,
                    })}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-orange-500/5 cursor-pointer transition-colors"
                  >
                    <span className="text-[10px] font-mono text-text3 w-3">{i + 1}</span>
                    <img src={`https://www.cryptocompare.com${info.ImageUrl}`} className="w-4.5 h-4.5 rounded-full" alt="" />
                    <span className="font-semibold flex-1 truncate">{info.FullName}</span>
                    <span className={cn("font-mono text-[10px]", ch >= 0 ? 'text-green' : 'text-red')}>
                      {ch >= 0 ? '▲' : '▼'}{Math.abs(ch).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
