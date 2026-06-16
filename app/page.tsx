"use client";
import React, { useState, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Html } from "@react-three/drei";
import * as THREE from "three";

type StarData = { id: string; name: string; x: number; y: number; z: number; color: string; radius: number; distanceLY: number; class: string; temp?: number; mass?: number; isCustom?: boolean };

const CORE_STARS: StarData[] = [
  { id: "SOL", name: "Sun", class: "G2V", x: 0, y: 0, z: 0, color: "#fef08a", radius: 1, distanceLY: 0, temp: 5778, mass: 1 },
  { id: "CEN", name: "Alpha Centauri", class: "G2V", x: 4.37, y: 0, z: 0, color: "#fde047", radius: 1.1, distanceLY: 4.37, temp: 5790, mass: 1.1 },
  { id: "SIR", name: "Sirius", class: "A1V", x: -2.0, y: -8.0, z: -2.5, color: "#cffafe", radius: 1.71, distanceLY: 8.6, temp: 9940, mass: 2.02 },
  { id: "ERI", name: "Epsilon Eridani", class: "K2V", x: -5.0, y: -8.0, z: 5.0, color: "#fdba74", radius: 0.73, distanceLY: 10.5, temp: 5084, mass: 0.82 },
  { id: "PRO", name: "Procyon", class: "F5IV", x: -4.0, y: -10.0, z: 1.0, color: "#fef08a", radius: 2.04, distanceLY: 11.4, temp: 6530, mass: 1.49 },
  { id: "VEG", name: "Vega", class: "A0V", x: 15.0, y: 15.0, z: -10.0, color: "#67e8f9", radius: 2.36, distanceLY: 25.0, temp: 9602, mass: 2.13 },
  { id: "ARC", name: "Arcturus", class: "K0III", x: 5.0, y: 30.0, z: 20.0, color: "#fb923c", radius: 25.4, distanceLY: 36.7, temp: 4286, mass: 1.08 },
  { id: "ALD", name: "Aldebaran", class: "K5III", x: -40.0, y: 20.0, z: 45.0, color: "#f97316", radius: 44.1, distanceLY: 65.3, temp: 3910, mass: 1.16 },
  { id: "BET", name: "Betelgeuse", class: "M1-2I", x: -400.0, y: -100.0, z: 300.0, color: "#dc2626", radius: 887.0, distanceLY: 548.0, temp: 3600, mass: 16.5 },
  { id: "POL", name: "Polaris", class: "F7Ib", x: 0.0, y: 433.0, z: 0.0, color: "#fef08a", radius: 37.5, distanceLY: 433.0, temp: 6015, mass: 5.4 },
  { id: "DEN", name: "Deneb", class: "A2Ia", x: 1500.0, y: 1500.0, z: -1000.0, color: "#e0f2fe", radius: 203.0, distanceLY: 2615.0, temp: 8525, mass: 19.0 }
];

const SECONDS_PER_YEAR = 31557600;

const StarMesh = ({ star }: { star: StarData }) => {
  const radius = Math.max(0.02, star.radius * 0.015);
  return (
    <group position={[star.x, star.y, star.z]}>
      <mesh><sphereGeometry args={[radius, 32, 32]} /><meshBasicMaterial color={star.color} /></mesh>
      <mesh><sphereGeometry args={[radius * 2.5, 32, 32]} /><meshBasicMaterial color={star.color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      <Html distanceFactor={15} center zIndexRange={[100, 0]}>
        <div className="text-white text-[10px] font-mono whitespace-nowrap opacity-60 pointer-events-none mt-6 tracking-widest">{star.name}</div>
      </Html>
    </group>
  );
};

const RelativisticDust = ({ velocityC }: { velocityC: number }) => {
  const dustRef = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const particleCount = 2000;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40; pos[i * 3 + 1] = (Math.random() - 0.5) * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!dustRef.current || velocityC <= 0) return;
    const pos = dustRef.current.geometry.attributes.position.array as Float32Array;
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const speed = velocityC * delta * 50; 
    
    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).addScaledVector(camDir, -speed);
      if (p.distanceTo(camera.position) > 25) {
         const newPos = camera.position.clone().addScaledVector(camDir, 20);
         newPos.x += (Math.random() - 0.5) * 20; newPos.y += (Math.random() - 0.5) * 20; newPos.z += (Math.random() - 0.5) * 20;
         p.copy(newPos);
      }
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    }
    dustRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={dustRef}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} /></bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.05} transparent opacity={velocityC > 0.1 ? 0.8 : 0.3} sizeAttenuation={true} />
    </points>
  );
};

