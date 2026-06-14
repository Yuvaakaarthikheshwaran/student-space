"use client";
import React, { useEffect, useRef, useState } from "react";

// --- TRUE LOCAL STELLAR NEIGHBORHOOD DATABASE ---
// Coordinates are in exact Light Years (LY) relative to Sol at (0,0,0).
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
  
  // Controls
  const [velocityC, setVelocityC] = useState(0); // 0 to 0.999c
  const [timeMultiplier, setTimeMultiplier] = useState(1); 
  
  // UI Telemetry (Synced from the engine)
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [telemetry, setTelemetry] = useState({ gamma: 1, universeYears: 0, shipYears: 0 });

  // 64-bit Engine State
  const engineState = useRef({
    ship: { x: 0, y: 0.001, z: -2.0 }, // Start looking at the Sun from 2 LY away
    camera: { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 },
    mouse: { isDown: false, lastX: 0, lastY: 0 },
    clocks: { universe: 0, ship: 0 }
  });

  // Background "Dust" to provide motion reference
  const bgDust = useRef(Array.from({ length: 4000 }, () => ({
    x: (Math.random() - 0.5) * 200,
    y: (Math.random() - 0.5) * 200,
    z: (Math.random() - 0.5) * 200,
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

  // Align Camera to a specific star
  const alignToStar = (targetId: string) => {
    const state = engineState.current;
    const target = REAL_STARS.find(s => s.id === targetId);
    if (!target) return;
    const dx = target.x - state.ship.x;
    const dy = target.y - state.ship.y;
    const dz = target.z - state.ship.z;
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

    // 3D Projection Math
    const project = (x: number, y: number, z: number, v_c: number, isDust = false) => {
      const state = engineState.current;
      
      let dx = x - (isDust ? 0 : state.ship.x);
      let dy = y - (isDust ? 0 : state.ship.y);
      let dz = z - (isDust ? 0 : state.ship.z);

      let tx = dx * Math.cos(state.camera.yaw) - dz * Math.sin(state.camera.yaw);
      let tz = dx * Math.sin(state.camera.yaw) + dz * Math.cos(state.camera.yaw);
      let ty = dy * Math.cos(state.camera.pitch) - tz * Math.sin(state.camera.pitch);
      let fz = dy * Math.sin(state.camera.pitch) + tz * Math.cos(state.camera.pitch);

      if (fz < 0.0001) return null; // Behind camera

      // Relativistic Aberration (Stars bunch up in front of you at high speeds)
      const aberration = Math.sqrt((1 - v_c) / (1 + v_c)); 
      const scale = (width / 2) * (1 / fz) * aberration;

      return { sx: width / 2 + tx * scale, sy: height / 2 + ty * scale, scale: scale, dist: fz };
    };

    const animate = () => {
      const state = engineState.current;
      
      // Camera Lerp
      state.camera.yaw += (state.camera.targetYaw - state.camera.yaw) * 0.1;
      state.camera.pitch += (state.camera.targetPitch - state.camera.pitch) * 0.1;

      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      // Time & Relativity
      const gamma = 1 / Math.sqrt(1 - Math.pow(velocityC, 2));
      const deltaYears = dtBase * timeMultiplier;
      state.clocks.universe += deltaYears;
      state.clocks.ship += deltaYears / gamma;

      // True Physical Movement
      if (velocityC > 0) {
        const moveDist = velocityC * deltaYears; // Move in Light Years
        state.ship.x += Math.sin(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
        state.ship.y += Math.sin(state.camera.pitch) * moveDist;
        state.ship.z += Math.cos(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
      }

      // Calculate Distances to ALL Stars
      const currentDistances: Record<string, number> = {};
      REAL_STARS.forEach(star => {
        const dx = star.x - state.ship.x;
        const dy = star.y - state.ship.y;
        const dz = star.z - state.ship.z;
        currentDistances[star.id] = Math.sqrt(dx*dx + dy*dy + dz*dz);
      });

      // Throttle UI updates to prevent React lag
      if (Math.random() < 0.1) {
        setDistances(currentDistances);
        setTelemetry({ gamma, universeYears: state.clocks.universe, shipYears: state.clocks.ship });
      }

      // 1. Draw Background Dust (Motion Reference)
      bgDust.current.forEach(dust => {
        if (velocityC > 0) {
           // Dust moves past ship based on absolute velocity and direction
           const moveDist = velocityC * deltaYears * 10; // Scaled for visual effect
           dust.x -= Math.sin(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
           dust.y -= Math.sin(state.camera.pitch) * moveDist;
           dust.z -= Math.cos(state.camera.yaw) * Math.cos(state.camera.pitch) * moveDist;
           
           // Loop dust endlessly in a local box around the ship
           if (dust.x > 100) dust.x = -100; if (dust.x < -100) dust.x = 100;
           if (dust.y > 100) dust.y = -100; if (dust.y < -100) dust.y = 100;
           if (dust.z > 100) dust.z = -100; if (dust.z < -100) dust.z = 100;
        }

        const proj = project(dust.x, dust.y, dust.z, velocityC, true);
        if (proj) {
          ctx.fillStyle = `rgba(255, 255, 255, ${dust.alpha})`;
          ctx.fillRect(proj.sx, proj.sy, 1, 1);
        }
      });

      // 2. Draw Real Targetable Stars
      REAL_STARS.forEach(star => {
        const proj = project(star.x, star.y, star.z, velocityC);
        
        if (proj) {
          // Visual scale. Stars far away are tiny 1px dots. As you approach, they grow massively.
          const visualRadius = Math.max(0.5, (star.radius * 2) * proj.scale);
          
          // Clamp max size so flying into a star doesn't crash the canvas math
          const coreRadius = Math.min(width * 0.3, visualRadius); 
          const glowRadius = Math.min(width * 1.5, visualRadius * 3);

          if (proj.dist > 0.001) {
             // Glow
             const gradient = ctx.createRadialGradient(proj.sx, proj.sy, coreRadius, proj.sx, proj.sy, glowRadius);
             gradient.addColorStop(0, `${star.color}90`); 
             gradient.addColorStop(1, "rgba(0,0,0,0)");
             ctx.fillStyle = gradient;
             ctx.beginPath(); ctx.arc(proj.sx, proj.sy, glowRadius, 0, Math.PI * 2); ctx.fill();

             // Solid Core
             ctx.fillStyle = "#ffffff";
             ctx.beginPath(); ctx.arc(proj.sx, proj.sy, coreRadius, 0, Math.PI * 2); ctx.fill();
          }

          // Label appears only when you are looking generally at it and not colliding
          if (proj.dist < 500 && proj.dist > 0.1) {
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.font = "10px monospace";
            ctx.fillText(star.name, proj.sx + coreRadius + 10, proj.sy);
          }
        }
      });

      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(animate);

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(reqId); window.removeEventListener("resize", handleResize); };
  }, [velocityC, timeMultiplier]);

  return (
    <main 
      className="relative w-screen h-screen bg-[#020202] text-white font-mono overflow-hidden cursor-crosshair selection:bg-cyan-900"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />

      {/* CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30">
        <div className="w-8 h-px bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="w-px h-8 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* RIGHT PANEL: LIVE DISTANCE MATRIX TO ALL STARS */}
      <aside className="absolute top-6 right-6 w-80 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-lg pointer-events-auto shadow-2xl max-h-[85vh] flex flex-col">
        <h2 className="text-sm font-bold text-cyan-400 mb-2 uppercase tracking-widest border-b border-white/10 pb-2">Targeting Matrix</h2>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {REAL_STARS.map(star => (
            <div key={star.id} className="bg-white/5 border border-white/5 p-2 rounded flex flex-col hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold">{star.name}</span>
                <button onClick={() => alignToStar(star.id)} className="text-[9px] bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded uppercase hover:bg-cyan-500 hover:text-black transition-colors">Align</button>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>Distance:</span>
                <span className="text-white font-bold">{(distances[star.id] || 0).toFixed(4)} LY</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* BOTTOM PANEL: FLIGHT CONTROLS & RELATIVITY */}
      <footer className="absolute bottom-6 left-6 w-[500px] bg-black/80 backdrop-blur-3xl border border-white/10 p-6 rounded-xl pointer-events-auto shadow-2xl">
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
            <input type="range" min="1" max="5000" step="10" value={timeMultiplier} onChange={(e) => setTimeMultiplier(parseFloat(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-400" />
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
