"use client";
import React, { useEffect, useRef, useState } from "react";

// --- TRUE LOCAL STELLAR NEIGHBORHOOD DATABASE ---
// Coordinates (x, y, z) are mapped in exact Light Years (LY) relative to Sol at (0,0,0).
const REAL_STARS = [
  { id: "SOL", name: "Sun (Sol)", class: "G-Type", dist: 0, x: 0, y: 0, z: 0, color: "#fef08a", radius: 1 },
  { id: "CEN", name: "Alpha Centauri", class: "G/K-Type", dist: 4.37, x: 4.37, y: 0.0, z: 0.0, color: "#fde047", radius: 1.1 },
  { id: "BAR", name: "Barnard's Star", class: "M-Type Red Dwarf", dist: 5.96, x: 3.5, y: 4.0, z: 2.0, color: "#ef4444", radius: 0.2 },
  { id: "WOL", name: "Wolf 359", class: "M-Type Flare Star", dist: 7.78, x: -1.0, y: 7.0, z: 3.0, color: "#f87171", radius: 0.16 },
  { id: "SIR", name: "Sirius A", class: "A-Type Main Sequence", dist: 8.60, x: -2.0, y: -8.0, z: -2.5, color: "#cffafe", radius: 1.7 },
  { id: "ERI", name: "Epsilon Eridani", class: "K-Type Main Sequence", dist: 10.5, x: -5.0, y: -8.0, z: 5.0, color: "#fdba74", radius: 0.73 },
  { id: "PRO", name: "Procyon", class: "F-Type Main Sequence", dist: 11.4, x: -4.0, y: -10.0, z: 1.0, color: "#fef08a", radius: 2.0 },
  { id: "TAU", name: "Tau Ceti", class: "G-Type Main Sequence", dist: 11.9, x: -11.0, y: 0.0, z: -4.0, color: "#fde047", radius: 0.79 },
  { id: "ALT", name: "Altair", class: "A-Type Main Sequence", dist: 16.7, x: 12.0, y: 5.0, z: 8.0, color: "#a5f3fc", radius: 1.8 },
  { id: "VEG", name: "Vega", class: "A-Type Main Sequence", dist: 25.0, x: 15.0, y: 15.0, z: -10.0, color: "#67e8f9", radius: 2.3 },
  { id: "ARC", name: "Arcturus", class: "K-Type Red Giant", dist: 36.7, x: 5.0, y: 30.0, z: 20.0, color: "#fb923c", radius: 25.4 },
  { id: "BET", name: "Betelgeuse", class: "M-Type Red Supergiant", dist: 548.0, x: -400.0, y: -100.0, z: 300.0, color: "#dc2626", radius: 887.0 },
  { id: "RIG", name: "Rigel", class: "B-Type Blue Supergiant", dist: 860.0, x: -600.0, y: -200.0, z: 500.0, color: "#3b82f6", radius: 78.9 },
];

