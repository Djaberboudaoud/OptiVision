import { getApiBaseUrl } from './api';

export interface SavedScanData {
  faceShape: string;
  confidence: number;
  mbs: number;
  pupillaryDistance: number;
  faceWidth: number;
  faceHeight: number;
  photoDataUrl: string;
}

export async function saveScanToBackend(scanData: SavedScanData): Promise<any> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/saved-scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        face_shape: scanData.faceShape,
        confidence: scanData.confidence,
        mbs: scanData.mbs,
        pupillary_distance: scanData.pupillaryDistance,
        face_width: scanData.faceWidth,
        face_height: scanData.faceHeight,
        photo_data_url: scanData.photoDataUrl,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save scan: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving scan to backend:', error);
    throw error;
  }
}
