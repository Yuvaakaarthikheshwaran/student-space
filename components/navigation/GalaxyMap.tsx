import React, { useState } from 'react';
import { StarData } from '../../data/coreStars';

interface GalaxyMapProps {
  stars: StarData[];
  fleet: any[];
  ship: { x: number; y: number; z: number };
  onSelectTarget: (star: StarData) => void;
  onClose: () => void;
}

export default function GalaxyMap({ stars, fleet, ship, onSelectTarget, onClose }: GalaxyMapProps) {
  // Deneb is ~2600 LY away, so a 3000 LY radius fits the current known cluster
  const MAP_RADIUS = 3000; 

  // Converts a 3D space coordinate to a 2D Map Percentage (0% to 100%)
  const toMapCoord = (val: number) => ((val + MAP_RADIUS) / (MAP_RADIUS * 2)) * 100;

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-8"
      onPointerDown={onClose}
    >
      <div 
        className="relative w-full max-w-4xl aspect-square max-h-[85vh] bg-[#020202] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center bg-cyan-950/20 border-b border-cyan-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_#06b6d4]"></div>
            <h2 className="font-bold tracking-widest uppercase text-sm text-cyan-400 m-0">Nav-Computer: Tactical Grid</h2>
          </div>
          <button onClick={onClose} className="text-cyan-500 hover:text-black hover:bg-cyan-500 px-4 py-2 border border-cyan-500 rounded transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer">
            Close Map [M]
          </button>
        </div>

        {/* The Map Canvas */}
        <div className="relative flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-black to-black overflow-hidden">
          
          {/* Grid Lines */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.2) 1px, transparent 1px)', backgroundSize: '10% 10%' }}>
          </div>
          
          {/* Radar Sweep Animation */}
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
               style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(6,182,212,0.1) 100%)', animation: 'spin 4s linear infinite' }}>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 100% { transform: translate(-50%, -50%) rotate(360deg); } }
          `}} />

          {/* Plotting the Stars */}
          {stars.map((star) => {
            const left = toMapCoord(star.x);
            const top = toMapCoord(star.z); // Using Z as the Y-axis on the 2D map
            
            // Don't render if it's way outside the map bounds
            if (left < -5 || left > 105 || top < -5 || top > 105) return null;

            return (
              <div 
                key={star.id} 
                className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{ left: `${left}%`, top: `${top}%` }}
                onClick={() => onSelectTarget(star)}
              >
                <div 
                  className="w-2 h-2 rounded-full transition-transform group-hover:scale-150"
                  style={{ backgroundColor: star.color, boxShadow: `0 0 10px ${star.color}` }}
                />
                <span className="mt-1 text-[8px] text-white/50 font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/50 px-1 rounded">
                  {star.name}
                </span>
              </div>
            );
          })}

          {/* Plotting Live Multiplayer Fleet */}
          {fleet.map((f) => (
            <div 
              key={f.id} 
              className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${toMapCoord(f.x)}%`, top: `${toMapCoord(f.z)}%` }}
            >
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_#a855f7]" />
              <span className="mt-1 text-[8px] text-purple-400 font-mono tracking-widest">AGT-{f.id.substring(0,4)}</span>
            </div>
          ))}

          {/* Plotting Current Ship Location */}
          <div 
            className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
            style={{ left: `${toMapCoord(ship.x)}%`, top: `${toMapCoord(ship.z)}%` }}
          >
            {/* A simple triangle for the ship */}
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-cyan-400 shadow-[0_0_10px_#22d3ee]" />
            <div className="absolute w-6 h-6 border border-cyan-400/50 rounded-full animate-ping" />
          </div>

        </div>
      </div>
    </div>
  );
}
