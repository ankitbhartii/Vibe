'use client'
import { useEffect, useState } from 'react'

export default function VibeLoader() {
  const [phase, setPhase] = useState(0)
  // 0 = black,  1 = letters drop in,  2 = underline + glow,  3 = fade out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120)   // letters drop in
    const t2 = setTimeout(() => setPhase(2), 900)   // underline + glow bloom
    const t3 = setTimeout(() => setPhase(3), 2800)  // fade out
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const letters = ['V', 'I', 'B', 'E']

  return (
    <>
      <style>{`
        @keyframes vibe-drop {
          0%   { transform: translateY(-50px) scaleY(1.3); opacity: 0; }
          100% { transform: translateY(0)     scaleY(1);   opacity: 1; }
        }
        @keyframes shimmer-slide {
          0%   { left: -100%; }
          100% { left: 200%;  }
        }
        @keyframes eq-bar {
          0%   { height: 4px; }
          100% { height: 22px; }
        }
        @keyframes vibe-glow-pulse {
          0%, 100% { text-shadow: 0 0 30px rgba(255,45,85,0.7), 0 0 60px rgba(255,45,85,0.3); }
          50%       { text-shadow: 0 0 50px rgba(255,45,85,1),   0 0 100px rgba(255,45,85,0.5); }
        }
      `}</style>

      {/* Full-screen overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: phase === 3 ? 0 : 1,
        transition: phase === 3 ? 'opacity 0.7s ease-in-out' : 'none',
        pointerEvents: phase === 3 ? 'none' : 'all',
      }}>

        {/* Ambient radial glow — grows on phase 2 */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: phase >= 2
            ? 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(255,45,85,0.18) 0%, rgba(80,0,30,0.10) 60%, transparent 100%)'
            : 'radial-gradient(ellipse 55% 45% at 50% 50%, transparent 0%, transparent 100%)',
          transition: 'background 1s ease',
        }} />

        {/* Cinematic letterbox bars */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'60px',
          background:'linear-gradient(to bottom, #000 40%, transparent)', zIndex:10 }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'60px',
          background:'linear-gradient(to top, #000 40%, transparent)', zIndex:10 }} />

        {/* ── LOGO LETTERS ── */}
        <div style={{ position:'relative', zIndex:5, display:'flex', alignItems:'center', gap:'2px' }}>

          {/* Shimmer sweep overlay — slides across the whole word */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            width: '45%',
            background: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)',
            zIndex: 20,
            animation: phase >= 2 ? 'shimmer-slide 0.9s ease forwards' : 'none',
            pointerEvents: 'none',
          }} />

          {letters.map((letter, i) => (
            <span
              key={letter}
              style={{
                display: 'inline-block',
                fontSize: 'clamp(72px, 14vw, 115px)',
                fontWeight: 900,
                fontFamily: '"Arial Black", "Impact", "Helvetica Neue", sans-serif',
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '-1px',
                opacity: 0,
                animation: phase >= 1
                  ? `vibe-drop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s forwards,
                     ${phase >= 2 ? `vibe-glow-pulse 2s ease-in-out ${0.3 + i * 0.05}s infinite` : 'none'}`
                  : 'none',
                position: 'relative', zIndex: 15,
              }}
            >
              {letter}
            </span>
          ))}

          {/* Red underline — grows from center on phase 2 */}
          <div style={{
            position: 'absolute', bottom: '-10px', left: '50%',
            transform: 'translateX(-50%)',
            height: '4px', borderRadius: '2px',
            background: 'linear-gradient(90deg, #ff2d55, #ff6b8a)',
            boxShadow: '0 0 18px rgba(255,45,85,0.9)',
            width: phase >= 2 ? '100%' : '0%',
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s',
          }} />
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: '30px', zIndex: 5,
          fontSize: '10px', fontWeight: 600,
          letterSpacing: '6px', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
          fontFamily: '"Helvetica Neue", sans-serif',
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s',
        }}>
          Your Music Universe
        </div>

        {/* Equalizer bars */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '5px',
          height: '22px', marginTop: '28px', zIndex: 5,
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.5s ease 0.6s',
        }}>
          {[0.55, 0.4, 0.7, 0.5, 0.65, 0.45, 0.6].map((dur, i) => (
            <div key={i} style={{
              width: '3px', height: '4px', borderRadius: '2px',
              background: 'linear-gradient(to top, #ff2d55, #ff8ca0)',
              boxShadow: '0 0 6px rgba(255,45,85,0.7)',
              animation: phase >= 2
                ? `eq-bar ${dur}s ease-in-out ${i * 0.08}s infinite alternate`
                : 'none',
            }} />
          ))}
        </div>

      </div>
    </>
  )
}
