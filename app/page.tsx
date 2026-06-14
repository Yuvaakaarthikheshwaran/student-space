"use client";
import React, { useEffect, useRef, useState } from "react";

// --- PHYSICS ENGINE TYPES & CONSTANTS ---
type Body = {
  id: string;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
};

const G = 0.5; // Scaled Gravitational Constant for simulation
const DT = 0.1; // Time step per frame
const MAX_TRAIL = 300;

// Initial Stable State: A Binary Star System with a figure-8 planet, plus outer orbiters
const INITIAL_BODIES: Body[] = [
  { id: "Star A", mass: 2000, x: -150, y: 0, vx: 0, vy: -1.2, ax: 0, ay: 0, radius: 12, color: "#eab308", trail: [] },
  { id: "Star B", mass: 2000, x: 150, y: 0, vx: 0, vy: 1.2, ax: 0, ay: 0, radius: 12, color: "#f97316", trail: [] },
  { id: "Planet 1", mass: 10, x: 0, y: 0, vx: 0, vy: 3.5, ax: 0, ay: 0, radius: 3, color: "#38bdf8", trail: [] },
  { id: "Planet 2", mass: 50, x: 0, y: 400, vx: 1.8, vy: 0, ax: 0, ay: 0, radius: 5, color: "#a3e635", trail: [] },
  { id: "Comet", mass: 1, x: 500, y: -300, vx: -1.0, vy: -0.2, ax: 0, ay: 0, radius: 2, color: "#cbd5e1", trail: [] }
];

