import React, { useState } from 'react';
import { X, Trash2, Database, Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn, safeStorage } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  watchlistCount: number;
  drawingsCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onReset,
  watchlistCount,
  drawingsCount,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const storageSize = (safeStorage.getAll().length / 1024).toFixed(2);

  return (
    <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-bg2 border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden relative"
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-accent/10 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
              <Shield size={18} />
            </div>
            <span className="font-orbitron font-bold text-accent tracking-wider">APP SETTINGS</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red/10 hover:text-red rounded-md transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-text3 mb-2">
              <Database size={16} />
              <span className="text-[10px] font-mono uppercase tracking-widest">Local Storage Data</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <DataCard label="Watchlist" value={watchlistCount} unit="items" />
              <DataCard label="Drawings" value={drawingsCount} unit="objects" />
              <DataCard label="Storage Used" value={storageSize} unit="KB" />
              <DataCard label="Last Sync" value="Live" unit="Status" />
            </div>
          </div>

          <div className="p-4 bg-surface rounded-lg border border-border space-y-3">
            <div className="text-xs font-bold text-text">Data Persistence</div>
            <p className="text-[10px] text-text3 leading-relaxed">
              Your watchlist and chart drawings are automatically saved to your browser's local storage. 
              This allows you to keep your data even after refreshing or closing the tab.
            </p>
          </div>

          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full flex items-center justify-center gap-2 bg-red/10 border border-red/30 text-red font-orbitron text-[10px] font-bold py-3 rounded hover:bg-red hover:text-white transition-all"
            >
              <Trash2 size={14} />
              CLEAR ALL LOCAL DATA
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-accent/10 border border-accent/30 text-accent font-orbitron text-[10px] font-bold py-3 rounded hover:bg-accent hover:text-bg transition-all"
            >
              <RefreshCw size={14} />
              FORCE REFRESH APP
            </button>
          </div>
        </div>

        {showConfirm && (
          <div
            className="absolute inset-0 bg-bg2/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-50"
          >
            <AlertTriangle size={48} className="text-red mb-4 animate-pulse" />
            <h3 className="text-lg font-orbitron font-bold text-text mb-2">ERASE ALL DATA?</h3>
            <p className="text-xs text-text2 mb-6 leading-relaxed">
              This will permanently delete your watchlist and all chart drawings. This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-surface border border-border text-text font-orbitron text-[10px] font-bold py-3 rounded hover:bg-border transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  onReset();
                  onClose();
                }}
                className="flex-1 bg-red text-white font-orbitron text-[10px] font-bold py-3 rounded hover:bg-red/80 transition-all"
              >
                ERASE DATA
              </button>
            </div>
          </div>
        )}

        <div className="p-4 bg-bg border-t border-border text-center">
          <div className="text-[9px] font-mono text-text3">
            Token-Tokens v1.2.0 • Build: 2026.04.07
          </div>
        </div>
      </div>
    </div>
  );
};

const DataCard: React.FC<{ label: string; value: string | number; unit: string }> = ({ label, value, unit }) => (
  <div className="bg-surface border border-border p-3 rounded-lg">
    <div className="text-[9px] font-mono text-text3 uppercase mb-1">{label}</div>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-orbitron font-black text-text">{value}</span>
      <span className="text-[8px] font-mono text-text3 uppercase">{unit}</span>
    </div>
  </div>
);
