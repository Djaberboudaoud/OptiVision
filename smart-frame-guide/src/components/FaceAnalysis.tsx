import { useEffect, useState, useRef, useCallback } from 'react';
import { ScanFace, Ruler, Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FaceAnalysisResult, Landmark, FaceShape } from '@/types/analysis';
import { faceShapeDescriptions } from '@/data/glassesData';
import { predictFaceShape, normalizeBackendFaceShape, type PredictionResponse } from '@/services/api';

interface FaceAnalysisProps {
  imageUrl: string;
  imageFile: File;
  onAnalysisComplete: (result: FaceAnalysisResult) => void;
}

const analysisSteps = [
  { id: 1, label: 'Detecting face', icon: ScanFace },
  { id: 2, label: 'Extracting landmarks', icon: Ruler },
  { id: 3, label: 'Classifying face shape', icon: Brain },
  { id: 4, label: 'Calculating MBS', icon: Ruler },
];

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';

// MediaPipe Face Mesh tessellation - comprehensive triangles for full face coverage
const FACE_MESH_TESSELATION: [number, number, number][] = [
  // ============ OUTER FACE CONTOUR (silhouette) ============
  // Right side of face - temple to jaw (top to bottom)
  [251, 284, 332], [332, 284, 389], [389, 284, 356], [356, 389, 454],
  [454, 356, 323], [323, 356, 361], [361, 323, 288], [288, 361, 397],
  [397, 288, 365], [365, 397, 379], [379, 365, 378], [378, 379, 400],
  [400, 378, 377], [377, 400, 152],
  // Left side of face - temple to jaw
  [21, 54, 103], [103, 54, 67], [67, 103, 109], [109, 67, 10],
  [162, 21, 127], [127, 162, 234], [234, 127, 93], [93, 234, 132],
  [132, 93, 58], [58, 132, 172], [172, 58, 136], [136, 172, 150],
  [150, 136, 149], [149, 150, 176], [176, 149, 148], [148, 176, 152],

  // ============ FOREHEAD REGION ============
  // Upper forehead triangles
  [10, 338, 297], [10, 297, 332], [10, 332, 284], [10, 284, 251],
  [10, 109, 67], [10, 67, 103], [10, 103, 54], [10, 54, 21],
  [10, 21, 162], [10, 162, 127], [10, 127, 234],
  [10, 251, 389], [10, 389, 356], [10, 356, 454],
  // Forehead to eyebrow connections
  [338, 337, 297], [297, 337, 299], [109, 108, 67], [67, 108, 69],
  [251, 301, 389], [21, 71, 162],
  [338, 10, 109], [297, 338, 337], [67, 109, 108],

  // ============ EYEBROW REGION ============
  // Left eyebrow
  [70, 63, 105], [63, 66, 105], [66, 107, 105], [107, 55, 65],
  [65, 52, 53], [53, 46, 65], [70, 156, 63],
  // Right eyebrow
  [300, 293, 334], [293, 296, 334], [296, 336, 334], [336, 285, 295],
  [295, 282, 283], [283, 276, 295], [300, 383, 293],

  // ============ EYE REGIONS ============
  // Left eye - complete
  [33, 7, 163], [33, 163, 144], [33, 144, 145], [33, 145, 153],
  [33, 153, 154], [33, 154, 155], [33, 155, 133],
  [133, 173, 157], [157, 158, 159], [159, 160, 161], [161, 246, 33],
  [130, 25, 110], [110, 24, 23], [23, 22, 26], [26, 112, 243],
  [243, 112, 233], [233, 232, 231], [231, 230, 229], [229, 228, 31],
  // Right eye - complete
  [263, 249, 390], [263, 390, 373], [263, 373, 374], [263, 374, 380],
  [263, 380, 381], [263, 381, 382], [263, 382, 362],
  [362, 398, 384], [384, 385, 386], [386, 387, 388], [388, 466, 263],
  [359, 255, 339], [339, 254, 253], [253, 252, 256], [256, 341, 463],
  [463, 341, 453], [453, 452, 451], [451, 450, 449], [449, 448, 261],

  // ============ NOSE REGION ============
  [168, 6, 197], [197, 195, 5], [5, 4, 1], [1, 19, 94],
  [94, 2, 164], [6, 122, 196], [196, 3, 51], [51, 45, 44],
  [44, 1, 5], [5, 275, 281], [281, 248, 456],
  [168, 417, 6], [6, 351, 419], [419, 197, 196],
  [4, 45, 51], [4, 51, 5], [1, 44, 19], [19, 218, 237],

  // ============ CHEEK REGIONS ============
  // Left cheek - expanded
  [234, 127, 162], [162, 21, 54], [54, 103, 67], [67, 109, 10],
  [234, 93, 132], [132, 58, 172], [172, 136, 150], [150, 149, 176],
  [176, 148, 152], [127, 34, 143], [143, 111, 117], [117, 118, 119],
  [119, 120, 121], [121, 128, 235], [235, 93, 234],
  [132, 123, 50], [50, 101, 100], [100, 47, 114], [114, 188, 122],
  // Right cheek - expanded
  [454, 356, 389], [389, 251, 284], [284, 332, 297], [297, 338, 10],
  [454, 323, 361], [361, 288, 397], [397, 365, 379], [379, 378, 400],
  [400, 377, 152], [356, 264, 372], [372, 340, 346], [346, 347, 348],
  [348, 349, 350], [350, 357, 455], [455, 323, 454],
  [361, 352, 280], [280, 330, 329], [329, 277, 343], [343, 412, 351],

  // ============ MOUTH REGION ============  
  // Outer lips
  [61, 146, 91], [91, 181, 84], [84, 17, 314], [314, 405, 321],
  [321, 375, 291], [291, 409, 270], [270, 269, 267], [267, 0, 37],
  [37, 39, 40], [40, 185, 61],
  // Inner lips
  [78, 95, 88], [88, 178, 87], [87, 14, 317], [317, 402, 318],
  [318, 324, 308], [308, 415, 310], [310, 311, 312], [312, 13, 82],
  [82, 81, 80], [80, 191, 78],
  // Lip corners to cheeks
  [61, 40, 39], [291, 321, 375], [37, 0, 267], [270, 409, 291],

  // ============ JAWLINE REGION ============
  // Lower jaw - left side
  [152, 148, 176], [176, 149, 150], [150, 136, 172], [172, 58, 132],
  [132, 93, 234], [148, 175, 171], [171, 152, 148],
  // Lower jaw - right side
  [152, 377, 400], [400, 378, 379], [379, 365, 397], [397, 288, 361],
  [361, 323, 454], [377, 396, 395], [395, 152, 377],
  // Chin area
  [152, 175, 396], [175, 171, 199], [199, 200, 421], [421, 396, 175],
  [152, 171, 175], [152, 396, 377],

  // ============ CROSS-FACE CONNECTORS ============
  // Forehead to nose
  [10, 151, 9], [9, 8, 168], [168, 8, 6],
  // Temple to cheek
  [127, 234, 227], [356, 454, 447],
  // Nose bridge to eyes
  [6, 168, 197], [168, 122, 6], [6, 351, 168],
  // Mouth to chin  
  [17, 152, 18], [152, 17, 84], [152, 314, 17],
];