export default function InterstellarFlightEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [velocityC, setVelocityC] = useState(0); 
  const [timeMultiplier, setTimeMultiplier] = useState(1); 
  
  const [telemetry, setTelemetry] = useState({ 
    universeYears: 0, shipYears: 0, gamma: 1, distance: 0 
  });

  const [targetStar, setTargetStar] = useState(REAL_STARS[1]);

  // Persistent Engine State (64-bit precision in Light Years)
  const engineState = useRef({
    ship: { x: 0, y: 0.0, z: -0.05 }, // Spawn slightly behind Sol so we can see it
    camera: { 
        pitch: 0, yaw: 0, 
        targetPitch: 0, targetYaw: 0 
    },
    mouse: { isDown: false, lastX: 0, lastY: 0 },
    clocks: { universe: 0, ship: 0 }
  });

  // Background stars for parallax and relativistic aberration reference
  const bgStars = useRef(Array.from({ length: 5000 }, () => ({
    x: (Math.random() - 0.5) * 5000,
    y: (Math.random() - 0.5) * 5000,
    z: (Math.random() - 0.5) * 5000,
    size: Math.random() * 0.8 + 0.2,
    alpha: Math.random() * 0.5 + 0.1
  })));

  // Smooth Input Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    engineState.current.mouse.isDown = true;
    engineState.current.mouse.lastX = e.clientX;
    engineState.current.mouse.lastY = e.clientY;
  };
  
  const handleMouseUp = () => { engineState.current.mouse.isDown = false; };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const mouse = engineState.current.mouse;
    if (!mouse.isDown) return;
    const dx = e.clientX - mouse.lastX;
    const dy = e.clientY - mouse.lastY;
    
    engineState.current.camera.targetYaw -= dx * 0.003;
    engineState.current.camera.targetPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, engineState.current.camera.targetPitch - dy * 0.003));
    
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  };

  // Align ship exactly to target coordinates
  const alignToTarget = () => {
    const state = engineState.current;
    const dx = targetStar.x - state.ship.x;
    const dy = targetStar.y - state.ship.y;
    const dz = targetStar.z - state.ship.z;
    
    const distanceXZ = Math.sqrt(dx * dx + dz * dz);
    state.camera.targetYaw = Math.atan2(dx, dz);
    state.camera.targetPitch = Math.atan2(dy, distanceXZ);
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

    const project = (x: number, y: number, z: number, v_c: number, isBackground = false) => {
      const state = engineState.current;
      
      let dx = x - (isBackground ? 0 : state.ship.x);
      let dy = y - (isBackground ? 0 : state.ship.y);
      let dz = z - (isBackground ? 0 : state.ship.z);

      let tx = dx * Math.cos(state.camera.yaw) - dz * Math.sin(state.camera.yaw);
      let tz = dx * Math.sin(state.camera.yaw) + dz * Math.cos(state.camera.yaw);
      let ty = dy * Math.cos(state.camera.pitch) - tz * Math.sin(state.camera.pitch);
      let fz = dy * Math.sin(state.camera.pitch) + tz * Math.cos(state.camera.pitch);

      if (fz < 0.000001) return null; 

      // Relativistic Aberration (FOV narrows at high speeds)
      const aberration = Math.sqrt((1 - v_c) / (1 + v_c)); 
      const scale = (width / 2) * (1 / fz) * aberration;

      return { sx: width / 2 + tx * scale, sy: height / 2 + ty * scale, scale: scale, dist: fz };
    };

    const animate = () => {
      const state = engineState.current;
      
      // Smooth Camera Lerp
      state.camera.yaw += (state.camera.targetYaw - state.camera.yaw) * 0.1;
      state.camera.pitch += (state.camera.targetPitch - state.camera.pitch) * 0.1;

      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      // Relativistic Math
      const gamma = 1 / Math.sqrt(1 - Math.pow(velocityC, 2));
      const deltaYears = dtBase * timeMultiplier;
      
      state.clocks.universe += deltaYears;
      state.clocks.ship += deltaYears / gamma;

      // 3D Distance to target
      const tx = targetStar.x - state.ship.x;
      const ty = targetStar.y - state.ship.y;
      const tz = targetStar.z - state.ship.z;
      const distToTarget = Math.sqrt(tx*tx + ty*ty + tz*tz);

      // Sub-light movement vector relative to camera rotation
      if (velocityC > 0) {
        const moveDist = velocityC * deltaYears; // Distance in LY
        // Move forward along the direction the camera is facing
        state.ship.x += Math.sin(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
        state.ship.y += Math.sin(state.camera.pitch) * moveDist;
        state.ship.z += Math.cos(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
      }

      if (Math.random() < 0.1) {
        setTelemetry({
          universeYears: state.clocks.universe, shipYears: state.clocks.ship,
          gamma: gamma, distance: distToTarget
        });
      }

      // Draw Background Starfield
      bgStars.current.forEach(star => {
        // Starfield moves past ship based on absolute velocity and direction
        if (velocityC > 0) {
           const moveDist = velocityC * 10 * timeMultiplier; // Scaled for visual effect
           star.x -= Math.sin(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
           star.y -= Math.sin(state.camera.pitch) * moveDist;
           star.z -= Math.cos(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
           
           // Loop stars to create infinite field
           if (star.z < -2500) star.z = 2500;
           if (star.z > 2500) star.z = -2500;
           if (star.x < -2500) star.x = 2500;
           if (star.x > 2500) star.x = -2500;
        }

        const proj = project(star.x, star.y, star.z, velocityC, true);
        if (proj) {
          ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
          ctx.fillRect(proj.sx, proj.sy, Math.max(1, star.size * proj.scale), Math.max(1, star.size * proj.scale));
        }
      });

      // Draw Real Stars
      REAL_STARS.forEach(star => {
        const starProj = project(star.x, star.y, star.z, velocityC);
        
        if (starProj) {
          // Accurate visual scaling based on absolute stellar radius (scaled up for visibility)
          const visualRadius = Math.max(2, (star.radius * 2) * starProj.scale);
          
          // Near-plane clamping to prevent screen washout
          const coreRadius = Math.min(width * 0.4, visualRadius); 
          const glowRadius = Math.min(width * 1.5, visualRadius * 3);

          if (starProj.dist > 0.0001) {
             // Glowing Corona
             const gradient = ctx.createRadialGradient(starProj.sx, starProj.sy, coreRadius, starProj.sx, starProj.sy, glowRadius);
             gradient.addColorStop(0, `${star.color}90`); 
             gradient.addColorStop(1, "rgba(0,0,0,0)");
             ctx.fillStyle = gradient;
             ctx.beginPath(); ctx.arc(starProj.sx, starProj.sy, glowRadius, 0, Math.PI * 2); ctx.fill();

             // Solid Core
             ctx.fillStyle = "#ffffff";
             ctx.beginPath(); ctx.arc(starProj.sx, starProj.sy, coreRadius, 0, Math.PI * 2); ctx.fill();

             // Target Reticle
             if (star.id === targetStar.id) {
               ctx.strokeStyle = "rgba(34, 211, 238, 0.5)"; // Cyan
               ctx.lineWidth = 1;
               ctx.beginPath();
               ctx.arc(starProj.sx, starProj.sy, glowRadius + 10, 0, Math.PI * 2);
               ctx.stroke();
               
               // Distance tag directly on star
               ctx.fillStyle = "rgba(34, 211, 238, 0.8)";
               ctx.font = "10px monospace";
               const distanceToThisStar = Math.sqrt(Math.pow(star.x - state.ship.x, 2) + Math.pow(star.y - state.ship.y, 2) + Math.pow(star.z - state.ship.z, 2));
               ctx.fillText(`TARGET: ${distanceToThisStar.toFixed(3)} LY`, starProj.sx + glowRadius + 15, starProj.sy + 10);
             }
          }

          // Dynamic Labeling
          if (starProj.dist < 100 && starProj.dist > 0.01) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.font = "12px monospace";
            ctx.fillText(star.name, starProj.sx + coreRadius + 15, starProj.sy - 5);
          }
        }
      });

      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(animate);

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(reqId); window.removeEventListener("resize", handleResize); };
  }, [velocityC, timeMultiplier, targetStar]);

  return (
    <main 
      className="relative w-screen h-screen bg-[#020202] text-white font-mono overflow-hidden cursor-crosshair selection:bg-cyan-900"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />

      {/* NAV COMPUTER */}
      <aside className="absolute top-6 left-6 w-80 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-lg pointer-events-auto shadow-2xl flex flex-col max-h-[80vh]">
        <p className="text-[10px] uppercase tracking-widest text-cyan-400 mb-4 animate-pulse">Stellar Cartography Online</p>
        
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
           <h2 className="text-xl font-bold">Local Bubble</h2>
           <button onClick={alignToTarget} className="text-[10px] uppercase border border-cyan-500/50 text-cyan-400 px-3 py-1.5 rounded hover:bg-cyan-500/20 transition-colors">Align Trajectory</button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {REAL_STARS.map(sys => (
            <button 
              key={sys.id}
              onClick={() => setTargetStar(sys)}
              className={`w-full text-left p-3 rounded border transition-colors flex justify-between items-center ${targetStar.id === sys.id ? "bg-cyan-950/50 border-cyan-500" : "bg-black/40 border-white/10 hover:border-white/30"}`}
            >
              <div>
                <div className="text-sm font-bold text-white">{sys.name}</div>
                <div className="text-[10px] text-neutral-500">{sys.class}</div>
              </div>
              <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: sys.color }}></div>
            </button>
          ))}
        </div>

        <div className="mt-4 bg-white/5 p-4 rounded border border-white/5 shrink-0">
          <p className="text-[10px] uppercase text-neutral-500 mb-1">Vector Distance</p>
          <p className="text-xl font-bold text-white">{telemetry.distance.toFixed(6)} LY</p>
          <p className="text-[10px] text-cyan-500 mt-1 uppercase tracking-widest">Target Lock Active</p>
        </div>
      </aside>

      {/* RELATIVISTIC PHYSICS CONTROLS */}
      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-2xl pointer-events-auto shadow-2xl">
        <div className="grid grid-cols-2 gap-12">
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Relativistic Velocity (v)</span>
              <span className="text-xs font-bold text-cyan-400">{velocityC.toFixed(4)}c</span>
            </div>
            <input 
              type="range" min="0" max="0.9999" step="0.0001" 
              value={velocityC} 
              onChange={(e) => setVelocityC(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Universe Time Flow</span>
              <span className="text-xs font-bold text-purple-400">{timeMultiplier.toFixed(0)}x</span>
            </div>
            <input 
              type="range" min="1" max="50000" step="10" 
              value={timeMultiplier} 
              onChange={(e) => setTimeMultiplier(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-400"
            />
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Lorentz Factor (γ)</p>
            <p className="text-xl font-bold text-white">{telemetry.gamma.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Ship Time Elapsed</p>
            <p className="text-xl font-bold text-cyan-400">{telemetry.shipYears.toFixed(2)} YRS</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Universe Time Elapsed</p>
            <p className="text-xl font-bold text-purple-400">{telemetry.universeYears.toFixed(2)} YRS</p>
          </div>
        </div>
      </footer>

      {/* CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
        <div className="w-8 h-px bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="w-px h-8 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
    </main>
  );
}
