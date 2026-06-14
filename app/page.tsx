"use client";
import React, { useEffect, useRef, useState } from "react";

// --- THE ASTROPHYSICS DATABASE ---
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

const LY_TO_AU = 63241.077; 
const AU_IN_LY = 1 / LY_TO_AU; // ~0.0000158

export default function SeamlessRelativisticEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [velocityC, setVelocityC] = useState(0); 
  const [timeMultiplier, setTimeMultiplier] = useState(1); 
  
  const [telemetry, setTelemetry] = useState({ 
    universeYears: 0, shipYears: 0, gamma: 1, distance: 0, zoom: 1 
  });

  const [targetStar, setTargetStar] = useState(STAR_SYSTEMS[0]);

  // Persistent Engine State
  const engineState = useRef({
    // NEW SPAWN POINT: Exactly 2.0 AU away from the Sun (Sol)
    ship: { x: 0, y: 0.000005, z: -(2.0 * AU_IN_LY) }, 
    
    // CAMERA LERP SYSTEM (Smooth Damping)
    camera: { 
        pitch: 0, yaw: 0, 
        targetPitch: 0.05, targetYaw: 0, // Targets for the Lerp function
        zoomExp: 0, zoomRaw: 1 
    },
    mouse: { isDown: false, lastX: 0, lastY: 0 },
    clocks: { universe: 0, ship: 0 },
    planetAngles: new Map<string, number>()
  });

  const bgStars = useRef(Array.from({ length: 4000 }, () => ({
    x: (Math.random() - 0.5) * 1000,
    y: (Math.random() - 0.5) * 1000,
    z: (Math.random() - 0.5) * 1000,
    size: Math.random() * 0.8 + 0.2,
    alpha: Math.random() * 0.5 + 0.1
  })));

  // SMOOTH INPUT HANDLING
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
    
    // We update TARGETS, not the actual camera. This allows smooth gliding.
    engineState.current.camera.targetYaw -= dx * 0.003;
    engineState.current.camera.targetPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, engineState.current.camera.targetPitch - dy * 0.003));
    
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const cam = engineState.current.camera;
    cam.zoomExp = Math.max(0, Math.min(15, cam.zoomExp - e.deltaY * 0.005));
    cam.zoomRaw = Math.exp(cam.zoomExp);
  };

  const centerCamera = () => {
    engineState.current.camera.targetYaw = 0;
    engineState.current.camera.targetPitch = 0;
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

      // NEAR-PLANE CULLING FIX: Prevents math exploding when too close
      if (fz < 0.000001) return null; 

      const aberration = Math.sqrt((1 - v_c) / (1 + v_c)); 
      const activeZoom = isBackground ? 1 : state.camera.zoomRaw;
      const scale = (width / 2) * (activeZoom / fz) * aberration;

      return { sx: width / 2 + tx * scale, sy: height / 2 + ty * scale, scale: scale, dist: fz };
    };

    const animate = () => {
      const state = engineState.current;
      
      // APPLY CAMERA LERP (The Butter-Smooth Feel)
      state.camera.yaw += (state.camera.targetYaw - state.camera.yaw) * 0.1;
      state.camera.pitch += (state.camera.targetPitch - state.camera.pitch) * 0.1;

      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      const gamma = 1 / Math.sqrt(1 - Math.pow(velocityC, 2));
      const deltaYears = dtBase * timeMultiplier;
      
      state.clocks.universe += deltaYears;
      state.clocks.ship += deltaYears / gamma;

      // AUTOPILOT NAVIGATION
      let distToTarget = 0;
      const tx = targetStar.x - state.ship.x;
      const ty = targetStar.y - state.ship.y;
      const tz = targetStar.z - state.ship.z;
      distToTarget = Math.sqrt(tx*tx + ty*ty + tz*tz);

      if (velocityC > 0 && distToTarget > 0.00001) {
        const moveDist = velocityC * deltaYears; 
        state.ship.x += (tx / distToTarget) * moveDist;
        state.ship.y += (ty / distToTarget) * moveDist;
        state.ship.z += (tz / distToTarget) * moveDist;
      }

      if (Math.random() < 0.1) {
        setTelemetry({
          universeYears: state.clocks.universe, shipYears: state.clocks.ship,
          gamma: gamma, distance: distToTarget, zoom: state.camera.zoomRaw
        });
      }

      // 1. BACKGROUND STARS
      bgStars.current.forEach(star => {
        if (velocityC > 0) {
           star.z -= velocityC * 5;
           if (star.z < -500) star.z = 500;
        }
        const proj = project(star.x, star.y, star.z, velocityC, true);
        if (proj) {
          ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
          ctx.fillRect(proj.sx, proj.sy, Math.max(1, star.size * proj.scale), Math.max(1, star.size * proj.scale));
        }
      });

      // 2. STARS (WITH YELLOW SCREEN FIX)
      STAR_SYSTEMS.forEach(star => {
        const starProj = project(star.x, star.y, star.z, velocityC);
        
        if (starProj) {
          const rawBaseSize = 5 * starProj.scale;
          // CLAMPING: Prevent the star from becoming infinitely large and washing out the screen
          const coreRadius = Math.min(width * 0.4, rawBaseSize); 
          const glowRadius = Math.min(width * 1.5, rawBaseSize * 3);

          if (starProj.dist > 0.000005) {
             // Draw Corona Glow
             const gradient = ctx.createRadialGradient(starProj.sx, starProj.sy, coreRadius, starProj.sx, starProj.sy, glowRadius);
             gradient.addColorStop(0, `${star.color}90`); // 90 is hex alpha (slightly transparent)
             gradient.addColorStop(1, "rgba(0,0,0,0)");
             ctx.fillStyle = gradient;
             ctx.beginPath(); ctx.arc(starProj.sx, starProj.sy, glowRadius, 0, Math.PI * 2); ctx.fill();

             // Draw Solid Hot Core
             ctx.fillStyle = "#ffffff";
             ctx.beginPath(); ctx.arc(starProj.sx, starProj.sy, coreRadius, 0, Math.PI * 2); ctx.fill();
          }

          // Labels disappear when you get too close so they don't block the screen
          if (starProj.dist < 50 && starProj.dist > 0.001) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.font = "12px monospace";
            ctx.fillText(star.name, starProj.sx + coreRadius + 15, starProj.sy);
          }
        }

        // 3. PLANETARY ORBITS (No more infinite zooming glitches)
        const distToCamera = Math.sqrt(Math.pow(star.x - state.ship.x, 2) + Math.pow(star.y - state.ship.y, 2) + Math.pow(star.z - state.ship.z, 2));
        
        if (distToCamera < 0.1 || state.camera.zoomRaw > 100) {
          star.planets.forEach(p => {
            const planetId = `${star.id}-${p.name}`;
            if (!state.planetAngles.has(planetId)) state.planetAngles.set(planetId, Math.random() * Math.PI * 2);
            
            const periodYears = Math.sqrt(Math.pow(p.d, 3) / star.mass);
            let currentAngle = state.planetAngles.get(planetId)!;
            currentAngle += (deltaYears / periodYears) * Math.PI * 2;
            state.planetAngles.set(planetId, currentAngle);

            const radiusInLY = p.d * AU_IN_LY;
            const px = star.x + radiusInLY * Math.cos(currentAngle);
            const pz = star.z + radiusInLY * Math.sin(currentAngle);
            const py = star.y;

            const pProj = project(px, py, pz, velocityC);
            if (pProj) {
              // Clamp planet size so they don't consume the screen either
              const pSize = Math.min(width * 0.2, Math.max(1.5, p.r * pProj.scale * 0.0005)); 
              ctx.fillStyle = p.color;
              ctx.beginPath(); ctx.arc(pProj.sx, pProj.sy, pSize, 0, Math.PI * 2); ctx.fill();
              
              if (state.camera.zoomRaw > 500 || distToCamera < 0.001) {
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
                ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.stroke();
                
                ctx.fillStyle = "rgba(255,255,255,0.7)";
                ctx.font = "10px monospace";
                ctx.fillText(p.name, pProj.sx + pSize + 6, pProj.sy + 4);
              }
            }
          });
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
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />

      <aside className="absolute top-6 left-6 w-80 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-lg pointer-events-auto shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest text-cyan-400 mb-4 animate-pulse">Nav-Computer Online</p>
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
           <h2 className="text-xl font-bold">Coordinates</h2>
           <button onClick={centerCamera} className="text-[10px] uppercase border border-white/20 px-2 py-1 rounded hover:bg-white/10 transition-colors">Align Forward</button>
        </div>
        
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
          <p className="text-lg font-bold text-white">{telemetry.distance.toFixed(6)} LY</p>
          <p className="text-[10px] text-neutral-500 mt-2">({(telemetry.distance * LY_TO_AU).toLocaleString(undefined, {maximumFractionDigits:0})} AU)</p>
        </div>
      </aside>

      <footer className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-black/80 backdrop-blur-3xl border border-white/10 p-8 rounded-2xl pointer-events-auto shadow-2xl">
        <div className="grid grid-cols-2 gap-12">
          
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
          </div>

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
    </main>
  );
}
