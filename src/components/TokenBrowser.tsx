import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Coin } from '../types';
import { formatPrice, formatLargeNumber, getCoinColor, cn } from '../lib/utils';

interface TokenBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoin: (coin: Coin) => void;
  watchlist: Coin[];
}

export const TokenBrowser: React.FC<TokenBrowserProps> = ({
  isOpen,
  onClose,
  onSelectCoin,
  watchlist,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: '', label: '🌐 All' },
    { id: 'layer-1', label: '⛓ Layer 1' },
    { id: 'decentralized-finance-defi', label: '🏦 DeFi' },
    { id: 'meme-token', label: '🐸 Meme' },
    { id: 'artificial-intelligence', label: '🤖 AI' },
  ];

  React.useEffect(() => {
    if (!isOpen) return;
    fetchTokens();
  }, [isOpen, category]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const catParam = category ? `&category=${category}` : '';
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd${catParam}&order=market_cap_desc&per_page=50&page=1&sparkline=false`);
      const data = await res.json();
      setTokens(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredTokens = tokens.filter(t => 
    t.name.toLowerCase().includes(query.toLowerCase()) || 
    t.symbol.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-bg2 border border-border rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <span className="font-orbitron font-bold text-accent whitespace-nowrap">⊞ TOKEN BROWSER</span>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-surface border border-border text-text pl-10 pr-4 py-2 rounded-md outline-none focus:border-accent transition-all"
              placeholder="Search by name or symbol..."
            />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red/10 hover:text-red rounded-md transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-border flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-mono border border-border transition-all whitespace-nowrap",
                category === cat.id ? "bg-accent/10 border-accent text-accent" : "text-text2 hover:border-accent/50"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
              <div className="text-text3 font-mono text-sm">Loading tokens...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTokens.map(t => {
                const inWatchlist = watchlist.some(c => c.id === t.id);
                return (
                  <div key={t.id} className="bg-surface border border-border rounded-lg p-3 hover:border-accent/50 transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={t.image} className="w-8 h-8 rounded-full" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate text-sm">{t.name}</div>
                        <div className="text-[10px] font-mono text-text3 uppercase">{t.symbol}</div>
                      </div>
                      <div className={cn("text-xs font-mono font-bold", t.price_change_percentage_24h >= 0 ? 'text-green' : 'text-red')}>
                        {t.price_change_percentage_24h?.toFixed(2)}%
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-sm font-mono font-bold">${formatPrice(t.current_price)}</div>
                        <div className="text-[10px] text-text3 font-mono">MCap: ${formatLargeNumber(t.market_cap)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onSelectCoin({
                              id: t.id,
                              name: t.name,
                              symbol: t.symbol.toUpperCase(),
                              image: t.image,
                            });
                            onClose();
                          }}
                          className="flex-1 bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold px-3 py-1.5 rounded hover:bg-accent hover:text-bg transition-all"
                        >
                          VIEW CHART
                        </button>
                        {!inWatchlist && (
                          <button
                            onClick={() => {
                              onSelectCoin({
                                id: t.id,
                                name: t.name,
                                symbol: t.symbol.toUpperCase(),
                                image: t.image,
                              });
                            }}
                            className="bg-accent2/10 border border-accent2/30 text-accent2 text-[10px] font-bold px-3 py-1.5 rounded hover:bg-accent2 hover:text-bg transition-all"
                            title="Add to Watchlist"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
