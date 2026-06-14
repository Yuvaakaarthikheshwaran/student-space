"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";

// --- CORE DATA: THE ARCHIVE ---
const PHYSICS_ARTICLES = [
  { id: "2401.001", title: "Quantum Entanglement Dynamics in Non-Abelian Gauge Theories", authors: ["Dr. E. Witten", "H. Ooguri"], field: "Quantum Mechanics", date: "2026-06-12", abstract: "We investigate the real-time entanglement entropy evolution in strongly coupled non-Abelian gauge theories using holographic duality. The results suggest a fundamental limit on information propagation in early-universe quark-gluon plasmas.", citations: 142 },
  { id: "2401.002", title: "Observational Signatures of Primordial Black Hole Mergers", authors: ["S. Hawking (Simulated)", "K. Thorne"], field: "Astrophysics", date: "2026-06-10", abstract: "Analyzing recent LIGO/Virgo datasets, we propose a new statistical framework for isolating gravitational wave signatures originating exclusively from primordial black hole binaries formed in the pre-inflationary epoch.", citations: 89 },
  { id: "2401.003", title: "Room-Temperature Superconductivity in Hydrogen-Rich Clathrates", authors: ["R. Dias", "A. Oganov"], field: "Condensed Matter", date: "2026-06-08", abstract: "We report the observation of zero electrical resistance at 295 K in a novel yttrium-hydrogen clathrate structure stabilized under 1.2 Mbar of pressure. Implications for zero-loss power transmission are discussed.", citations: 315 },
  { id: "2401.004", title: "Topological Defects in String Cosmology", authors: ["L. Susskind"], field: "String Theory", date: "2026-06-05", abstract: "A review of cosmic string formation in the context of recent Brane-world scenarios. We calculate the probability of detecting macroscopic string loops via gravitational lensing of the cosmic microwave background.", citations: 45 },
  { id: "2401.005", title: "Decoherence Rates in Superconducting Qubit Arrays", authors: ["J. Martinis"], field: "Quantum Computing", date: "2026-06-01", abstract: "An experimental analysis of crosstalk and spontaneous decoherence across a 1024-qubit array. We demonstrate a novel error-correction surface code that extends coherence times by two orders of magnitude.", citations: 210 },
  { id: "2401.006", title: "Dark Matter Annihilation in the Galactic Center", authors: ["L. Randall"], field: "Particle Physics", date: "2026-05-28", abstract: "Evaluating the excess gamma-ray emissions from the Milky Way's core. We constrain the mass of weakly interacting massive particles (WIMPs) using latest Fermi-LAT data combined with N-body dark matter simulations.", citations: 178 },
];
const FIELDS = ["All", "Quantum Mechanics", "Astrophysics", "Condensed Matter", "String Theory", "Quantum Computing", "Particle Physics"];

