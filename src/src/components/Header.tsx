import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { ChevronDown, ExternalLink } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  isDarkMode,
  toggleTheme,
}) => {
  const [isHattyOpen, setIsHattyOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsHattyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hattyLinks = [
    { title: "Learn With Hatty", sub: "Tutorials & guides", url: "https://earnwithhatty.com/" },
    { title: "Hatty's Tools", sub: "Useful web tools", url: "https://earn-with-hatty-tools.netlify.app/" },
    { title: "Hatty's Media", sub: "Videos & content", url: "https://hattys-media.netlify.app/" },
    { title: "Privacy Gadgets", sub: "Privacy tools & gear", url: "https://privacy-gadgets-hub.netlify.app/" },
    { title: "Hatty's Universe", sub: "Explore the ecosystem", url: "https://hatty-universe.netlify.app/" },
    { title: "Hatty's News", sub: "Latest crypto news", url: "https://hattys-news.netlify.app/" },
  ];

  return (
    <header className="flex items-center justify-between px-5 py-2 bg-bg2/98 border-b border-border sticky top-0 z-[400]">
      <div className="font-orbitron text-lg font-black bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
        Token-Tokens
      </div>
      
      <nav className="flex items-center gap-1">
        <TabButton
          active={activeTab === 'chart'}
          onClick={() => setActiveTab('chart')}
          label="📊 Chart"
        />
        <TabButton
          active={activeTab === 'learn'}
          onClick={() => setActiveTab('learn')}
          label="📚 Learn"
        />
        <TabButton
          active={activeTab === 'news'}
          onClick={() => setActiveTab('news')}
          label="📰 News"
        />
        
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => setIsHattyOpen(!isHattyOpen)}
            className={cn(
              "flex items-center gap-1 font-semibold text-[13px] px-3 py-1.5 rounded-md transition-all text-text2 hover:text-accent hover:bg-accent/5",
              isHattyOpen && "text-accent bg-accent/10"
            )}
          >
            🔗 HattyHats <ChevronDown size={14} className={cn("transition-transform", isHattyOpen && "rotate-180")} />
          </button>
          
          <AnimatePresence>
            {isHattyOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-64 bg-bg2 border border-border rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-3 bg-gradient-to-br from-accent/10 to-accent2/5 border-b border-border">
                  <div className="font-orbitron text-[10px] font-bold text-text3 tracking-widest uppercase">HattyHats Links</div>
                </div>
                <div className="py-1">
                  {hattyLinks.map((link) => (
                    <a
                      key={link.title}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/5 group transition-colors"
                    >
                      <div>
                        <div className="text-sm font-bold text-text group-hover:text-accent transition-colors">{link.title}</div>
                        <div className="text-[10px] font-mono text-text3">{link.sub}</div>
                      </div>
                      <ExternalLink size={12} className="text-text3 group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" />
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full border border-green/40 text-green text-[10px] font-mono">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          LIVE
        </div>
        <button
          onClick={onOpenSettings}
          className="bg-surface border border-border text-text2 px-3 py-1.5 rounded-md text-xs font-semibold hover:text-accent hover:border-accent transition-all shadow-md"
        >
          ⚙ Settings
        </button>
        <button
          onClick={toggleTheme}
          className="bg-surface border border-border text-text2 px-3 py-1.5 rounded-md text-xs hover:text-accent hover:border-accent transition-all shadow-md"
        >
          {isDarkMode ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    onClick={onClick}
    className={cn(
      "font-semibold text-[13px] tracking-wider uppercase px-3 py-1.5 rounded-md transition-all",
      active
        ? "text-accent bg-accent/10"
        : "text-text2 hover:text-accent hover:bg-accent/5"
    )}
  >
    {label}
  </button>
);

import { motion, AnimatePresence } from 'motion/react';
