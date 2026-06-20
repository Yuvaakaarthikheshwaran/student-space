export type StarData = { 
  id: string; name: string; x: number; y: number; z: number; color: string; 
  radius: number; distanceLY: number; class: string; temp?: number; 
  mass?: number; isCustom?: boolean; discoveredBy?: string 
};

export const CORE_STARS: StarData[] = [
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
