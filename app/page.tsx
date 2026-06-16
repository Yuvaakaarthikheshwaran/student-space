"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Html } from "@react-three/drei";
import * as THREE from "three";

type StarData = { id: string; name: string; x: number; y: number; z: number; color: string; radius: number; distanceLY: number; class: string; temp?: number; mass?: number; isCustom?: boolean };

// EXPANDED CATALOG: 25 Famous Stars
const CORE_STARS: StarData[] = [
  { id: "SOL", name: "Sun", class: "G2V", x: 0, y: 0, z: 0, color: "#fef08a", radius: 1, distanceLY: 0, temp: 5778, mass: 1 },
  { id: "CEN", name: "Alpha Centauri", class: "G2V", x: 4.37, y: 0, z: 0, color: "#fde047", radius: 1.1, distanceLY: 4.37, temp: 5790, mass: 1.1 },
  { id: "SIR", name: "Sirius", class: "A1V", x: -2.0, y: -8.0, z: -2.5, color: "#cffafe", radius: 1.71, distanceLY: 8.6, temp: 9940, mass: 2.02 },
  { id: "ERI", name: "Epsilon Eridani", class: "K2V", x: -5.0, y: -8.0, z: 5.0, color: "#fdba74", radius: 0.73, distanceLY: 10.5, temp: 5084, mass: 0.82 },
  { id: "PRO", name: "Procyon", class: "F5IV", x: -4.0, y: -10.0, z: 1.0, color: "#fef08a", radius: 2.04, distanceLY: 11.4, temp: 6530, mass: 1.49 },
  { id: "TAU", name: "Tau Ceti", class: "G8V", x: -11.0, y: 0.0, z: -4.0, color: "#fde047", radius: 0.79, distanceLY: 11.9, temp: 5344, mass: 0.78 },
  { id: "ALT", name: "Altair", class: "A7V", x: 12.0, y: 5.0, z: 8.0, color: "#a5f3fc", radius: 1.63, distanceLY: 16.7, temp: 7550, mass: 1.79 },
  { id: "FOM", name: "Fomalhaut", class: "A3V", x: 10.0, y: -18.0, z: 10.0, color: "#cffafe", radius: 1.84, distanceLY: 25.1, temp: 8590, mass: 1.92 },
  { id: "VEG", name: "Vega", class: "A0V", x: 15.0, y: 15.0, z: -10.0, color: "#67e8f9", radius: 2.36, distanceLY: 25.0, temp: 9602, mass: 2.13 },
  { id: "ARC", name: "Arcturus", class: "K0III", x: 5.0, y: 30.0, z: 20.0, color: "#fb923c", radius: 25.4, distanceLY: 36.7, temp: 4286, mass: 1.08 },
  { id: "CAP", name: "Capella", class: "G3III", x: -20.0, y: 35.0, z: -15.0, color: "#fde047", radius: 11.9, distanceLY: 42.9, temp: 4970, mass: 2.56 },
  { id: "ALD", name: "Aldebaran", class: "K5III", x: -40.0, y: 20.0, z: 45.0, color: "#f97316", radius: 44.1, distanceLY: 65.3, temp: 3910, mass: 1.16 },
  { id: "REG", name: "Regulus", class: "B8Ia", x: -600.0, y: -100.0, z: 400.0, color: "#3b82f6", radius: 78.9, distanceLY: 860.0, temp: 12100, mass: 21 },
  { id: "BET", name: "Betelgeuse", class: "M1-2I", x: -400.0, y: -100.0, z: 300.0, color: "#dc2626", radius: 887.0, distanceLY: 548.0, temp: 3600, mass: 16.5 },
  { id: "POL", name: "Polaris", class: "F7Ib", x: 0.0, y: 433.0, z: 0.0, color: "#fef08a", radius: 37.5, distanceLY: 433.0, temp: 6015, mass: 5.4 },
  { id: "ANT", name: "Antares", class: "M1.5I", x: 200.0, y: -300.0, z: -400.0, color: "#ef4444", radius: 680.0, distanceLY: 550.0, temp: 3500, mass: 12.0 },
  { id: "SPI", name: "Spica", class: "B1IV", x: 100.0, y: -150.0, z: 200.0, color: "#60a5fa", radius: 7.4, distanceLY: 250.0, temp: 22400, mass: 11.43 },
  { id: "DEN", name: "Deneb", class: "A2Ia", x: 1500.0, y: 1500.0, z: -1000.0, color: "#e0f2fe", radius: 203.0, distanceLY: 2615.0, temp: 8525, mass: 19.0 },
  { id: "ACR", name: "Acrux", class: "G2V", x: 200.0, y: -100.0, z: -200.0, color: "#67e8f9", radius: 1.3, distanceLY: 320.0, temp: 28000, mass: 14.0 },
  { id: "ALN", name: "Alnilam", class: "B0Ia", x: -800.0, y: -300.0, z: 800.0, color: "#2563eb", radius: 32.4, distanceLY: 2000.0, temp: 27500, mass: 34.6 }
];
const SECONDS_PER_YEAR = 31557600;

