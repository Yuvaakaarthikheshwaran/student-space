"use client";
import React, { useEffect, useRef, useState } from "react";

// --- TRUE LOCAL STELLAR NEIGHBORHOOD DATABASE ---
const REAL_STARS = [
  { id: "SOL", name: "Sun (Sol)", class: "G-Type", x: 0, y: 0, z: 0, color: "#fef08a", radius: 1 },
  { id: "CEN", name: "Alpha Centauri", class: "G/K-Type", x: 4.37, y: 0.0, z: 0.0, color: "#fde047", radius: 1.1 },
  { id: "BAR", name: "Barnard's Star", class: "M-Type Red Dwarf", x: 3.5, y: 4.0, z: 2.0, color: "#ef4444", radius: 0.2 },
  { id: "WOL", name: "Wolf 359", class: "M-Type Flare Star", x: -1.0, y: 7.0, z: 3.0, color: "#f87171", radius: 0.16 },
  { id: "SIR", name: "Sirius A", class: "A-Type Main Sequence", x: -2.0, y: -8.0, z: -2.5, color: "#cffafe", radius: 1.7 },
  { id: "ERI", name: "Epsilon Eridani", class: "K-Type Main Sequence", x: -5.0, y: -8.0, z: 5.0, color: "#fdba74", radius: 0.73 },
  { id: "TAU", name: "Tau Ceti", class: "G-Type Main Sequence", x: -11.0, y: 0.0, z: -4.0, color: "#fde047", radius: 0.79 },
  { id: "VEG", name: "Vega", class: "A-Type Main Sequence", x: 15.0, y: 15.0, z: -10.0, color: "#67e8f9", radius: 2.3 },
  { id: "BET", name: "Betelgeuse", class: "M-Type Red Supergiant", x: -400.0, y: -100.0, z: 300.0, color: "#dc2626", radius: 887.0 }
];