export default function NBodySimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bodies, setBodies] = useState<Body[]>(INITIAL_BODIES);
  const [isRunning, setIsRunning] = useState(true);
  const [metrics, setMetrics] = useState({ kinetic: 0, potential: 0, total: 0 });
  
  const bodiesRef = useRef<Body[]>(JSON.parse(JSON.stringify(INITIAL_BODIES)));
  const reqRef = useRef<number>();

  // --- THE VELOCITY VERLET INTEGRATOR ---
  const calculateAccelerations = (currentBodies: Body[]) => {
    // Reset accelerations
    for (let i = 0; i < currentBodies.length; i++) {
      currentBodies[i].ax = 0;
      currentBodies[i].ay = 0;
    }

    let potentialEnergy = 0;

    // Calculate pairwise gravitational forces
    for (let i = 0; i < currentBodies.length; i++) {
      for (let j = i + 1; j < currentBodies.length; j++) {
        const b1 = currentBodies[i];
        const b2 = currentBodies[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Prevent division by zero / extreme singularities
        if (dist < (b1.radius + b2.radius) / 2) continue;

        const force = (G * b1.mass * b2.mass) / distSq;
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);

        b1.ax += fx / b1.mass;
        b1.ay += fy / b1.mass;
        b2.ax -= fx / b2.mass;
        b2.ay -= fy / b2.mass;

        potentialEnergy -= (G * b1.mass * b2.mass) / dist;
      }
    }
    return potentialEnergy;
  };

  const updatePhysics = () => {
    const current = bodiesRef.current;
    let kineticEnergy = 0;

    // 1. Update Positions based on current velocity and acceleration
    for (let i = 0; i < current.length; i++) {
      const b = current[i];
      b.x += b.vx * DT + 0.5 * b.ax * DT * DT;
      b.y += b.vy * DT + 0.5 * b.ay * DT * DT;
      
      // Save trail data
      if (Math.random() < 0.2) { // Throttle trail updates for performance
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > MAX_TRAIL) b.trail.shift();
      }
    }

    // Store old accelerations to calculate new velocity
    const oldAx = current.map(b => b.ax);
    const oldAy = current.map(b => b.ay);

    // 2. Calculate New Accelerations based on new positions
    const potentialEnergy = calculateAccelerations(current);

    // 3. Update Velocities using average of old and new accelerations
    for (let i = 0; i < current.length; i++) {
      const b = current[i];
      b.vx += 0.5 * (oldAx[i] + b.ax) * DT;
      b.vy += 0.5 * (oldAy[i] + b.ay) * DT;

      const vSq = b.vx * b.vx + b.vy * b.vy;
      kineticEnergy += 0.5 * b.mass * vSq;
    }

    // Update React state safely (throttled to UI refresh rate)
    setMetrics({ 
      kinetic: kineticEnergy, 
      potential: potentialEnergy, 
      total: kineticEnergy + potentialEnergy 
    });
  };

  // --- RENDER ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize observer
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let frameCount = 0;

    const animate = () => {
      if (isRunning) {
        // Run multiple physics steps per visual frame for higher accuracy
        for(let step = 0; step < 5; step++) {
          updatePhysics();
        }
      }

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for(let i = 0; i < canvas.width; i+= 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
      for(let i = 0; i < canvas.height; i+= 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); }

      const current = bodiesRef.current;

      // Draw Trails
      current.forEach(b => {
        if (b.trail.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(cx + b.trail[0].x, cy + b.trail[0].y);
        for (let i = 1; i < b.trail.length; i++) {
          ctx.lineTo(cx + b.trail[i].x, cy + b.trail[i].y);
        }
        ctx.strokeStyle = `${b.color}40`; // 25% opacity
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw Bodies & Velocity Vectors
      current.forEach(b => {
        // Body
        ctx.beginPath();
        ctx.arc(cx + b.x, cy + b.y, Math.max(b.radius, 2), 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        // Velocity Vector Line
        ctx.beginPath();
        ctx.moveTo(cx + b.x, cy + b.y);
        ctx.lineTo(cx + b.x + (b.vx * 15), cy + b.y + (b.vy * 15));
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Sync state to UI occasionally
      if (frameCount % 10 === 0) {
        setBodies([...current]);
      }
      frameCount++;

      reqRef.current = requestAnimationFrame(animate);
    };

    reqRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(reqRef.current!);
      window.removeEventListener('resize', resize);
    };
  }, [isRunning]);

  const resetSystem = () => {
    bodiesRef.current = JSON.parse(JSON.stringify(INITIAL_BODIES));
    setBodies(bodiesRef.current);
  };

  return (
    <main className="relative w-full h-screen bg-[#050505] text-neutral-300 font-mono overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" />

      {/* SCIENTIFIC HUD - TOP LEFT */}
      <div className="absolute top-6 left-6 pointer-events-none flex flex-col gap-2">
        <h1 className="text-white font-bold tracking-widest uppercase border-b border-white/20 pb-2 mb-2">N-Body Integrator v1.0</h1>
        <div className="bg-black/50 border border-white/10 p-4 rounded-sm backdrop-blur-md w-72">
          <p className="text-[10px] text-neutral-500 mb-2 uppercase tracking-widest">System Thermodynamics</p>
          <div className="flex justify-between text-xs mb-1">
            <span>Kinetic Energy (T):</span>
            <span className="text-cyan-400">{metrics.kinetic.toExponential(4)} J</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span>Potential Energy (U):</span>
            <span className="text-pink-400">{metrics.potential.toExponential(4)} J</span>
          </div>
          <div className="flex justify-between text-xs pt-2 border-t border-white/10 mt-2 font-bold text-white">
            <span>Total Energy (E):</span>
            <span>{metrics.total.toExponential(4)} J</span>
          </div>
          <p className="text-[9px] text-neutral-600 mt-3 leading-tight">
            * Utilizing Velocity Verlet algorithm. A constant Total Energy (E) indicates a highly stable and accurate mathematical integration.
          </p>
        </div>
      </div>

      {/* DATA TERMINAL - RIGHT SIDE */}
      <div className="absolute top-6 right-6 bottom-6 w-80 flex flex-col gap-4 pointer-events-none">
        
        {/* Controls */}
        <div className="bg-black/50 border border-white/10 p-4 rounded-sm backdrop-blur-md pointer-events-auto flex gap-2">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className="flex-1 bg-white text-black text-xs py-2 font-bold hover:bg-neutral-300 transition-colors uppercase"
          >
            {isRunning ? "Pause Engine" : "Resume Engine"}
          </button>
          <button 
            onClick={resetSystem}
            className="flex-1 bg-transparent border border-white/20 text-white text-xs py-2 hover:bg-white/10 transition-colors uppercase"
          >
            Reset State
          </button>
        </div>

        {/* Live Body Telemetry */}
        <div className="bg-black/50 border border-white/10 p-4 rounded-sm backdrop-blur-md flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] text-neutral-500 mb-4 uppercase tracking-widest sticky top-0 bg-black/80 pb-2">Live Telemetry Streams</p>
          
          <div className="flex flex-col gap-4">
            {bodies.map(b => (
              <div key={b.id} className="text-xs border-l-2 pl-3" style={{ borderColor: b.color }}>
                <p className="font-bold text-white mb-1 uppercase">{b.id}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-neutral-400">
                  <p>Mass: <span className="text-white">{b.mass.toFixed(1)}</span></p>
                  <p>Pos X: <span className="text-white">{b.x.toFixed(1)}</span></p>
                  <p>Pos Y: <span className="text-white">{b.y.toFixed(1)}</span></p>
                  <p>Vel X: <span className="text-white">{b.vx.toFixed(2)}</span></p>
                  <p>Vel Y: <span className="text-white">{b.vy.toFixed(2)}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  );
}