const ShipController = ({ targetStar, velocityC, timeExp, setVelocityC, setTimeExp, knownStars, setArrivalScan }: any) => {
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

    if (v > 0 && moveDist >= dist - 0.05) {
      moveDist = Math.max(0, dist - 0.05);
      v = 0;
      setVelocityC(0);
      setTimeExp(0);
      setArrivalScan(true);
    } else if (v > 0) {
      setArrivalScan(false);
    }

    if (moveDist > 0) {
      const dir = new THREE.Vector3().subVectors(targetVec, camera.position).normalize();
      camera.position.addScaledVector(dir, moveDist);
    }

    const currentQuat = camera.quaternion.clone();
    camera.lookAt(targetVec);
    camera.quaternion.copy(currentQuat).slerp(camera.quaternion.clone(), 0.05);

    // DIRECT DOM MANIPULATION
    const gamma = 1 / Math.sqrt(1 - Math.pow(v, 2));
    clocks.current.universe += dYrs;
    clocks.current.ship += dYrs / gamma;

    const elDist = document.getElementById("hud-dist");
    if (elDist) elDist.innerText = (dist / gamma).toFixed(3);
    
    const elGamma = document.getElementById("hud-gamma");
    if (elGamma) elGamma.innerText = gamma.toFixed(2);
    
    const elShipTime = document.getElementById("hud-ship-time");
    if (elShipTime) elShipTime.innerText = clocks.current.ship.toFixed(1) + " YR";
    
    const elUnivTime = document.getElementById("hud-univ-time");
    if (elUnivTime) elUnivTime.innerText = clocks.current.universe.toFixed(1) + " YR";

    const elEta = document.getElementById("hud-eta");
    if (elEta) {
       const etaYrs = v > 0 ? (dist / gamma) / v : -1;
       elEta.innerText = etaYrs < 0 ? "INF" : etaYrs < 0.0027 ? `${(etaYrs * 365).toFixed(1)} D` : `${etaYrs.toFixed(2)} Y`;
    }

    knownStars.forEach((s: StarData) => {
       const distEl = document.getElementById(`dist-${s.id}`);
       if (distEl) distEl.innerText = camera.position.distanceTo(new THREE.Vector3(s.x, s.y, s.z)).toFixed(4) + " LY";
    });
  });

  return null;
};

