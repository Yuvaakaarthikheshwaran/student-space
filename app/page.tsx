"use client";
import React, { useEffect, useRef, useState } from "react";

// --- THE ASTROPHYSICS DATABASE ---
// Real-world distances are scaled for the map. 1 Map Unit = ~1 Light Year
const STAR_SYSTEMS = [
  {
    id: "SOL-01", name: "Solar System (Sol)", type: "G-Type Main Sequence", distance: "0 LY", mass: 1.0, color: "#fef08a",
    x: 0, y: 0, z: 0,
    planets: [
      { name: "Mercury", r: 2, d: 20, speed: 0.04, color: "#a3a3a3" },
      { name: "Venus", r: 4, d: 35, speed: 0.015, color: "#fcd34d" },
      { name: "Earth", r: 4.2, d: 50, speed: 0.01, color: "#3b82f6" },
      { name: "Mars", r: 3, d: 70, speed: 0.005, color: "#ef4444" },
      { name: "Jupiter", r: 12, d: 130, speed: 0.001, color: "#fdba74" }
    ]
  },
  {
    id: "CEN-02", name: "Alpha Centauri System", type: "Triple Star System", distance: "4.37 LY", mass: 2.1, color: "#fde047",
    x: 40, y: 15, z: -20,
    planets: [
      { name: "Alpha Centauri A", r: 15, d: 0, speed: 0, color: "#fef08a" },
      { name: "Alpha Centauri B", r: 12, d: 40, speed: 0.02, color: "#fdba74" },
      { name: "Proxima b", r: 4, d: 80, speed: 0.05, color: "#10b981" }
    ]
  },
  {
    id: "TRAP-03", name: "TRAPPIST-1", type: "Ultra-cool Dwarf", distance: "39.46 LY", mass: 0.08, color: "#ef4444",
    x: -80, y: -40, z: 120,
    planets: [
      { name: "1b", r: 3, d: 15, speed: 0.08, color: "#78716c" },
      { name: "1c", r: 3.2, d: 22, speed: 0.06, color: "#a8a29e" },
      { name: "1d", r: 2.5, d: 30, speed: 0.04, color: "#4ade80" },
      { name: "1e", r: 3.1, d: 38, speed: 0.03, color: "#60a5fa" }
    ]
  },
  {
    id: "SIRI-04", name: "Sirius (Dog Star)", type: "A-Type Main Sequence", distance: "8.6 LY", mass: 2.02, color: "#cffafe",
    x: -30, y: 50, z: -40,
    planets: [
      { name: "Sirius A", r: 20, d: 0, speed: 0, color: "#cffafe" },
      { name: "Sirius B (White Dwarf)", r: 3, d: 90, speed: 0.01, color: "#ffffff" }
    ]
  }
];

