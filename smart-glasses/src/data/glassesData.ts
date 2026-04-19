export interface Glasses {
  id: string;
  name: string;
  brand: string;
  image: string;
  frameType: 'round' | 'square' | 'aviator' | 'cat-eye' | 'rectangle' | 'oval';
  material: string;
  mbsRange: [number, number]; // Min and max MBS in mm
  compatibleFaces: ('oval' | 'round' | 'square' | 'heart' | 'oblong')[];
  price: number;
  colors: string[];
  modelFile?: string; // Path to .glb file (legacy / Jeeliz)
  webarModelFile?: string; // Path to .glb for WebAR.rocks try-on
  jsonModel?: { frame: string; lenses: string }; // Legacy JSON model
}

// No static glasses — all data comes from the backend API
export const glassesCollection: Glasses[] = [];

export const faceShapeDescriptions: Record<string, string> = {
  oval: "Your face has balanced proportions with a gently rounded forehead and chin. Almost all frame styles suit you!",
  round: "Your face has soft angles with similar width and height. Angular frames can add definition and structure.",
  square: "Your face features a strong jawline and broad forehead. Round or oval frames can soften your features.",
  heart: "Your face is wider at the forehead and narrows toward the chin. Bottom-heavy frames balance proportions.",
  oblong: "Your face is longer than it is wide. Wide frames or decorative temples can add width balance.",
};

export const faceShapeRecommendations: Record<string, string[]> = {
  oval: ['rectangle', 'square', 'aviator', 'cat-eye', 'round', 'oval'],
  round: ['rectangle', 'square', 'cat-eye'],
  square: ['round', 'oval', 'aviator'],
  heart: ['round', 'oval', 'aviator', 'rectangle'],
  oblong: ['round', 'square', 'aviator'],
};
