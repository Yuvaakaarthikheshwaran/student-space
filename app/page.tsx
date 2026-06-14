"use client";
import React, { useEffect, useRef, useState } from "react";

// --- THE ASTROPHYSICS DATABASE ---
// Coordinates are in exact Light Years (LY).
// Planet distances (d) are in exact Astronomical Units (AU).
// Mass is in Solar Masses (M☉).
const STAR_SYSTEMS = [
  {
    id: "SOL", name: "Sol (Our System)", x: 0, y: 0, z: 0, mass: 1.0, color: "#fef08a",
    planets: [
      { name: "Mercury", d: 0.387, r: 0.5, color: "#a3a3a3" },
      { name: "Venus", d: 0.723, r: 1.2, color: "#fcd34d" },
      { name: "Earth", d: 1.0, r: 1.25, color: "#3b82f6" },
      { name: "Mars", d: 1.524, r: 0.7, color: "#ef4444" },
      { name: "Jupiter", d: 5.204, r: 4.0, color: "#fdba74" }
    ]
  },
  {
    id: "CEN", name: "Alpha Centauri", x: 4.37, y: 0, z: 0, mass: 1.1, color: "#fde047",
    planets: [
      { name: "Proxima b", d: 0.048, r: 1.1, color: "#10b981" },
      { name: "Proxima c", d: 1.48, r: 2.0, color: "#6366f1" }
    ]
  },
  {
    id: "TRAP", name: "TRAPPIST-1", x: -20.5, y: -10, z: 32.8, mass: 0.089, color: "#ef4444",
    planets: [
      { name: "1d", d: 0.022, r: 0.8, color: "#4ade80" },
      { name: "1e", d: 0.029, r: 0.9, color: "#60a5fa" },
      { name: "1f", d: 0.038, r: 1.0, color: "#94a3b8" }
    ]
  },
  {
    id: "SIRI", name: "Sirius", x: -4.5, y: 6.2, z: -3.8, mass: 2.02, color: "#cffafe",
    planets: []
  }
];

const LY_TO_AU = 63241.077; // 1 Light Year = 63,241 AU