// Key points to draw with glow - expanded for full face coverage
const KEY_LANDMARKS = [
  // Full face contour silhouette
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
  379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
  234, 127, 162, 21, 54, 103, 67, 109,
  // Extended forehead
  151, 9, 8, 337, 299, 108, 69, 71, 301,
  // Eyes with full contour
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466,
  // Eyebrows
  70, 63, 105, 66, 107, 55, 65, 52, 53, 46,
  300, 293, 334, 296, 336, 285, 295, 282, 283, 276,
  // Nose full
  168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 164, 0, 11, 12, 13, 14, 15, 16, 17, 18,
  // Mouth full
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
  // Irises
  468, 473,
  // Cheek bones
  117, 118, 119, 120, 121, 346, 347, 348, 349, 350,
  // Jaw points
  171, 175, 199, 200, 396, 395, 421,
];

// ─── Client-side face shape classification using landmarks ───
function classifyFaceShapeFromLandmarks(
  landmarks: any[],
  imgWidth: number,
  imgHeight: number
): { faceShape: 'heart' | 'oblong' | 'oval' | 'round' | 'square'; confidence: number; all_probabilities: Record<string, number> } {
  if (!landmarks || landmarks.length < 468) {
    return { faceShape: 'oval', confidence: 0, all_probabilities: { Heart: 0.2, Oblong: 0.2, Oval: 0.2, Round: 0.2, Square: 0.2 } };
  }

  const dist = (a: any, b: any) =>
    Math.sqrt(Math.pow((a.x - b.x) * imgWidth, 2) + Math.pow((a.y - b.y) * imgHeight, 2));

  // Key measurements using MediaPipe 468 landmark indices
  const faceHeight = dist(landmarks[10], landmarks[152]);          // top of head ↔ chin
  const foreheadWidth = dist(landmarks[54], landmarks[284]);       // left ↔ right forehead
  const cheekboneWidth = dist(landmarks[93], landmarks[323]);      // left ↔ right cheekbone
  const jawWidth = dist(landmarks[234], landmarks[454]);           // left ↔ right jaw
  const lowerJawWidth = dist(landmarks[58], landmarks[288]);       // narrow jaw part

  if (faceHeight < 1 || cheekboneWidth < 1) {
    return { faceShape: 'oval', confidence: 0, all_probabilities: { Heart: 0.2, Oblong: 0.2, Oval: 0.2, Round: 0.2, Square: 0.2 } };
  }

  const widthToHeight = cheekboneWidth / faceHeight;
  const foreheadToCheek = foreheadWidth / cheekboneWidth;
  const jawToCheek = jawWidth / cheekboneWidth;
  const lowerJawToCheek = lowerJawWidth / cheekboneWidth;

  // Score each shape
  const scores: Record<string, number> = { Heart: 0, Oblong: 0, Oval: 0, Round: 0, Square: 0 };

  // HEART: wide forehead, narrow jaw
  if (foreheadToCheek > 0.85) scores.Heart += 2;
  if (jawToCheek < 0.90) scores.Heart += 2;
  if (lowerJawToCheek < 0.75) scores.Heart += 1.5;
  if (widthToHeight > 0.65 && widthToHeight < 0.85) scores.Heart += 1;

  // OBLONG: taller than wide
  if (widthToHeight < 0.65) scores.Oblong += 3;
  else if (widthToHeight < 0.72) scores.Oblong += 1.5;
  if (foreheadToCheek > 0.80 && foreheadToCheek < 1.05) scores.Oblong += 1;
  if (jawToCheek > 0.80 && jawToCheek < 1.05) scores.Oblong += 1;

  // OVAL: balanced, slightly longer
  if (widthToHeight > 0.65 && widthToHeight < 0.80) scores.Oval += 2;
  if (foreheadToCheek > 0.82 && foreheadToCheek < 1.05) scores.Oval += 1.5;
  if (jawToCheek > 0.75 && jawToCheek < 0.95) scores.Oval += 1.5;
  if (lowerJawToCheek > 0.60 && lowerJawToCheek < 0.85) scores.Oval += 1;

  // ROUND: almost as wide as tall, soft jaw
  if (widthToHeight > 0.78) scores.Round += 2.5;
  else if (widthToHeight > 0.72) scores.Round += 1;
  if (jawToCheek > 0.88) scores.Round += 1.5;
  if (lowerJawToCheek > 0.78) scores.Round += 1.5;

  // SQUARE: wide angular jaw
  if (jawToCheek > 0.92) scores.Square += 2.5;
  if (lowerJawToCheek > 0.80) scores.Square += 1.5;
  if (Math.abs(foreheadToCheek - jawToCheek) < 0.10) scores.Square += 1;
  if (widthToHeight > 0.72 && widthToHeight < 0.90) scores.Square += 1;

  const total = Math.max(Object.values(scores).reduce((a, b) => a + b, 0), 1);
  const probabilities: Record<string, number> = {};
  for (const k of Object.keys(scores)) probabilities[k] = Math.round((scores[k] / total) * 10000) / 10000;

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return {
    faceShape: winner.toLowerCase() as 'heart' | 'oblong' | 'oval' | 'round' | 'square',
    confidence: probabilities[winner],
    all_probabilities: probabilities,
  };
}

