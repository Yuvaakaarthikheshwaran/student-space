"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

// Relative Imports for Root Architecture
import { auth, db, appId } from '../lib/firebase';
import { CORE_STARS, StarData } from '../data/coreStars';
import InteractiveTerminal from '../components/terminal/InteractiveTerminal';
import FlightHUD from '../components/hud/FlightHUD';

const SECONDS_PER_YEAR = 31557600;

export default function DeepSpaceEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [sharedStars, setSharedStars] = useState<StarData[]>([]);
  const [fleetLocations, setFleetLocations] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  const [hasStarted, setHasStarted] = useState(false);
  const [velocityC, setVelocityC] = useState(0); 
  const [timeExp, setTimeExp] = useState(0); 
  const [targetStar, setTargetStar] = useState(CORE_STARS[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [arrivalScan, setArrivalScan] = useState(false);
  const [isNavLocked, setIsNavLocked] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);

  // Global Key Listener for Backtick
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // Secure Auth
  useEffect(() => {
    if (!auth) {
      setTimeout(() => setUser({ uid: Math.random().toString(36).substring(2, 8).toUpperCase() } as any), 1000);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof (window as any).__initial_auth_token !== 'undefined' && (window as any).__initial_auth_token) {
          await signInWithCustomToken(auth, (window as any).__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {}
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Live Database Listeners
  useEffect(() => {
    if (!db || !user) return;
    
    // 1. Listen for Stars
    const unsubStars = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sharedStars'), (snapshot) => {
      const liveStars: StarData[] = [];
      snapshot.forEach(doc => liveStars.push(doc.data() as StarData));
      setSharedStars(liveStars);
    });

    // 2. Listen for Global Chat
    const unsubChat = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'commlink'), (snapshot) => {
      const liveChat: any[] = [];
      snapshot.forEach(doc => liveChat.push({ id: doc.id, ...doc.data() }));
      liveChat.sort((a, b) => a.timestamp - b.timestamp);
      setChatMessages(liveChat.slice(-50)); 
    });

    // 3. MULTIPLAYER: Listen for other Live Fleet players
    const unsubFleet = onSnapshot(collection(db, 'artifacts', appId, 'public', 'fleet'), (snapshot) => {
      const now = Date.now();
      const active: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (now - data.timestamp < 10000 && doc.id !== user.uid) {
          active.push({ id: doc.id, ...data });
        }
      });
      setFleetLocations(active);
    });

    return () => { unsubStars(); unsubChat(); unsubFleet(); };
  }, [user]);

  // MULTIPLAYER: Broadcast My Live Location every second
  useEffect(() => {
    if (!db || !user || !hasStarted) return;
    const interval = setInterval(() => {
      setDoc(doc(db, 'artifacts', appId, 'public', 'fleet', user.uid), {
        x: engineState.current.ship.x,
        y: engineState.current.ship.y,
        z: engineState.current.ship.z,
        timestamp: Date.now()
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [user, hasStarted]);

  const knownStars = useMemo(() => {
    const combined = [...CORE_STARS];
    sharedStars.forEach(remoteStar => {
      if (!combined.find(s => s.id === remoteStar.id)) combined.push(remoteStar);
    });
    return combined;
  }, [sharedStars]);

  const stateRefs = useRef({ vel: 0, timeExp: 0, lock: true, tgt: CORE_STARS[1], stars: CORE_STARS, fleet: [] as any[] });
  useEffect(() => { 
    stateRefs.current = { vel: velocityC, timeExp, lock: isNavLocked, tgt: targetStar, stars: knownStars, fleet: fleetLocations }; 
  }, [velocityC, timeExp, isNavLocked, targetStar, knownStars, fleetLocations]);

  const engineState = useRef({
    ship: { x: 0, y: 1.5, z: 3.0 }, 
    camera: { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 },
    mouse: { isDown: false, lastX: 0, lastY: 0 }, 
    clocks: { universe: 0, ship: 0 }, 
    lastFrameTime: 0
  });

  const skybox = useRef(Array.from({ length: 8000 }, () => {
    const theta = Math.random() * 2 * Math.PI, phi = Math.acos(2 * Math.random() - 1);
    return { x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi), a: Math.random() * 0.8 + 0.2 };
  }));

  const bgDust = useRef(Array.from({ length: 3000 }, () => ({
    x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200
  })));

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
        x: distLY * Math.cos(decRad) * Math.cos(raRad), y: distLY * Math.sin(decRad), z: distLY * Math.cos(decRad) * Math.sin(raRad),
        discoveredBy: user ? user.uid.substring(0,6) : "GUEST"
      };
      
      setTargetStar(newStar); 
      setIsNavLocked(true); 
      setSearchQuery("");

      if (db) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sharedStars', newStar.id), newStar);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'commlink', Date.now().toString()), { text: `SYSTEM: Agent ${newStar.discoveredBy} discovered ${newStar.name}`, sender: "SYSTEM", timestamp: Date.now(), isSystem: true });
      } else {
        setSharedStars(prev => [...prev, newStar]);
      }
    } catch (err: any) { alert("Uplink Failed: Star not found in Database."); } finally { setIsSearching(false); }
  };

  const handleMouse = {
    down: (e: React.MouseEvent) => { engineState.current.mouse = { isDown: true, lastX: e.clientX, lastY: e.clientY }; },
    up: () => { engineState.current.mouse.isDown = false; },
    move: (e: React.MouseEvent) => {
      const m = engineState.current.mouse;
      if (!m.isDown || isNavLocked || !hasStarted || showTerminal) return;
      engineState.current.camera.targetYaw += (e.clientX - m.lastX) * 0.003;
      engineState.current.camera.targetPitch = Math.max(-1.57, Math.min(1.57, engineState.current.camera.targetPitch - (e.clientY - m.lastY) * 0.003));
      m.lastX = e.clientX; m.lastY = e.clientY;
    }
  };

  // --- CORE PHYSICS LOOP ---
  useEffect(() => {
    if (!hasStarted || showTerminal) return;
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

      // Skybox
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      skybox.current.forEach(s => {
         const p = project(s.x, s.y, s.z, v, true);
         if (p) { ctx.globalAlpha = s.a; ctx.fillRect(p.sx, p.sy, 1.2, 1.2); }
      });
      ctx.globalAlpha = 1.0;

      // Dust
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

      // MULTIPLAYER: Live Fleet Rendering
      refs.fleet.forEach(f => {
        const p = project(f.x, f.y, f.z, v);
        if (p && p.dist > 0.05) {
          ctx.fillStyle = "#a855f7"; // Purple for multiplayer ships
          ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(1.5, 4 / p.dist), 0, 6.28); ctx.fill();
          ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
          ctx.font = "8px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`AGT-${f.id.substring(0,4)}`, p.sx, p.sy + 12);
        }
      });

      // Stars
      refs.stars.forEach(s => {
        const p = project(s.x, s.y, s.z, v), isTgt = s.id === refs.tgt.id;
        if (!p) return;
        
        let cr, gr;
        if (p.dist > 2.0) {
          cr = Math.max(0.5, Math.min(1.5, s.radius * 0.1));
          gr = cr * 2.5; 
        } else {
          const physicalRadius = s.radius * 0.002 * p.scale; 
          const bloom = Math.pow(0.3 / Math.max(0.0001, p.dist), 2) * Math.max(1, s.radius * 0.5);
          const maxRadiusAllowed = w * 0.4; 
          cr = Math.min(maxRadiusAllowed, Math.max(1.5, physicalRadius + bloom));
          const glowMultiplier = 3 + (1.0 - p.dist) * 4;
          gr = Math.min(maxRadiusAllowed * 1.5, Math.max(3, cr * glowMultiplier));
        }

        if (p.dist > 0.0001) {
            const g = ctx.createRadialGradient(p.sx, p.sy, cr, p.sx, p.sy, gr);
            g.addColorStop(0, `${s.color}90`); g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.sx, p.sy, gr, 0, 6.28); ctx.fill();
            
            ctx.fillStyle = p.dist > 2.0 ? s.color : "#fff"; 
            ctx.beginPath(); ctx.arc(p.sx, p.sy, cr, 0, 6.28); ctx.fill();
        }

        if ((p.dist < 100 && p.dist > 0.1) || isTgt) {
          ctx.fillStyle = isTgt ? "#22d3ee" : "rgba(255,255,255,0.5)"; 
          ctx.font = isTgt ? "bold 11px monospace" : "10px monospace";
          ctx.textAlign = "center";
          const offset = p.dist > 2.0 ? 15 : gr + 15;
          ctx.fillText(s.name, p.sx, p.sy + offset);
        }

        if (isTgt && refs.lock) {
          ctx.strokeStyle = "rgba(34, 211, 238, 0.8)"; 
          ctx.lineWidth = 1;
          const box = p.dist > 2.0 ? 8 : Math.min(80, gr + 10);
          
          ctx.beginPath();
          ctx.moveTo(p.sx - box, p.sy - box + 5); ctx.lineTo(p.sx - box, p.sy - box); ctx.lineTo(p.sx - box + 5, p.sy - box);
          ctx.moveTo(p.sx + box - 5, p.sy - box); ctx.lineTo(p.sx + box, p.sy - box); ctx.lineTo(p.sx + box, p.sy - box + 5);
          ctx.moveTo(p.sx - box, p.sy + box - 5); ctx.lineTo(p.sx - box, p.sy + box); ctx.lineTo(p.sx - box + 5, p.sy + box);
          ctx.moveTo(p.sx + box - 5, p.sy + box); ctx.lineTo(p.sx + box, p.sy + box); ctx.lineTo(p.sx + box, p.sy + box - 5);
          ctx.stroke();
        }
      });
      reqId = requestAnimationFrame(animate);
    };

    reqId = requestAnimationFrame(animate);
    const rs = () => { w = canvasRef.current!.width = window.innerWidth; h = canvasRef.current!.height = window.innerHeight; };
    window.addEventListener("resize", rs); 
    return () => { cancelAnimationFrame(reqId); window.removeEventListener("resize", rs); };
  }, [hasStarted, showTerminal]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root { color-scheme: dark; }
        body, html { background-color: #010101 !important; color: #ffffff !important; margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .fallback-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100vw; height: 100vh; background-color: #010101; position: relative; z-index: 50; }
        .fallback-btn { background: #10b981; color: #000; padding: 16px 40px; border-radius: 8px; font-weight: 900; font-family: monospace; border: none; cursor: pointer; font-size: 16px; margin-top: 20px; transition: transform 0.2s, background 0.2s; }
        .fallback-btn:hover { background: #34d399; transform: translateY(-2px); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.5); border-radius: 10px; }
      `}} />

      {!hasStarted ? (
        <div className="fallback-screen flex items-center justify-center h-screen w-screen bg-[#020202] text-white font-mono relative overflow-hidden">
           <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>
           <div className="text-center z-10 max-w-xl px-6">
              <p className="text-emerald-500 font-bold tracking-[0.3em] uppercase text-xs mb-4 animate-pulse">2D Engine + Discovery Network</p>
              <h1 className="text-5xl font-black mb-6 tracking-tight text-white drop-shadow-lg" style={{ fontSize: '3rem', margin: '0 0 20px 0' }}>Relativistic Engine</h1>
              <div className="bg-black/60 border border-emerald-500/30 p-8 rounded-2xl mb-8 text-left backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '24px', borderRadius: '16px', marginBottom: '30px' }}>
                  <p className="text-neutral-300 mb-4 text-sm leading-relaxed" style={{ margin: 0, paddingBottom: '16px', color: '#d4d4d8' }}>
                    <strong className="text-emerald-400 font-bold" style={{ color: '#34d399' }}>UPGRADE ACTIVE:</strong> Component Architecture injected. 
                    <br/><br/>
                    <span className="text-purple-400 font-bold" style={{ color: '#c084fc' }}>SECURE BACK-END:</span> Multiplayer Fleet Tracking Online.
                  </p>
              </div>
