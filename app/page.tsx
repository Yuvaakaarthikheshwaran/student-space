"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Html } from "@react-three/drei";
import * as THREE from "three";

type StarData = { id: string; name: string; x: number; y: number; z: number; color: string; radius: number; distanceLY: number; class: string; temp?: number; mass?: number; isCustom?: boolean };

// EXPANDED 20-STAR CATALOG
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

// --- 3D COMPONENTS ---
const StarMesh = ({ star }: { star: StarData }) => {
  const radius = Math.max(0.02, star.radius * 0.015);
  return (
    <group position={[star.x, star.y, star.z]}>
      {/* Star Core */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color={star.color} />
      </mesh>
      {/* Atmospheric Glow */}
      <mesh>
        <sphereGeometry args={[radius * 2.5, 32, 32]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Upgraded 3D HUD Label */}
      <Html distanceFactor={15} center zIndexRange={[100, 0]}>
        <div className="flex flex-col items-center pointer-events-none mt-8 transition-opacity opacity-80 hover:opacity-100">
           <div className="w-1.5 h-1.5 rounded-full mb-1" style={{ backgroundColor: star.color, boxShadow: `0 0 10px ${star.color}` }} />
           <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-white text-[10px] font-mono whitespace-nowrap tracking-widest shadow-lg">
             {star.name}
           </div>
        </div>
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

const ShipController = ({ targetStar, velocityC, timeExp, setVelocityC, setTimeExp, knownStars, setArrivalScan, isNavLocked }: any) => {
  const { camera, gl } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(targetStar.x, targetStar.y, targetStar.z), [targetStar]);
  const lastTime = useRef(performance.now());
  const clocks = useRef({ universe: 0, ship: 0 });

  const dragState = useRef({ isDown: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0 });

  useEffect(() => {
    const dom = gl.domElement;
    const onDown = (e: PointerEvent) => { dragState.current.isDown = true; dragState.current.lastX = e.clientX; dragState.current.lastY = e.clientY; };
    const onUp = () => { dragState.current.isDown = false; };
    const onMove = (e: PointerEvent) => {
      if (!dragState.current.isDown || isNavLocked) return;
      dragState.current.yaw -= (e.clientX - dragState.current.lastX) * 0.003;
      dragState.current.pitch -= (e.clientY - dragState.current.lastY) * 0.003;
      dragState.current.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, dragState.current.pitch));
      dragState.current.lastX = e.clientX; dragState.current.lastY = e.clientY;
      
      const euler = new THREE.Euler(dragState.current.pitch, dragState.current.yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
    };
    
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    return () => { dom.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointermove', onMove); };
  }, [isNavLocked, camera, gl.domElement]);

  useFrame(() => {
    const now = performance.now();
    const dRealSec = (now - lastTime.current) / 1000;
    lastTime.current = now;

    const dYrs = (dRealSec * Math.pow(10, timeExp)) / SECONDS_PER_YEAR;
    const dist = camera.position.distanceTo(targetVec);

    let v = velocityC;
    let moveDist = v * dYrs;

    // "Black Box" FIX: Safely stop OUTSIDE the star's atmospheric mesh glow
    const starRenderRadius = Math.max(0.02, targetStar.radius * 0.015);
    const safeStopDist = (starRenderRadius * 4.5) + 0.05;

    if (v > 0 && moveDist >= dist - safeStopDist) {
      moveDist = Math.max(0, dist - safeStopDist);
      v = 0;
      setVelocityC(0);
      setTimeExp(0);
      setArrivalScan(true);
    } else if (v > 0) {
      setArrivalScan(false);
    }

    if (moveDist > 0) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      camera.position.addScaledVector(dir, moveDist);
    }

    if (isNavLocked) {
      const currentQuat = camera.quaternion.clone();
      camera.lookAt(targetVec);
      const targetQuat = camera.quaternion.clone();
      camera.quaternion.copy(currentQuat).slerp(targetQuat, 0.05);

      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      dragState.current.yaw = euler.y;
      dragState.current.pitch = euler.x;
    }

    // High-FPS HUD Sync
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

// --- REACT UI OVERLAY ---
export default function DeepSpaceEngine() {
  const [hasStarted, setHasStarted] = useState(false);
  const [velocityC, setVelocityC] = useState(0); 
  const [timeExp, setTimeExp] = useState(0); 
  const [knownStars, setKnownStars] = useState<StarData[]>(CORE_STARS);
  const [targetStar, setTargetStar] = useState<StarData>(CORE_STARS[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [arrivalScan, setArrivalScan] = useState(false);
  const [isNavLocked, setIsNavLocked] = useState(true);

  const searchSimbadAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const sq = searchQuery.trim().toLowerCase();
      const localMatch = knownStars.find(s => s.name.toLowerCase().includes(sq));
      if (localMatch) { setTargetStar(localMatch); setIsNavLocked(true); setIsSearching(false); setSearchQuery(""); return; }

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
      setKnownStars(p => [...p, newStar]); setTargetStar(newStar); setIsNavLocked(true); setSearchQuery("");
    } catch (err: any) { alert(err.message || "Uplink Failed"); } finally { setIsSearching(false); }
  };

  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#020202] text-white font-mono relative overflow-hidden">
         <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>
         <div className="text-center z-10 max-w-xl px-6">
            <p className="text-cyan-500 font-bold tracking-[0.3em] uppercase text-xs mb-4 animate-pulse">GPU WebGL Initialized</p>
            <h1 className="text-5xl font-black mb-6 tracking-tight text-white drop-shadow-lg">R3F Spatial Engine</h1>
            <div className="bg-black/60 border border-cyan-500/30 p-8 rounded-2xl mb-8 text-left backdrop-blur-xl shadow-[0_0_40px_rgba(34,211,238,0.1)]">
                <p className="text-neutral-300 mb-4 text-sm leading-relaxed">
                  <strong className="text-cyan-400 font-bold">UPGRADE ACTIVE:</strong> You are launching the WebGL GPU rendering engine coupled with the advanced Glassmorphic Tactical UI.
                </p>
                <p className="text-neutral-400 text-xs italic border-l-2 border-cyan-500/50 pl-3">
                  Camera collision systems updated. Atmospheric multi-scanning active.
                </p>
            </div>
            <button onClick={() => setHasStarted(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black px-12 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] transform hover:-translate-y-1">Ignite 3D Engine</button>
         </div>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen bg-[#020202] text-white font-mono overflow-hidden selection:bg-cyan-900">
      
      {/* 3D CANVAS - FULL VIEWPORT */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0 }}>
        <Canvas camera={{ position: [0, 1.5, 3], fov: 60 }}>
          <color attach="background" args={['#010101']} />
          <ambientLight intensity={0.2} />
          <Stars radius={500} depth={50} count={15000} factor={4} saturation={0} fade speed={1} />
          {knownStars.map(star => <StarMesh key={star.id} star={star} />)}
          <RelativisticDust velocityC={velocityC} />
          <ShipController targetStar={targetStar} velocityC={velocityC} timeExp={timeExp} setVelocityC={setVelocityC} setTimeExp={setTimeExp} knownStars={knownStars} setArrivalScan={setArrivalScan} isNavLocked={isNavLocked} />
        </Canvas>
      </div>

      {/* SCANLINES OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.02] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>

      {/* CENTER CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-30">
        <div className="w-16 h-[1px] bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-[1px] h-16 bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-6 h-6 border border-cyan-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* UPGRADED ARRIVAL SCAN MODAL ("Itsabouts") */}
      {arrivalScan && velocityC === 0 && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] bg-gradient-to-b from-black/90 to-cyan-950/40 backdrop-blur-3xl border border-cyan-500/50 p-8 rounded-2xl shadow-[0_0_100px_rgba(34,211,238,0.2)] z-30 transform scale-100 animate-in fade-in zoom-in duration-500">
             
             {/* Glowing Top Icon */}
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
             <div className="relative flex items-center justify-center w-14 h-14 mx-auto mb-4 border border-cyan-500/50 rounded-full bg-black/60 shadow-lg">
                 <div className="w-6 h-6 rounded-full animate-pulse" style={{ backgroundColor: targetStar.color, boxShadow: `0 0 20px ${targetStar.color}` }} />
             </div>

             <h3 className="text-cyan-400 font-bold text-center text-xs tracking-[0.2em] uppercase mb-1">Destination Reached</h3>
             <h1 className="text-4xl font-black text-center text-white mb-6 drop-shadow-lg">{targetStar.name}</h1>
             
             {/* Stats Grid */}
             <div className="grid grid-cols-2 gap-3 border-t border-cyan-500/20 pt-6">
                 <div className="bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner">
                     <span className="block text-[9px] text-cyan-500/80 uppercase tracking-widest mb-1">Classification</span>
                     <span className="text-white font-bold text-sm">{targetStar.class}</span>
                 </div>
                 <div className="bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner">
                     <span className="block text-[9px] text-cyan-500/80 uppercase tracking-widest mb-1">Surface Temp</span>
                     <span className="text-orange-400 font-bold text-sm">{targetStar.temp || Math.floor(5700 * Math.sqrt(targetStar.radius))} K</span>
                 </div>
                 <div className="bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner">
                     <span className="block text-[9px] text-cyan-500/80 uppercase tracking-widest mb-1">Est. Mass</span>
                     <span className="text-white font-bold text-sm">{targetStar.mass || (targetStar.radius * 0.9).toFixed(2)} M☉</span>
                 </div>
                 <div className="bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner">
                     <span className="block text-[9px] text-cyan-500/80 uppercase tracking-widest mb-1">Stellar Radius</span>
                     <span className="text-emerald-400 font-bold text-sm">{targetStar.radius} R☉</span>
                 </div>
             </div>

             <p className="mt-6 text-[10px] text-center text-neutral-500 italic tracking-wide">"Optical sensors locked. Atmospheric interference minimal. Standing by."</p>
         </div>
      )}

      {/* TOP HEADER */}
      <header className="absolute top-6 left-6 z-20 pointer-events-none flex flex-col gap-2">
         <h1 className="text-white font-black tracking-widest uppercase text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Relativistic Engine</h1>
         <div className="flex gap-2 pointer-events-auto mt-1">
           <button onClick={() => setIsNavLocked(!isNavLocked)} className={`text-[9px] px-4 py-1.5 rounded-full uppercase tracking-widest font-bold border transition-all cursor-pointer shadow-lg ${isNavLocked ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "bg-black/60 border-neutral-600 text-neutral-400"}`}>
             {isNavLocked ? "Nav-Lock: Engaged" : "Free-Look: Active"}
           </button>
           {isNavLocked && (
             <div className="text-cyan-400 text-[10px] tracking-widest uppercase font-bold bg-black/60 backdrop-blur-md border border-cyan-500/30 px-4 py-1.5 rounded-full w-fit shadow-lg flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
               Target: {targetStar.name}
             </div>
           )}
         </div>
      </header>

      {/* RIGHT SIDEBAR: SEARCH & TARGETS */}
      <aside className="absolute top-6 right-6 w-[340px] bg-black/50 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.8)] z-20 flex flex-col max-h-[calc(100vh-200px)]">
        <div className="mb-5">
          <p className="text-[10px] text-cyan-400 uppercase tracking-widest mb-3 font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> SIMBAD Database</p>
          <form onSubmit={searchSimbadAPI} className="flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search (e.g. Rigel)..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none transition-colors shadow-inner" />
            <button type="submit" disabled={isSearching} className="bg-cyan-500/20 hover:bg-cyan-500 hover:text-black border border-cyan-500/50 hover:border-cyan-400 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 text-cyan-400 cursor-pointer">{isSearching ? "..." : "SCAN"}</button>
          </form>
        </div>
        
        <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Stellar Coordinates</h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {knownStars.map(star => {
            const isTgt = targetStar.id === star.id;
            return (
              <div key={star.id} className={`p-3 rounded-xl flex flex-col border transition-all cursor-pointer group ${isTgt && isNavLocked ? "bg-cyan-950/40 border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.15)]" : "bg-black/40 border-white/5 hover:bg-white/10 hover:border-white/20"}`} onClick={() => { setTargetStar(star); setIsNavLocked(true); setArrivalScan(false); }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2.5">
                    {/* Glowing Star Color Indicator */}
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: star.color, boxShadow: `0 0 8px ${star.color}` }} />
                    {star.name}
                    {star.isCustom && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase border border-indigo-500/30">API</span>}
                  </span>
                  {isTgt && isNavLocked && <span className="text-[8px] bg-cyan-500 text-black px-2 py-0.5 rounded font-bold uppercase tracking-widest">Locked</span>}
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 pl-4.5">
                    <span>Dist: <span id={`dist-${star.id}`} className="text-white font-medium">--- LY</span></span>
                    <span className="text-neutral-500">{star.class}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* BOTTOM FOOTER: FLIGHT CONTROLS & HUD */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 pointer-events-none z-20">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto relative">
          
          <div className="grid grid-cols-2 gap-12 mb-6">
            {/* Throttle with Tactical Presets */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Sub-light Throttle</span>
                <span className="text-base font-black text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{velocityC.toFixed(4)} c</span>
              </div>
              <input type="range" min="0" max="0.9999" step="0.0001" value={velocityC} onChange={(e) => setVelocityC(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer outline-none hover:bg-white/20 transition-all shadow-inner" />
              <div className="flex justify-between gap-2 mt-1">
                {[0, 0.25, 0.5, 0.9, 0.9999].map(val => (
                  <button key={val} onClick={() => setVelocityC(val)} className="flex-1 bg-black/40 hover:bg-cyan-500 hover:text-black border border-white/10 hover:border-cyan-500 text-[9px] font-bold py-1.5 rounded transition-all text-neutral-300 cursor-pointer shadow-sm">
                    {val === 0 ? "STOP" : val === 0.9999 ? "MAX" : `${val}c`}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Warp with Tactical Presets */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Time Warp Multiplier</span>
                <span className="text-base font-black text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">{timeExp === 0 ? "1x (Real Time)" : `10^${timeExp.toFixed(1)}x`}</span>
              </div>
              <input type="range" min="0" max="10" step="0.1" value={timeExp} onChange={(e) => setTimeExp(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-purple-400 cursor-pointer outline-none hover:bg-white/20 transition-all shadow-inner" />
              <div className="flex justify-between gap-2 mt-1">
                {[0, 3, 6, 8, 10].map(val => (
                  <button key={val} onClick={() => setTimeExp(val)} className="flex-1 bg-black/40 hover:bg-purple-500 hover:text-black border border-white/10 hover:border-purple-500 text-[9px] font-bold py-1.5 rounded transition-all text-neutral-300 cursor-pointer shadow-sm">
                    {val === 0 ? "1x" : val === 10 ? "MAX" : `10^${val}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* High-Performance Telemetry Readouts */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-4 grid grid-cols-5 gap-4 text-center divide-x divide-white/10 shadow-inner">
            <div className="flex flex-col gap-1.5"><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Lorentz (γ)</span><span id="hud-gamma" className="text-sm font-black text-white">1.00</span></div>
            <div className="flex flex-col gap-1.5"><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Contracted Dist</span><span id="hud-dist" className="text-sm font-black text-emerald-400">---</span></div>
            <div className="flex flex-col gap-1.5"><span className="text-[9px] uppercase tracking-widest text-cyan-500 font-bold">Ship ETA</span><span id="hud-eta" className="text-sm font-black text-cyan-400 animate-pulse drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">INF</span></div>
            <div className="flex flex-col gap-1.5"><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Ship Time</span><span id="hud-ship-time" className="text-sm font-black text-white">0.0 YR</span></div>
            <div className="flex flex-col gap-1.5"><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Univ Time</span><span id="hud-univ-time" className="text-sm font-black text-purple-400">0.0 YR</span></div>
          </div>
        </div>
      </footer>
    </main>
  );
}
