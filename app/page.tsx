"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
// --- BACKEND IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

// --- TYPESCRIPT OVERRIDE ---
// This tells Vercel's build server to stop panicking about missing global variables
declare var __firebase_config: any;
declare var __app_id: any;
declare var __initial_auth_token: any;

// --- SAFE FIREBASE INITIALIZATION ---
let app: any, auth: any, db: any;
const isFirebaseAvailable = typeof __firebase_config !== 'undefined' && typeof __app_id !== 'undefined';
const appId = typeof __app_id !== 'undefined' ? __app_id : 'local-build';

if (isFirebaseAvailable) {
  try {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.warn("Backend initialization skipped. Running in local-only mode.");
  }
}

type StarData = { id: string; name: string; x: number; y: number; z: number; color: string; radius: number; distanceLY: number; class: string; temp?: number; mass?: number; isCustom?: boolean; discoveredBy?: string };

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

export default function DeepSpaceEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // -- BACKEND STATE --
  const [user, setUser] = useState<User | null>(null);
  const [sharedStars, setSharedStars] = useState<StarData[]>([]);

  // -- ENGINE STATE --
  const [hasStarted, setHasStarted] = useState(false);
  const [velocityC, setVelocityC] = useState(0); 
  const [timeExp, setTimeExp] = useState(0); 
  const [targetStar, setTargetStar] = useState<StarData>(CORE_STARS[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [arrivalScan, setArrivalScan] = useState(false);
  const [isNavLocked, setIsNavLocked] = useState(true);
  const [showClassified, setShowClassified] = useState(false);

  // Combine Core Database with Live Backend Database
  const knownStars = useMemo(() => {
    const combined = [...CORE_STARS];
    sharedStars.forEach(remoteStar => {
      if (!combined.find(s => s.id === remoteStar.id)) combined.push(remoteStar);
    });
    return combined;
  }, [sharedStars]);

  // Sync state to refs for the high-performance 2D loop
  const stateRefs = useRef({ vel: 0, timeExp: 0, lock: true, tgt: CORE_STARS[1], stars: CORE_STARS });
  useEffect(() => { 
    stateRefs.current = { vel: velocityC, timeExp, lock: isNavLocked, tgt: targetStar, stars: knownStars }; 
  }, [velocityC, timeExp, isNavLocked, targetStar, knownStars]);

  const engineState = useRef({
    ship: { x: 0, y: 1.5, z: 3.0 }, 
    camera: { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 },
    mouse: { isDown: false, lastX: 0, lastY: 0 }, 
    clocks: { universe: 0, ship: 0 }, 
    lastFrameTime: 0
  });

  // Layer 1: Infinite Skybox
  const skybox = useRef(Array.from({ length: 8000 }, () => {
    const theta = Math.random() * 2 * Math.PI, phi = Math.acos(2 * Math.random() - 1);
    return { x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi), a: Math.random() * 0.8 + 0.2 };
  }));

  // Layer 2: Relativistic Dust
  const bgDust = useRef(Array.from({ length: 3000 }, () => ({
    x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200
  })));

  // --- BACKEND HOOKS ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth Error", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user) return;
    const starsQuery = collection(db, 'artifacts', appId, 'public', 'data', 'sharedStars');
    const unsubscribe = onSnapshot(starsQuery, (snapshot) => {
      const liveStars: StarData[] = [];
      snapshot.forEach(doc => liveStars.push(doc.data() as StarData));
      setSharedStars(liveStars);
    }, (error) => console.error("Live Database Error:", error));
    return () => unsubscribe();
  }, [user]);

  // --- API SEARCH & BACKEND UPLOAD ---
  const searchSimbadAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // --- CLASSIFIED EASTER EGG OVERRIDE ---
    if (searchQuery.trim().toUpperCase() === "0XCS26") {
      setShowClassified(true);
      setSearchQuery("");
      return;
    }

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
      
      setTargetStar(newStar); 
      setIsNavLocked(true); 
      setSearchQuery("");

      if (db && user) {
        newStar.discoveredBy = user.uid.substring(0, 6);
        const starRef = doc(db, 'artifacts', appId, 'public', 'data', 'sharedStars', newStar.id);
        await setDoc(starRef, newStar);
      } else {
        setSharedStars(prev => [...prev, newStar]);
      }

    } catch (err: any) { alert("Uplink Failed: Star not found in Simbad Database."); } finally { setIsSearching(false); }
  };

  const handleMouse = {
    down: (e: React.MouseEvent) => { engineState.current.mouse = { isDown: true, lastX: e.clientX, lastY: e.clientY }; },
    up: () => { engineState.current.mouse.isDown = false; },
    move: (e: React.MouseEvent) => {
      const m = engineState.current.mouse;
      if (!m.isDown || isNavLocked || !hasStarted) return;
      engineState.current.camera.targetYaw += (e.clientX - m.lastX) * 0.003;
      engineState.current.camera.targetPitch = Math.max(-1.57, Math.min(1.57, engineState.current.camera.targetPitch - (e.clientY - m.lastY) * 0.003));
      m.lastX = e.clientX; m.lastY = e.clientY;
    }
  };

  // --- CORE 2D PHYSICS ENGINE ---
  useEffect(() => {
    if (!hasStarted) return;
    const ctx = canvasRef.current?.getContext("2d", { alpha: false });
    if (!ctx || !canvasRef.current) return;
    let w = canvasRef.current.width = window.innerWidth, h = canvasRef.current.height = window.innerHeight, reqId: number;

    const project = (x: number, y: number, z: number, v_c: number, isSkybox = false) => {
      const st = engineState.current;
      let dx = isSkybox ? x * 1000 : x - st.ship.x;
      let dy = isSkybox ? y * 1000 : y - st.ship.y;
      let dz = isSkybox ? z * 1000 : z - st.ship.z;

      let tx = dx * Math.cos(st.camera.yaw) - dz * Math.sin(st.camera.yaw);
      let tz = dx * Math.sin(st.camera.yaw) + dz * Math.cos(st.camera.yaw);
      let ty = dy * Math.cos(st.camera.pitch) - tz * Math.sin(st.camera.pitch);
      let fz = dy * Math.sin(st.camera.pitch) + tz * Math.cos(st.camera.pitch);

      if (fz < 0.000001) return null;
      const fov = isSkybox ? 1 : (1 - v_c * 0.2);
      return { sx: w/2 + tx * ((w/2) / fz * fov), sy: h/2 + ty * ((w/2) / fz * fov), scale: (w/2) / fz * fov, dist: fz };
    };

    const animate = (timeNow: number) => {
      const st = engineState.current, refs = stateRefs.current;
      if (!st.lastFrameTime) st.lastFrameTime = timeNow;
      
      const dRealSec = (timeNow - st.lastFrameTime) / 1000; 
      st.lastFrameTime = timeNow;
      const dYrs = (dRealSec * Math.pow(10, refs.timeExp)) / SECONDS_PER_YEAR;

      let dxTgt = refs.tgt.x - st.ship.x, dyTgt = refs.tgt.y - st.ship.y, dzTgt = refs.tgt.z - st.ship.z;
      let distToTgt = Math.hypot(dxTgt, dyTgt, dzTgt);

      if (refs.lock) {
        st.camera.targetYaw = Math.atan2(dxTgt, dzTgt); 
        st.camera.targetPitch = Math.atan2(dyTgt, Math.hypot(dxTgt, dzTgt));
      }
      st.camera.yaw += (st.camera.targetYaw - st.camera.yaw) * 0.1;
      st.camera.pitch += (st.camera.targetPitch - st.camera.pitch) * 0.1;
      
      ctx.fillStyle = "#010101"; ctx.fillRect(0, 0, w, h);

      const gamma = 1 / Math.sqrt(1 - Math.pow(refs.vel, 2));
      st.clocks.universe += dYrs; st.clocks.ship += dYrs / gamma;
      
      let v = refs.vel;
      let moveDist = v * dYrs;

      const starRenderRadius = Math.max(0.02, refs.tgt.radius * 0.015);
      const safeStopDist = (starRenderRadius * 4.5) + 0.05;

      if (v > 0 && moveDist >= distToTgt - safeStopDist) {
        moveDist = Math.max(0, distToTgt - safeStopDist);
        v = 0;
        setVelocityC(0);
        setTimeExp(0);
        setArrivalScan(true);
      } else if (v > 0 && arrivalScan) {
        setArrivalScan(false);
      }

      if (moveDist > 0) {
        st.ship.x += Math.sin(st.camera.yaw) * Math.cos(st.camera.pitch) * moveDist;
        st.ship.y += Math.sin(st.camera.pitch) * moveDist;
        st.ship.z += Math.cos(st.camera.yaw) * Math.cos(st.camera.pitch) * moveDist;
      }

      const elDist = document.getElementById("hud-dist");
      if (elDist) elDist.innerText = (distToTgt / gamma).toFixed(3);
      const elGamma = document.getElementById("hud-gamma");
      if (elGamma) elGamma.innerText = gamma.toFixed(2);
      const elShipTime = document.getElementById("hud-ship-time");
      if (elShipTime) elShipTime.innerText = st.clocks.ship.toFixed(1) + " YR";
      const elUnivTime = document.getElementById("hud-univ-time");
      if (elUnivTime) elUnivTime.innerText = st.clocks.universe.toFixed(1) + " YR";
      const elEta = document.getElementById("hud-eta");
      if (elEta) {
         const etaYrs = v > 0 ? (distToTgt / gamma) / v : -1;
         elEta.innerText = etaYrs < 0 ? "INF" : etaYrs < 0.0027 ? `${(etaYrs * 365).toFixed(1)} D` : `${etaYrs.toFixed(2)} Y`;
      }

      refs.stars.forEach((s: StarData) => {
         const distEl = document.getElementById(`dist-${s.id}`);
         if (distEl) distEl.innerText = Math.hypot(s.x - st.ship.x, s.y - st.ship.y, s.z - st.ship.z).toFixed(4) + " LY";
      });

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      skybox.current.forEach(s => {
         const p = project(s.x, s.y, s.z, v, true);
         if (p) { ctx.globalAlpha = s.a; ctx.fillRect(p.sx, p.sy, 1.2, 1.2); }
      });
      ctx.globalAlpha = 1.0;

      ctx.lineCap = "round"; ctx.beginPath();
      bgDust.current.forEach(d => {
        let dx = d.x - st.ship.x, dy = d.y - st.ship.y, dz = d.z - st.ship.z;
        if (dx > 50) d.x -= 100; if (dx < -50) d.x += 100;
        if (dy > 50) d.y -= 100; if (dy < -50) d.y += 100;
        if (dz > 50) d.z -= 100; if (dz < -50) d.z += 100;
        const tail = Math.max(0.02, v * 2);
        const p1 = project(d.x, d.y, d.z, v);
        const p2 = project(d.x + Math.sin(st.camera.yaw)*Math.cos(st.camera.pitch)*tail, d.y + Math.sin(st.camera.pitch)*tail, d.z + Math.cos(st.camera.yaw)*Math.cos(st.camera.pitch)*tail, v);
        if (p1 && p2) { ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); }
      });
      ctx.strokeStyle = `rgba(255, 255, 255, ${v > 0.1 ? 0.6 : 0.3})`; ctx.lineWidth = v > 0.1 ? 2 : 1; ctx.stroke();

      refs.stars.forEach(s => {
        const p = project(s.x, s.y, s.z, v), isTgt = s.id === refs.tgt.id;
        if (p) {
          const bloom = p.dist < 0.5 ? Math.pow(0.5 / Math.max(0.0001, p.dist), 2) : 0;
          const maxRadiusAllowed = w * 0.4; 
          const cr = Math.max(1.5, Math.min(maxRadiusAllowed, s.radius * 0.015 * p.scale + s.radius * bloom));
          const gr = p.dist < 0.5 ? Math.min(maxRadiusAllowed * 1.5, cr * 3) : Math.max(2, cr * 2); 

          if (p.dist > 0.0001) {
             const g = ctx.createRadialGradient(p.sx, p.sy, cr, p.sx, p.sy, gr);
             g.addColorStop(0, `${s.color}90`); g.addColorStop(1, "rgba(0,0,0,0)");
             ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.sx, p.sy, gr, 0, 6.28); ctx.fill();
             ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.sx, p.sy, cr, 0, 6.28); ctx.fill();
          }
          if ((p.dist < 100 && p.dist > 0.1) || isTgt) {
            ctx.fillStyle = isTgt ? "#22d3ee" : "rgba(255,255,255,0.5)"; 
            ctx.font = isTgt ? "bold 11px monospace" : "10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(s.name, p.sx, p.sy + gr + 12);
          }
          if (isTgt && refs.lock) {
            ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.sx, p.sy, gr + 15, 0, 6.28); ctx.stroke();
            const gR = gr; ctx.beginPath();
            ctx.moveTo(p.sx, p.sy - gR - 20); ctx.lineTo(p.sx, p.sy - gR - 10); ctx.moveTo(p.sx, p.sy + gR + 20); ctx.lineTo(p.sx, p.sy + gR + 10);
            ctx.moveTo(p.sx - gR - 20, p.sy); ctx.lineTo(p.sx - gR - 10, p.sy); ctx.moveTo(p.sx + gR + 20, p.sy); ctx.lineTo(p.sx + gR + 10, p.sy); ctx.stroke();
          }
        }
      });
      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(animate);
    const rs = () => { w = canvasRef.current!.width = window.innerWidth; h = canvasRef.current!.height = window.innerHeight; };
    window.addEventListener("resize", rs); 
    return () => { cancelAnimationFrame(reqId); window.removeEventListener("resize", rs); };
  }, [hasStarted]);

  if (!hasStarted) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#020202] text-white font-mono relative overflow-hidden">
         <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>
         <div className="text-center z-10 max-w-xl px-6">
            <p className="text-emerald-500 font-bold tracking-[0.3em] uppercase text-xs mb-4 animate-pulse">2D Engine + Global Database</p>
            <h1 className="text-5xl font-black mb-6 tracking-tight text-white drop-shadow-lg">Relativistic Engine</h1>
            <div className="bg-black/60 border border-emerald-500/30 p-8 rounded-2xl mb-8 text-left backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                <p className="text-neutral-300 mb-4 text-sm leading-relaxed">
                  <strong className="text-emerald-400 font-bold">UPGRADE ACTIVE:</strong> Back to pure HTML5 2D performance. 
                  <br/><br/>
                  <span className="text-purple-400 font-bold">NEW MULTIPLAYER BACK-END:</span> The SIMBAD API is now wired into a live cloud database. Any custom stars you discover will be permanently broadcast to the navigation computers of all other players on the network.
                </p>
                {user ? (
                  <p className="text-emerald-400 text-xs font-bold border-l-2 border-emerald-500/50 pl-3">Network Uplink: Connected (ID: {user.uid.substring(0, 6)})</p>
                ) : (
                  <p className="text-orange-400 text-xs italic border-l-2 border-orange-500/50 pl-3 animate-pulse">Establishing secure network uplink...</p>
                )}
            </div>
            <button onClick={() => setHasStarted(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black px-12 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transform hover:-translate-y-1">Ignite 2D Engine</button>
         </div>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen bg-[#010101] text-white font-mono overflow-hidden selection:bg-cyan-900" onMouseDown={handleMouse.down} onMouseUp={handleMouse.up} onMouseLeave={handleMouse.up} onMouseMove={handleMouse.move}>
      
      {/* 2D CANVAS */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0 touch-none block" />

      {/* SCANLINES OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.02] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>

      {/* CENTER CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-30">
        <div className="w-16 h-[1px] bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-[1px] h-16 bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-6 h-6 border border-cyan-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* ARRIVAL SCAN MODAL ("Itsabouts") */}
      {arrivalScan && velocityC === 0 && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] bg-gradient-to-b from-black/90 to-cyan-950/40 backdrop-blur-3xl border border-cyan-500/50 p-8 rounded-2xl shadow-[0_0_100px_rgba(34,211,238,0.2)] z-30 transform scale-100 animate-in fade-in zoom-in duration-500">
             
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
             <div className="relative flex items-center justify-center w-14 h-14 mx-auto mb-4 border border-cyan-500/50 rounded-full bg-black/60 shadow-lg">
                 <div className="w-6 h-6 rounded-full animate-pulse" style={{ backgroundColor: targetStar.color, boxShadow: `0 0 20px ${targetStar.color}` }} />
             </div>

             <h3 className="text-cyan-400 font-bold text-center text-xs tracking-[0.2em] uppercase mb-1">Destination Reached</h3>
             <h1 className="text-4xl font-black text-center text-white mb-6 drop-shadow-lg">{targetStar.name}</h1>
             
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
             
             {targetStar.discoveredBy && (
               <div className="mt-4 bg-purple-900/30 border border-purple-500/30 p-2 rounded-lg text-center">
                 <span className="text-[10px] text-purple-300 font-bold tracking-widest uppercase">Global Discovery By: Agent {targetStar.discoveredBy}</span>
               </div>
             )}
         </div>
      )}

      {/* TOP HEADER */}
      <header className="absolute top-6 left-6 z-20 pointer-events-none flex flex-col gap-2">
         <h1 className="text-white font-black tracking-widest uppercase text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Relativistic Engine <span className="text-emerald-500 text-xs align-top">[2D]</span></h1>
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

      {/* RIGHT SIDEBAR: SHARED DATABASE */}
      <aside className="absolute top-6 right-6 w-[340px] bg-black/50 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.8)] z-20 flex flex-col max-h-[calc(100vh-200px)]">
        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
             <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span> 
                Global Discovery Net
             </p>
             <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-neutral-400 font-mono">
               {user ? `Connected` : 'Local Only'}
             </span>
          </div>
          <form onSubmit={searchSimbadAPI} className="flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Discover star (e.g. Rigel)..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none transition-colors shadow-inner" />
            <button type="submit" disabled={isSearching} className="bg-purple-500/20 hover:bg-purple-500 hover:text-black border border-purple-500/50 hover:border-purple-400 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 text-purple-400 cursor-pointer">{isSearching ? "..." : "SCAN"}</button>
          </form>
        </div>
        
        <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Stellar Coordinates</h2>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {knownStars.map(star => {
            const isTgt = targetStar.id === star.id;
            const isShared = star.discoveredBy !== undefined;
            return (
              <div key={star.id} className={`p-3 rounded-xl flex flex-col border transition-all cursor-pointer group ${isTgt && isNavLocked ? "bg-cyan-950/40 border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.15)]" : "bg-black/40 border-white/5 hover:bg-white/10 hover:border-white/20"}`} onClick={() => { setTargetStar(star); setIsNavLocked(true); setArrivalScan(false); }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: star.color, boxShadow: `0 0 8px ${star.color}` }} />
                    {star.name}
                    {isShared && <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded uppercase border border-purple-500/30" title={`Discovered globally by ${star.discoveredBy}`}>Global</span>}
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

      {/* --- CLASSIFIED EASTER EGG OVERLAY --- */}
      {showClassified && (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8">
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #0f0 2px, #0f0 4px)" }}></div>
          
          <div className="relative w-full max-w-4xl h-[85vh] bg-black border border-green-500/50 rounded-lg shadow-[0_0_50px_rgba(0,255,0,0.1)] flex flex-col font-mono text-green-500 overflow-hidden">
            {/* Terminal Header */}
            <div className="flex justify-between items-center bg-green-950/30 border-b border-green-500/50 p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#0f0]"></div>
                <h2 className="font-bold tracking-widest uppercase text-sm">Classified Access: Level 10 Clearance</h2>
              </div>
              <button onClick={() => setShowClassified(false)} className="text-green-500 hover:text-black hover:bg-green-500 px-4 py-2 border border-green-500 rounded transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer">Close Connection</button>
            </div>

            {/* Terminal Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 text-sm whitespace-pre-wrap leading-relaxed">
{`COMPUTER SCIENCE PRACTICALS 2026-27

PROGRAM 1
#Program for Arithmetic Calculator
result = 0
while True:
    val1 = float(input("Enter the first value :"))
    val2 = float(input("Enter the second value :"))
    op = input("Enter any one of the operator (+,-,*,/,//,%)")
    if op == "+":
        result = val1 + val2
    elif op == "-":
        result = val1 - val2
    elif op == "*":
        result = val1 * val2
    elif op == "/":
        if val2 == 0:
            print("Please enter a value other than 0")
        else:
            result = val1 / val2
    elif op == "//":
        result = val1 // val2
    else:
        result = val1 % val2
    print("The result is :",result)
    x=input("do you want to continue ")
    if x=='n':
        break

PROGRAM 2
n =int(input("Enter the limit:"))
x = -1
y = 1
z = 0
i=0
print("Fibonacci series :\\n")
while(i<n):
    print(z, end=" ")
    x = y
    y = z
    z = x + y
    i=i+1

PROGRAM 3
while True:
    print('1.Area of triangle')
    print('2.Area of Circle')
    print('3.Area of Rectangle')
    choice=int(input('Enter the choice'))
    if(choice==1):
        b=int(input('Enter the base'))
        h=int(input('Enter the height'))
        Area=0.5*b*h
        print('Area of triangle is', Area)
    elif(choice==2):
        r=int(input('Enter the radius'))
        Area=3.14*r*r
        print('the area of the circle is', Area)
    elif(choice==3):
        l=int(input('enter the length'))
        b=int(input('enter the breadth'))
        Area=l*b
        print('The Area of the Rectangle is ', Area)
    else:
        print('Wrong input')
    c=input('Do you want to continue?')
    if c=='n':
        break

PROGRAM 4
while True:
    print("1.Factorial")
    print("2.Sum of Elements in the list")
    ch=int(input("Enter your choice"))
    if ch==1:
        n=int(input("Enter the number of terms to find the factorial"))
        f=1
        for i in range(1,n+1):
            f=f*i
        print("Factorial of given number is ", f)
    elif ch==2:
        n=eval(input("Enter the list"))
        s=0
        for i in n:
            s=s+i
        print("The sum of series",s)
    con=input("Do you want to continue")
    if con=='n':
        break

PROGRAM 5
no=int(input("Enter any number to check : "))
no1=no
sum=0
while(no>0):
    ans=no%10
    sum=sum+(ans*ans*ans)
    no=int(no/10)
if sum==no1:
    print("Armstrong Number")
else:
    print("Not an Armstrong Number")

PROGRAM 6
a=input("Enter the String")
b=""
l=len(a)
for i in range(l-1,-1,-1):
    b+=a[i]
if a==b:
    print("Given string is palindrome")
else:
    print("The given string is not palindrome")

PROGRAM 7
st=input("Enter the string")
up=0
lc=0
Chr=0
for i in range(len(st)):
    Chr=Chr+1
    if st[i].isupper()==True:
        up=up+1
    elif st[i].islower()==True:
        lc=lc+1
print("Number of upper case letter",up)
print("Number of lower case letter",lc)
print("Number of character ",Chr)

PROGRAM 8
a=eval(input("Enter a List"))
odd=[]
even=[]
for i in a:
    if i%2==0:
        even.append(i)
    else:
        odd.append(i)
if even==[]:
    print("No even number")
else:
    print("The largest even number is",max(even))
if odd==[]:
    print("No odd number")
else:
    print("The largest odd number is ",max(odd))

PROGRAM 9
l=eval(input("Enter the list elements"))
s=eval(input("Enter the element to be searched"))
b=0
for i in range(len(l)):
    if l[i]==s:
        print("The element found in the index",i,"position",i+1)
        b=1
if b==0:
    print("element not found")

PROGRAMS 10-20 INCLUDED FROM PRACTICAL FILE.
(Programs 10-15: Text Files, Pickle, CSV, Stack)
(Programs 16-19: Python MySQL Connectivity)
(Program 20: SQL Commands and Queries)
`}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
