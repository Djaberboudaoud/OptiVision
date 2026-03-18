export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong';

export interface Landmark {
  x: number;
  y: number;
  label: string;
}

export interface FaceAnalysisResult {
  faceShape: FaceShape;
  confidence: number;
  landmarks: Landmark[];
  measurements: {
    faceWidth: number;
    faceHeight: number;
    pupillaryDistance: number;
    noseBridgeWidth: number;
  };
  mbs: number; // Minimum Bridge Size in mm
}

export interface AnalysisStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

export type AppStep = 'upload' | 'analysis' | 'recommendations' | 'tryon';