export default function RelativisticUniverse() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Physics Controls
  const [velocityC, setVelocityC] = useState(0); // v/c (0 to 0.999)
  const [timeMultiplier, setTimeMultiplier] = useState(1); // 1x to 10000x
  
  // HUD Telemetry
  const [telemetry, setTelemetry] = useState({ 
    universeYears: 0, 
    shipYears: 0, 
    gamma: 1, 
    distance: 0, 
    zoom: 1 
  });

  // Target Autopilot
  const [targetStar, setTargetStar] = useState(STAR_SYSTEMS[0]);

  // Persistent Engine State (Bypassing React re-renders for 120fps physics)
  const engineState = useRef({
    ship: { x: 0, y: 0, z: -0.1 }, // Start slightly outside Sol to look at it
    camera: { pitch: 0, yaw: 0, zoomExp: 0, zoomRaw: 1 },
    mouse: { isDown: false, lastX: 0, lastY: 0 },
    clocks: { universe: 0, ship: 0 },
    planetAngles: new Map<string, number>()
  });

  // Input Handlers
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
    engineState.current.camera.yaw -= dx * 0.005;
    engineState.current.camera.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, engineState.current.camera.pitch - dy * 0.005));
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Logarithmic Zoom: Allows zooming from 1x (Galactic) to 100,000x (Planetary AU)
    const cam = engineState.current.camera;
    cam.zoomExp = Math.max(0, Math.min(12, cam.zoomExp - e.deltaY * 0.005));
    cam.zoomRaw = Math.exp(cam.zoomExp);
  };

  // --- 64-BIT DOUBLE PRECISION PHYSICS & RENDERING LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let reqId: number;
    let lastTime = performance.now();

    const dtBase = 0.001; // Base time step in years per frame at 1x multiplier

    // 3D to 2D Projection with Relativistic Aberration
    const project = (x: number, y: number, z: number, v_c: number) => {
      const state = engineState.current;
      
      // Translate to ship-relative origin
      let dx = x - state.ship.x;
      let dy = y - state.ship.y;
      let dz = z - state.ship.z;

      // Rotate Camera Yaw & Pitch
      let tx = dx * Math.cos(state.camera.yaw) - dz * Math.sin(state.camera.yaw);
      let tz = dx * Math.sin(state.camera.yaw) + dz * Math.cos(state.camera.yaw);
      let ty = dy * Math.cos(state.camera.pitch) - tz * Math.sin(state.camera.pitch);
      let fz = dy * Math.sin(state.camera.pitch) + tz * Math.cos(state.camera.pitch);

      if (fz < 0.0001) return null; // Behind camera plane

      // Relativistic visual narrowing of Field of View as you approach c
      const aberration = Math.sqrt((1 - v_c) / (1 + v_c)); 
      
      // Scale is exponentially driven by the mouse wheel
      const scale = (width / 2) * (state.camera.zoomRaw / fz) * aberration;

      return {
        sx: width / 2 + tx * scale,
        sy: height / 2 + ty * scale,
        scale: scale,
        dist: fz
      };
    };

    const animate = (now: number) => {
      const state = engineState.current;
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      // --- 1. RELATIVISTIC KINEMATICS ---
      const gamma = 1 / Math.sqrt(1 - Math.pow(velocityC, 2));
      const deltaYears = dtBase * timeMultiplier;
      
      // Update Timelines (The weight of years)
      state.clocks.universe += deltaYears;
      state.clocks.ship += deltaYears / gamma;

      // Autopilot Navigation
      let distToTarget = 0;
      if (velocityC > 0) {
        const tx = targetStar.x - state.ship.x;
        const ty = targetStar.y - state.ship.y;
        const tz = targetStar.z - state.ship.z;
        distToTarget = Math.sqrt(tx*tx + ty*ty + tz*tz);
        
        if (distToTarget > 0.001) { // If not arrived
          // Move ship along vector in Light Years
          const moveDist = velocityC * deltaYears; // c = 1 LY/year
          state.ship.x += (tx / distToTarget) * moveDist;
          state.ship.y += (ty / distToTarget) * moveDist;
          state.ship.z += (tz / distToTarget) * moveDist;
        }
      } else {
        const tx = targetStar.x - state.ship.x;
        const ty = targetStar.y - state.ship.y;
        const tz = targetStar.z - state.ship.z;
        distToTarget = Math.sqrt(tx*tx + ty*ty + tz*tz);
      }

      // Sync telemetry to React UI every few frames to avoid lag
      if (Math.random() < 0.1) {
        setTelemetry({
          universeYears: state.clocks.universe,
          shipYears: state.clocks.ship,
          gamma: gamma,
          distance: distToTarget,
          zoom: state.camera.zoomRaw
        });
      }

      // --- 2. RENDER UNIVERSE (64-BIT PRECISION) ---
      STAR_SYSTEMS.forEach(star => {
        const starProj = project(star.x, star.y, star.z, velocityC);
        
        if (starProj) {
          // Draw Star
          const size = Math.max(1, 10 * starProj.scale);
          const gradient = ctx.createRadialGradient(starProj.sx, starProj.sy, 0, starProj.sx, starProj.sy, size * 2);
          gradient.addColorStop(0, star.color);
          gradient.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gradient;
          ctx.beginPath(); ctx.arc(starProj.sx, starProj.sy, size * 2, 0, Math.PI * 2); ctx.fill();

          // Draw Label if close enough or zoomed out
          if (starProj.dist < 50 || state.camera.zoomRaw < 10) {
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.font = "10px monospace";
            ctx.fillText(star.name, starProj.sx + size + 5, starProj.sy);
          }
        }

        // --- 3. KEPLERIAN ORBITAL MECHANICS (Micro Scale) ---
        // Only calculate and render planets if we are close to the star or heavily zoomed in
        const distToCamera = Math.sqrt(Math.pow(star.x - state.ship.x, 2) + Math.pow(star.y - state.ship.y, 2) + Math.pow(star.z - state.ship.z, 2));
        
        if (distToCamera < 0.5 || state.camera.zoomRaw > 1000) {
          star.planets.forEach(p => {
            const planetId = `${star.id}-${p.name}`;
            if (!state.planetAngles.has(planetId)) state.planetAngles.set(planetId, Math.random() * Math.PI * 2);
            
            // Kepler's Third Law: T = sqrt(a^3 / M)
            // T is period in Earth Years.
            const periodYears = Math.sqrt(Math.pow(p.d, 3) / star.mass);
            
            // Update angle based on accurate UNIVERSE TIME elapsed
            let currentAngle = state.planetAngles.get(planetId)!;
            currentAngle += (deltaYears / periodYears) * Math.PI * 2;
            state.planetAngles.set(planetId, currentAngle);

            // Convert AU distance to Light Years for the master 3D grid
            const radiusInLY = p.d / LY_TO_AU;
            const px = star.x + radiusInLY * Math.cos(currentAngle);
            const pz = star.z + radiusInLY * Math.sin(currentAngle);
            const py = star.y;

            const pProj = project(px, py, pz, velocityC);
            if (pProj) {
              // Draw Planet
              const pSize = Math.max(0.5, p.r * pProj.scale * 0.0001); // Scale radius visually
              ctx.fillStyle = p.color;
              ctx.beginPath(); ctx.arc(pProj.sx, pProj.sy, pSize, 0, Math.PI * 2); ctx.fill();
              
              // Draw Orbit Ring (Optional, fades in when zoomed)
              if (state.camera.zoomRaw > 5000) {
                ctx.beginPath();
                for (let a = 0; a <= Math.PI * 2; a += 0.1) {
                  const ringX = star.x + radiusInLY * Math.cos(a);
                  const ringZ = star.z + radiusInLY * Math.sin(a);
                  const ringProj = project(ringX, py, ringZ, velocityC);
                  if (ringProj) {
                    if (a === 0) ctx.moveTo(ringProj.sx, ringProj.sy);
                    else ctx.lineTo(ringProj.sx, ringProj.sy);
                  }
                }
                ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.stroke();
                
                // Planet Label
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.font = "8px monospace";
                ctx.fillText(p.name, pProj.sx + pSize + 2, pProj.sy + 2);
              }
            }
          });
        }
      });

      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(performance.now);

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
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />

      {/* TARGETING HUD - LEFT */}
      <aside className="absolute top-6 left-6 w-80 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-lg pointer-events-auto">
        <p className="text-[10px] uppercase tracking-widest text-cyan-400 mb-4 animate-pulse">Nav-Computer Online</p>
        <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-4">Select Coordinates</h2>
        
        <div className="space-y-2 mb-6">
          {STAR_SYSTEMS.map(sys => (
            <button 
              key={sys.id}
              onClick={() => setTargetStar(sys)}
              className={`w-full text-left p-3 text-sm rounded border transition-colors ${targetStar.id === sys.id ? "bg-cyan-950/50 border-cyan-500" : "bg-black/40 border-white/10 hover:border-white/30"}`}
            >
              {sys.name}
            </button>
          ))}
        </div>

        <div className="bg-white/5 p-4 rounded border border-white/5">
          <p className="text-[10px] uppercase text-neutral-500 mb-1">Target Distance</p>
          <p className="text-lg font-bold text-white">{telemetry.distance.toFixed(4)} LY</p>
          <p className="text-[10px] text-neutral-500 mt-2">({(telemetry.distance * LY_TO_AU).toLocaleString(undefined, {maximumFractionDigits:0})} AU)</p>
        </div>
      </aside>

      {/* RELATIVISTIC PHYSICS CONTROLS - BOTTOM */}
      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-2xl pointer-events-auto shadow-2xl">
        <div className="grid grid-cols-2 gap-12">
          
          {/* THROTTLE (c) */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Sub-light Throttle</span>
              <span className="text-xs font-bold text-cyan-400">{velocityC.toFixed(4)}c</span>
            </div>
            <input 
              type="range" min="0" max="0.9999" step="0.0001" 
              value={velocityC} 
              onChange={(e) => setVelocityC(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
            />
            <p className="text-[9px] text-neutral-500 leading-tight mt-1">
              Accelerating alters Lorentz factor ($\gamma$). Visually contracts FOV due to relativistic aberration.
            </p>
          </div>

          {/* TIME MULTIPLIER */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Universe Time Multiplier</span>
              <span className="text-xs font-bold text-purple-400">{timeMultiplier.toFixed(0)}x</span>
            </div>
            <input 
              type="range" min="1" max="50000" step="10" 
              value={timeMultiplier} 
              onChange={(e) => setTimeMultiplier(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-400"
            />
            <p className="text-[9px] text-neutral-500 leading-tight mt-1">
              Fast-forwards universal simulation. Watch Keplerian orbits accelerate.
            </p>
          </div>

        </div>

        {/* RELATIVISTIC CHRONOMETER (The Weight of Years) */}
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

      {/* CAMERA INFO - TOP RIGHT */}
      <div className="absolute top-6 right-6 text-right pointer-events-none">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500">Camera Mag-Level</p>
        <p className="text-lg font-bold text-white">{telemetry.zoom.toLocaleString(undefined, {maximumFractionDigits:0})}x</p>
        <p className="text-[10px] text-neutral-500 mt-1">Scroll wheel to zoom across 64-bit scale</p>
      </div>

    </main>
  );
}
