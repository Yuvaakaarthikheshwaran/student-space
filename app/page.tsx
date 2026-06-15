"use client";
import React, { useEffect, useRef, useState } from "react";

type StarData = { id: string; name: string; x: number; y: number; z: number; color: string; radius: number; distanceLY: number; class: string; temp?: number; mass?: number };

const CORE_STARS: StarData[] = [
  { id: "SOL", name: "Sun (Sol)", class: "G2V Yellow Dwarf", x: 0, y: 0, z: 0, color: "#fef08a", radius: 1, distanceLY: 0, temp: 5778, mass: 1 },
  { id: "CEN", name: "Alpha Centauri", class: "G2V/K1V Binary", x: 4.37, y: 0, z: 0, color: "#fde047", radius: 1.1, distanceLY: 4.37, temp: 5790, mass: 1.1 },
  { id: "SIR", name: "Sirius A", class: "A1V Main Sequence", x: -2.0, y: -8.0, z: -2.5, color: "#cffafe", radius: 1.71, distanceLY: 8.6, temp: 9940, mass: 2.02 },
  { id: "VEG", name: "Vega", class: "A0V Main Sequence", x: 15.0, y: 15.0, z: -10.0, color: "#67e8f9", radius: 2.36, distanceLY: 25.0, temp: 9602, mass: 2.13 },
  { id: "BET", name: "Betelgeuse", class: "M1-2 Red Supergiant", x: -400.0, y: -100.0, z: 300.0, color: "#dc2626", radius: 887.0, distanceLY: 548.0, temp: 3600, mass: 16.5 },
  { id: "RIG", name: "Rigel", class: "B8 Blue Supergiant", x: -600.0, y: -200.0, z: 500.0, color: "#3b82f6", radius: 78.9, distanceLY: 860.0, temp: 12100, mass: 21 },
  { id: "BAR", name: "Barnard's Star", class: "M4.0V Red Dwarf", x: 3.5, y: 4.0, z: 2.0, color: "#ef4444", radius: 0.19, distanceLY: 5.96, temp: 3134, mass: 0.14 }
];

const SECONDS_PER_YEAR = 31557600;

