"use client";
import React, { useEffect, useRef, useState } from "react";

type StarData = { id: string; name: string; x: number; y: number; z: number; color: string; radius: number; distanceLY: number; class: string; temp?: number; mass?: number; isCustom?: boolean };

const CORE_STARS: StarData[] = [
  { id: "SOL", name: "Sun (Sol)", class: "G2V Yellow Dwarf", x: 0, y: 0, z: 0, color: "#fef08a", radius: 1, distanceLY: 0, temp: 5778, mass: 1 },
  { id: "CEN", name: "Alpha Centauri", class: "G2V/K1V Binary", x: 4.37, y: 0, z: 0, color: "#fde047", radius: 1.1, distanceLY: 4.37, temp: 5790, mass: 1.1 },
  { id: "SIR", name: "Sirius A", class: "A1V Main Sequence", x: -2.0, y: -8.0, z: -2.5, color: "#cffafe", radius: 1.71, distanceLY: 8.6, temp: 9940, mass: 2.02 },
  { id: "VEG", name: "Vega", class: "A0V Main Sequence", x: 15.0, y: 15.0, z: -10.0, color: "#67e8f9", radius: 2.36, distanceLY: 25.0, temp: 9602, mass: 2.13 },
  { id: "BET", name: "Betelgeuse", class: "M1-2 Red Supergiant", x: -400.0, y: -100.0, z: 300.0, color: "#dc2626", radius: 887.0, distanceLY: 548.0, temp: 3600, mass: 16.5 }
];
const SECONDS_PER_YEAR = 31557600;