// --- 3D STELLAR MESH COMPONENT ---
const StarMesh = ({ star }: { star: StarData }) => {
  const radius = Math.max(0.015, star.radius * 0.015);
  return (
    <group position={[star.x, star.y, star.z]}>
      {/* Physical Star Core */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color={star.color} />
      </mesh>
      {/* Atmospheric Glow/Halo */}
      <mesh>
        <sphereGeometry args={[radius * 2.5, 32, 32]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 3D UI Label */}
      <Html distanceFactor={15} center zIndexRange={[100, 0]}>
        <div className="text-white text-[10px] font-mono whitespace-nowrap opacity-60 pointer-events-none mt-6 tracking-widest">{star.name}</div>
      </Html>
    </group>
  );
};

// --- DYNAMIC RELATIVISTIC DUST ---
const RelativisticDust = ({ velocityC }: { velocityC: number }) => {
  const dustRef = useRef<THREE.Points>(null);
  const { camera } = useThree();
  
  const particleCount = 2000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!dustRef.current || velocityC <= 0) return;
    const positions = dustRef.current.geometry.attributes.position.array as Float32Array;
    
    // Move dust opposite to camera facing
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const speed = velocityC * delta * 50; 
    
    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      p.addScaledVector(camDir, -speed);
      
      // Wrap dust around camera if it falls behind
      if (p.distanceTo(camera.position) > 25) {
         const newPos = camera.position.clone().addScaledVector(camDir, 20);
         newPos.x += (Math.random() - 0.5) * 20;
         newPos.y += (Math.random() - 0.5) * 20;
         newPos.z += (Math.random() - 0.5) * 20;
         p.copy(newPos);
      }
      
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
    dustRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={dustRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.05} transparent opacity={velocityC > 0.1 ? 0.8 : 0.3} sizeAttenuation={true} />
    </points>
  );
};

