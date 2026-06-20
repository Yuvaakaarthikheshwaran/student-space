"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";

// --- TYPES ---
type User = { uid: string };
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
  
  // -- CRASH-PROOF STATE --
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

  // --- BULLETPROOF CSS OVERRIDE ---
  // Guarantees Tailwind loads directly in the browser, bypassing all Vercel Webpack errors.
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // --- CRASH-PROOF MOCK BACKEND ---
  useEffect(() => {
    // Simulate secure network connection
    const timer = setTimeout(() => {
      setUser({ uid: Math.random().toString(36).substring(2, 8).toUpperCase() });
    }, 1500);

    // Load any locally discovered stars
    const saved = localStorage.getItem('global_stars');
    if (saved) {
      setSharedStars(JSON.parse(saved));
    } else {
      const mockStars = [
        { id: "MOCK-1", name: "KEPLER-186", class: "M1V", x: 150, y: -50, z: 200, color: "#fca5a5", radius: 0.8, distanceLY: 582, isCustom: true, discoveredBy: "SYS-ADMIN" }
      ];
      setSharedStars(mockStars);
      localStorage.setItem('global_stars', JSON.stringify(mockStars));
    }
    return () => clearTimeout(timer);
  }, []);

  const knownStars = useMemo(() => {
    const combined = [...CORE_STARS];
    sharedStars.forEach(remoteStar => {
      if (!combined.find(s => s.id === remoteStar.id)) combined.push(remoteStar);
    });
    return combined;
  }, [sharedStars]);

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

  const skybox = useRef(Array.from({ length: 8000 }, () => {
    const theta = Math.random() * 2 * Math.PI, phi = Math.acos(2 * Math.random() - 1);
    return { x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi), a: Math.random() * 0.8 + 0.2 };
  }));

  const bgDust = useRef(Array.from({ length: 3000 }, () => ({
    x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200
  })));

  // --- API SEARCH & 10k RUPEE EASTER EGG ---
  const searchSimbadAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // --- THE SECRET OVERRIDE (10,000 RS PRIZE) ---
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
        x: distLY * Math.cos(decRad) * Math.cos(raRad), y: distLY * Math.sin(decRad), z: distLY * Math.cos(decRad) * Math.sin(raRad),
        discoveredBy: user ? user.uid : "GUEST"
      };
      
      setTargetStar(newStar); 
      setIsNavLocked(true); 
      setSearchQuery("");

      const updatedShared = [...sharedStars, newStar];
      setSharedStars(updatedShared);
      localStorage.setItem('global_stars', JSON.stringify(updatedShared));

    } catch (err: any) { alert("Uplink Failed: Star not found in Database."); } finally { setIsSearching(false); }
  };

  const handleMouse = {
    down: (e: React.MouseEvent) => { engineState.current.mouse = { isDown: true, lastX: e.clientX, lastY: e.clientY }; },
    up: () => { engineState.current.mouse.isDown = false; },
    move: (e: React.MouseEvent) => {
      const m = engineState.current.mouse;
      if (!m.isDown || isNavLocked || !hasStarted || showClassified) return;
      engineState.current.camera.targetYaw += (e.clientX - m.lastX) * 0.003;
      engineState.current.camera.targetPitch = Math.max(-1.57, Math.min(1.57, engineState.current.camera.targetPitch - (e.clientY - m.lastY) * 0.003));
      m.lastX = e.clientX; m.lastY = e.clientY;
    }
  };

  // --- CORE 2D PHYSICS ENGINE ---
  useEffect(() => {
    if (!hasStarted || showClassified) return;
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

      // ADJUSTED OPTICAL BRAKING: Safely stop at an optically scaled distance based on radius
      const safeStopDist = (refs.tgt.radius * 0.004) + 0.02;

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
          // OPTICAL SIZING ALGORITHM
          // 1. Point Size Fallback: They look like tiny sub-pixel points from far away
          const basePointRadius = Math.max(0.8, Math.min(2.5, s.radius * 0.05)); 
          
          // 2. Optical Scaler: When you get close, they bloom into disks according to inverse-square distance
          const physicalRadius = s.radius * 0.002 * p.scale; 
          const bloom = p.dist < 0.3 ? Math.pow(0.3 / Math.max(0.0001, p.dist), 2) * Math.max(1, s.radius * 0.5) : 0;
          
          const maxRadiusAllowed = w * 0.4; 
          const cr = Math.min(maxRadiusAllowed, Math.max(basePointRadius, physicalRadius + bloom));
          
          // Glow expands dynamically as you approach the star
          const glowMultiplier = p.dist < 1.0 ? 3 + (1.0 - p.dist) * 4 : 2;
          const gr = Math.min(maxRadiusAllowed * 1.5, Math.max(basePointRadius * 2, cr * glowMultiplier));

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
  }, [hasStarted, showClassified]);

  return (
    <>
      {/* ABSOLUTE FALLBACK CSS: Guarantees the site will never be a plain white screen */}
      <style dangerouslySetInnerHTML={{__html: `
        :root { color-scheme: dark; }
        body, html { background-color: #010101 !important; color: #ffffff !important; margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .fallback-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100vw; height: 100vh; background-color: #010101; position: relative; z-index: 50; }
        .fallback-btn { background: #10b981; color: #000; padding: 16px 40px; border-radius: 8px; font-weight: 900; font-family: monospace; border: none; cursor: pointer; font-size: 16px; margin-top: 20px; transition: transform 0.2s, background 0.2s; }
        .fallback-btn:hover { background: #34d399; transform: translateY(-2px); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.8); }
      `}} />

      {!hasStarted ? (
        <div className="fallback-screen flex items-center justify-center h-screen w-screen bg-[#020202] text-white font-mono relative overflow-hidden">
           <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>
           <div className="text-center z-10 max-w-xl px-6">
              <p className="text-emerald-500 font-bold tracking-[0.3em] uppercase text-xs mb-4 animate-pulse">2D Engine + Discovery Network</p>
              <h1 className="text-5xl font-black mb-6 tracking-tight text-white drop-shadow-lg" style={{ fontSize: '3rem', margin: '0 0 20px 0' }}>Relativistic Engine</h1>
              <div className="bg-black/60 border border-emerald-500/30 p-8 rounded-2xl mb-8 text-left backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '24px', borderRadius: '16px', marginBottom: '30px' }}>
                  <p className="text-neutral-300 mb-4 text-sm leading-relaxed" style={{ margin: 0, paddingBottom: '16px', color: '#d4d4d8' }}>
                    <strong className="text-emerald-400 font-bold" style={{ color: '#34d399' }}>UPGRADE ACTIVE:</strong> Pure HTML5 2D performance restored. WebGL engine detached to prevent deployment errors.
                    <br/><br/>
                    <span className="text-purple-400 font-bold" style={{ color: '#c084fc' }}>SECURE BACK-END:</span> The SIMBAD API is safely wired into local storage persistence.
                  </p>
                  {user ? (
                    <p className="text-emerald-400 text-xs font-bold border-l-2 border-emerald-500/50 pl-3" style={{ margin: 0, color: '#34d399', borderLeft: '2px solid rgba(16,185,129,0.5)', paddingLeft: '12px' }}>Network Uplink: Connected (ID: {user.uid})</p>
                  ) : (
                    <p className="text-orange-400 text-xs italic border-l-2 border-orange-500/50 pl-3 animate-pulse" style={{ margin: 0, color: '#fb923c', borderLeft: '2px solid rgba(249,115,22,0.5)', paddingLeft: '12px' }}>Establishing secure network uplink...</p>
                  )}
              </div>
              <button onClick={() => setHasStarted(true)} className="fallback-btn bg-emerald-500 hover:bg-emerald-400 text-black px-12 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transform hover:-translate-y-1">Ignite 2D Engine</button>
           </div>
        </div>
      ) : (
        <main style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#010101', color: '#fff', overflow: 'hidden' }} className="relative w-screen h-screen bg-[#010101] text-white font-mono overflow-hidden selection:bg-cyan-900" onMouseDown={handleMouse.down} onMouseUp={handleMouse.up} onMouseLeave={handleMouse.up} onMouseMove={handleMouse.move}>
          
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, display: 'block' }} className="absolute top-0 left-0 w-full h-full z-0 touch-none block" />

          <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.02] mix-blend-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10, opacity: 0.02, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-30" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 10, opacity: 0.3 }}>
            <div className="w-16 h-[1px] bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '64px', height: '1px', backgroundColor: '#06b6d4', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="w-[1px] h-16 bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '1px', height: '64px', backgroundColor: '#06b6d4', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="w-6 h-6 border border-cyan-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '24px', height: '24px', border: '1px solid #06b6d4', borderRadius: '50%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>

          {arrivalScan && velocityC === 0 && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] bg-gradient-to-b from-black/90 to-cyan-950/40 backdrop-blur-3xl border border-cyan-500/50 p-8 rounded-2xl shadow-[0_0_100px_rgba(34,211,238,0.2)] z-30 transform scale-100 animate-in fade-in zoom-in duration-500" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '420px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(6,182,212,0.5)', padding: '32px', borderRadius: '16px', zIndex: 30 }}>
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                 <div className="relative flex items-center justify-center w-14 h-14 mx-auto mb-4 border border-cyan-500/50 rounded-full bg-black/60 shadow-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', margin: '0 auto 16px', border: '1px solid rgba(6,182,212,0.5)', borderRadius: '50%', background: 'rgba(0,0,0,0.6)' }}>
                     <div className="w-6 h-6 rounded-full animate-pulse" style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: targetStar.color, boxShadow: `0 0 20px ${targetStar.color}` }} />
                 </div>
                 <h3 className="text-cyan-400 font-bold text-center text-xs tracking-[0.2em] uppercase mb-1" style={{ color: '#22d3ee', textAlign: 'center', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>Destination Reached</h3>
                 <h1 className="text-4xl font-black text-center text-white mb-6 drop-shadow-lg" style={{ fontSize: '2.25rem', fontWeight: 900, textAlign: 'center', color: '#fff', margin: '0 0 24px 0' }}>{targetStar.name}</h1>
                 <div className="grid grid-cols-2 gap-3 border-t border-cyan-500/20 pt-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(6,182,212,0.2)', paddingTop: '24px' }}>
                     <div className="bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner" style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <span className="block text-[9px] text-cyan-500/80 uppercase tracking-widest mb-1" style={{ display: 'block', fontSize: '9px', color: 'rgba(6,182,212,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Classification</span>
                         <span className="text-white font-bold text-sm" style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.875rem' }}>{targetStar.class}</span>
                     </div>
                     <div className="bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner" style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <span className="block text-[9px] text-cyan-500/80 uppercase tracking-widest mb-1" style={{ display: 'block', fontSize: '9px', color: 'rgba(6,182,212,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Surface Temp</span>
                         <span className="text-orange-400 font-bold text-sm" style={{ color: '#fb923c', fontWeight: 'bold', fontSize: '0.875rem' }}>{targetStar.temp || Math.floor(5700 * Math.sqrt(targetStar.radius))} K</span>
                     </div>
                     <div className="bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner" style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <span className="block text-[9px] text-cyan-500/80 uppercase tracking-widest mb-1" style={{ display: 'block', fontSize: '9px', color: 'rgba(6,182,212,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Est. Mass</span>
                         <span className="text-white font-bold text-sm" style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.875rem' }}>{targetStar.mass || (targetStar.radius * 0.9).toFixed(2)} M☉</span>
                     </div>
                     <div className="bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner" style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <span className="block text-[9px] text-cyan-500/80 uppercase tracking-widest mb-1" style={{ display: 'block', fontSize: '9px', color: 'rgba(6,182,212,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Stellar Radius</span>
                         <span className="text-emerald-400 font-bold text-sm" style={{ color: '#34d399', fontWeight: 'bold', fontSize: '0.875rem' }}>{targetStar.radius} R☉</span>
                     </div>
                 </div>
                 {targetStar.discoveredBy && (
                   <div className="mt-4 bg-purple-900/30 border border-purple-500/30 p-2 rounded-lg text-center" style={{ marginTop: '16px', background: 'rgba(88,28,135,0.3)', border: '1px solid rgba(168,85,247,0.3)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                     <span className="text-[10px] text-purple-300 font-bold tracking-widest uppercase" style={{ fontSize: '10px', color: '#d8b4fe', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Global Discovery By: Agent {targetStar.discoveredBy}</span>
                   </div>
                 )}
             </div>
          )}

          <header className="absolute top-6 left-6 z-20 pointer-events-none flex flex-col gap-2" style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 20, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <h1 className="text-white font-black tracking-widest uppercase text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" style={{ margin: 0, color: '#fff', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '1.5rem' }}>Relativistic Engine <span className="text-emerald-500 text-xs align-top" style={{ color: '#10b981', fontSize: '0.75rem', verticalAlign: 'top' }}>[2D]</span></h1>
             <div className="flex gap-2 pointer-events-auto mt-1" style={{ display: 'flex', gap: '8px', pointerEvents: 'auto', marginTop: '4px' }}>
               <button onClick={() => setIsNavLocked(!isNavLocked)} className={`text-[9px] px-4 py-1.5 rounded-full uppercase tracking-widest font-bold border transition-all cursor-pointer shadow-lg ${isNavLocked ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-black/60 border-neutral-600 text-neutral-400"}`} style={{ fontSize: '9px', padding: '6px 16px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', cursor: 'pointer', border: isNavLocked ? '1px solid #06b6d4' : '1px solid #525252', background: isNavLocked ? 'rgba(6,182,212,0.2)' : 'rgba(0,0,0,0.6)', color: isNavLocked ? '#22d3ee' : '#a3a3a3' }}>
                 {isNavLocked ? "Nav-Lock: Engaged" : "Free-Look: Active"}
               </button>
               {isNavLocked && (
                 <div className="text-cyan-400 text-[10px] tracking-widest uppercase font-bold bg-black/60 backdrop-blur-md border border-cyan-500/30 px-4 py-1.5 rounded-full w-fit shadow-lg flex items-center gap-2" style={{ color: '#22d3ee', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 'bold', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(6,182,212,0.3)', padding: '6px 16px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ width: '6px', height: '6px', backgroundColor: '#22d3ee', borderRadius: '50%' }} />
                   Target: {targetStar.name}
                 </div>
               )}
             </div>
          </header>

          <aside className="absolute top-6 right-6 w-[340px] bg-black/50 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.8)] z-20 flex flex-col max-h-[calc(100vh-200px)]" style={{ position: 'absolute', top: '24px', right: '24px', width: '340px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', pointerEvents: 'auto', zIndex: 20, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)' }}>
            <div className="mb-5" style={{ marginBottom: '20px' }}>
              <div className="flex justify-between items-center mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold flex items-center gap-2" style={{ margin: 0, fontSize: '10px', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#c084fc' }}></span> 
                    Global Discovery Net
                 </p>
                 <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-neutral-400 font-mono" style={{ fontSize: '9px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', color: '#a3a3a3' }}>
                   {user ? `Connected` : 'Local Only'}
                 </span>
              </div>
              <form onSubmit={searchSimbadAPI} className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Discover star (e.g. Rigel)..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none transition-colors shadow-inner" style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#fff' }} />
                <button type="submit" disabled={isSearching} className="bg-purple-500/20 hover:bg-purple-500 hover:text-black border border-purple-500/50 hover:border-purple-400 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 text-purple-400 cursor-pointer" style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.5)', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', color: '#c084fc', cursor: 'pointer' }}>{isSearching ? "..." : "SCAN"}</button>
              </form>
            </div>
            
            <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-2" style={{ margin: '0 0 12px 0', fontSize: '10px', fontWeight: 'bold', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Stellar Coordinates</h2>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
              {knownStars.map(star => {
                const isTgt = targetStar.id === star.id;
                const isShared = star.discoveredBy !== undefined;
                return (
                  <div key={star.id} className={`p-3 rounded-xl flex flex-col border transition-all cursor-pointer group ${isTgt && isNavLocked ? "bg-cyan-950/40 border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.15)]" : "bg-black/40 border-white/5 hover:bg-white/10 hover:border-white/20"}`} onClick={() => { setTargetStar(star); setIsNavLocked(true); setArrivalScan(false); }} style={{ padding: '12px', borderRadius: '12px', border: isTgt && isNavLocked ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.05)', background: isTgt && isNavLocked ? 'rgba(8,145,178,0.2)' : 'rgba(0,0,0,0.4)', cursor: 'pointer' }}>
                    <div className="flex justify-between items-center mb-1.5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="text-xs font-bold text-white flex items-center gap-2.5" style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="w-2 h-2 rounded-full" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: star.color, boxShadow: `0 0 8px ${star.color}` }} />
                        {star.name}
                        {isShared && <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded uppercase border border-purple-500/30" title={`Discovered globally by ${star.discoveredBy}`} style={{ fontSize: '8px', background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', border: '1px solid rgba(168,85,247,0.3)' }}>Global</span>}
                      </span>
                      {isTgt && isNavLocked && <span className="text-[8px] bg-cyan-500 text-black px-2 py-0.5 rounded font-bold uppercase tracking-widest" style={{ fontSize: '8px', background: '#06b6d4', color: '#000', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Locked</span>}
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-400 pl-4.5" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#a3a3a3', paddingLeft: '18px' }}>
                        <span>Dist: <span id={`dist-${star.id}`} className="text-white font-medium" style={{ color: '#fff', fontWeight: 500 }}>--- LY</span></span>
                        <span className="text-neutral-500" style={{ color: '#737373' }}>{star.class}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 pointer-events-none z-20" style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '896px', padding: '0 24px', pointerEvents: 'none', zIndex: 20 }}>
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto relative" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '16px', pointerEvents: 'auto', position: 'relative' }}>
              
              <div className="grid grid-cols-2 gap-12 mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginBottom: '24px' }}>
                <div className="flex flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="flex justify-between items-end" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a3a3a3', fontWeight: 'bold' }}>Sub-light Throttle</span>
                    <span className="text-base font-black text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" style={{ fontSize: '1rem', fontWeight: 900, color: '#22d3ee', marginLeft: 'auto' }}>{velocityC.toFixed(4)} c</span>
                  </div>
                  <input type="range" min="0" max="0.9999" step="0.0001" value={velocityC} onChange={(e) => setVelocityC(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-cyan-400 cursor-pointer outline-none hover:bg-white/20 transition-all shadow-inner" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', cursor: 'pointer' }} />
                  <div className="flex justify-between gap-2 mt-1" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                    {[0, 0.25, 0.5, 0.9, 0.9999].map(val => (
                      <button key={val} onClick={() => setVelocityC(val)} className="flex-1 bg-black/40 hover:bg-cyan-500 hover:text-black border border-white/10 hover:border-cyan-500 text-[9px] font-bold py-1.5 rounded transition-all text-neutral-300 cursor-pointer shadow-sm" style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px', fontWeight: 'bold', padding: '6px 0', borderRadius: '4px', color: '#d4d4d8', cursor: 'pointer' }}>
                        {val === 0 ? "STOP" : val === 0.9999 ? "MAX" : `${val}c`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="flex justify-between items-end" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a3a3a3', fontWeight: 'bold' }}>Time Warp Multiplier</span>
                    <span className="text-base font-black text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" style={{ fontSize: '1rem', fontWeight: 900, color: '#c084fc', marginLeft: 'auto' }}>{timeExp === 0 ? "1x (Real Time)" : `10^${timeExp.toFixed(1)}x`}</span>
                  </div>
                  <input type="range" min="0" max="10" step="0.1" value={timeExp} onChange={(e) => setTimeExp(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-purple-400 cursor-pointer outline-none hover:bg-white/20 transition-all shadow-inner" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', cursor: 'pointer' }} />
                  <div className="flex justify-between gap-2 mt-1" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                    {[0, 3, 6, 8, 10].map(val => (
                      <button key={val} onClick={() => setTimeExp(val)} className="flex-1 bg-black/40 hover:bg-purple-500 hover:text-black border border-white/10 hover:border-purple-500 text-[9px] font-bold py-1.5 rounded transition-all text-neutral-300 cursor-pointer shadow-sm" style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px', fontWeight: 'bold', padding: '6px 0', borderRadius: '4px', color: '#d4d4d8', cursor: 'pointer' }}>
                        {val === 0 ? "1x" : val === 10 ? "MAX" : `10^${val}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-4 grid grid-cols-5 gap-4 text-center divide-x divide-white/10 shadow-inner" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', textAlign: 'center' }}>
                <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373', fontWeight: 'bold' }}>Lorentz (γ)</span><span id="hud-gamma" className="text-sm font-black text-white" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#fff' }}>1.00</span></div>
                <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373', fontWeight: 'bold' }}>Contracted Dist</span><span id="hud-dist" className="text-sm font-black text-emerald-400" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#34d399' }}>---</span></div>
                <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><span className="text-[9px] uppercase tracking-widest text-cyan-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#06b6d4', fontWeight: 'bold' }}>Ship ETA</span><span id="hud-eta" className="text-sm font-black text-cyan-400 animate-pulse drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#22d3ee' }}>INF</span></div>
                <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373', fontWeight: 'bold' }}>Ship Time</span><span id="hud-ship-time" className="text-sm font-black text-white" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#fff' }}>0.0 YR</span></div>
                <div className="flex flex-col gap-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}><span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#737373', fontWeight: 'bold' }}>Univ Time</span><span id="hud-univ-time" className="text-sm font-black text-purple-400" style={{ fontSize: '0.875rem', fontWeight: 900, color: '#c084fc' }}>0.0 YR</span></div>
              </div>
            </div>
          </footer>

          {/* --- CLASSIFIED EASTER EGG OVERLAY (10k RUPEE REWARD) --- */}
          {showClassified && (
            <div 
              className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8" 
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}
              onPointerDown={() => setShowClassified(false)}
            >
              <div className="absolute inset-0 pointer-events-none opacity-10" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', opacity: 0.1, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #0f0 2px, #0f0 4px)" }}></div>
              
              <div 
                className="relative w-full max-w-4xl h-[85vh] bg-black border border-green-500/50 rounded-lg shadow-[0_0_50px_rgba(0,255,0,0.1)] flex flex-col font-mono text-green-500 overflow-hidden" 
                style={{ position: 'relative', width: '100%', maxWidth: '896px', height: '85vh', background: '#000', border: '1px solid rgba(0,255,0,0.5)', borderRadius: '8px', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', color: '#22c55e', overflow: 'hidden' }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center bg-green-950/30 border-b border-green-500/50 p-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(5,46,22,0.3)', borderBottom: '1px solid rgba(0,255,0,0.5)', padding: '16px' }}>
                  <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#0f0]" style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #0f0' }}></div>
                    <h2 className="font-bold tracking-widest uppercase text-sm" style={{ fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem', margin: 0 }}>Classified Access: Level 10 Clearance</h2>
                  </div>
                  <button onClick={() => setShowClassified(false)} className="text-green-500 hover:text-black hover:bg-green-500 px-4 py-2 border border-green-500 rounded transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer" style={{ color: '#22c55e', background: 'transparent', padding: '8px 16px', border: '1px solid #22c55e', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Close Connection</button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 text-sm whitespace-pre-wrap leading-relaxed" style={{ padding: '32px', overflowY: 'auto', flex: 1, fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.625 }}>
{`COMPUTER SCIENCE PRACTICALS 2026-27

PROGRAM 1: Write a Python Program to enter two numbers and print the arithmetic operations like +, -, *, /, // and %.
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

PROGRAM 2: Write a Python Program to enter the number of terms and to print the Fibonacci Series.
n =int(input("Enter the limit:"))
x = -1
y = 1
z = 0
i=0
print("Fibonacci series :\n")
while(i<n):
    print(z, end=" ")
    x = y
    y = z
    z = x + y
    i=i+1

PROGRAM 3: Write a menu driven Python program to calculate Area of triangle, Area of a circle, and Area of Rectangle.
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

PROGRAM 4: Write a menu driven program to find the factorial of given number and sum of list elements.
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

PROGRAM 5: Write a Program to check if the entered number is Armstrong or not.
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

PROGRAM 6: Write a Python program to check the given string if palindrome or not.
a=input("Enter the String")
b=""
l=len(a)
for i in range(l-1,-1,-1):
    b+=a[i]
if a==b:
    print("Given string is palindrome")
else:
    print("The given string is not palindrome")

PROGRAM 7: Write a Python program to count number of character, number of upper case and lower case letters in a given string.
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

PROGRAM 8: Write a Python program to print largest even and largest odd number in the list without using built - in functions.
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

PROGRAM 9: Write a Python Program to perform Linear Search on list.
l=eval(input("Enter the list elements"))
s=eval(input("Enter the element to be searched"))
b=0
for i in range(len(l)):
    if l[i]==s:
        print("The element found in the index",i,"position",i+1)
        b=1
if b==0:
    print("element not found")

PROGRAM 10: Python Program to read and write the content to/from the text file and count number of lines start with mentioned letter entered by the user.
f=open("file.txt", 'w')
char="Text files store data in ascii format.\\nHuman readable form.\\nAt lowest level text file is a collection of bytes"
f.write(char)
f.close()

f=open("file.txt",'r')
x=f.readlines()
count=0
s=0
ser=input("Enter the search letter")
for i in x:
    if i[0]==ser:
        count+=1
        s=1
if s==0:
    print("The letter not found")
else:
    print("No of line starts with", ser, "is", count)
f.close()

PROGRAM 11: Program to find the number of occurrences of the given word using text files.
f=open("file.txt", 'w')
char="Seek() function is used to change the position of the file handle to a given specific position.\\nTell() returns the current position of the file read/write pointer within the file"
f.write(char)
f.close()

f=open("file.txt",'r')
x=f.read()
y=x.split()
count=0
s=0
ser=input("Enter the search word")
for i in y:
    if i==ser:
        count+=1
        s=1
if s==0:
    print("The given word not found")
else:
    print("No of time the word ",ser,"occured is", count)
f.close()

PROGRAM 12: Write and Read operations in Binary files using Pickle Module.
import pickle
f=open("library.dat", 'wb')
while True:
    Bno=int(input("Enter the Book number"))
    Bname=input("Enter the name of the book")
    Bprice=int(input("Enter the Price"))
    info=[Bno, Bname, Bprice]
    pickle.dump(info,f)
    ch=input("Do you want to continue adding records(y/n)")
    if ch.upper()=='N':
        break
f.close()

with open("library.dat", 'rb')as f:
    while True:
        try:
            r=pickle.load(f)
            print(r)
        except:
            break

PROGRAM 13: Writing the data and Searching for a particular records in binary file using pickle module.
import pickle
f=open("library.dat",'wb')
while True:
    Bno=int(input("Enter the Book number"))
    Bname=input("Enter the name of the book")
    Bprice=int(input("enter the Price"))
    info=[Bno, Bname, Bprice]
    pickle.dump(info,f)
    ch=input("Do you want to continue adding records(y/n)")
    if ch.upper()=='N':
        break
f.close()

with open("library.dat", 'rb')as f:
    n=int(input("Enter the no to be searched"))
    while True:
        try:
            r=pickle.load(f)
            if r[0]==n:
                print(r)
        except:
            break

PROGRAM 14: Writing the records in CSV files and count number of records in the file.
import csv
f=open("emp.csv", 'w', newline="")
csvw=csv.writer(f)
while True:
    Eno=int(input("Enter the Employee number"))
    Ename=input("Enter the name of the Employee")
    Esal=int(input("Enter the Esal"))
    Desig=input("Enter the Designation")
    info=[Eno, Ename, Esal, Desig]
    csvw.writerow(info)
    ch=input("Do you want to continue adding records(y/n)")
    if ch.upper()=='N':
        break
f.close()

c=0
f=open("emp.csv",'r')
csvr=csv.reader(f)
for i in csvr:
    c=c+1
    print(i)
f.close()
print("Number of records in file is",c)

PROGRAM 15: PUSH and POP operation in stack using list.
stack=[]
def PUSH(item, stack):
    stack.append(item)

def POP(stack):
    if stack==[]:
        print("Stack is empty")
    else:
        p=stack.pop()
        print("Deleted element", p)

def DISPLAY(stack):
    if stack==[]:
        print("stack is empty")
    else:
        for i in range (len(stack)-1,-1,-1):
            print(stack[i])

while True:
    print("1.Push\\n2.Pop\\n3.Display")
    n=int(input("Enter the operation"))
    if n==1:
        a=int(input("Enter no"))
        PUSH(a,stack)
    elif n==2:
        POP(stack)
    elif n==3:
        DISPLAY(stack)
    con=input("Do you want to continue")
    if con=='n':
        break

PROGRAM 16: Python with MySQL connectivity - creating connection & Table.
import mysql.connector
con=mysql.connector.connect(host='localhost', user='root', password='root')
mycursor=con.cursor()

mycursor.execute("DROP DATABASE IF EXISTS student")
mycursor.execute("CREATE DATABASE student")
mycursor.execute("USE student")

mycursor.execute("DROP TABLE IF EXISTS studentinfo")
mycursor.execute("CREATE TABLE studentinfo (name VARCHAR(30), age INT(3), gender CHAR(1))")

sql = """INSERT INTO studentinfo(name, age, gender) VALUES(%s, %s, %s)"""
rows = [('Amit', 18, 'M'), ('Sudha', 17, 'F'), ('Suma', 19, 'F'), ('Paresh', 19, 'M'), ('Ali', 17,'M')]
mycursor.executemany(sql, rows)
con.commit()

sql = "SELECT * FROM studentinfo"
mycursor.execute(sql)
result = mycursor.fetchall()
for row in result:
    name = row[0]
    age = row[1]
    gender = row[2]
    print("Name=%s, Age=%s, Gender=%s" % (name, age, gender))
con.close()

PROGRAM 17: Python with MySQL connectivity - updating records.
import mysql.connector
con=mysql.connector.connect(host='localhost', user='root', password='root')
mycursor=con.cursor()

mycursor.execute("USE student")
mycursor.execute("DROP TABLE IF EXISTS result")
mycursor.execute("CREATE TABLE result (name VARCHAR(30), phys INT(3), chem INT(3), math INT(3))")

sql = """INSERT INTO result(name, phys, chem, math) VALUES(%s, %s, %s, %s)"""
rows = [('Amit', 70,76,80), ('Sudha',80,85,90), ('Suma',50,70,90), ('Paresh',55,60,70), ('Ali', 80,70,75), ('Gargi', 80,60,80)]
mycursor.executemany(sql, rows)
con.commit()

sql = "UPDATE result SET math=math+5 WHERE name='%s'" % ('Sudha')
mycursor.execute(sql)

sql = "SELECT * FROM result"
mycursor.execute(sql)
result = mycursor.fetchall()
for row in result:
    name = row[0]
    p = row[1]
    c = row[2]
    m = row[3]
    print("Name=%s, Phys=%d, Chem=%d, Math=%d" % (name,p,c,m))
con.close()

PROGRAM 18: Python with MySQL connectivity - deleting records.
import mysql.connector
con=mysql.connector.connect(host='localhost', user='root', password='root')
mycursor=con.cursor()
mycursor.execute("USE student")

sql = "DELETE FROM result WHERE math>=%d" % (90)
mycursor.execute(sql)

sql = "SELECT * FROM result"
mycursor.execute(sql)
result = mycursor.fetchall()
for row in result:
    name = row[0]
    p = row[1]
    c = row[2]
    m = row[3]
    print("Name=%s, Phys=%s, Chem=%s, Math=%s" % (name, p,c,m))
con.close()

PROGRAM 19: Python with MySQL connectivity -fetch all command.
import mysql.connector
con=mysql.connector.connect(host='localhost', user='root', password='root')
mycursor=con.cursor()
mycursor.execute("USE student")

mycursor.execute("DROP TABLE IF EXISTS staff")
mycursor.execute("CREATE TABLE staff (name VARCHAR(30), desg VARCHAR(10), subject VARCHAR(10), salary INT(5))")

sql = """INSERT INTO staff(name, desg, subject, salary) VALUES(%s, %s, %s, %s)"""
rows = [('Amit', 'PGT', 'CHEM', 8000), ('Sudha', 'HDM', 'BIOL', 8500), ('Suma', 'TGT', 'MATH', 9000), ('Paresh', 'PGT', 'HIND', 7000), ('Ali', 'PRT', 'COMM', 7500), ('Gargi', 'PGT', 'COMP',9000)]
mycursor.executemany(sql, rows)
con.commit()

sql = "SELECT * FROM staff WHERE salary>'%d'" % (8000)
mycursor.execute(sql)
result = mycursor.fetchall()
for row in result:
    name = row[0]
    des = row[1]
    sub = row[2]
    sal = row[3]
    print("Name=%s, Desg=%s, subject=%s, Salary=%s" % (name,des, sub,sal))
con.close()

PROGRAM 20: Execute the SQL commands and queries.
Create table employee (empno varchar(25) primary key, ename varchar(25), department varchar(25), salary int);

Insert into employee values('e034','snigdha sadu','sales', 35000);
Insert into employee values('e089','rekha sao', 'hr', 65000);
Insert into employee values('e112', 'shweta jagtap','marketing', 45000);
Insert into employee values('e123', 'ankush das', 'sales', 40000);
Insert into employee values('e245','neeraj kapoor','finance', 55000);

Select * from employee;

Select * from employee where department ='sales';

Select * from employee where department in ('sales', 'hr','marketing');

Select * from employee where empname like 's%';

Select * from employee order by salary desc;

Select department, count(*) from employee group by department;

Select count(*) from employee;

update employee set salary = salary +5000 where empno='e123';

delete from employee where empno='e034';
`}
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </>
  );
}