export default function DeepSpaceEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [velocityC, setVelocityC] = useState(0); 
  const [timeExp, setTimeExp] = useState(0); 
  const [telemetry, setTelemetry] = useState({ gamma: 1, universeYears: 0, shipYears: 0, contractedDist: Infinity, etaYears: -1 });
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [knownStars, setKnownStars] = useState<StarData[]>(CORE_STARS);
  const [targetStar, setTargetStar] = useState<StarData>(CORE_STARS[1]);
  const [isNavLocked, setIsNavLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const stateRefs = useRef({ vel: 0, timeExp: 0, lock: false, tgt: CORE_STARS[1], stars: CORE_STARS });
  useEffect(() => { stateRefs.current = { vel: velocityC, timeExp, lock: isNavLocked, tgt: targetStar, stars: knownStars }; }, [velocityC, timeExp, isNavLocked, targetStar, knownStars]);

  const engineState = useRef({
    ship: { x: 0, y: 0.001, z: -1.0 }, camera: { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 },
    mouse: { isDown: false, lastX: 0, lastY: 0 }, clocks: { universe: 0, ship: 0 }, lastFrameTime: 0
  });

  const bgDust = useRef(Array.from({ length: 4000 }, () => ({
    x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200, alpha: Math.random() * 0.8 + 0.2
  })));

  const searchSimbadAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true); setSearchError("");
    
    try {
      const sq = searchQuery.trim().toLowerCase();
      const localMatch = CORE_STARS.find(s => s.name.toLowerCase().includes(sq));
      if (localMatch) { setTargetStar(localMatch); setIsNavLocked(true); setIsSearching(false); setSearchQuery(""); return; }

      const res = await fetch(`https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?${encodeURIComponent(searchQuery)}`);
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");

      const plxNode = xml.querySelector("plx");
      if (!plxNode) throw new Error("Distance/Parallax not found for this star.");

      const plx = parseFloat(plxNode.textContent || "0");
      const distLY = (1000 / plx) * 3.26156;
      const raRad = parseFloat(xml.querySelector("jradeg")?.textContent || "0") * (Math.PI / 180);
      const decRad = parseFloat(xml.querySelector("jdedeg")?.textContent || "0") * (Math.PI / 180);
      const name = xml.querySelector("oname")?.textContent || searchQuery.toUpperCase();
      
      const newStar: StarData = {
        id: `API-${Date.now()}`, name, class: "API Discovered", color: "#a5b4fc", radius: 1.5, distanceLY: distLY, isCustom: true,
        x: distLY * Math.cos(decRad) * Math.cos(raRad), y: distLY * Math.sin(decRad), z: distLY * Math.cos(decRad) * Math.sin(raRad)
      };
      
      setKnownStars(p => [...p, newStar]); setTargetStar(newStar); setIsNavLocked(true); setSearchQuery("");
    } catch (err: any) { setSearchError(err.message || "Uplink Failed"); } finally { setIsSearching(false); }
  };

  const handleMouse = {
    down: (e: React.MouseEvent) => { engineState.current.mouse = { isDown: true, lastX: e.clientX, lastY: e.clientY }; },
    up: () => { engineState.current.mouse.isDown = false; },
    move: (e: React.MouseEvent) => {
      const m = engineState.current.mouse;
      if (!m.isDown || isNavLocked) return;
      engineState.current.camera.targetYaw += (e.clientX - m.lastX) * 0.003;
      engineState.current.camera.targetPitch = Math.max(-1.57, Math.min(1.57, engineState.current.camera.targetPitch - (e.clientY - m.lastY) * 0.003));
      m.lastX = e.clientX; m.lastY = e.clientY;
    }
  };

  const resetEngine = () => {
    engineState.current.ship = { x: 0, y: 0.001, z: -1.0 };
    engineState.current.camera = { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 };
    engineState.current.clocks = { universe: 0, ship: 0 };
    setVelocityC(0); setTimeExp(0); setIsNavLocked(false); setTargetStar(CORE_STARS[1]);
    setTelemetry({ gamma: 1, universeYears: 0, shipYears: 0, contractedDist: Infinity, etaYears: -1 });
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    let w = canvasRef.current.width = window.innerWidth, h = canvasRef.current.height = window.innerHeight, reqId: number;

    const project = (x: number, y: number, z: number, v_c: number) => {
      const st = engineState.current;
      let dx = x - st.ship.x, dy = y - st.ship.y, dz = z - st.ship.z;
      let tx = dx * Math.cos(st.camera.yaw) - dz * Math.sin(st.camera.yaw);
      let tz = dx * Math.sin(st.camera.yaw) + dz * Math.cos(st.camera.yaw);
      let ty = dy * Math.cos(st.camera.pitch) - tz * Math.sin(st.camera.pitch);
      let fz = dy * Math.sin(st.camera.pitch) + tz * Math.cos(st.camera.pitch);
      if (fz < 0.000001) return null;
      return { sx: w/2 + tx * ((w/2) / fz * (1 - v_c * 0.2)), sy: h/2 + ty * ((w/2) / fz * (1 - v_c * 0.2)), scale: (w/2) / fz * (1 - v_c * 0.2), dist: fz };
    };

    const animate = (timeNow: number) => {
      const st = engineState.current, refs = stateRefs.current;
      if (!st.lastFrameTime) st.lastFrameTime = timeNow;
      
      const dRealSec = (timeNow - st.lastFrameTime) / 1000; 
      st.lastFrameTime = timeNow;
      const dYrs = (dRealSec * Math.pow(10, refs.timeExp)) / SECONDS_PER_YEAR;

      if (refs.lock) {
        let dx = refs.tgt.x - st.ship.x, dy = refs.tgt.y - st.ship.y, dz = refs.tgt.z - st.ship.z;
        st.camera.targetYaw = Math.atan2(dx, dz); st.camera.targetPitch = Math.atan2(dy, Math.hypot(dx, dz));
      }
      st.camera.yaw += (st.camera.targetYaw - st.camera.yaw) * 0.1;
      st.camera.pitch += (st.camera.targetPitch - st.camera.pitch) * 0.1;
      
      ctx.fillStyle = "#020202"; ctx.fillRect(0, 0, w, h);

      const gamma = 1 / Math.sqrt(1 - Math.pow(refs.vel, 2));
      st.clocks.universe += dYrs; st.clocks.ship += dYrs / gamma;
      
      let v = refs.vel, distToTgt = Math.hypot(refs.tgt.x - st.ship.x, refs.tgt.y - st.ship.y, refs.tgt.z - st.ship.z);
      let moveDist = v * dYrs;

      if (refs.lock && v > 0) {
         if (moveDist >= distToTgt - 0.05) {
             moveDist = Math.max(0, distToTgt - 0.05);
             v = 0; 
             setVelocityC(0);
             setTimeExp(0);
         }
      }
      
      if (moveDist > 0) {
        st.ship.x += Math.sin(st.camera.yaw) * Math.cos(st.camera.pitch) * moveDist;
        st.ship.y += Math.sin(st.camera.pitch) * moveDist;
        st.ship.z += Math.cos(st.camera.yaw) * Math.cos(st.camera.pitch) * moveDist;
      }

      let etaYears = -1;
      if (refs.lock && v > 0) etaYears = (distToTgt / gamma) / v;

      if (Math.random() < 0.15) {
        const liveDistances: Record<string, number> = {};
        refs.stars.forEach(s => { liveDistances[s.id] = Math.hypot(s.x - st.ship.x, s.y - st.ship.y, s.z - st.ship.z); });
        setDistances(liveDistances);
        setTelemetry({ gamma, universeYears: st.clocks.universe, shipYears: st.clocks.ship, contractedDist: distToTgt / gamma, etaYears });
