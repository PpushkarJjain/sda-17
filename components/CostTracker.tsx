import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { getSessionSummary, resetSession, subscribe, type SessionSummary } from '../services/costTracker';

const useCostTracker = (): SessionSummary => {
  return useSyncExternalStore(
    subscribe,
    getSessionSummary,
    getSessionSummary
  );
};

const formatCost = (cost: number): string => {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
};

const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
};

const CostTracker: React.FC = () => {
  const summary = useCostTracker();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      {/* Expanded Panel */}
      {isExpanded && (
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '10px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          color: '#e0e0e0',
          minWidth: '280px',
          animation: 'costTrackerSlideUp 0.25s ease-out',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#a78bfa', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Session Cost
            </span>
            <button
              onClick={() => {
                if (window.confirm('Reset session cost tracker?')) resetSession();
              }}
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            >
              Reset
            </button>
          </div>

          {/* Big cost display */}
          <div style={{
            fontSize: '32px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #34d399, #6ee7b7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px',
            letterSpacing: '-1px',
          }}>
            {formatCost(summary.totalEstimatedCost)}
          </div>

          {/* Stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '10px',
              padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>API Calls</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{summary.totalCalls}</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '10px',
              padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Tokens</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{formatTokens(summary.totalInputTokens + summary.totalOutputTokens)}</div>
            </div>
            <div style={{
              background: 'rgba(167,139,250,0.08)',
              borderRadius: '10px',
              padding: '10px 12px',
              border: '1px solid rgba(167,139,250,0.15)',
            }}>
              <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Input</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#c4b5fd' }}>{formatTokens(summary.totalInputTokens)}</div>
            </div>
            <div style={{
              background: 'rgba(52,211,153,0.08)',
              borderRadius: '10px',
              padding: '10px 12px',
              border: '1px solid rgba(52,211,153,0.15)',
            }}>
              <div style={{ fontSize: '10px', color: '#34d399', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Output</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#6ee7b7' }}>{formatTokens(summary.totalOutputTokens)}</div>
            </div>
          </div>

          {/* Recent calls */}
          {summary.entries.length > 0 && (
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Recent ({Math.min(summary.entries.length, 5)} of {summary.entries.length})
              </div>
              {summary.entries.slice(-5).reverse().map((entry, i) => (
                <div key={entry.timestamp + i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  fontSize: '11px',
                  borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                }}>
                  <span style={{ color: '#94a3b8', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.functionName}
                  </span>
                  <span style={{ color: '#6ee7b7', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCost(entry.estimatedCost)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating pill button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: summary.totalCalls > 0
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
          color: summary.totalCalls > 0 ? '#6ee7b7' : '#9ca3af',
          border: summary.totalCalls > 0 ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: '50px',
          padding: '10px 16px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          transition: 'all 0.2s ease',
          fontVariantNumeric: 'tabular-nums',
          marginLeft: 'auto',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)';
        }}
      >
        <span style={{ fontSize: '15px' }}>💰</span>
        <span>{formatCost(summary.totalEstimatedCost)}</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>
          {isExpanded ? '▼' : '▲'}
        </span>
      </button>

      {/* Animation keyframes */}
      <style>{`
        @keyframes costTrackerSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CostTracker;