export default function QuantumArchiveTerminal() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState(0);
  
  // Data States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedField, setSelectedField] = useState("All");

  // 1. Instant Data Engine (The Meaning of Function)
  const filteredArticles = useMemo(() => {
    return PHYSICS_ARTICLES.filter((article) => {
      const matchesSearch = 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        article.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.authors.join(", ").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesField = selectedField === "All" || article.field === selectedField;
      return matchesSearch && matchesField;
    });
  }, [searchQuery, selectedField]);

  // 2. 120FPS Direct-DOM Custom Cursor (The Meaning of Interaction)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 16}px, 0)`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 3. Track Scroll
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 4. Gravitational WebGL Grid (The Meaning of Visual Physics)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId: number;

    const spacing = width > 768 ? 35 : 20;
    const points: Array<{ x: number; y: number; originX: number; originY: number }> = [];
    
    // Build the grid
    for (let x = 0; x < width + spacing; x += spacing) {
      for (let y = 0; y < height + spacing; y += spacing) {
        points.push({ x, y, originX: x, originY: y });
      }
    }

    let mouse = { x: width / 2, y: height / 2 };
    const handleCanvasMouse = (e: MouseEvent) => { mouse = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handleCanvasMouse);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Shift colors based on scroll depth
      const scrollPercent = scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1);
      const r = Math.floor(6 + (scrollPercent * 162));   // Cyan to Purple
      const g = Math.floor(182 - (scrollPercent * 97));
      const b = Math.floor(212 + (scrollPercent * 35));
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;

      points.forEach((p) => {
        // Gravitational Repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 300) {
          const force = (300 - dist) / 300;
          p.x += dx * force * 0.08;
          p.y += dy * force * 0.08;
        }

        // Elastic return
        p.x += (p.originX - p.x) * 0.06;
        p.y += (p.originY - p.y) * 0.06;

        ctx.beginPath();
        const size = dist < 300 ? 1.5 + ((300 - dist) / 150) : 1;
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener("resize", handleResize); window.removeEventListener("mousemove", handleCanvasMouse); };
  }, [scrollY]);

  return (
    <main className="relative min-h-screen bg-[#020202] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-100 overflow-x-hidden cursor-none">
      
      {/* LAYER 1: FILM GRAIN */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      ></div>

      {/* LAYER 2: CUSTOM CURSOR */}
      <div 
        ref={cursorRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full bg-white mix-blend-difference pointer-events-none z-[100] transition-transform duration-75 ease-out flex items-center justify-center"
      >
        <div className="w-1 h-1 bg-black rounded-full"></div>
      </div>

      {/* LAYER 3: GRAVITATIONAL WEBGL GRID */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020202_85%)]"></div>
      </div>

      {/* LAYER 4: THE DATA TERMINAL UI */}
      <div className="relative z-10 w-full px-6 py-12 md:px-12 lg:px-24 max-w-[120rem] mx-auto min-h-screen flex flex-col">
        
        {/* HEADER: Philosophical + Functional */}
        <header className="mb-16 pt-10">
          <p className="text-cyan-500 font-mono text-xs uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></span>
            Simulation Override Active
          </p>
          <h1 className="text-6xl md:text-8xl lg:text-[9rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-300 to-neutral-800 leading-[0.85] mb-6 select-none">
            QUANTUM<br />ARCHIVE.
          </h1>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-8">
            <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl font-light leading-relaxed">
              Reality is a low-resolution rendering. We are parsing the underlying source code in real-time.
            </p>
            <div className="flex gap-8 font-mono text-xs bg-white/[0.02] backdrop-blur-md p-4 rounded-xl border border-white/5">
              <div>
                <p className="text-neutral-500 mb-1">LATENCY</p>
                <p className="text-cyan-400">1.02ms</p>
              </div>
              <div>
                <p className="text-neutral-500 mb-1">LOCAL DATA NODES</p>
                <p className="text-white">{PHYSICS_ARTICLES.length} Active</p>
              </div>
            </div>
          </div>
        </header>

        {/* COMMAND CENTER: Glassmorphic Sticky Search */}
        <section className="mb-12 sticky top-6 z-40">
          <div className="bg-[#0a0a0a]/60 border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row gap-4 backdrop-blur-2xl transition-all duration-300 hover:border-cyan-500/30">
            <div className="flex-1 relative group">
              <input
                type="text"
                placeholder="Query abstracts, authors, or quantum states..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-4 px-6 text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500 focus:bg-black transition-all font-mono text-sm cursor-none"
              />
              <div className="absolute right-4 top-4 text-cyan-500/50 font-mono text-xs border border-cyan-500/20 px-2 py-1 rounded bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors">
                SEARCH
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar items-center px-2 cursor-none">
              {FIELDS.map((field) => (
                <button
                  key={field}
                  onClick={() => setSelectedField(field)}
                  className={`whitespace-nowrap px-5 py-3 rounded-xl text-xs font-mono transition-all border cursor-none ${
                    selectedField === field 
                      ? "bg-cyan-900/40 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]" 
                      : "bg-black/40 border-white/5 text-neutral-500 hover:text-white hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  {field}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* DATA GRID: Brutalist Glass Cards */}
        <section className="flex-1 pb-32">
          {filteredArticles.length === 0 ? (
            <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-black/20 backdrop-blur-sm">
              <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">No wavefunctions collapsed. Adjust your query vectors.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredArticles.map((article) => (
                <article 
                  key={article.id} 
                  className="bg-[#050505]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:bg-[#111]/80 hover:border-cyan-500/40 hover:-translate-y-2 transition-all duration-500 flex flex-col group relative overflow-hidden shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <span className="bg-white/5 text-neutral-400 font-mono text-[10px] px-3 py-1.5 rounded-md border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                      REF: {article.id}
                    </span>
                    <span className="text-cyan-500 font-mono text-[10px] uppercase tracking-[0.2em]">
                      {article.field}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4 leading-snug tracking-tight group-hover:text-cyan-50 transition-colors relative z-10">
                    {article.title}
                  </h3>

                  <p className="text-base text-neutral-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                    {article.abstract}
                  </p>

                  <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-3 relative z-10">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-600">AUTHORS:</span>
                      <span className="text-neutral-300 truncate ml-4 text-right">{article.authors.join(", ")}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-neutral-600">IMPACT FACTOR:</span>
                      <span className="text-cyan-400 font-bold tracking-wider">{article.citations} CITATIONS</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
