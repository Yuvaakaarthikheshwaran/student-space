"use client";
import React, { useEffect, useRef, useState } from "react";

type StarData = { id: string; name: string; x: number; y: number; z: number; color: string; radius: number; distanceLY: number; isCustom?: boolean };

const CORE_STARS: StarData[] = [
  { id: "SOL", name: "Sun (Sol)", x: 0, y: 0, z: 0, color: "#fef08a", radius: 1, distanceLY: 0 },
  { id: "CEN", name: "Alpha Centauri", x: 4.37, y: 0.0, z: 0.0, color: "#fde047", radius: 1.1, distanceLY: 4.37 },
  { id: "SIR", name: "Sirius A", x: -2.0, y: -8.0, z: -2.5, color: "#cffafe", radius: 1.7, distanceLY: 8.6 }
];

export default function DeepSpaceEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [velocityC, setVelocityC] = useState(0); 
  const [timeMultiplier, setTimeMultiplier] = useState(1); 
  const [telemetry, setTelemetry] = useState({ gamma: 1, universeYears: 0, shipYears: 0, contractedDist: 0 });
  const [knownStars, setKnownStars] = useState<StarData[]>(CORE_STARS);
  const [targetStar, setTargetStar] = useState<StarData>(CORE_STARS[1]); 
  const [isNavLocked, setIsNavLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const velRef = useRef(velocityC);
  const timeRef = useRef(timeMultiplier);
  const navLockRef = useRef(isNavLocked);
  const targetStarRef = useRef(targetStar);
  const knownStarsRef = useRef(knownStars);
  
  useEffect(() => { velRef.current = velocityC; }, [velocityC]);
  useEffect(() => { timeRef.current = timeMultiplier; }, [timeMultiplier]);
  useEffect(() => { navLockRef.current = isNavLocked; }, [isNavLocked]);
  useEffect(() => { targetStarRef.current = targetStar; }, [targetStar]);
  useEffect(() => { knownStarsRef.current = knownStars; }, [knownStars]);

  const engineState = useRef({
    ship: { x: 0, y: 0.001, z: -1.0 }, 
    camera: { pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 },
    mouse: { isDown: false, lastX: 0, lastY: 0 },
    clocks: { universe: 0, ship: 0 }
  });

  const bgDust = useRef(Array.from({ length: 2500 }, () => ({
    x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100, z: (Math.random() - 0.5) * 100,
    baseAlpha: Math.random() * 0.8 + 0.2
  })));

  const searchSimbadAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError("");

    try {
      const safeQuery = searchQuery.trim().replace(/'/g, "''");
      const adql = `SELECT TOP 1 basic.MAIN_ID, basic.ra, basic.dec, parallaxes.plx FROM basic JOIN parallaxes ON basic.oid = parallaxes.oidref JOIN ident ON basic.oid = ident.oidref WHERE LOWER(ident.id) LIKE LOWER('%${safeQuery}%') AND parallaxes.plx > 0`;
      const url = `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=json&query=${encodeURIComponent(adql)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.error || !data.data || data.data.length === 0) {
        setSearchError("Star not found in database.");
        return setIsSearching(false);
      }

      const starData = data.data[0];
      const name = String(starData[0]).replace(/b'/g, '').replace(/'/g, '').trim();
      const plx = parseFloat(starData[3]);
      const distLY = (1000 / plx) * 3.26156;
      const raRad = parseFloat(starData[1]) * (Math.PI / 180);
      const decRad = parseFloat(starData[2]) * (Math.PI / 180);

      const x = distLY * Math
