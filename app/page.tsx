"use client";
import React, { useEffect, useRef, useState } from "react";

// --- CORE SYSTEM DATA ---
type StarData = { id: string; name: string; x: number; y: number; z: number; color: string; radius: number; distanceLY: number; isCustom?: boolean };

const CORE_STARS: StarData[] = [
  { id: "SOL", name: "Sun (Sol)", x: 0, y: 0, z: 0, color: "#fef08a", radius: 1, distanceLY: 0 },
  { id: "CEN", name: "Alpha Centauri", x: 4.37, y: 0.0, z: 0.0, color: "#fde047", radius: 1.1, distanceLY: 4.37 },
  { id: "SIR", name: "Sirius A", x: -2.0, y: -8.0, z: -2.5, color: "#cffafe", radius: 1.7, distanceLY: 8.6 }
];

export default function DeepSpaceEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [velocityC, setVelocityC] = useState(0); 
  const [timeMultiplier, setTimeMultiplier] = useState(1); 
  const [telemetry, setTelemetry] = useState({ gamma: 1, universeYears: 0, shipYears: 0, contractedDist: 0 });
  
  const [knownStars, setKnownStars] = useState<StarData[]>(CORE_STARS);
  const [targetStar, setTargetStar] = useState<StarData>(CORE_STARS[1]); 
  const [isNavLocked, setIsNavLocked] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const velRef = useRef(velocityC);
  const timeRef = useRef(timeMultiplier);
  const navLockRef = useRef(isNavLocked);
  const targetStarRef = useRef(targetStar);
  const knownStarsRef = useRef(knownStars);
  
  useEffect(() => { velRef.current = velocityC; }, [velocityC]);
  useEffect(() => { timeRef.current = timeMultiplier; }, [timeMultiplier]);
  useEffect(() => { navLockRef.current = isNavLocked; }, [isNavLocked]);
  useEffect(() => { targetStarRef.current = targetStar; }, [targetStar]);
  useEffect(() => { knownStarsRef.current = knownStars; }, [knownStars]);

  const engineState = useRef({
    ship: { x: 0, y: 0.001, z: -1.0 }, 
    camera: { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 },
    mouse: { isDown: false, lastX: 0, lastY: 0 },
    clocks: { universe: 0, ship: 0 }
  });

  const bgDust = useRef(Array.from({ length: 3000 }, () => ({
    x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100, z: (Math.random() - 0.5) * 100,
    baseAlpha: Math.random() * 0.8 + 0.2
  })));

  // --- FIXED SIMBAD API UPLINK ---
  const searchSimbadAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError("");

    try {
      // Secure the input against SQL injection bugs
      const safeQuery = searchQuery.trim().replace(/'/g, "''");
      
      // Standardized ADQL 2.0 Query joining the 'ident' table for common names
      const adql = `SELECT TOP 1 basic.MAIN_ID, basic.ra, basic.dec, parallaxes.plx FROM basic JOIN parallaxes ON basic.oid = parallaxes.oidref JOIN ident ON basic.oid = ident.oidref WHERE LOWER(ident.id) LIKE LOWER('%${safeQuery}%') AND parallaxes.plx > 0`;
      
      // Updated to the highly stable CDS Unistra domain
      const url = `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=json&query=${encodeURIComponent(adql)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
         throw new Error(`Server rejected query (HTTP ${response.status})`);
      }
      
      const data = await response.json();

      if (data.error) {
         throw new Error("ADQL Parse Error from Database.");
      }

      if (!data.data || data.data.length === 0) {
        setSearchError("No star matches that designation.");
        setIsSearching(false);
        return;
      }

      // Extract Data from the Multi-dimensional Array
      const starData = data.data[0];
      const name = String(starData[0]).replace(/b'/g, '').replace(/'/g, '').trim();
      const ra = parseFloat(starData[1]);
      const dec = parseFloat(starData[2]);
      const plx = parseFloat(starData[3]); // Parallax in milliarcseconds

      // Convert Parallax to Light Years
      const distParsecs = 1000 / plx;
      const distLY = distParsecs * 3.26156;
      
      // Convert Spherical Coordinates (RA/Dec) to Cartesian 3D (X, Y, Z)
      const raRad = ra * (Math.PI / 180);
      const decRad = dec * (Math.PI / 180);

      const x = distLY * Math.cos(decRad) * Math.cos(raRad);
      const y = distLY * Math.sin(decRad);
      const z = distLY * Math.cos(decRad) * Math.sin(raRad);

      const newStar: StarData = {
        id: `API-${Date.now()}`,
        name: name,
        x: x, y: y, z: z,
        color: "#a5b4fc", 
        radius: 1.5,
        distanceLY: distLY,
        isCustom: true
      };

      setKnownStars(prev => [...prev, newStar]);
      setTargetStar(newStar);
      setIsNavLocked(true);
      setSearchQuery("");

    } catch (err: any) {
      console.error("Uplink Error:", err);
      setSearchError(err.message || "Connection to Earth failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    engineState.current.mouse.isDown = true;
    engineState.current.mouse.lastX = e.clientX;
    engineState.current.mouse.lastY = e.clientY;
  };
  const handleMouseUp = () => { engineState.current.mouse.isDown = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    const mouse = engineState.current.mouse;
    if (!mouse.isDown || isNavLocked) return; 
    const dx = e.clientX - mouse.lastX;
    const dy = e.clientY - mouse.lastY;
    engineState.current.camera.targetYaw += dx * 0.003; 
    engineState.current.camera.targetPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, engineState.current.camera.targetPitch - dy * 0.003));
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  };

  const engageNavLock = (star: StarData) => {
    setTargetStar(star);
    setIsNavLocked(true); 
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let reqId: number;
    const dtBase = 0.001; 

    const project = (x: number, y: number, z: number, v_c: number) => {
      const state = engineState.current;
      let dx = x - state.ship.x; let dy = y - state.ship.y; let dz = z - state.ship.z;

      let tx = dx * Math.cos(state.camera.yaw) - dz * Math.sin(state.camera.yaw);
      let tz = dx * Math.sin(state.camera.yaw) + dz * Math.cos(state.camera.yaw);
      let ty = dy * Math.cos(state.camera.pitch) - tz * Math.sin(state.camera.pitch);
      let fz = dy * Math.sin(state.camera.pitch) + tz * Math.cos(state.camera.pitch);

      if (fz < 0.000001) return null; 

      const aberration = 1 - (v_c * 0.2); 
      const scale = (width / 2) * (1 / fz) * aberration;
      return { sx: width / 2 + tx * scale, sy: height / 2 + ty * scale, scale: scale, dist: fz };
    };

    const animate = () => {
      const state = engineState.current;
      const v = velRef.current;
      const tMult = timeRef.current;
      const activeStars = knownStarsRef.current;
      
      if (navLockRef.current) {
        const tgt = targetStarRef.current;
        const dx = tgt.x - state.ship.x; const dy = tgt.y - state.ship.y; const dz = tgt.z - state.ship.z;
        const distanceXZ = Math.sqrt(dx * dx + dz * dz);
        state.camera.targetYaw = Math.atan2(dx, dz);
        state.camera.targetPitch = Math.atan2(dy, distanceXZ);
      }

      state.camera.yaw += (state.camera.targetYaw - state.camera.yaw) * 0.1;
      state.camera.pitch += (state.camera.targetPitch - state.camera.pitch) * 0.1;

      ctx.fillStyle = "#020202"; ctx.fillRect(0, 0, width, height);

      const gamma = 1 / Math.sqrt(1 - Math.pow(v, 2));
      const deltaYears = dtBase * tMult;
      state.clocks.universe += deltaYears;
      state.clocks.ship += deltaYears / gamma;

      let activeV = v;
      const tgt = targetStarRef.current;
      const distToTgt = Math.hypot(tgt.x - state.ship.x, tgt.y - state.ship.y, tgt.z - state.ship.z);

      if (navLockRef.current && v > 0) {
          const frameDist = v * deltaYears;
          if (frameDist > distToTgt - 0.05) {
              activeV = 0; setVelocityC(0); setTimeMultiplier(1);
          }
      }

      if (activeV > 0) {
        const moveDist = activeV * deltaYears; 
        state.ship.x += Math.sin(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
        state.ship.y += Math.sin(state.camera.pitch) * moveDist;
        state.ship.z += Math.cos(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
      }

      if (Math.random() < 0.1) {
        setTelemetry({ 
            gamma, universeYears: state.clocks.universe, shipYears: state.clocks.ship,
            contractedDist: distToTgt / gamma 
        });
      }

      bgDust.current.forEach(dust => {
        let dx = dust.x - state.ship.x; let dy = dust.y - state.ship.y; let dz = dust.z - state.ship.z;
        const boxSize = 50; 
        if (dx > boxSize) dust.x -= boxSize * 2; if (dx < -boxSize) dust.x += boxSize * 2;
        if (dy > boxSize) dust.y -= boxSize * 2; if (dy < -boxSize) dust.y += boxSize * 2;
        if (dz > boxSize) dust.z -= boxSize * 2; if (dz < -boxSize) dust.z += boxSize * 2;

        const proj = project(dust.x, dust.y, dust.z, activeV);
        const projTail = project(
            dust.x + Math.sin(state.camera.yaw) * Math.cos(state.camera.pitch) * activeV * 2, 
            dust.y + Math.sin(state.camera.pitch) * activeV * 2, 
            dust.z + Math.cos(state.camera.yaw) * Math.cos(state.camera.pitch) * activeV * 2, 
            activeV
        );

        if (proj && projTail) {
          const distToShip = Math.hypot(dx, dy, dz);
          const fade = Math.max(0, 1 - (distToShip / boxSize));
          
          const distFromCenter = Math.hypot(proj.sx - width / 2, proj.sy - height / 2);
          let r = 255, g = 255, b = 255;
          if (activeV > 0.1) {
              const shift = Math.min(1, distFromCenter / (width / 2)); 
              r = Math.floor(255 * shift); b = Math.floor(255 * (1 - shift)); g = Math.floor(255 * (1 - shift * 0.5));
          }

          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${dust.baseAlpha * fade})`;
          ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(proj.sx, proj.sy); ctx.lineTo(projTail.sx, projTail.sy); ctx.stroke();
        }
      });

      let targetOnScreen = false;
      activeStars.forEach(star => {
        const proj = project(star.x, star.y, star.z, activeV);
        const isTarget = star.id === targetStarRef.current.id;

        if (proj) {
          if (isTarget && proj.sx > 0 && proj.sx < width && proj.sy > 0 && proj.sy < height) targetOnScreen = true;

          const cinematicScale = star.radius * 0.0005;
          const coreRadius = Math.max(1, Math.min(width * 0.4, cinematicScale * proj.scale));
          const glowRadius = Math.max(2, coreRadius * 3);

          if (proj.dist > 0.0001) {
             const gradient = ctx.createRadialGradient(proj.sx, proj.sy, coreRadius, proj.sx, proj.sy, glowRadius);
             gradient.addColorStop(0, `${star.color}90`); gradient.addColorStop(1, "rgba(0,0,0,0)");
             ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(proj.sx, proj.sy, glowRadius, 0, Math.PI * 2); ctx.fill();
             ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(proj.sx, proj.sy, coreRadius, 0, Math.PI * 2); ctx.fill();
          }

          if ((proj.dist < 100 && proj.dist > 0.1) || isTarget) {
            ctx.fillStyle = isTarget ? "rgba(34, 211, 238, 0.9)" : "rgba(255,255,255,0.5)";
            ctx.font = isTarget ? "bold 12px monospace" : "10px monospace";
            ctx.fillText(star.name, proj.sx + glowRadius + 5, proj.sy + 3);
          }

          if (isTarget && navLockRef.current) {
            ctx.strokeStyle = "rgba(34, 211, 238, 0.8)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(proj.sx, proj.sy, glowRadius + 15, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(proj.sx, proj.sy - glowRadius - 20); ctx.lineTo(proj.sx, proj.sy - glowRadius - 10);
            ctx.moveTo(proj.sx, proj.sy + glowRadius + 20); ctx.lineTo(proj.sx, proj.sy + glowRadius + 10);
            ctx.moveTo(proj.sx - glowRadius - 20, proj.sy); ctx.lineTo(proj.sx - glowRadius - 10, proj.sy);
            ctx.moveTo(proj.sx + glowRadius + 20, proj.sy); ctx.lineTo(proj.sx + glowRadius + 10, proj.sy);
            ctx.stroke();
          }
        } else if (isTarget) { targetOnScreen = false; }
      });

      if (!targetOnScreen) {
        const tgt = targetStarRef.current;
        let dx = tgt.x - state.ship.x; let dy = tgt.y - state.ship.y; let dz = tgt.z - state.ship.z;
        let tx = dx * Math.cos(state.camera.yaw) - dz * Math.sin(state.camera.yaw);
        let ty = dy * Math.cos(state.camera.pitch) - (dx * Math.sin(state.camera.yaw) + dz * Math.cos(state.camera.yaw)) * Math.sin(state.camera.pitch);
        
        const angle = Math.atan2(ty, tx);
        const arrowX = width/2 + Math.cos(angle) * (Math.min(width/2, height/2) - 50);
        const arrowY = height/2 + Math.sin(angle) * (Math.min(width/2, height/2) - 50);

        ctx.fillStyle = "rgba(34, 211, 238, 0.8)"; ctx.beginPath(); ctx.arc(arrowX, arrowY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.font = "10px monospace"; ctx.fillText("TARGET", arrowX + 10, arrowY + 4);
      }

      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(animate);

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(reqId); window.removeEventListener("resize", handleResize); };
  }, []);

  return (
    <main 
      className={`relative w-screen h-screen bg-[#020202] text-white font-mono overflow-hidden selection:bg-indigo-900 ${isNavLocked ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />

      {/* CRT SCANLINE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>

      {!isNavLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30">
          <div className="w-8 h-px bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="w-px h-8 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      )}

      {/* RIGHT PANEL: API SEARCH & TARGETING */}
      <aside className="absolute top-6 right-6 w-80 bg-black/60 backdrop-blur-xl border border-indigo-500/20 p-4 rounded-lg pointer-events-auto shadow-[0_0_30px_rgba(99,102,241,0.05)] max-h-[85vh] flex flex-col z-10">
        
        {/* GLOBAL SEARCH */}
        <div className="mb-4">
          <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Global SIMBAD Uplink
          </p>
          <form onSubmit={searchSimbadAPI} className="flex gap-2">
            <input 
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query star (e.g., Vega)"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50">
              {isSearching ? "..." : "SCAN"}
            </button>
          </form>
          {searchError && <p className="text-[9px] text-red-400 mt-1 uppercase tracking-widest">{searchError}</p>}
        </div>

        <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
          <h2 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active Waypoints</h2>
          <button onClick={() => setIsNavLocked(false)} className={`text-[9px] px-2 py-1 rounded uppercase transition-colors ${isNavLocked ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/40" : "bg-neutral-800 text-neutral-500 border border-neutral-700 hover:bg-neutral-700"}`}>
            {isNavLocked ? "Unlock Camera" : "Manual Flight"}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
          {knownStars.map(star => {
            const isTargeted = targetStar.id === star.id && isNavLocked;
            return (
              <div key={star.id} className={`p-2 rounded flex flex-col transition-colors border ${isTargeted ? "bg-cyan-950/40 border-cyan-500" : "bg-white/5 border-white/5 hover:bg-white/10"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold flex items-center gap-2">
                    {star.name}
                    {star.isCustom && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1 rounded uppercase border border-indigo-500/30">API</span>}
                  </span>
                  <button onClick={() => engageNavLock(star)} className={`text-[9px] px-2 py-0.5 rounded uppercase transition-colors ${isTargeted ? "bg-cyan-500 text-black font-bold" : "bg-cyan-900/50 text-cyan-300 hover:bg-cyan-500 hover:text-black"}`}>
                    {isTargeted ? "Tracking" : "Lock On"}
                  </button>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Target Distance:</span>
                  <span className="text-white font-bold">{Math.hypot(star.x - engineState.current.ship.x, star.y - engineState.current.ship.y, star.z -
