"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";

// --- THE COSMOS CODEX (REAL ASTRONOMICAL DATA) ---
const COSMIC_ENTITIES = [
  {
    id: "BH-TON618",
    name: "TON 618",
    classification: "Ultramassive Black Hole",
    distance: "18.2 Billion LY",
    mass: 66000000000, // Solar masses
    radius: "1300 AU",
    description: "One of the most massive black holes ever discovered. It powers a quasar so intensely luminous that it outshines the rest of its host galaxy by a factor of 100. Its event horizon is so large it would swallow our entire solar system 30 times over.",
    gravityDistortion: 0.98, // 0 to 1 scale for the visual engine
    color: "#a855f7" // Purple
  },
  {
    id: "NS-B0531",
    name: "Crab Pulsar",
    classification: "Neutron Star",
    distance: "6,500 LY",
    mass: 1.4,
    radius: "10 km",
    description: "The crushed core of a massive star that exploded in a supernova witnessed by Earth in 1054 AD. It spins 30 times per second, emitting a terrifyingly dense magnetic field and beams of intense radiation.",
    gravityDistortion: 0.85, 
    color: "#06b6d4" // Cyan
  },
  {
    id: "STAR-UY",
    name: "UY Scuti",
    classification: "Red Hypergiant",
    distance: "5,100 LY",
    mass: 10,
    radius: "1,700 Solar Radii",
    description: "One of the largest known stars in the universe. If placed at the center of our solar system, its photosphere would engulf the orbit of Jupiter. Despite its massive size, its outer layers are essentially a hot vacuum.",
    gravityDistortion: 0.4,
    color: "#ef4444" // Red
  },
  {
    id: "EXO-TRAPPIST1E",
    name: "TRAPPIST-1e",
    classification: "Terrestrial Exoplanet",
    distance: "39.46 LY",
    mass: 0.69,
    radius: "0.92 Earth Radii",
    description: "An Earth-sized planet orbiting within the habitable zone of an ultra-cool dwarf star. It is tidally locked—one hemisphere is locked in eternal daylight, the other in frozen, eternal night. A twilight ring separates the two.",
    gravityDistortion: 0.1,
    color: "#22c55e" // Green
  },
  {
    id: "GAL-M31",
    name: "Andromeda Galaxy",
    classification: "Barred Spiral Galaxy",
    distance: "2.5 Million LY",
    mass: 1500000000000,
    radius: "110,000 LY",
    description: "The nearest major galaxy to the Milky Way. It contains approximately one trillion stars. It is currently hurtling toward us at 110 kilometers per second and will collide with our galaxy in roughly 4.5 billion years.",
    gravityDistortion: 0.7,
    color: "#f59e0b" // Amber
  },
  {
    id: "VOID-BOOTES",
    name: "Boötes Void",
    classification: "Cosmic Void",
    distance: "700 Million LY",
    mass: 0.0000001,
    radius: "165 Million LY",
    description: "An incredibly massive, spherical region of space that is terrifyingly empty. At 330 million light-years across, it contains only 60 galaxies. If the Milky Way were in its center, we wouldn't have known other galaxies existed until the 1960s.",
    gravityDistortion: 0.01,
    color: "#737373" // Neutral
  }
];