export default function DeepSpaceEngine() {
  const [hasStarted, setHasStarted] = useState(false);
  const [velocityC, setVelocityC] = useState(0); 
  const [timeExp, setTimeExp] = useState(0); 
  const [knownStars, setKnownStars] = useState<StarData[]>(CORE_STARS);
  const [targetStar, setTargetStar] = useState<StarData>(CORE_STARS[1]); // Default to Alpha Centauri
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [arrivalScan, setArrivalScan] = useState(false);

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
        id: `API-${Date.now()}`, name: xml.querySelector("oname")?.textContent || searchQuery.toUpperCase(), class: "API Target", color: "#a5b4fc", radius: 1.5, distanceLY: distLY, isCustom: true,
        x: distLY * Math.cos(decRad) * Math.cos(raRad), y: distLY * Math.sin(decRad), z: distLY * Math.cos(decRad) * Math.sin(raRad)
      };
      setKnownStars(p => [...p, newStar]); setTargetStar(newStar); setSearchQuery("");
    } catch (err: any) { alert(err.message || "Uplink Failed"); } finally { setIsSearching(false); }
  };

  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#020202] text-white font-mono relative overflow-hidden">
         <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>
         <div className="text-center z-10 max-w-xl px-6">
            <p className="text-cyan-500 font-bold tracking-[0.3em] uppercase text-xs mb-4 animate-pulse">GPU WebGL Initialized</p>
            <h1 className="text-5xl font-black mb-6 tracking-tight text-white drop-shadow-lg">R3F Spatial Engine</h1>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-8 text-left backdrop-blur-md shadow-2xl">
                <p className="text-neutral-300 mb-4 text-sm leading-relaxed"><strong className="text-cyan-400">UPGRADE ACTIVE:</strong> You have crossed into dedicated GPU rendering. Stars are now true 3D spherical meshes. The background skybox spans an infinite volumetric domain.</p>
            </div>
            <button onClick={() => setHasStarted(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black px-12 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] transform hover:-translate-y-1">Ignite 3D Engine</button>
         </div>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen bg-[#020202] text-white font-mono overflow-hidden selection:bg-cyan-900">
      
      {/* 3D CANVAS - FORCED TO 100% VIEWPORT TO FIX THE "TINY BOX" BUG */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0 }}>
        <Canvas camera={{ position: [0, 1.5, 3], fov: 60 }}>
          <color attach="background" args={['#010101']} />
          <ambientLight intensity={0.2} />
          <Stars radius={500} depth={50} count={15000} factor={4} saturation={0} fade speed={1} />
          {knownStars.map(star => <StarMesh key={star.id} star={star} />)}
          <RelativisticDust velocityC={velocityC} />
          <ShipController targetStar={targetStar} velocityC={velocityC} timeExp={timeExp} setVelocityC={setVelocityC} setTimeExp={setTimeExp} knownStars={knownStars} setArrivalScan={setArrivalScan} />
        </Canvas>
      </div>

      {/* SCANLINES OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.02] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>

      {/* CENTER CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-40">
        <div className="w-12 h-[1px] bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-[1px] h-12 bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-4 h-4 border border-cyan-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* ARRIVAL SCAN MODAL */}
      {arrivalScan && velocityC === 0 && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-black/60 backdrop-blur-2xl border border-cyan-500/50 p-8 rounded-2xl shadow-[0_0_80px_rgba(34,211,238,0.15)] z-30 transform scale-100 animate-in fade-in zoom-in duration-300">
             <div className="flex items-center gap-3 mb-4">
                 <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                 <h3 className="text-cyan-400 font-bold text-sm tracking-widest uppercase">Target Reached</h3>
             </div>
             <h1 className="text-4xl font-black text-white mb-6 drop-shadow-lg">{targetStar.name}</h1>
             <div className="space-y-3 border-t border-white/10 pt-5 text-sm">
                 <div className="flex justify-between"><span className="text-neutral-400">Classification</span> <span className="text-white font-medium">{targetStar.class}</span></div>
                 <div className="flex justify-between"><span className="text-neutral-400">Surface Temp</span> <span className="text-orange-400 font-medium">{targetStar.temp || Math.floor(5700 * Math.sqrt(targetStar.radius))} K</span></div>
                 <div className="flex justify-between"><span className="text-neutral-400">Est. Mass</span> <span className="text-white font-medium">{targetStar.mass || (targetStar.radius * 0.9).toFixed(2)} M☉</span></div>
             </div>
         </div>
      )}

      {/* TOP HEADER */}
      <header className="absolute top-6 left-6 z-20 pointer-events-none flex flex-col gap-2">
         <h1 className="text-white/80 font-black tracking-widest uppercase text-xl">Relativistic Engine</h1>
         <div className="text-cyan-400/80 text-[10px] tracking-widest uppercase font-bold bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full w-fit">
           Tracking: {targetStar.name}
         </div>
      </header>

      {/* RIGHT SIDEBAR: SEARCH & TARGETS */}
      <aside className="absolute top-6 right-6 w-80 bg-black/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-2xl z-20 flex flex-col max-h-[calc(100vh-200px)]">
        <div className="mb-5">
          <p className="text-[10px] text-cyan-400 uppercase tracking-widest mb-3 font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> SIMBAD Uplink</p>
          <form onSubmit={searchSimbadAPI} className="flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Query Star..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none transition-colors" />
            <button type="submit" disabled={isSearching} className="bg-white/10 hover:bg-cyan-500 hover:text-black border border-white/10 hover:border-cyan-400 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 text-white">{isSearching ? "..." : "SCAN"}</button>
          </form>
        </div>
        
        <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Known Coordinates</h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {knownStars.map(star => {
            const isTgt = targetStar.id === star.id;
            return (
              <div key={star.id} className={`p-3 rounded-xl flex flex-col border transition-all cursor-pointer ${isTgt ? "bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"}`} onClick={() => { setTargetStar(star); setArrivalScan(false); }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">{star.name} {star.isCustom && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase border border-indigo-500/30">API</span>}</span>
                  {isTgt && <span className="text-[8px] bg-cyan-500 text-black px-2 py-0.5 rounded font-bold uppercase tracking-widest">Locked</span>}
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400"><span>Distance:</span><span id={`dist-${star.id}`} className="text-white font-medium">--- LY</span></div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* BOTTOM FOOTER: FLIGHT CONTROLS & HUD */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 pointer-events-none z-20">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl pointer-events-auto relative">
          
          <div className="grid grid-cols-2 gap-12 mb-6">
            {/* Throttle */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Sub-light Throttle</span>
                <span className="text-sm font-black text-cyan-400">{velocityC.toFixed(4)} c</span>
              </div>
              <input type="range" min="0" max="0.9999" step="0.0001" value={velocityC} onChange={(e) => setVelocityC(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer outline-none hover:bg-white/20 transition-all" />
            </div>

            {/* Time Warp */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Time Warp Multiplier</span>
                <span className="text-sm font-black text-purple-400">{timeExp === 0 ? "1x (Real Time)" : `10^${timeExp.toFixed(1)}x`}</span>
              </div>
              <input type="range" min="0" max="10" step="0.1" value={timeExp} onChange={(e) => setTimeExp(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-purple-400 cursor-pointer outline-none hover:bg-white/20 transition-all" />
            </div>
          </div>

          {/* Telemetry Readouts */}
          <div className="bg-black/50 border border-white/5 rounded-xl p-4 grid grid-cols-5 gap-4 text-center divide-x divide-white/5">
            <div className="flex flex-col gap-1"><span className="text-[9px] uppercase tracking-widest text-neutral-500">Lorentz (γ)</span><span id="hud-gamma" className="text-sm font-black text-white">1.00</span></div>
            <div className="flex flex-col gap-1"><span className="text-[9px] uppercase tracking-widest text-neutral-500">Contracted Dist</span><span id="hud-dist" className="text-sm font-black text-emerald-400">---</span></div>
            <div className="flex flex-col gap-1"><span className="text-[9px] uppercase tracking-widest text-cyan-500">Ship ETA</span><span id="hud-eta" className="text-sm font-black text-cyan-400 animate-pulse">INF</span></div>
            <div className="flex flex-col gap-1"><span className="text-[9px] uppercase tracking-widest text-neutral-500">Ship Time</span><span id="hud-ship-time" className="text-sm font-black text-white">0.0 YR</span></div>
            <div className="flex flex-col gap-1"><span className="text-[9px] uppercase tracking-widest text-neutral-500">Univ Time</span><span id="hud-univ-time" className="text-sm font-black text-purple-400">0.0 YR</span></div>
          </div>
        </div>
      </footer>
    </main>
  );
}