export default function DeepSpaceEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [velocityC, setVelocityC] = useState(0); 
  const [timeExp, setTimeExp] = useState(0); // 0 = 1x, 10 = 10 Billion x
  const [telemetry, setTelemetry] = useState({ gamma: 1, universeYears: 0, shipYears: 0, contractedDist: 0, etaYears: -1 });
  const [knownStars, setKnownStars] = useState<StarData[]>(CORE_STARS);
  const [targetStar, setTargetStar] = useState<StarData>(CORE_STARS[1]);
  const [isNavLocked, setIsNavLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const stateRefs = useRef({ vel: 0, timeExp: 0, lock: false, tgt: CORE_STARS[1], stars: CORE_STARS });
  useEffect(() => { stateRefs.current = { vel: velocityC, timeExp, lock: isNavLocked, tgt: targetStar, stars: knownStars }; }, [velocityC, timeExp, isNavLocked, targetStar, knownStars]);

  const engineState = useRef({
    ship: { x: 0, y: 0.001, z: -1.0 }, camera: { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 },
    mouse: { isDown: false, lastX: 0, lastY: 0 }, clocks: { universe: 0, ship: 0 }, lastFrameTime: 0
  });

  const bgDust = useRef(Array.from({ length: 8000 }, () => ({
    x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200, alpha: Math.random() * 0.8 + 0.2
  })));

  const searchSimbadAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true); setSearchError("");
    
    try {
      const sq = searchQuery.trim().toLowerCase().replace(/'/g, "''");
      const localMatch = CORE_STARS.find(s => s.name.toLowerCase().includes(sq));
      if (localMatch) {
         setTargetStar(localMatch); setIsNavLocked(true); setIsSearching(false); setSearchQuery(""); return;
      }

      const adql = `SELECT basic.MAIN_ID, basic.ra, basic.dec, parallaxes.plx FROM ident JOIN basic ON ident.oidref = basic.oid JOIN parallaxes ON basic.oid = parallaxes.oidref WHERE LOWER(ident.id) = '${sq}' OR LOWER(ident.id) = 'name ${sq}'`;
      const url = `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=json&maxrec=1&query=${encodeURIComponent(adql)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error || !data.data || !data.data.length) throw new Error("Star not found in SIMBAD.");

      const d = data.data[0];
      const name = String(d[0]).replace(/b'|'/g, '').trim();
      const distLY = (1000 / parseFloat(d[3])) * 3.26156;
      const raRad = parseFloat(d[1]) * (Math.PI / 180), decRad = parseFloat(d[2]) * (Math.PI / 180);
      
      const newStar: StarData = {
        id: `API-${Date.now()}`, name, class: "API Class Unknown", color: "#a5b4fc", radius: 1.5, distanceLY: distLY, isCustom: true,
        x: distLY * Math.cos(decRad) * Math.cos(raRad), y: distLY * Math.sin(decRad), z: distLY * Math.cos(decRad) * Math.sin(raRad)
      };
      
      setKnownStars(p => [...p, newStar]); setTargetStar(newStar); setIsNavLocked(true); setSearchQuery("");
    } catch (err: any) { 
      setSearchError(err.message); 
    } finally { setIsSearching(false); }
  };

  const handleMouse = {
    down: (e: React.MouseEvent) => { engineState.current.mouse = { isDown: true, lastX: e.clientX, lastY: e.clientY }; },
    up: () => { engineState.current.mouse.isDown = false; },
    move: (e: React.MouseEvent) => {
      const m = engineState.current.mouse;
      if (!m.isDown || isNavLocked) return;
      engineState.current.camera.targetYaw += (e.clientX - m.lastX) * 0.003;
      engineState.current.camera.targetPitch = Math.max(-1.57, Math.min(1.57, engineState.current.camera.targetPitch - (e.clientY - m.lastY) * 0.003));
      m.lastX = e.clientX; m.lastY = e.clientY;
    }
  };

  const resetEngine = () => {
    engineState.current.ship = { x: 0, y: 0.001, z: -1.0 };
    engineState.current.camera = { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 };
    engineState.current.clocks = { universe: 0, ship: 0 };
    setVelocityC(0); setTimeExp(0); setIsNavLocked(false); setTargetStar(CORE_STARS[1]);
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    let w = canvasRef.current.width = window.innerWidth, h = canvasRef.current.height = window.innerHeight, reqId: number;
    engineState.current.lastFrameTime = performance.now();

    const project = (x: number, y: number, z: number, v_c: number) => {
      const st = engineState.current;
      let dx = x - st.ship.x, dy = y - st.ship.y, dz = z - st.ship.z;
      let tx = dx * Math.cos(st.camera.yaw) - dz * Math.sin(st.camera.yaw);
      let tz = dx * Math.sin(st.camera.yaw) + dz * Math.cos(st.camera.yaw);
      let ty = dy * Math.cos(st.camera.pitch) - tz * Math.sin(st.camera.pitch);
      let fz = dy * Math.sin(st.camera.pitch) + tz * Math.cos(st.camera.pitch);
      if (fz < 0.000001) return null;
      return { sx: w/2 + tx * ((w/2) / fz * (1 - v_c * 0.2)), sy: h/2 + ty * ((w/2) / fz * (1 - v_c * 0.2)), scale: (w/2) / fz * (1 - v_c * 0.2), dist: fz };
    };

    const animate = (now: number) => {
      const st = engineState.current, refs = stateRefs.current;
      
      // REAL TIME CALCULATION
      const deltaRealSeconds = (now - st.lastFrameTime) / 1000;
      st.lastFrameTime = now;
      
      const timeMult = Math.pow(10, refs.timeExp);
      const dYrs = (deltaRealSeconds * timeMult) / SECONDS_PER_YEAR;

      if (refs.lock) {
        let dx = refs.tgt.x - st.ship.x, dy = refs.tgt.y - st.ship.y, dz = refs.tgt.z - st.ship.z;
        st.camera.targetYaw = Math.atan2(dx, dz); st.camera.targetPitch = Math.atan2(dy, Math.hypot(dx, dz));
      }
      st.camera.yaw += (st.camera.targetYaw - st.camera.yaw) * 0.1;
      st.camera.pitch += (st.camera.targetPitch - st.camera.pitch) * 0.1;
      
      ctx.fillStyle = "#020202"; ctx.fillRect(0, 0, w, h);

      const gamma = 1 / Math.sqrt(1 - Math.pow(refs.vel, 2));
      st.clocks.universe += dYrs; st.clocks.ship += dYrs / gamma;
      
      let v = refs.vel, distToTgt = Math.hypot(refs.tgt.x - st.ship.x, refs.tgt.y - st.ship.y, refs.tgt.z - st.ship.z);
      
      // AUTO BRAKING
      if (refs.lock && v > 0 && v * dYrs > distToTgt - 0.05) { v = 0; setVelocityC(0); }
      
      if (v > 0) {
        st.ship.x += Math.sin(st.camera.yaw) * Math.cos(st.camera.pitch) * (v * dYrs);
        st.ship.y += Math.sin(st.camera.pitch) * (v * dYrs);
        st.ship.z += Math.cos(st.camera.yaw) * Math.cos(st.camera.pitch) * (v * dYrs);
      }

      // LIVE ETA MATH
      let etaYears = -1;
      if (refs.lock && v > 0) {
         const contractedDist = distToTgt / gamma;
         etaYears = contractedDist / v;
      }

      if (Math.random() < 0.1) setTelemetry({ gamma, universeYears: st.clocks.universe, shipYears: st.clocks.ship, contractedDist: distToTgt / gamma, etaYears });

      // HIGH PERFORMANCE DUST RENDERER
      ctx.beginPath();
      bgDust.current.forEach(d => {
        let dx = d.x - st.ship.x, dy = d.y - st.ship.y, dz = d.z - st.ship.z;
        if (dx > 50) d.x -= 100; if (dx < -50) d.x += 100;
        if (dy > 50) d.y -= 100; if (dy < -50) d.y += 100;
        if (dz > 50) d.z -= 100; if (dz < -50) d.z += 100;
        const p1 = project(d.x, d.y, d.z, v), p2 = project(d.x + Math.sin(st.camera.yaw)*Math.cos(st.camera.pitch)*v*2, d.y + Math.sin(st.camera.pitch)*v*2, d.z + Math.cos(st.camera.yaw)*Math.cos(st.camera.pitch)*v*2, v);
        if (p1 && p2) {
          ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
        }
      });
      ctx.strokeStyle = `rgba(255, 255, 255, ${v > 0.1 ? 0.6 : 0.2})`;
      ctx.lineWidth = v > 0.1 ? 2 : 1; 
      ctx.stroke();

      let onScreen = false;
      refs.stars.forEach(s => {
        const p = project(s.x, s.y, s.z, v), isTgt = s.id === refs.tgt.id;
        if (p) {
          if (isTgt && p.sx > 0 && p.sx < w && p.sy > 0 && p.sy < h) onScreen = true;
          const cr = Math.max(1, Math.min(w * 0.4, (s.radius * 0.0005) * p.scale)), gr = Math.max(2, cr * 3);
          if (p.dist > 0.0001) {
             const g = ctx.createRadialGradient(p.sx, p.sy, cr, p.sx, p.sy, gr);
             g.addColorStop(0, `${s.color}90`); g.addColorStop(1, "rgba(0,0,0,0)");
             ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.sx, p.sy, gr, 0, 6.28); ctx.fill();
             ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.sx, p.sy, cr, 0, 6.28); ctx.fill();
          }
          if ((p.dist < 100 && p.dist > 0.1) || isTgt) {
            ctx.fillStyle = isTgt ? "#22d3ee" : "rgba(255,255,255,0.5)"; ctx.font = isTgt ? "bold 12px monospace" : "10px monospace";
            ctx.fillText(s.name, p.sx + gr + 5, p.sy + 3);
          }
          if (isTgt && refs.lock) {
            ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.sx, p.sy, gr + 15, 0, 6.28); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.sx, p.sy - gr - 20); ctx.lineTo(p.sx, p.sy - gr - 10); ctx.moveTo(p.sx, p.sy + gr + 20); ctx.lineTo(p.sx, p.sy + gr + 10);
            ctx.moveTo(p.sx - gr - 20, p.sy); ctx.lineTo(p.sx - gr - 10, p.sy); ctx.moveTo(p.sx + gr + 20, p.sy); ctx.lineTo(p.sx + gr + 10, p.sy); ctx.stroke();
          }
        }
      });

      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(performance.now);
    const rs = () => { w = canvasRef.current!.width = window.innerWidth; h = canvasRef.current!.height = window.innerHeight; };
    window.addEventListener("resize", rs); return () => { cancelAnimationFrame(reqId); window.removeEventListener("resize", rs); };
  }, []);

  const formatETA = (years: number) => {
     if (years < 0) return "INF";
     if (years < 0.0027) return `${(years * 365).toFixed(1)} DAYS`;
     return `${years.toFixed(2)} YRS`;
  };

  const getMultiplierLabel = (exp: number) => {
      if (exp === 0) return "1x (REAL TIME)";
      if (exp <= 3) return "1000x (DAYS/SEC)";
      if (exp <= 7) return "10M x (MONTHS/SEC)";
      return "1B+ x (YEARS/SEC)";
  };

  return (
    <main className={`relative w-screen h-screen bg-[#020202] text-white font-mono overflow-hidden ${isNavLocked ? 'cursor-not-allowed' : 'cursor-crosshair'}`} onMouseDown={handleMouse.down} onMouseUp={handleMouse.up} onMouseLeave={handleMouse.up} onMouseMove={handleMouse.move}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>

      <header className="absolute top-6 left-6 z-10">
         <button onClick={resetEngine} className="bg-red-900/50 hover:bg-red-600 border border-red-500/50 text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all">Reset Origin</button>
      </header>

      {/* INTERACTIVE STELLAR SCANNER */}
      {isNavLocked && telemetry.contractedDist < 0.1 && velocityC === 0 && (
         <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 bg-black/80 backdrop-blur-xl border border-cyan-500 p-6 rounded-lg shadow-[0_0_50px_rgba(34,211,238,0.2)] animate-pulse z-20">
             <h3 className="text-cyan-400 font-bold text-lg mb-1 uppercase">Stellar Scan Complete</h3>
             <h1 className="text-3xl font-black text-white mb-4">{targetStar.name}</h1>
             <div className="space-y-2 border-t border-cyan-500/30 pt-4 text-sm">
                 <div className="flex justify-between"><span className="text-neutral-400">Class:</span> <span className="text-white">{targetStar.class}</span></div>
                 <div className="flex justify-between"><span className="text-neutral-400">Surface Temp:</span> <span className="text-orange-400">{targetStar.temp || Math.floor(5700 * Math.sqrt(targetStar.radius))} K</span></div>
                 <div className="flex justify-between"><span className="text-neutral-400">Estimated Mass:</span> <span className="text-white">{targetStar.mass || (targetStar.radius * 0.9).toFixed(2)} M☉</span></div>
                 <div className="flex justify-between"><span className="text-neutral-400">Habitable Zone:</span> <span className="text-green-400">{(Math.sqrt(Math.pow(targetStar.radius, 2))).toFixed(2)} AU</span></div>
             </div>
             <p className="text-[10px] text-neutral-500 mt-4 leading-tight">Data calculated via Main Sequence approximations and Stefan-Boltzmann scaling.</p>
         </div>
      )}

      {!isNavLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30">
          <div className="w-8 h-px bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="w-px h-8 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      )}

      <aside className="absolute top-6 right-6 w-80 bg-black/60 backdrop-blur-xl border border-indigo-500/20 p-4 rounded-lg pointer-events-auto shadow-[0_0_30px_rgba(99,102,241,0.05)] max-h-[85vh] flex flex-col z-10">
        <div className="mb-4">
          <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-2 font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> SIMBAD Uplink</p>
          <form onSubmit={searchSimbadAPI} className="flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Query star (e.g., Vega)" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" />
            <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50">{isSearching ? "..." : "SCAN"}</button>
          </form>
          {searchError && <p className="text-[9px] text-red-400 mt-1 uppercase tracking-widest">{searchError}</p>}
        </div>

        <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
          <h2 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Waypoints</h2>
          <button onClick={() => setIsNavLocked(false)} className={`text-[9px] px-2 py-1 rounded uppercase ${isNavLocked ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-neutral-800 text-neutral-500 border border-neutral-700"}`}>{isNavLocked ? "Unlock Camera" : "Manual Flight"}</button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
          {knownStars.map(star => {
            const isTgt = targetStar.id === star.id && isNavLocked;
            return (
              <div key={star.id} className={`p-2 rounded flex flex-col border ${isTgt ? "bg-cyan-950/40 border-cyan-500" : "bg-white/5 border-white/5"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold flex items-center gap-2">{star.name}</span>
                  <button onClick={() => { setTargetStar(star); setIsNavLocked(true); }} className={`text-[9px] px-2 py-0.5 rounded uppercase ${isTgt ? "bg-cyan-500 text-black font-bold" : "bg-cyan-900/50 text-cyan-300"}`}>{isTgt ? "Tracking" : "Lock On"}</button>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400"><span>Target Dist:</span><span className="text-white font-bold">{Math.hypot(star.x - engineState.current.ship.x, star.y - engineState.current.ship.y, star.z - engineState.current.ship.z).toFixed(4)} LY</span></div>
              </div>
            );
          })}
        </div>
      </aside>

      <footer className="absolute bottom-6 left-6 w-[600px] bg-black/80 backdrop-blur-3xl border border-white/10 p-6 rounded-xl pointer-events-auto shadow-2xl z-10">
        {isNavLocked && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Autopilot Engaged</div>}
        
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-neutral-500">Throttle (v)</span><span className="text-xs font-bold text-cyan-400">{velocityC.toFixed(4)}c</span></div>
            <input type="range" min="0" max="0.9999" step="0.0001" value={velocityC} onChange={(e) => setVelocityC(parseFloat(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-neutral-500">Time Warp</span><span className="text-xs font-bold text-purple-400">{getMultiplierLabel(timeExp)}</span></div>
            <input type="range" min="0" max="10" step="0.1" value={timeExp} onChange={(e) => setTimeExp(parseFloat(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none accent-purple-400 cursor-pointer" />
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 grid grid-cols-5 gap-2 text-center">
          <div><p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Lorentz (γ)</p><p className="text-sm font-bold text-white">{telemetry.gamma.toFixed(2)}</p></div>
          <div><p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Dist (LY)</p><p className="text-sm font-bold text-emerald-400">{telemetry.contractedDist.toFixed(3)}</p></div>
          <div className="border-x border-white/10"><p className="text-[9px] uppercase tracking-widest text-cyan-500 mb-1">Ship ETA</p><p className="text-sm font-bold text-cyan-400 animate-pulse">{formatETA(telemetry.etaYears)}</p></div>
          <div><p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Ship Time</p><p className="text-sm font-bold text-white">{telemetry.shipYears.toFixed(1)} YR</p></div>
          <div><p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Univ Time</p><p className="text-sm font-bold text-purple-400">{telemetry.universeYears.toFixed(1)} YR</p></div>
        </div>
      </footer>
    </main>
  );
}