export default function DeepSpaceEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // React State for UI
  const [velocityC, setVelocityC] = useState(0); 
  const [timeMultiplier, setTimeMultiplier] = useState(1); 
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [telemetry, setTelemetry] = useState({ gamma: 1, universeYears: 0, shipYears: 0 });
  const [targetStar, setTargetStar] = useState(REAL_STARS[1]); 
  const [isNavLocked, setIsNavLocked] = useState(false);

  // Performance Optimization: Refs prevent the React UI from resetting the 120fps physics loop
  const velRef = useRef(velocityC);
  const timeRef = useRef(timeMultiplier);
  const navLockRef = useRef(isNavLocked);
  const targetStarRef = useRef(targetStar);
  
  useEffect(() => { velRef.current = velocityC; }, [velocityC]);
  useEffect(() => { timeRef.current = timeMultiplier; }, [timeMultiplier]);
  useEffect(() => { navLockRef.current = isNavLocked; }, [isNavLocked]);
  useEffect(() => { targetStarRef.current = targetStar; }, [targetStar]);

  // 64-bit Engine State
  const engineState = useRef({
    ship: { x: 0, y: 0.001, z: -1.0 }, 
    camera: { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 },
    mouse: { isDown: false, lastX: 0, lastY: 0 },
    clocks: { universe: 0, ship: 0 }
  });

  // Physical Background Dust Generation
  const bgDust = useRef(Array.from({ length: 3000 }, () => ({
    x: (Math.random() - 0.5) * 100,
    y: (Math.random() - 0.5) * 100,
    z: (Math.random() - 0.5) * 100,
    baseAlpha: Math.random() * 0.8 + 0.2
  })));

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
    engineState.current.camera.targetYaw += dx * 0.003; // Drag left = Look left
    engineState.current.camera.targetPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, engineState.current.camera.targetPitch - dy * 0.003));
    
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  };

  const engageNavLock = (starId: string) => {
    const target = REAL_STARS.find(s => s.id === starId);
    if (!target) return;
    setTargetStar(target);
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
      
      let dx = x - state.ship.x;
      let dy = y - state.ship.y;
      let dz = z - state.ship.z;

      let tx = dx * Math.cos(state.camera.yaw) - dz * Math.sin(state.camera.yaw);
      let tz = dx * Math.sin(state.camera.yaw) + dz * Math.cos(state.camera.yaw);
      let ty = dy * Math.cos(state.camera.pitch) - tz * Math.sin(state.camera.pitch);
      let fz = dy * Math.sin(state.camera.pitch) + tz * Math.cos(state.camera.pitch);

      if (fz < 0.000001) return null; 

      // SOFTENED Relativistic Aberration so you can actually see the star grow
      const aberration = 1 - (v_c * 0.2); 
      const scale = (width / 2) * (1 / fz) * aberration;

      return { sx: width / 2 + tx * scale, sy: height / 2 + ty * scale, scale: scale, dist: fz };
    };

    const animate = () => {
      const state = engineState.current;
      const v = velRef.current;
      const tMult = timeRef.current;
      
      if (navLockRef.current) {
        const tgt = targetStarRef.current;
        const dx = tgt.x - state.ship.x;
        const dy = tgt.y - state.ship.y;
        const dz = tgt.z - state.ship.z;
        const distanceXZ = Math.sqrt(dx * dx + dz * dz);
        state.camera.targetYaw = Math.atan2(dx, dz);
        state.camera.targetPitch = Math.atan2(dy, distanceXZ);
      }

      state.camera.yaw += (state.camera.targetYaw - state.camera.yaw) * 0.1;
      state.camera.pitch += (state.camera.targetPitch - state.camera.pitch) * 0.1;

      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      const gamma = 1 / Math.sqrt(1 - Math.pow(v, 2));
      const deltaYears = dtBase * tMult;
      state.clocks.universe += deltaYears;
      state.clocks.ship += deltaYears / gamma;

      // SHIP MOVEMENT & ANTI-OVERSHOOT LOGIC
      if (v > 0) {
        let moveDist = v * deltaYears; 
        
        if (navLockRef.current) {
            const tgt = targetStarRef.current;
            const distToTgt = Math.hypot(tgt.x - state.ship.x, tgt.y - state.ship.y, tgt.z - state.ship.z);
            
            // Auto-Braking: If movement exceeds distance, stop exactly 0.05 LY away
            if (moveDist > distToTgt - 0.05) {
                moveDist = Math.max(0, distToTgt - 0.05);
                // Dynamically drop UI sliders to prevent glitching
                setVelocityC(0);
                setTimeMultiplier(1);
            }
        }

        state.ship.x += Math.sin(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
        state.ship.y += Math.sin(state.camera.pitch) * moveDist;
        state.ship.z += Math.cos(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
      }

      const currentDistances: Record<string, number> = {};
      REAL_STARS.forEach(star => {
        currentDistances[star.id] = Math.hypot(star.x - state.ship.x, star.y - state.ship.y, star.z - state.ship.z);
      });

      if (Math.random() < 0.1) {
        setDistances(currentDistances);
        setTelemetry({ gamma, universeYears: state.clocks.universe, shipYears: state.clocks.ship });
      }

      // TRUE WORLD-SPACE DUST GENERATION
      bgDust.current.forEach(dust => {
        let dx = dust.x - state.ship.x;
        let dy = dust.y - state.ship.y;
        let dz = dust.z - state.ship.z;

        // Wrap dust around ship endlessly creating infinite physical parallax
        const boxSize = 50; 
        if (dx > boxSize) dust.x -= boxSize * 2; if (dx < -boxSize) dust.x += boxSize * 2;
        if (dy > boxSize) dust.y -= boxSize * 2; if (dy < -boxSize) dust.y += boxSize * 2;
        if (dz > boxSize) dust.z -= boxSize * 2; if (dz < -boxSize) dust.z += boxSize * 2;

        const proj = project(dust.x, dust.y, dust.z, v);
        if (proj) {
          // Fade dust in and out at edges so it doesn't pop into existence
          const distToShip = Math.hypot(dx, dy, dz);
          const fade = Math.max(0, 1 - (distToShip / boxSize));
          
          ctx.fillStyle = `rgba(255, 255, 255, ${dust.baseAlpha * fade})`;
          ctx.fillRect(proj.sx, proj.sy, 1.5, 1.5);
        }
      });

      // DRAW REAL TARGETABLE STARS
      REAL_STARS.forEach(star => {
        const proj = project(star.x, star.y, star.z, v);
        
        if (proj) {
          const cinematicScale = star.radius * 0.0005;
          const coreRadius = Math.max(1, Math.min(width * 0.4, cinematicScale * proj.scale));
          const glowRadius = Math.max(2, coreRadius * 3);

          if (proj.dist > 0.0001) {
             const gradient = ctx.createRadialGradient(proj.sx, proj.sy, coreRadius, proj.sx, proj.sy, glowRadius);
             gradient.addColorStop(0, `${star.color}90`); 
             gradient.addColorStop(1, "rgba(0,0,0,0)");
             ctx.fillStyle = gradient;
             ctx.beginPath(); ctx.arc(proj.sx, proj.sy, glowRadius, 0, Math.PI * 2); ctx.fill();

             ctx.fillStyle = "#ffffff";
             ctx.beginPath(); ctx.arc(proj.sx, proj.sy, coreRadius, 0, Math.PI * 2); ctx.fill();
          }

          if ((proj.dist < 100 && proj.dist > 0.1) || star.id === targetStarRef.current.id) {
            ctx.fillStyle = star.id === targetStarRef.current.id ? "rgba(34, 211, 238, 0.9)" : "rgba(255,255,255,0.5)";
            ctx.font = star.id === targetStarRef.current.id ? "bold 12px monospace" : "10px monospace";
            ctx.fillText(star.name, proj.sx + glowRadius + 5, proj.sy + 3);
          }

          if (star.id === targetStarRef.current.id && navLockRef.current) {
            ctx.strokeStyle = "rgba(34, 211, 238, 0.8)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, glowRadius + 15, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(proj.sx, proj.sy - glowRadius - 20); ctx.lineTo(proj.sx, proj.sy - glowRadius - 10);
            ctx.moveTo(proj.sx, proj.sy + glowRadius + 20); ctx.lineTo(proj.sx, proj.sy + glowRadius + 10);
            ctx.moveTo(proj.sx - glowRadius - 20, proj.sy); ctx.lineTo(proj.sx - glowRadius - 10, proj.sy);
            ctx.moveTo(proj.sx + glowRadius + 20, proj.sy); ctx.lineTo(proj.sx + glowRadius + 10, proj.sy);
            ctx.stroke();
          }
        }
      });

      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(animate);

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(reqId); window.removeEventListener("resize", handleResize); };
  }, []);

  return (
    <main 
      className={`relative w-screen h-screen bg-[#020202] text-white font-mono overflow-hidden selection:bg-cyan-900 ${isNavLocked ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />

      {/* CROSSHAIR */}
      {!isNavLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30">
          <div className="w-8 h-px bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="w-px h-8 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      )}

      {/* RIGHT PANEL: LIVE DISTANCE MATRIX TO ALL STARS */}
      <aside className="absolute top-6 right-6 w-80 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-lg pointer-events-auto shadow-2xl max-h-[85vh] flex flex-col z-10">
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Targeting Matrix</h2>
          <button 
            onClick={() => setIsNavLocked(false)}
            className={`text-[9px] px-2 py-1 rounded uppercase transition-colors ${isNavLocked ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/40" : "bg-neutral-800 text-neutral-500 border border-neutral-700 hover:bg-neutral-700"}`}
          >
            {isNavLocked ? "Unlock Camera" : "Manual Flight"}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {REAL_STARS.map(star => {
            const isTargeted = targetStar.id === star.id && isNavLocked;
            return (
              <div key={star.id} className={`p-2 rounded flex flex-col transition-colors border ${isTargeted ? "bg-cyan-950/40 border-cyan-500" : "bg-white/5 border-white/5 hover:bg-white/10"}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold">{star.name}</span>
                  <button 
                    onClick={() => engageNavLock(star.id)} 
                    className={`text-[9px] px-2 py-0.5 rounded uppercase transition-colors ${isTargeted ? "bg-cyan-500 text-black font-bold" : "bg-cyan-900/50 text-cyan-300 hover:bg-cyan-500 hover:text-black"}`}
                  >
                    {isTargeted ? "Tracking" : "Lock On"}
                  </button>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Distance:</span>
                  <span className="text-white font-bold">{(distances[star.id] || 0).toFixed(4)} LY</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* BOTTOM PANEL: FLIGHT CONTROLS & RELATIVITY */}
      <footer className="absolute bottom-6 left-6 w-[500px] bg-black/80 backdrop-blur-3xl border border-white/10 p-6 rounded-xl pointer-events-auto shadow-2xl z-10">
        
        {isNavLocked && (
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
             Autopilot Engaged
           </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Throttle (v)</span>
              <span className="text-xs font-bold text-cyan-400">{velocityC.toFixed(4)}c</span>
            </div>
            <input type="range" min="0" max="0.9999" step="0.0001" value={velocityC} onChange={(e) => setVelocityC(parseFloat(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Time Warp</span>
              <span className="text-xs font-bold text-purple-400">{timeMultiplier.toFixed(0)}x</span>
            </div>
            <input type="range" min="1" max="50000" step="10" value={timeMultiplier} onChange={(e) => setTimeMultiplier(parseFloat(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-400" />
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 grid grid-cols-3 gap-2 text-center">
          <div>
             <p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Lorentz (γ)</p>
             <p className="text-sm font-bold text-white">{telemetry.gamma.toFixed(2)}</p>
          </div>
          <div>
             <p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Ship Time</p>
             <p className="text-sm font-bold text-cyan-400">{telemetry.shipYears.toFixed(1)} YR</p>
          </div>
          <div>
             <p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Universe Time</p>
             <p className="text-sm font-bold text-purple-400">{telemetry.universeYears.toFixed(1)} YR</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
