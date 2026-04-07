import React, { useState, useEffect } from 'react';
import { fetchNews } from '@/src/services/api';
import { ExternalLink, Clock, Newspaper } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const NewsSection: React.FC = () => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  const categories = [
    { id: '', label: 'All News' },
    { id: 'BTC', label: 'Bitcoin' },
    { id: 'ETH', label: 'Ethereum' },
    { id: 'ADA', label: 'Cardano' },
    { id: 'SOL', label: 'Solana' },
    { id: 'DeFi', label: 'DeFi' },
    { id: 'NFT', label: 'NFT' },
  ];

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      try {
        const data = await fetchNews(category);
        setNews(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, [category]);

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg">
      <div className="p-4 border-b border-border bg-bg2 flex items-center gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 text-accent mr-4 shrink-0">
          <Newspaper size={18} />
          <span className="font-orbitron font-bold text-sm tracking-wider uppercase">Live News</span>
        </div>
        <div className="flex gap-2">
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
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <div className="text-text3 font-mono text-sm">Fetching headlines...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {Array.isArray(news) && news.length > 0 ? (
              news.map((item, index) => (
                <a
                  key={item.id || item.url || index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface border border-border rounded-xl overflow-hidden hover:border-accent2/50 transition-all group flex flex-col"
                >
                  <div className="aspect-video relative overflow-hidden bg-bg2">
                    <img
                      src={item.imageurl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/crypto/400/225';
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-bg/80 backdrop-blur-md border border-border px-2 py-1 rounded text-[10px] font-bold text-accent">
                      {item.source_info?.name || 'News'}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-text3">
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(item.published_on)}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.categories?.split('|').slice(0, 2).map((c: string) => (
                          <span key={c} className="bg-accent/5 px-1.5 py-0.5 rounded text-accent/70">#{c}</span>
                        ))}
                      </div>
                    </div>
                    <h3 className="font-bold text-text group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-text2 line-clamp-3 leading-relaxed">
                      {item.body}
                    </p>
                    <div className="mt-auto pt-3 border-t border-border/30 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-accent2 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Read full story <ExternalLink size={10} />
                      </span>
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-4">📡</div>
                <div className="text-text font-bold mb-2">No news found</div>
                <div className="text-text3 text-sm max-w-xs">
                  We couldn't find any news for this category. Try switching to "All News".
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
