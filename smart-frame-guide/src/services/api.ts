/**
 * API Service - Communication with FastAPI backend
 * Handles all requests to the Smart Frame Guide backend
 */

// Backend API base URL - adjust based on your environment
// DIRECT_URL="postgresql://postgres.dyhxhwsfsjhcrhpctmft:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export interface PredictionResponse {
  face_shape: 'Heart' | 'Oblong' | 'Oval' | 'Round' | 'Square';
  confidence: number;
  all_probabilities: {
    Heart: number;
    Oblong: number;
    Oval: number;
    Round: number;
    Square: number;
  };
}


export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  model?: {
    status: string;
    model_loaded: boolean;
    model_path: string;
    image_size: number;
  };
}

/**
 * Check if the backend is healthy and model is loaded
 */
export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw new Error('Failed to connect to backend. Make sure it\'s running at ' + API_BASE_URL);
  }
}

/**
 * Upload image and get face shape prediction from backend
 * @param file - Image file to analyze
 * @returns Prediction result with face shape and confidence
 */
export async function predictFaceShape(file: File): Promise<PredictionResponse> {
  // Validate file
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG and PNG are supported.');
  }

  // Check file size (5MB max, same as backend)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/predict-face-shape`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header, browser will set it automatically with boundary
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Prediction failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      console.error('Prediction error:', error.message);
      throw error;
    }
    throw new Error('Unknown error during prediction');
  }
}

/**
 * Convert backend face shape format to frontend format
 * Backend returns "Oval", frontend expects "oval"
 */
export function normalizeBackendFaceShape(
  backendShape: PredictionResponse['face_shape']
): 'heart' | 'oblong' | 'oval' | 'round' | 'square' {
  return backendShape.toLowerCase() as 'heart' | 'oblong' | 'oval' | 'round' | 'square';
}

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Fetch all glasses from the backend
 */
export async function getAllGlasses(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/glasses`);
    if (!response.ok) {
      // Fallback or throw
      console.warn('Failed to fetch from API, falling back to static data if needed');
      return [];
    }
    const data = await response.json();
    return data.glasses || [];
  } catch (error) {
    console.warn('Error fetching glasses:', error);
    return [];
  }
}
