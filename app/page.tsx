"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Relative Imports for Root Architecture
import { app, auth, db, appId } from '../lib/firebase';
import { CORE_STARS, StarData } from '../data/coreStars';
import InteractiveTerminal from '../components/terminal/InteractiveTerminal';
import FlightHUD from '../components/hud/FlightHUD';
import GalaxyMap from '../components/navigation/GalaxyMap';

const SECONDS_PER_YEAR = 31557600;

export default function DeepSpaceEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [agentName, setAgentName] = useState(""); // <-- Global Username State
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
  const [showMap, setShowMap] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // NEW: Global Connection Monitoring
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [connectionError, setConnectionError] = useState<string>("");

  // Global Key Listener for Backtick & Map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
      if (e.key.toLowerCase() === 'm' && !showTerminal && !isSearching) {
        e.preventDefault();
        setShowMap(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTerminal, isSearching]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // Secure Auth with Explicit Error Handling
  useEffect(() => {
    if (!auth) {
      setConnectionStatus('error');
      setConnectionError("Firebase Configuration Missing. Check lib/firebase.ts keys.");
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
        setConnectionStatus('connected');
      } catch (e: any) {
        console.error("FIREBASE AUTH BLOCKED:", e);
        setConnectionStatus('error');
        setConnectionError("Authentication Blocked. Ensure Anonymous Login is enabled in Firebase Console.");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setConnectionStatus('connected');
      }
    });
    return () => unsubscribe();
  }, []);

  // Live Database Listeners with Explicit Fallback Warnings
  useEffect(() => {
    if (!db || !user) return;
    
    // 1. Listen for Stars
    const unsubStars = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sharedStars'), (snapshot) => {
      const liveStars: StarData[] = [];
      snapshot.forEach(doc => liveStars.push(doc.data() as StarData));
      setSharedStars(liveStars);
    }, (error) => {
      console.error("STAR SYNC FAILED:", error);
      setConnectionStatus('error');
      setConnectionError("Database Sync Denied. Check Firestore Security Rules.");
    });

    // 2. Listen for Global Chat
    const unsubChat = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'commlink'), (snapshot) => {
      const liveChat: any[] = [];
      snapshot.forEach(doc => liveChat.push({ id: doc.id, ...doc.data() }));
      liveChat.sort((a, b) => a.timestamp - b.timestamp);
      setChatMessages(liveChat.slice(-50)); 
    }, (error) => {
      console.error("CHAT SYNC FAILED:", error);
      setConnectionStatus('error');
      setConnectionError("Database Sync Denied. Check Firestore Security Rules.");
    });

    // 3. MULTIPLAYER: Listen for other Live Fleet players
    const unsubFleet = onSnapshot(collection(db, 'artifacts', appId, 'public', 'fleet'), (snapshot) => {
      const now = Date.now();
      const active: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (typeof data.x === 'number' && typeof data.y === 'number' && typeof data.z === 'number') {
          if (now - data.timestamp < 10000 && doc.id !== user.uid) {
            active.push({ id: doc.id, ...data });
          }
        }
      });
      setFleetLocations(active);
    }, (error) => {
      console.error("FLEET SYNC FAILED:", error);
      setConnectionStatus('error');
      setConnectionError("Database Sync Denied. Check Firestore Security Rules.");
    });

    return () => { unsubStars(); unsubChat(); unsubFleet(); };
  }, [user]);

  // MULTIPLAYER: Broadcast My Live Location every second
  useEffect(() => {
    if (!db || !user || !hasStarted || connectionStatus === 'error') return;
    const interval = setInterval(async () => {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'fleet', user.uid), {
          x: engineState.current.ship.x,
          y: engineState.current.ship.y,
          z: engineState.current.ship.z,
          name: agentName || user.uid.substring(0,4),
          timestamp: Date.now()
        }, { merge: true });
      } catch (error) {
        console.warn("Could not broadcast location (Check Firestore Rules)");
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [user, hasStarted, agentName, connectionStatus]);

  // --- FCM NOTIFICATIONS INTEGRATION ---
  const requestNotificationPermission = async () => {
    if (!app || !user || typeof window === 'undefined' || !('Notification' in window)) {
      alert("Push notifications aren't supported on this browser.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: 'BEG37DUh4P2iqpeLnEEZhqpWmBjGHnt_3BZlFytnN63vc4848KzcIDYAkpAWJ1YqcQIkugpGYBJ0arV3auSMbjg'
        });

        if (token) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'fleet', user.uid), {
            fcmToken: token
          }, { merge: true });
          
          setNotificationsEnabled(true);
          
          onMessage(messaging, (payload) => {
            console.log("Foreground transmission received: ", payload);
          });
        }
      } else {
        console.warn("Notification permission denied.");
      }
    } catch (error) {
      console.error("FCM Token generation failed: ", error);
    }
  };

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
        discoveredBy: agentName || "GUEST"
      };
      
      setTargetStar(newStar); 
      setIsNavLocked(true); 
      setSearchQuery("");

      if (db && connectionStatus === 'connected') {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sharedStars', newStar.id), newStar);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'commlink', Date.now().toString()), { 
          text: `SYSTEM: Agent ${newStar.discoveredBy} mapped ${newStar.name}`, 
          sender: "SYSTEM", 
          timestamp: Date.now(), 
          isSystem: true 
        });
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
      if (!m.isDown || isNavLocked || !hasStarted || showTerminal || showMap) return;
      engineState.current.camera.targetYaw += (e.clientX - m.lastX) * 0.003;
      engineState.current.camera.targetPitch = Math.max(-1.57, Math.min(1.57, engineState.current.camera.targetPitch - (e.clientY - m.lastY) * 0.003));
      m.lastX = e.clientX; m.lastY = e.clientY;
    }
  };

  // --- CORE PHYSICS LOOP ---
  useEffect(() => {
    if (!hasStarted || showTerminal || showMap) return;
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

      // Update sidebar distances in real-time
      refs.stars.forEach(s => {
         if (typeof s.x !== 'number' || isNaN(s.x)) return; 
         const distEl = document.getElementById(`dist-${s.id}`);
         if (distEl) distEl.innerText = Math.hypot(s.x - st.ship.x, s.y - st.ship.y, s.z - st.ship.z).toFixed(4) + " LY";
      });

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
        if (typeof f.x !== 'number' || isNaN(f.x)) return;
        const p = project(f.x, f.y, f.z, v);
        if (p && p.dist > 0.05) {
          ctx.fillStyle = "#a855f7"; // Purple for multiplayer ships
          ctx.beginPath(); ctx.arc(p.sx, p.sy, Math.max(1.5, 4 / p.dist), 0, 6.28); ctx.fill();
          ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
          ctx.font = "8px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`AGT-${f.name || f.id.substring(0,4)}`, p.sx, p.sy + 12);
        }
      });

      // Stars
      refs.stars.forEach(s => {
        if (typeof s.x !== 'number' || isNaN(s.x)) return;
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
  }, [hasStarted, showTerminal, showMap]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: 
        ":root { color-scheme: dark; } " +
        "body, html { background-color: #010101 !important; color: #ffffff !important; margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; } " +
        ".fallback-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100vw; height: 100vh; background-color: #010101; position: relative; z-index: 50; } " +
        ".fallback-btn { background: #10b981; color: #000; padding: 16px 40px; border-radius: 8px; font-weight: 900; font-family: monospace; border: none; cursor: pointer; font-size: 16px; margin-top: 20px; transition: transform 0.2s, background 0.2s; } " +
        ".fallback-btn:hover:not(:disabled) { background: #34d399; transform: translateY(-2px); } " +
        ".fallback-btn:disabled { background: #064e3b; color: #a7f3d0; opacity: 0.5; cursor: not-allowed; } " +
        ".custom-scrollbar::-webkit-scrollbar { width: 4px; } " +
        ".custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; } " +
        ".custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.5); border-radius: 10px; }"
      }} />

      {/* Explicit Warning Banner if Firebase is Blocking Us */}
      {hasStarted && connectionStatus === 'error' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-950/90 border border-red-500/50 text-red-200 px-6 py-3 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.3)] backdrop-blur-md flex flex-col items-center text-center animate-pulse w-full max-w-2xl pointer-events-none">
          <span className="font-black tracking-widest uppercase text-xs mb-1 text-red-400">Database Connection Failed</span>
          <span className="text-[10px] text-red-200">{connectionError} You are playing in Offline Isolation Mode.</span>
        </div>
      )}

      {!hasStarted ? (
        <div className="fallback-screen flex items-center justify-center h-screen w-screen bg-[#020202] text-white font-mono relative overflow-hidden">
           <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }}></div>
           <div className="text-center z-10 max-w-xl px-6 flex flex-col items-center">
              <p className="text-emerald-500 font-bold tracking-[0.3em] uppercase text-xs mb-4 animate-pulse">2D Engine + Discovery Network</p>
              <h1 className="text-5xl font-black mb-6 tracking-tight text-white drop-shadow-lg" style={{ fontSize: '3rem', margin: '0 0 20px 0' }}>Relativistic Engine</h1>
              <div className="bg-black/60 border border-emerald-500/30 p-8 rounded-2xl mb-8 text-left backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)] w-full" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '24px', borderRadius: '16px', marginBottom: '30px' }}>
                  <p className="text-neutral-300 mb-4 text-sm leading-relaxed" style={{ margin: 0, paddingBottom: '16px', color: '#d4d4d8' }}>
                    <strong className="text-emerald-400 font-bold" style={{ color: '#34d399' }}>UPGRADE ACTIVE:</strong> Component Architecture injected. 
                    <br/><br/>
                    <span className="text-purple-400 font-bold" style={{ color: '#c084fc' }}>SECURE BACK-END:</span> Multiplayer Fleet Tracking & Push Alerts Online.
                  </p>
                  
                  {connectionStatus === 'error' && (
                    <div className="mt-4 bg-red-900/30 border border-red-500/30 p-3 rounded-lg text-xs text-red-300">
                      <strong>WARNING:</strong> {connectionError}
                    </div>
                  )}
              </div>

              {/* Agent Designation Input */}
              <div className="w-full max-w-sm mb-6">
                <label className="block text-emerald-400 text-[10px] uppercase tracking-widest font-bold mb-2 text-left">Agent Designation</label>
                <input 
                  type="text" 
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value.toUpperCase())}
                  placeholder="ENTER USERNAME"
                  maxLength={12}
                  className="w-full bg-black/80 border-2 border-emerald-500/50 rounded-lg px-4 py-3 text-emerald-400 font-bold tracking-widest text-center focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all uppercase"
                />
              </div>

              <button 
                onClick={() => setHasStarted(true)} 
                disabled={agentName.trim() === ""}
                className="fallback-btn font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                {agentName.trim() === "" ? "Awaiting Identity..." : "Ignite 2D Engine"}
              </button>
           </div>
        </div>
      ) : (
        <main style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#010101', color: '#fff', overflow: 'hidden' }} className="relative w-screen h-screen bg-[#010101] text-white font-mono overflow-hidden selection:bg-cyan-900" onMouseDown={handleMouse.down} onMouseUp={handleMouse.up} onMouseLeave={handleMouse.up} onMouseMove={handleMouse.move}>
          
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, display: 'block' }} className="absolute top-0 left-0 w-full h-full z-0 touch-none block" />

          {/* CROSSHAIR */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-30" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 10, opacity: 0.3 }}>
            <div className="w-16 h-[1px] bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '64px', height: '1px', backgroundColor: '#06b6d4', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="w-[1px] h-16 bg-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '1px', height: '64px', backgroundColor: '#06b6d4', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>

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

          {/* LEFT SIDE: LIVE CHAT COMMLINK */}
          <aside className="absolute top-32 left-6 w-[320px] bg-black/50 backdrop-blur-2xl border border-emerald-500/20 p-4 rounded-2xl pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.8)] z-20 flex flex-col" style={{ position: 'absolute', top: '120px', left: '24px', width: '320px', height: 'calc(100vh - 300px)', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(16,185,129,0.2)', padding: '16px', borderRadius: '16px', pointerEvents: 'auto', zIndex: 20, display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-3 mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(16,185,129,0.2)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399' }} />
              <h2 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex-1" style={{ margin: 0, fontSize: '10px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>Interstellar Comm-Link</h2>
              {!notificationsEnabled && connectionStatus === 'connected' && (
                 <button onClick={requestNotificationPermission} className="text-[8px] bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/50 text-emerald-300 px-2 py-1 rounded transition-colors uppercase tracking-widest font-bold">
                    Enable Alerts
                 </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar flex flex-col" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
              {chatMessages.map(msg => (
                <div key={msg.id} className="text-xs" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                  <span className={`font-bold mr-2 ${msg.isSystem ? 'text-yellow-400' : 'text-emerald-300'}`} style={{ fontWeight: 'bold', marginRight: '8px', color: msg.isSystem ? '#facc15' : '#6ee7b7' }}>
                    [{msg.sender}]:
                  </span>
                  <span className={`${msg.isSystem ? 'text-yellow-100 italic' : 'text-neutral-300'}`} style={{ color: msg.isSystem ? '#fef08a' : '#d4d4d8', fontStyle: msg.isSystem ? 'italic' : 'normal' }}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              
              const newMsg = { 
                text: chatInput.trim(), 
                sender: agentName || (user ? user.uid.substring(0,6) : "GUEST"), 
                timestamp: Date.now() 
              };

              // Optimistic UI update: Always show the message locally instantly!
              setChatMessages(prev => [...prev, { id: Date.now().toString(), ...newMsg }].slice(-50));
              setChatInput("");

              if (db && connectionStatus === 'connected') {
                try {
                  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'commlink', Date.now().toString()), newMsg);
                } catch (error) {
                  console.error("Firebase write failed, but message is visible locally.");
                }
              }
            }} className="mt-3 flex gap-2" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={connectionStatus === 'error' ? "Offline mode active..." : "Transmit..."} className="w-full bg-black/50 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-white" style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#fff' }} />
              <button type="submit" className="bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/50 hover:border-emerald-400 px-3 rounded-lg text-xs font-bold text-emerald-400 cursor-pointer" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', color: '#34d399', cursor: 'pointer' }}>TX</button>
            </form>
          </aside>

          {/* RIGHT SIDE: DISCOVERY NET */}
          <aside className="absolute top-6 right-6 w-[340px] bg-black/50 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.8)] z-20 flex flex-col max-h-[calc(100vh-200px)]" style={{ position: 'absolute', top: '24px', right: '24px', width: '340px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', pointerEvents: 'auto', zIndex: 20, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)' }}>
            <div className="mb-5" style={{ marginBottom: '20px' }}>
              <div className="flex justify-between items-center mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold flex items-center gap-2" style={{ margin: 0, fontSize: '10px', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#c084fc' }}></span> 
                    Global Discovery Net
                 </p>
                 <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-widest ${connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : connectionStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-neutral-400'}`} style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '4px' }}>
                   {connectionStatus === 'connected' ? 'ONLINE' : connectionStatus === 'error' ? 'OFFLINE' : 'CONNECTING...'}
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

          {/* FLIGHT CONTROLS */}
          <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, width: '100%', maxWidth: '896px', padding: '0 24px' }}>
          <FlightHUD velocityC={velocityC} setVelocityC={setVelocityC} timeExp={timeExp} setTimeExp={setTimeExp} />
      </div>

      {/* TACTICAL MAP */}
      {showMap && (
        <GalaxyMap 
          stars={knownStars}
          fleet={fleetLocations}
          ship={engineState.current.ship}
          onSelectTarget={(star) => {
            setTargetStar(star);
            setIsNavLocked(true);
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* EASTER EGG */}
      {/* NEW: We pass the agentName straight into the terminal component */}
      {showTerminal && <InteractiveTerminal onClose={() => setShowTerminal(false)} username={agentName} />}
    </main>
  )}
</>
  );
}