export default function AstrophysicsTerminal() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeEntity, setActiveEntity] = useState(COSMIC_ENTITIES[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Search Filter
  const filteredEntities = useMemo(() => {
    return COSMIC_ENTITIES.filter(entity => 
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.classification.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // --- SPACETIME GRAVITY WELL ENGINE ---
  // This canvas physically bends a grid based on the selected object's mass
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const spacing = 30;
    const points: Array<{ x: number; y: number; ox: number; oy: number }> = [];
    
    // Build Spacetime Grid
    for (let x = 0; x < width + spacing; x += spacing) {
      for (let y = 0; y < height + spacing; y += spacing) {
        points.push({ x, y, ox: x, oy: y });
      }
    }

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);
      time += 0.02;

      const cx = width / 2;
      const cy = height / 2;
      
      // The gravity depth is mapped to the active entity's data
      const distortionStrength = activeEntity.gravityDistortion * 400;

      ctx.strokeStyle = `rgba(255, 255, 255, 0.08)`;
      ctx.lineWidth = 1;

      points.forEach((p) => {
        // Calculate gravitational pull towards center
        const dx = p.ox - cx;
        const dy = p.oy - cy;
        const dist = Math.hypot(dx, dy);
        
        let force = 0;
        if (dist > 10) {
          // Inverse square law simulation for spacetime bending
          force = distortionStrength / dist;
        }

        // Add subtle quantum fluctuation
        const noise = Math.sin(p.ox * 0.05 + time) * Math.cos(p.oy * 0.05 + time) * 2;

        p.x = p.ox - (dx / dist) * force + noise;
        p.y = p.oy - (dy / dist) * force + noise;
      });

      // Draw Grid Lines (Horizontal & Vertical connections)
      ctx.beginPath();
      const cols = Math.floor(width / spacing) + 1;
      const rows = Math.floor(height / spacing) + 1;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        // Connect Right
        if ((i + 1) % rows !== 0 && points[i + 1]) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(points[i + 1].x, points[i + 1].y);
        }
        // Connect Down
        if (i + rows < points.length) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(points[i + rows].x, points[i + rows].y);
        }
      }
      ctx.stroke();

      // Draw Singularity/Core glow based on active entity color
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, distortionStrength * 1.5);
      gradient.addColorStop(0, `${activeEntity.color}80`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, distortionStrength * 1.5, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener("resize", handleResize); };
  }, [activeEntity]);

  return (
    <main className="relative min-h-screen bg-[#020202] text-white font-mono selection:bg-cyan-900 overflow-hidden flex">
      
      {/* BACKGROUND SPACETIME ENGINE */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,#020202_90%)]"></div>
      </div>

      {/* LEFT PANEL: DATABASE INDEX */}
      <aside className="relative z-10 w-96 border-r border-white/10 bg-[#050505]/80 backdrop-blur-xl h-screen flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">System Database</p>
          <h1 className="text-xl font-bold tracking-tight text-white mb-4">ASTROPHYSICS ARCHIVE</h1>
          <input
            type="text"
            placeholder="Search celestial bodies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-md py-2 px-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 transition-all"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {filteredEntities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => setActiveEntity(entity)}
              className={`w-full text-left p-4 rounded-lg border transition-all duration-300 ${
                activeEntity.id === entity.id 
                  ? "bg-white/10 border-white/30 shadow-lg" 
                  : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{entity.id}</span>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entity.color }}></div>
              </div>
              <h3 className="text-sm font-bold text-white">{entity.name}</h3>
              <p className="text-xs text-neutral-400 truncate mt-1">{entity.classification}</p>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-white/10 text-[9px] text-neutral-600 uppercase tracking-widest text-center">
          Simulation Real-time: {new Date().toLocaleTimeString()}
        </div>
      </aside>

      {/* RIGHT PANEL: TELEMETRY HUD */}
      <section className="relative z-10 flex-1 h-screen flex flex-col justify-between p-8 md:p-16 pointer-events-none">
        
        {/* Top Right: Status */}
        <div className="self-end text-right">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 flex items-center justify-end gap-2">
            Spacetime Distortion Grid <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          </p>
          <p className="text-xs font-bold text-white">ACTIVE SENSOR ARRAY</p>
        </div>

        {/* Bottom Left: Data Readout */}
        <div className="max-w-2xl bg-black/60 border border-white/10 p-8 rounded-2xl backdrop-blur-2xl shadow-2xl pointer-events-auto transition-all duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: activeEntity.color }}></div>
            <div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white">{activeEntity.name}</h2>
              <p className="text-sm text-neutral-400 mt-1 uppercase tracking-widest">{activeEntity.classification}</p>
            </div>
          </div>
          
          <p className="text-sm text-neutral-300 leading-relaxed mb-8 font-sans">
            {activeEntity.description}
          </p>

          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-6">
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Estimated Mass</p>
              <p className="text-lg font-bold text-white">{activeEntity.mass.toLocaleString()} <span className="text-xs text-neutral-500 font-normal uppercase">Solar Masses</span></p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Distance from Earth</p>
              <p className="text-lg font-bold text-white">{activeEntity.distance}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Physical Radius</p>
              <p className="text-lg font-bold text-white">{activeEntity.radius}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Gravitational Force</p>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full transition-all duration-1000 ease-out" 
                  style={{ width: `${activeEntity.gravityDistortion * 100}%`, backgroundColor: activeEntity.color }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