export default function InterstellarTerminal() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Terminal State
  const [viewState, setViewState] = useState<"MAP" | "WARP" | "SYSTEM">("MAP");
  const [activeSystem, setActiveSystem] = useState(STAR_SYSTEMS[0]);
  const [warpProgress, setWarpProgress] = useState(0);
  const [cameraRot, setCameraRot] = useState({ pitch: 0.2, yaw: 0 });

  // Refs for animation loop persistence
  const viewRef = useRef(viewState);
  const activeSystemRef = useRef(activeSystem);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });

  // Sync state to refs for the canvas loop
  useEffect(() => { viewRef.current = viewState; }, [viewState]);
  useEffect(() => { activeSystemRef.current = activeSystem; }, [activeSystem]);

  // Mouse Handlers for 3D Camera
  const handleMouseDown = (e: React.MouseEvent) => { mouseRef.current.isDown = true; };
  const handleMouseUp = () => { mouseRef.current.isDown = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseRef.current.isDown) return;
    setCameraRot(prev => ({
      yaw: prev.yaw - e.movementX * 0.005,
      pitch: Math.max(-Math.PI/2, Math.min(Math.PI/2, prev.pitch - e.movementY * 0.005))
    }));
  };

  const initiateJump = (system: typeof STAR_SYSTEMS[0]) => {
    setActiveSystem(system);
    setViewState("WARP");
    setWarpProgress(0);
    
    // Simulate Warp Sequence Time
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.01;
      setWarpProgress(progress);
      if (progress >= 1) {
        clearInterval(interval);
        setViewState("SYSTEM");
      }
    }, 30); // ~3 seconds of warp
  };

  // --- THE MASTER RENDERING ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Generate background static stars
    const staticStars = Array.from({ length: 800 }, () => ({
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      z: (Math.random() - 0.5) * 2000,
      size: Math.random() * 1.5
    }));

    // Local system orbital angles
    let planetAngles = Array(10).fill(0).map(() => Math.random() * Math.PI * 2);

    // 3D Projection Math
    const project = (x: number, y: number, z: number) => {
      let x1 = x * Math.cos(cameraRot.yaw) - z * Math.sin(cameraRot.yaw);
      let z1 = x * Math.sin(cameraRot.yaw) + z * Math.cos(cameraRot.yaw);
      let y1 = y * Math.cos(cameraRot.pitch) - z1 * Math.sin(cameraRot.pitch);
      let z2 = y * Math.sin(cameraRot.pitch) + z1 * Math.cos(cameraRot.pitch);
      
      const camZ = 400; // Camera distance
      z2 += camZ;
      if (z2 < 1) z2 = 1;
      
      const scale = 500 / z2;
      return { sx: width / 2 + x1 * scale, sy: height / 2 + y1 * scale, scale, z: z2 };
    };

    const animate = () => {
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      const state = viewRef.current;
      const sys = activeSystemRef.current;

      // 1. GALAXY MAP VIEW
      if (state === "MAP") {
        // Draw Grid
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        for(let i = -500; i <= 500; i += 50) {
          const p1 = project(i, 0, -500); const p2 = project(i, 0, 500);
          ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
          const p3 = project(-500, 0, i); const p4 = project(500, 0, i);
          ctx.moveTo(p3.sx, p3.sy); ctx.lineTo(p4.sx, p4.sy);
        }
        ctx.stroke();

        // Draw Stars
        STAR_SYSTEMS.forEach(star => {
          const proj = project(star.x, star.y, star.z);
          
          // Selection Highlight
          if (star.id === sys.id) {
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, 15 * proj.scale, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw connection to origin plane
            const dropProj = project(star.x, 0, star.z);
            ctx.beginPath(); ctx.moveTo(proj.sx, proj.sy); ctx.lineTo(dropProj.sx, dropProj.sy);
            ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
          }

          // Star Body
          ctx.beginPath();
          ctx.arc(proj.sx, proj.sy, 5 * proj.scale, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = star.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Label
          ctx.fillStyle = "white";
          ctx.font = "10px monospace";
          ctx.fillText(star.name, proj.sx + 10, proj.sy - 10);
        });
      }

      // 2. RELATIVISTIC WARP VIEW (Lorentz Contraction Visual)
      else if (state === "WARP") {
        const speed = warpProgress < 0.5 ? warpProgress * 2 : (1 - warpProgress) * 2; // Ease in/out
        const stretch = 1 + speed * 100;

        ctx.fillStyle = `rgba(2, 2, 2, ${0.1 + (1 - speed) * 0.9})`; // Motion blur trail
        ctx.fillRect(0, 0, width, height);

        staticStars.forEach(star => {
          star.z -= speed * 150; // Fly forward
          if (star.z < -200) star.z = 1000; // Loop stars

          const proj1 = project(star.x, star.y, star.z);
          const proj2 = project(star.x, star.y, star.z + stretch); // Stretched tail

          if (proj1.z > 0 && proj2.z > 0) {
            ctx.beginPath();
            ctx.moveTo(proj1.sx, proj1.sy);
            ctx.lineTo(proj2.sx, proj2.sy);
            
            // Doppler Shift: Blueshift approaching, redshift peripheral
            const isCenter = Math.abs(star.x) < 100 && Math.abs(star.y) < 100;
            ctx.strokeStyle = isCenter ? `rgba(165, 243, 252, ${speed})` : `rgba(239, 68, 68, ${speed * 0.5})`;
            ctx.lineWidth = proj1.scale * star.size;
            ctx.stroke();
          }
        });
      }

      // 3. LOCAL SYSTEM PHYSICS VIEW
      else if (state === "SYSTEM") {
        // Central Star
        const sunProj = project(0, 0, 0);
        const gradient = ctx.createRadialGradient(sunProj.sx, sunProj.sy, 0, sunProj.sx, sunProj.sy, 40 * sunProj.scale);
        gradient.addColorStop(0, sys.color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(sunProj.sx, sunProj.sy, 40 * sunProj.scale, 0, Math.PI * 2); ctx.fill();

        // Orbiting Planets
        const rendered = [] = [];
        sys.planets.forEach((p, i) => {
          planetAngles[i] += p.speed;
          const x = Math.cos(planetAngles[i]) * p.d;
          const z = Math.sin(planetAngles[i]) * p.d;
          
          // Draw Orbit Ring
          ctx.beginPath();
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            const ox = Math.cos(a) * p.d;
            const oz = Math.sin(a) * p.d;
            const ringProj = project(ox, 0, oz);
            if (a === 0) ctx.moveTo(ringProj.sx, ringProj.sy); else ctx.lineTo(ringProj.sx, ringProj.sy);
          }
          ctx.closePath();
          ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.stroke();

          const proj = project(x, 0, z);
          rendered.push({ ...proj, ...p });
        });

        // Depth sort and draw
        rendered.sort((a, b) => b.z - a.z).forEach(p => {
          ctx.beginPath(); ctx.arc(p.sx, p.sy, p.r * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = p.color; ctx.fill();
          
          // Tag
          ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "9px monospace";
          ctx.fillText(p.name, p.sx + p.r + 4, p.sy + 3);
        });
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", handleResize); };
  }, [cameraRot]);

  return (
    <main 
      className="relative w-screen h-screen bg-[#020202] text-neutral-300 font-mono overflow-hidden cursor-crosshair selection:bg-cyan-900"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />

      {/* TOP NAVIGATION HUD */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-cyan-500 mb-1 animate-pulse">Relativistic Flight Terminal</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">STELLAR CARTOGRAPHY</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Active Mode</p>
          <p className="text-sm font-bold text-white uppercase">{viewState === "MAP" ? "Sector Scan" : viewState === "WARP" ? "Transit" : "Local Physics"}</p>
        </div>
      </header>

      {/* LEFT PANEL: SYSTEM SELECTOR (Only in MAP mode) */}
      <aside className={`absolute top-24 left-6 w-80 flex flex-col gap-3 transition-all duration-500 ${viewState === "MAP" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none translate-x-[-20px]"}`}>
        <p className="text-[10px] uppercase tracking-widest text-neutral-500 border-b border-white/10 pb-2">Select Target Coordinates</p>
        {STAR_SYSTEMS.map(sys => (
          <button 
            key={sys.id}
            onClick={() => setActiveSystem(sys)}
            className={`text-left p-4 rounded-md border transition-all ${activeSystem.id === sys.id ? "bg-cyan-950/40 border-cyan-500/50" : "bg-black/40 border-white/10 hover:border-white/30 backdrop-blur-md"}`}
          >
            <h3 className="text-white font-bold text-sm">{sys.name}</h3>
            <div className="flex justify-between text-[10px] text-neutral-400 mt-2">
              <span>{sys.distance}</span>
              <span>{sys.type}</span>
            </div>
          </button>
        ))}

        <button 
          onClick={() => initiateJump(activeSystem)}
          className="mt-4 w-full bg-white text-black font-bold py-3 uppercase tracking-widest text-xs hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all"
        >
          Initiate Relativistic Jump
        </button>
      </aside>

      {/* RIGHT PANEL: LOCAL DATA (Only in SYSTEM mode) */}
      <aside className={`absolute top-24 right-6 w-80 flex flex-col gap-4 transition-all duration-500 ${viewState === "SYSTEM" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none translate-x-[20px]"}`}>
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-md">
          <p className="text-[10px] uppercase tracking-widest text-green-400 mb-1">Arrival Confirmed</p>
          <h2 className="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-4">{activeSystem.name}</h2>
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-xs text-neutral-400"><span className="uppercase text-[10px]">Stellar Class</span><span className="text-white">{activeSystem.type}</span></div>
            <div className="flex justify-between text-xs text-neutral-400"><span className="uppercase text-[10px]">Solar Mass</span><span className="text-white">{activeSystem.mass} M☉</span></div>
          </div>

          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">Orbital Bodies Detected [{activeSystem.planets.length}]</p>
          <div className="space-y-3">
            {activeSystem.planets.map((p, i) => (
              <div key={i} className="flex items-center justify-between border-l-2 pl-3" style={{ borderColor: p.color }}>
                <span className="text-xs text-white">{p.name}</span>
                <span className="text-[10px] text-neutral-500">Orbit: {p.d} AU</span>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setViewState("MAP")}
          className="w-full border border-white/20 text-white font-bold py-3 uppercase tracking-widest text-[10px] hover:bg-white/10 backdrop-blur-md transition-colors"
        >
          Return to Sector Map
        </button>
      </aside>

      {/* WARP HUD (Only visible during jump) */}
      <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center transition-opacity duration-300 ${viewState === "WARP" ? "opacity-100" : "opacity-0"}`}>
        <h2 className="text-6xl font-black text-white tracking-tighter mb-4 italic mix-blend-difference">VELOCITY: {(warpProgress * 0.999).toFixed(3)}c</h2>
        <div className="w-96 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" style={{ width: `${warpProgress * 100}%` }}></div>
        </div>
        <div className="w-96 flex justify-between text-[10px] text-cyan-400 uppercase tracking-widest mt-2 mix-blend-difference">
          <span>Lorentz Factor: {(1 / Math.sqrt(1 - Math.pow(warpProgress * 0.999, 2))).toFixed(2)}γ</span>
          <span>Doppler Shift Active</span>
        </div>
      </div>

    </main>
  );
}