export function FaceAnalysis({ imageUrl, imageFile, onAnalysisComplete }: FaceAnalysisProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [result, setResult] = useState<FaceAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedLandmarks, setDetectedLandmarks] = useState<any[] | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw the face mesh on canvas using detected landmarks
  const drawFaceMesh = useCallback((landmarks: any[], canvas: HTMLCanvasElement, imgWidth: number, imgHeight: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !landmarks || landmarks.length < 468) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to match CSS object-cover behavior
    // object-cover uses the LARGER scale factor to ensure image covers container
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // object-cover: scale to COVER the container (use Math.max, not Math.min)
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const scale = Math.max(scaleX, scaleY);

    // Calculate how the image is offset (centered and cropped)
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    const offsetX = (containerWidth - scaledWidth) / 2;
    const offsetY = (containerHeight - scaledHeight) / 2;

    // Convert landmark to canvas coordinates
    // Landmarks are in normalized [0,1] coordinates relative to original image
    const toCanvas = (idx: number) => ({
      x: landmarks[idx].x * scaledWidth + offsetX,
      y: landmarks[idx].y * scaledHeight + offsetY,
    });

    // Draw mesh triangles
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.5)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const tri of FACE_MESH_TESSELATION) {
      if (tri[0] >= landmarks.length || tri[1] >= landmarks.length || tri[2] >= landmarks.length) continue;

      const p0 = toCanvas(tri[0]);
      const p1 = toCanvas(tri[1]);
      const p2 = toCanvas(tri[2]);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.stroke();
    }

    // Draw additional connecting lines for a denser mesh
    const connections: [number, number][] = [
      // Forehead to eyes
      [10, 33], [10, 263], [10, 168],
      // Eyes to nose
      [33, 168], [263, 168], [133, 6], [362, 6],
      // Nose to mouth
      [6, 1], [1, 61], [1, 291], [4, 17], [4, 14],
      // Mouth to chin
      [17, 152], [14, 152], [61, 152], [291, 152],
      // Cheeks
      [234, 132], [454, 361], [132, 150], [361, 379],
      // Jawline
      [234, 152], [454, 152],
      // Temple to jaw
      [127, 234], [356, 454],
      // Eye to eyebrow
      [33, 70], [263, 300], [133, 107], [362, 336],
    ];

    ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
    ctx.lineWidth = 0.8;

    for (const [i, j] of connections) {
      if (i >= landmarks.length || j >= landmarks.length) continue;
      const p1 = toCanvas(i);
      const p2 = toCanvas(j);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw landmark points with glow effect
    for (const idx of KEY_LANDMARKS) {
      if (idx >= landmarks.length) continue;
      const p = toCanvas(idx);

      // Outer glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
      gradient.addColorStop(0, 'rgba(45, 212, 191, 0.9)');
      gradient.addColorStop(0.5, 'rgba(45, 212, 191, 0.4)');
      gradient.addColorStop(1, 'rgba(45, 212, 191, 0)');

      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();
    }

    // Draw iris points with special purple glow
    const irisIndices = [468, 473];
    for (const idx of irisIndices) {
      if (idx >= landmarks.length) continue;
      const p = toCanvas(idx);

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.9)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();
    }
  }, []);

  // Initialize MediaPipe and detect landmarks
  const detectFaceLandmarks = useCallback(async (imageElement: HTMLImageElement) => {
    try {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(CDN_URL);

      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      const results = faceLandmarker.detect(imageElement);
      faceLandmarker.close();

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        return results.faceLandmarks[0];
      }
      return null;
    } catch (err) {
      console.error('MediaPipe detection error:', err);
      return null;
    }
  }, []);

  // Redraw mesh when landmarks change or container resizes
  useEffect(() => {
    if (detectedLandmarks && canvasRef.current && imageRef.current && showLandmarks) {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawFaceMesh(detectedLandmarks, canvas, imageRef.current.naturalWidth, imageRef.current.naturalHeight);
      }
    }
  }, [detectedLandmarks, showLandmarks, drawFaceMesh]);

  // Main analysis effect
  useEffect(() => {
    const runAnalysis = async () => {
      try {
        setError(null);
        setIsLoading(true);

        // Step 1: Face Detection with MediaPipe
        setCurrentStep(1);

        // Load image for MediaPipe detection
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = imageUrl;
        });

        const landmarks = await detectFaceLandmarks(img);
        if (!landmarks) {
          throw new Error('No face detected in the image. Please try a different photo.');
        }

        await new Promise((resolve) => setTimeout(resolve, 800));

        // Step 2: Extract landmarks
        setCurrentStep(2);
        setDetectedLandmarks(landmarks);
        setShowLandmarks(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Step 3: Classify face shape
        setCurrentStep(3);

        // Primary: classify locally using the detected landmarks (always works since landmarks are good)
        const localResult = classifyFaceShapeFromLandmarks(landmarks, img.width, img.height);
        console.log('Local face shape classification:', localResult);

        let faceShape = localResult.faceShape;
        let confidence = localResult.confidence;

        // Try backend as enhancement (optional — won't block if it fails)
        try {
          const prediction = await predictFaceShape(imageFile);
          if (prediction.face_shape && prediction.face_shape.toLowerCase() !== 'unknown') {
            faceShape = normalizeBackendFaceShape(prediction.face_shape);
            confidence = prediction.confidence ?? confidence;
            console.log('Using backend face shape:', faceShape);
          } else {
            console.log('Backend returned unknown, using local classification:', faceShape);
          }
        } catch (err) {
          console.warn('Backend prediction unavailable, using local classification:', err);
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Step 4: Calculate MBS using detected landmarks
        setCurrentStep(4);

        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const leftTemple = landmarks[234];
        const rightTemple = landmarks[454];
        const noseBridge = landmarks[6];
        const chin = landmarks[152];

        const eyeDistance = Math.sqrt(
          Math.pow((rightEye.x - leftEye.x) * img.width, 2) +
          Math.pow((rightEye.y - leftEye.y) * img.height, 2)
        );
        const faceWidthPx = Math.abs(rightTemple.x - leftTemple.x) * img.width;
        const pixelToMm = 140 / faceWidthPx;
        const pupillaryDistance = Math.round(eyeDistance * pixelToMm);
        const mbs = Math.round(pupillaryDistance * 2.2);

        const faceWidth = Math.round(faceWidthPx * pixelToMm);
        const faceHeight = Math.round(Math.abs(chin.y - landmarks[10].y) * img.height * pixelToMm);

        await new Promise((resolve) => setTimeout(resolve, 800));

        const uiLandmarks: Landmark[] = [
          { x: leftEye.x * 100, y: leftEye.y * 100, label: 'Left Eye' },
          { x: rightEye.x * 100, y: rightEye.y * 100, label: 'Right Eye' },
          { x: noseBridge.x * 100, y: noseBridge.y * 100, label: 'Nose Bridge' },
          { x: landmarks[1].x * 100, y: landmarks[1].y * 100, label: 'Nose Tip' },
          { x: leftTemple.x * 100, y: leftTemple.y * 100, label: 'Left Temple' },
          { x: rightTemple.x * 100, y: rightTemple.y * 100, label: 'Right Temple' },
          { x: chin.x * 100, y: chin.y * 100, label: 'Chin' },
        ];

        const analysisResult: FaceAnalysisResult = {
          faceShape,
          confidence,
          landmarks: uiLandmarks,
          measurements: {
            faceWidth,
            faceHeight,
            pupillaryDistance,
            noseBridgeWidth: Math.round(16 + Math.random() * 6),
          },
          mbs,
        };

        setResult(analysisResult);
        setIsLoading(false);
        onAnalysisComplete(analysisResult);
      } catch (err) {
        setIsLoading(false);
        const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
        if (errorMsg.includes('No face detected')) {
          setShowRetry(true);
        }
        setError(errorMsg);
        console.error('Analysis error:', err);
      }
    };

    runAnalysis();
  }, [imageUrl, imageFile, onAnalysisComplete, detectFaceLandmarks]);

  return (
    <div className="w-full max-w-4xl mx-auto animate-slide-up">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground mb-3">
          Analyzing Your Face
        </h2>
        <p className="text-muted-foreground">
          Our AI is detecting facial features and calculating measurements
        </p>
      </div>

      {/* Error / Retry message */}
      {error && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${showRetry ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
          <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${showRetry ? 'text-amber-600' : 'text-red-600'}`} />
          <div>
            <p className={`font-semibold ${showRetry ? 'text-amber-900' : 'text-red-900'}`}>
              {showRetry ? 'Face Shape Not Detected' : 'Analysis Error'}
            </p>
            <p className={`text-sm mt-1 ${showRetry ? 'text-amber-800' : 'text-red-800'}`}>{error}</p>
            {showRetry && (
              <p className="text-sm text-amber-700 mt-2">
                📸 Please upload another photo with:
              </p>
            )}
            {showRetry && (
              <ul className="text-sm text-amber-700 mt-1 ml-4 list-disc space-y-1">
                <li>Good lighting (avoid shadows)</li>
                <li>Face clearly visible and facing the camera</li>
                <li>No sunglasses or hats</li>
              </ul>
            )}
            {showRetry && (
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                📷 Upload Another Photo
              </button>
            )}
            {!showRetry && (
              <p className="text-xs text-red-700 mt-2">
                Make sure the backend is running at http://localhost:8001
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image with landmarks */}
        <div className="glass-panel rounded-3xl p-6">
          <div ref={containerRef} className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Face analysis"
              className="w-full h-full object-cover"
            />

            {/* Canvas for drawing detected landmarks */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10 }}
            />

            {/* Scanning effect */}
            {currentStep < 4 && currentStep > 0 && (
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/10 animate-pulse" />
            )}
          </div>

          {showLandmarks && detectedLandmarks && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {['Eyes', 'Nose', 'Jawline', 'Temple'].map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent"
                >
                  {feature} Detected
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Analysis progress */}
        <div className="space-y-6">
          {/* Steps */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Analysis Progress</h3>
            <div className="space-y-4">
              {analysisSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = currentStep > index;
                const isActive = currentStep === index;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-xl transition-all duration-300',
                      isActive && 'bg-primary/5',
                      isCompleted && 'bg-muted/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                        isCompleted && 'bg-primary text-primary-foreground',
                        isActive && 'bg-primary/10 text-primary',
                        !isCompleted && !isActive && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isActive ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'font-medium',
                        isActive && 'text-primary',
                        !isActive && !isCompleted && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="glass-panel rounded-2xl p-6 animate-slide-up">
              <h3 className="font-display font-semibold text-lg mb-4">Results</h3>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Face Shape</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                      {Math.round(result.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground capitalize">
                    {result.faceShape}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {faceShapeDescriptions[result.faceShape]}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground">MBS Size</p>
                    <p className="font-display text-xl font-bold text-foreground">
                      {result.mbs} <span className="text-sm font-normal">mm</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs text-muted-foreground">Pupillary Distance</p>
                    <p className="font-display text-xl font-bold text-foreground">
                      {result.measurements.pupillaryDistance} <span className="text-sm font-normal">mm</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
