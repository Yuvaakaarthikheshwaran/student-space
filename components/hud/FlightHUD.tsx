import React from 'react';

export default function FlightHUD({ velocityC, setVelocityC, timeExp, setTimeExp }: any) {
  return (
    <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 pointer-events-none z-20" style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '896px', padding: '0 24px', pointerEvents: 'none', zIndex: 20 }}>
      <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto relative" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '16px', pointerEvents: 'auto', position: 'relative' }}>
        
        <div className="grid grid-cols-2 gap-12 mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '24px' }}>
          
          <div className="flex flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="flex justify-between items-end" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a3a3a3', fontWeight: 'bold' }}>Sub-light Throttle</span>
              <span className="text-base font-black text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" style={{ fontSize: '1rem', fontWeight: 900, color: '#22d3ee', marginLeft: 'auto' }}>{velocityC.toFixed(4)} c</span>
            </div>
            <input type="range" min="0" max="0.9999" step="0.0001" value={velocityC} onChange={(e) => setVelocityC(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer outline-none hover:bg-white/20 transition-all shadow-inner" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', cursor: 'pointer' }} />
            <div className="flex justify-between gap-2 mt-1" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
              {[0, 0.25, 0.5, 0.9, 0.9999].map(val => (
                <button key={val} onClick={() => setVelocityC(val)} className="flex-1 bg-black/40 hover:bg-cyan-500 hover:text-black border border-white/10 hover:border-cyan-500 text-[9px] font-bold py-1.5 rounded transition-all text-neutral-300 cursor-pointer shadow-sm" style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px', fontWeight: 'bold', padding: '6px 0', borderRadius: '4px', color: '#d4d4d8', cursor: 'pointer' }}>
                  {val === 0 ? "STOP" : val === 0.9999 ? "MAX" : `${val}c`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="flex justify-between items-end" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a3a3a3', fontWeight: 'bold' }}>Time Warp Multiplier</span>
              <span className="text-base font-black text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" style={{ fontSize: '1rem', fontWeight: 900, color: '#c084fc', marginLeft: 'auto' }}>{timeExp === 0 ? "1x (Real Time)" : `10^${timeExp.toFixed(1)}x`}</span>
            </div>
            <input type="range" min="0" max="10" step="0.1" value={timeExp} onChange={(e) => setTimeExp(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-purple-400 cursor-pointer outline-none hover:bg-white/20 transition-all shadow-inner" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', cursor: 'pointer' }} />
            <div className="flex justify-between gap-2 mt-1" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
              {[0, 3, 6, 8, 10].map(val => (
                <button key={val} onClick={() => setTimeExp(val)} className="flex-1 bg-black/40 hover:bg-purple-500 hover:text-black border border-white/10 hover:border-purple-500 text-[9px] font-bold py-1.5 rounded transition-all text-neutral-300 cursor-pointer shadow-sm" style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px', fontWeight: 'bold', padding: '6px 0', borderRadius: '4px', color: '#d4d4d8', cursor: 'pointer' }}>
                  {val === 0 ? "1x" : val === 10 ? "MAX" : `10^${val}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-black/50 border border-white/10 rounded-xl p-4 grid grid-cols-5 gap-4 text-center divide-x divide-white/10 shadow-inner" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', textAlign: 'center' }}>
          <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373', fontWeight: 'bold' }}>Lorentz (γ)</span><span id="hud-gamma" className="text-sm font-black text-white" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#fff' }}>1.00</span></div>
          <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373', fontWeight: 'bold' }}>Contracted Dist</span><span id="hud-dist" className="text-sm font-black text-emerald-400" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#34d399' }}>---</span></div>
          <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><span className="text-[9px] uppercase tracking-widest text-cyan-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#06b6d4', fontWeight: 'bold' }}>Ship ETA</span><span id="hud-eta" className="text-sm font-black text-cyan-400 animate-pulse drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#22d3ee' }}>INF</span></div>
          <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373', fontWeight: 'bold' }}>Ship Time</span><span id="hud-ship-time" className="text-sm font-black text-white" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#fff' }}>0.0 YR</span></div>
          <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373', fontWeight: 'bold' }}>Univ Time</span><span id="hud-univ-time" className="text-sm font-black text-purple-400" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#c084fc' }}>0.0 YR</span></div>
        </div>
      </div>
    </footer>
  );
}