// --- 3D RELATIVISTIC NAV-COMPUTER COMPONENT ---
const ShipController = ({ targetStar, velocityC, timeExp, setVelocityC, setTimeExp, setTelemetry, setDistances, knownStars }: any) => {
  const { camera } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(targetStar.x, targetStar.y, targetStar.z), [targetStar]);
  const lastTime = useRef(performance.now());
  const clocks = useRef({ universe: 0, ship: 0 });

  useFrame(() => {
    const now = performance.now();
    const dRealSec = (now - lastTime.current) / 1000;
    lastTime.current = now;

    const dYrs = (dRealSec * Math.pow(10, timeExp)) / SECONDS_PER_YEAR;
    const dist = camera.position.distanceTo(targetVec);

    let v = velocityC;
    let moveDist = v * dYrs;

    // Cinematic Auto-Brake
    if (v > 0 && moveDist >= dist - 0.05) {
      moveDist = Math.max(0, dist - 0.05);
      v = 0;
      setTimeout(() => { setVelocityC(0); setTimeExp(0); }, 0);
    }

    // Physical Camera Translation
    if (moveDist > 0) {
      const dir = new THREE.Vector3().subVectors(targetVec, camera.position).normalize();
      camera.position.addScaledVector(dir, moveDist);
    }

    // Cinematic Slerp Camera Rotation (Smooth Panning)
    const currentQuat = camera.quaternion.clone();
    camera.lookAt(targetVec);
    const targetQuat = camera.quaternion.clone();
    camera.quaternion.copy(currentQuat).slerp(targetQuat, 0.05);

    // Relativistic Math
    const gamma = 1 / Math.sqrt(1 - Math.pow(v, 2));
    clocks.current.universe += dYrs;
    clocks.current.ship += dYrs / gamma;

    // UI Telemetry Sync
    if (Math.random() < 0.1) {
      const liveDistances: Record<string, number> = {};
      knownStars.forEach((s: StarData) => {
         liveDistances[s.id] = camera.position.distanceTo(new THREE.Vector3(s.x, s.y, s.z));
      });
      setDistances(liveDistances);
      setTelemetry({ gamma, universeYears: clocks.current.universe, shipYears: clocks.current.ship, contractedDist: dist / gamma, etaYears: v > 0 ? (dist / gamma) / v : -1 });
    }
  });

  return null;
};
// --- REACT UI OVERLAY ---
export default function DeepSpaceEngine() {
  const [hasStarted, setHasStarted] = useState(false);
  const [velocityC, setVelocityC] = useState(0); 
  const [timeExp, setTimeExp] = useState(0); 
  const [telemetry, setTelemetry] = useState({ gamma: 1, universeYears: 0, shipYears: 0, contractedDist: Infinity, etaYears: -1 });
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [knownStars, setKnownStars] = useState<StarData[]>(CORE_STARS);
  const [targetStar, setTargetStar] = useState<StarData>(CORE_STARS[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const searchSimbadAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const sq = searchQuery.trim().toLowerCase();
      const localMatch = knownStars.find(s => s.name.toLowerCase().includes(sq));
      if (localMatch) { setTargetStar(localMatch); setIsSearching(false); setSearchQuery(""); return; }

      const res = await fetch(`https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?${encodeURIComponent(searchQuery)}`);
      const xml = new DOMParser().parseFromString(await res.text(), "text/xml");
      if (!xml.querySelector("plx")) throw new Error("Parallax not found.");

      const plx = parseFloat(xml.querySelector("plx")!.textContent || "0");
      const distLY = (1000 / plx) * 3.26156;
      const raRad = parseFloat(xml.querySelector("jradeg")?.textContent || "0") * (Math.PI / 180);
      const decRad = parseFloat(xml.querySelector("jdedeg")?.textContent || "0") * (Math.PI / 180);
      
      const newStar: StarData = {
        id: `API-${Date.now()}`, name: xml.querySelector("oname")?.textContent || searchQuery.toUpperCase(), class: "API Discovered", color: "#a5b4fc", radius: 1.5, distanceLY: distLY, isCustom: true,
        x: distLY * Math.cos(decRad) * Math.cos(raRad), y: distLY * Math.sin(decRad), z: distLY * Math.cos(decRad) * Math.sin(raRad)
      };
      setKnownStars(p => [...p, newStar]); setTargetStar(newStar); setSearchQuery("");
    } catch (err: any) { alert(err.message || "Uplink Failed"); } finally { setIsSearching(false); }
  };

  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#020202] text-white font-mono selection:bg-cyan-900 relative overflow-hidden">
         <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>
         <div className="text-center z-10 max-w-2xl px-6">
            <p className="text-cyan-500 font-bold tracking-[0.3em] uppercase text-xs mb-4 animate-pulse">GPU WebGL Initialized</p>
            <h1 className="text-5xl font-black mb-6 tracking-tight">R3F Spatial Engine</h1>
            
            <div className="bg-white/5 border border-white/10 p-6 rounded-lg mb-8 text-left">
                <p className="text-neutral-400 mb-4 text-sm leading-relaxed">
                   <strong className="text-cyan-400">UPGRADE ACTIVE:</strong> You have crossed into dedicated GPU rendering. Stars are now true 3D spherical meshes. The background skybox spans an infinite volumetric domain.
                </p>
                <p className="text-neutral-400 text-sm leading-relaxed">
                   <strong className="text-red-400">WARNING:</strong> At 99% the speed of light, you won't need a diet. Lorentz contraction will make your ship appear incredibly thin to the rest of the universe. Proceed at your own existential risk.
                </p>
            </div>
            <button onClick={() => setHasStarted(true)} className="bg-cyan-600 hover:bg-cyan-400 text-black px-12 py-4 rounded-lg font-black uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]">Ignite 3D Engine</button>
         </div>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen bg-[#020202] text-white font-mono overflow-hidden">
      
      {/* --- REACT THREE FIBER WEBGL CANVAS --- */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0.05, 0.05, 0.05], fov: 60 }}>
          <color attach="background" args={['#010101']} />
          <ambientLight intensity={0.2} />
          
          {/* Layer 1: Deep Space Background Skybox (Static at infinity) */}
          <Stars radius={500} depth={50} count={15000} factor={4} saturation={0} fade speed={1} />
          
          {/* Layer 2: Known Stars (3D Meshes) */}
          {knownStars.map(star => <StarMesh key={star.id} star={star} />)}
          
          {/* Layer 3: Relativistic Dust */}
          <RelativisticDust velocityC={velocityC} />

          <ShipController targetStar={targetStar} velocityC={velocityC} timeExp={timeExp} setVelocityC={setVelocityC} setTimeExp={setTimeExp} setTelemetry={setTelemetry} setDistances={setDistances} knownStars={knownStars} />
        </Canvas>
      </div>

      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>

      {/* --- HUD OVERLAYS --- */}
      {telemetry.contractedDist <= 0.051 && velocityC === 0 && (
         <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 bg-black/80 backdrop-blur-xl border border-cyan-500 p-6 rounded-lg shadow-[0_0_50px_rgba(34,211,238,0.2)] animate-pulse z-20">
             <h3 className="text-cyan-400 font-bold text-lg mb-1 uppercase">Stellar Scan Complete</h3>
             <h1 className="text-3xl font-black text-white mb-4">{targetStar.name}</h1>
             <div className="space-y-2 border-t border-cyan-500/30 pt-4 text-sm">
                 <div className="flex justify-between"><span className="text-neutral-400">Class:</span> <span className="text-white">{targetStar.class}</span></div>
                 <div className="flex justify-between"><span className="text-neutral-400">Surface Temp:</span> <span className="text-orange-400">{targetStar.temp || Math.floor(5700 * Math.sqrt(targetStar.radius))} K</span></div>
                 <div className="flex justify-between"><span className="text-neutral-400">Est. Mass:</span> <span className="text-white">{targetStar.mass || (targetStar.radius * 0.9).toFixed(2)} M☉</span></div>
             </div>
         </div>
      )}

      <aside className="absolute top-6 right-6 w-80 bg-black/60 backdrop-blur-xl border border-indigo-500/20 p-4 rounded-lg pointer-events-auto shadow-[0_0_30px_rgba(99,102,241,0.05)] max-h-[85vh] flex flex-col z-20">
        <div className="mb-4">
          <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-2 font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> SIMBAD Uplink</p>
          <form onSubmit={searchSimbadAPI} className="flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Query star (e.g., Vega)" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:border-indigo-500 outline-none" />
            <button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50">{isSearching ? "..." : "SCAN"}</button>
          </form>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
          {knownStars.map(star => {
            const isTgt = targetStar.id === star.id;
            const activeDistance = distances[star.id] !== undefined ? distances[star.id] : star.distanceLY;
            return (
              <div key={star.id} className={`p-2 rounded flex flex-col border ${isTgt ? "bg-cyan-950/40 border-cyan-500" : "bg-white/5 border-white/5 hover:bg-white/10 cursor-pointer transition-colors"}`} onClick={() => { setTargetStar(star); }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold flex items-center gap-2">{star.name} {star.isCustom && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1 rounded uppercase border border-indigo-500/30">API</span>}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded uppercase ${isTgt ? "bg-cyan-500 text-black font-bold" : "bg-cyan-900/50 text-cyan-300"}`}>{isTgt ? "Tracking" : "Lock On"}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400"><span>Target Dist:</span><span className="text-white font-bold">{activeDistance.toFixed(4)} LY</span></div>
              </div>
            );
          })}
        </div>
      </aside>

      <footer className="absolute bottom-6 left-6 w-[600px] bg-black/80 backdrop-blur-3xl border border-white/10 p-6 rounded-xl pointer-events-auto shadow-2xl z-20">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Nav-Lock Engaged</div>
        
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-neutral-500">Throttle (v)</span><span className="text-xs font-bold text-cyan-400">{velocityC.toFixed(4)}c</span></div>
            <input type="range" min="0" max="0.9999" step="0.0001" value={velocityC} onChange={(e) => setVelocityC(parseFloat(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-neutral-500">Time Warp</span><span className="text-xs font-bold text-purple-400">{timeExp === 0 ? "1x (REAL TIME)" : `10^${timeExp.toFixed(1)}x`}</span></div>
            <input type="range" min="0" max="10" step="0.1" value={timeExp} onChange={(e) => setTimeExp(parseFloat(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none accent-purple-400 cursor-pointer" />
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 grid grid-cols-5 gap-2 text-center">
          <div><p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Lorentz (γ)</p><p className="text-sm font-bold text-white">{telemetry.gamma.toFixed(2)}</p></div>
          <div><p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Dist (LY)</p><p className="text-sm font-bold text-emerald-400">{telemetry.contractedDist === Infinity ? "---" : telemetry.contractedDist.toFixed(3)}</p></div>
          <div className="border-x border-white/10"><p className="text-[9px] uppercase tracking-widest text-cyan-500 mb-1">Ship ETA</p><p className="text-sm font-bold text-cyan-400 animate-pulse">{telemetry.etaYears < 0 ? "INF" : telemetry.etaYears < 0.0027 ? `${(telemetry.etaYears * 365).toFixed(1)} DYS` : `${telemetry.etaYears.toFixed(2)} YRS`}</p></div>
          <div><p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Ship Time</p><p className="text-sm font-bold text-white">{telemetry.shipYears.toFixed(1)} YR</p></div>
          <div><p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Univ Time</p><p className="text-sm font-bold text-purple-400">{telemetry.universeYears.toFixed(1)} YR</p></div>
        </div>
      </footer>
    </main>
  );
}
