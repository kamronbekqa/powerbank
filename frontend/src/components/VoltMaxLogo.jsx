import React from 'react';

/**
 * `onDark` forces light text. The footer sits on a fixed dark background
 * regardless of theme, so a theme-aware colour would render near-black text on
 * near-black and become invisible in light mode.
 */
export default function VoltMaxLogo({ size = 'medium', showText = true, onDark = false, className = '' }) {
  const iconSizes = {
    small: { w: 28, h: 28, font: '1.1rem', subFont: '0.6rem' },
    medium: { w: 36, h: 36, font: '1.35rem', subFont: '0.7rem' },
    large: { w: 48, h: 48, font: '1.8rem', subFont: '0.85rem' }
  };

  const dim = iconSizes[size] || iconSizes.medium;

  return (
    <div className={`voltmax-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
      <svg width={dim.w} height={dim.h} viewBox="0 0 100 100" fill="none" style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 240, 255, 0.35))' }}>
        <defs>
          <linearGradient id="vmlShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="vmlBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE600" />
            <stop offset="100%" stopColor="#FF9900" />
          </linearGradient>
          <linearGradient id="vmlGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M50 8 L82 20 V46 C82 66 68 84 50 92 C32 84 18 66 18 46 V20 Z" fill="url(#vmlShieldGrad)" stroke="#00F0FF" strokeWidth="2.5" />
        <path d="M50 14 L76 24 V45 C76 61 64 77 50 84 C36 77 24 61 24 45 V24 Z" fill="url(#vmlGlow)" />
        <path d="M54 22 L32 50 H48 L44 78 L68 46 H52 L54 22 Z" fill="url(#vmlBoltGrad)" stroke="#FFFFFF" strokeWidth="1" />
      </svg>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: dim.font, fontWeight: 900, tracking: '0.5px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <span style={{ color: onDark ? '#f8fafc' : 'var(--meco-text-main, #0f172a)' }}>VOLTMAX</span>
            <span style={{ color: '#00F0FF', textShadow: '0 0 12px rgba(0,240,255,0.4)' }}>HUB</span>
          </span>
          <span style={{ fontSize: dim.subFont, fontWeight: 700, color: onDark ? '#94a3b8' : 'var(--meco-text-muted, #64748b)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>
            SOLAR & POWER STATIONS
          </span>
        </div>
      )}
    </div>
  );
}
