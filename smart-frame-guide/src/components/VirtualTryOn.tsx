import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceAnalysisResult } from '../types/analysis';
import { type Glasses } from '../data/glassesData';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './VirtualTryOn.css';

interface VirtualTryOnProps {
  imageUrl?: string;
  analysisResult?: FaceAnalysisResult;
  selectedGlasses?: Glasses | string | null;
  onSelectGlasses?: (glasses: Glasses) => void;
  glassesList?: Glasses[];
}

interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseBridge: { x: number; y: number };
  ipd: number;
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  scale: number;
}

interface EmaState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

const EMA_ALPHA = 0.3;

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({
  imageUrl,
  analysisResult,
  selectedGlasses,
  onSelectGlasses,
  glassesList = [],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const faceTrackerRef = useRef<any>(null);
  const faceDetectorRef = useRef<any>(null);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const glassesGroupRef = useRef<THREE.Group | null>(null);
  const glassesModelsRef = useRef<Map<string, THREE.Group>>(new Map());
  const emaStateRef = useRef<EmaState>({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    scale: new THREE.Vector3(1, 1, 1),
  });

  // Face detection via canvas analysis (simple fallback)
  const canvasAnalyzerRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [cameraState, setCameraState] = useState<'idle' | 'initializing' | 'active' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [adjustments, setAdjustments] = useState({
    scale: 100,
    verticalOffset: 0,
  });
  const [loadedModels, setLoadedModels] = useState<Set<string>>(new Set());

  // Cleanup function to prevent memory leaks
  const cleanupThreeJS = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current.forceContextLoss();
    }
    if (sceneRef.current) {
      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }
    glassesModelsRef.current.clear();
  }, []);

  // Initialize Three.js scene with memory optimization
  const initializeScene = useCallback(() => {
    if (!canvasRef.current) return;

    // Clean up previous renderer
    cleanupThreeJS();

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    // No background - transparent so webcam video shows through
    scene.background = null;

    // Camera setup - adjusted for proper glasses viewing similar to WebAR.rocks
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 1.5; // Increased distance for better glasses viewing

    // Renderer setup with reduced quality for memory efficiency
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
      precision: 'lowp',
    });
    renderer.setSize(width, height);
    // Reduce pixel ratio for memory efficiency
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better lighting like WebAR.rocks
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Lighting - improved to match WebAR.rocks approach
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 200, 200); // Higher position for better lighting
    scene.add(directionalLight);

    // Point light for realistic reflections like WebAR.rocks
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(100, 100, 100);
    scene.add(pointLight);

    // Glasses group
    const glassesGroup = new THREE.Group();
    scene.add(glassesGroup);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    glassesGroupRef.current = glassesGroup;

    // Handle window resize
    const handleResize = () => {
      const newWidth = canvasRef.current?.clientWidth || width;
      const newHeight = canvasRef.current?.clientHeight || height;
      if (camera) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
      }
      if (renderer) {
        renderer.setSize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cleanupThreeJS]);

  // Initialize face tracking canvas (simple edge detection fallback)
  const initializeFaceTracking = useCallback(() => {
    try {
      canvasAnalyzerRef.current = document.createElement('canvas');
      canvasAnalyzerRef.current.width = 320;
      canvasAnalyzerRef.current.height = 240;
      canvasCtxRef.current = canvasAnalyzerRef.current.getContext('2d', { willReadFrequently: true })!;

      console.log('Simple face tracking initialized (canvas-based fallback)');
      return true;
    } catch (err) {
      console.warn('Face tracking initialization failed:', err);
      return false;
    }
  }, []);

  // Simple face landmark detection using edge detection on canvas
  const detectFaceLandmarksSimple = useCallback((video: HTMLVideoElement): FaceLandmarks | null => {
    if (!canvasAnalyzerRef.current || !canvasCtxRef.current || !video.videoWidth) {
      return null;
    }

    const ctx = canvasCtxRef.current;
    const canvas = canvasAnalyzerRef.current;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple skin color detection to find face region
    let faceLeft = canvas.width, faceRight = 0, faceTop = canvas.height, faceBottom = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Detect skin-like pixels (simple heuristic)
      if (r > 95 && g > 40 && b > 20 && r > b && r > g && Math.abs(r - g) > 15) {
        const pixelIndex = i / 4;
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);

        faceLeft = Math.min(faceLeft, x);
        faceRight = Math.max(faceRight, x);
        faceTop = Math.min(faceTop, y);
        faceBottom = Math.max(faceBottom, y);
      }
    }

    // If no face detected, return centered default
    if (faceLeft >= faceRight || faceTop >= faceBottom) {
      return {
        leftEye: { x: 0.4, y: 0.35 },
        rightEye: { x: 0.6, y: 0.35 },
        noseBridge: { x: 0.5, y: 0.5 },
        ipd: 0.15,
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
      };
    }

    const faceCenterX = (faceLeft + faceRight) / 2 / canvas.width;
    const faceCenterY = (faceTop + faceBottom) / 2 / canvas.height;
    const faceWidth = (faceRight - faceLeft) / canvas.width;

    // Estimate eye positions based on face region
    const eyeY = faceCenterY - faceWidth * 0.15;
    const leftEyeX = faceCenterX - faceWidth * 0.25;
    const rightEyeX = faceCenterX + faceWidth * 0.25;

    return {
      leftEye: { x: Math.max(0, Math.min(1, leftEyeX)), y: Math.max(0, Math.min(1, eyeY)) },
      rightEye: { x: Math.max(0, Math.min(1, rightEyeX)), y: Math.max(0, Math.min(1, eyeY)) },
      noseBridge: { x: faceCenterX, y: faceCenterY },
      ipd: faceWidth * 0.5,
      rotation: { x: 0, y: 0, z: 0 },
      scale: faceWidth * 2,
    };
  }, []);

  // Create procedural glasses placeholder when .glb not available
  const createPlaceholderGlasses = useCallback(() => {
    const group = new THREE.Group();

    // Create simple glasses frame using primitives
    const frameGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.05);
    const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    group.add(frame);

    // Add simple lenses
    const lensGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const lensMaterial = new THREE.MeshPhongMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6
    });

    const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
    leftLens.position.x = -0.05;
    group.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
    rightLens.position.x = 0.05;
    group.add(rightLens);

    group.scale.set(0.1, 0.1, 0.1);
    return group;
  }, []);

  // Load GLB model with proper scaling from WebAR.rocks approach
  const loadGlassesModel = useCallback(
    async (glassesId: string, modelUrl: string) => {
      if (glassesModelsRef.current.has(glassesId)) {
        return glassesModelsRef.current.get(glassesId)!.clone();
      }

      try {
        const loader = new GLTFLoader();
        // Load from backend caders directory
        const modelPath = `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/glasses_models/${modelUrl}`;
        const gltf = await loader.loadAsync(modelPath);
        const model = gltf.scene;

        // Use WebAR.rocks-inspired scaling: 78x for glasses model
        // Adjust for different model sizes - if model seems too big, use 0.6-0.8
        model.scale.set(1.2, 1.2, 1.2);

        // Apply proper positioning and rotation (like WebAR.rocks does in tweak_faceAccessory)
        model.rotation.set(-0.3, 0, 0); // Slight downward rotation for branches

        glassesModelsRef.current.set(glassesId, model);
        setLoadedModels((prev) => new Set([...prev, glassesId]));

        return model.clone();
      } catch (err) {
        console.warn(`Model file not found for ${glassesId}, using placeholder:`, err);
        // Use placeholder if model not found
        const placeholder = createPlaceholderGlasses();
        glassesModelsRef.current.set(glassesId, placeholder);
        setLoadedModels((prev) => new Set([...prev, glassesId]));
        return placeholder.clone();
      }
    },
    [createPlaceholderGlasses]
  );

  // Update glasses positioning - using WebAR.rocks-inspired proper tracking
  const updateGlassesTransform = useCallback(
    (faceLandmarks: FaceLandmarks | null) => {
      if (!faceLandmarks || !glassesGroupRef.current) return;

      const glassesGroup = glassesGroupRef.current;

      // Calculate center between eyes for glasses positioning
      const eyeCenterX = (faceLandmarks.leftEye.x + faceLandmarks.rightEye.x) / 2;
      const eyeCenterY = (faceLandmarks.leftEye.y + faceLandmarks.rightEye.y) / 2;

      // Normalized coordinates (0-1 -> center coordinates)
      const normalizedX = (eyeCenterX - 0.5) * 2;
      const normalizedY = -(eyeCenterY - 0.5) * 2; // Flip Y for Three.js

      // IPD-based scaling - closer to WebAR.rocks approach
      // Scale glasses proportionally to inter-pupillary distance
      const ipdPixels = Math.hypot(
        faceLandmarks.rightEye.x - faceLandmarks.leftEye.x,
        faceLandmarks.rightEye.y - faceLandmarks.leftEye.y
      );

      // Adjust baseScale based on canvas size relative to face detection resolution
      const baseScale = ipdPixels * 4;
      const adjustedScale = (baseScale * adjustments.scale) / 100 * 0.008;

      // Head rotation from face landmarks
      const headRotationX = faceLandmarks.rotation.x - 0.3; // Slight downward tilt like WebAR.rocks
      const headRotationY = faceLandmarks.rotation.y;
      const headRotationZ = faceLandmarks.rotation.z;

      // Target transforms
      const targetPosition = new THREE.Vector3(
        normalizedX * 0.15,
        normalizedY * 0.15 + (adjustments.verticalOffset / 100) * 0.2,
        -0.2
      );

      const targetRotation = new THREE.Euler(headRotationX, headRotationY, headRotationZ, 'YXZ');
      const targetScale = new THREE.Vector3(adjustedScale, adjustedScale, adjustedScale);

      // Apply EMA smoothing for smoother tracking
      const ema = emaStateRef.current;
      ema.position.lerp(targetPosition, EMA_ALPHA);
      ema.rotation.x = THREE.MathUtils.lerp(ema.rotation.x, targetRotation.x, EMA_ALPHA);
      ema.rotation.y = THREE.MathUtils.lerp(ema.rotation.y, targetRotation.y, EMA_ALPHA);
      ema.rotation.z = THREE.MathUtils.lerp(ema.rotation.z, targetRotation.z, EMA_ALPHA);
      ema.scale.lerp(targetScale, EMA_ALPHA);

      // Apply transforms to glasses group
      glassesGroup.position.copy(ema.position);
      glassesGroup.rotation.order = 'YXZ';
      glassesGroup.rotation.x = ema.rotation.x;
      glassesGroup.rotation.y = ema.rotation.y;
      glassesGroup.rotation.z = ema.rotation.z;
      glassesGroup.scale.copy(ema.scale);
    },
    [adjustments.scale, adjustments.verticalOffset]
  );

  // Process face landmarks
  const processFaceLandmarks = useCallback((detections: any[]): FaceLandmarks | null => {
    if (!detections || detections.length === 0) return null;

    const detection = detections[0];
    if (!detection.landmarks || detection.landmarks.length < 10) return null;

    const landmarks = detection.landmarks;
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseBridge = landmarks[1];

    const ipd = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);

    // Estimate head rotation
    const leftEarLobe = landmarks[234];
    const rightEarLobe = landmarks[454];
    const yaw = Math.atan2(rightEarLobe.x - leftEarLobe.x, 0.1) * 0.5;

    const forehead = landmarks[10];
    const chin = landmarks[152];
    const pitch = Math.atan2(chin.y - forehead.y, 0.1) * 0.3;

    return {
      leftEye,
      rightEye,
      noseBridge,
      ipd,
      rotation: {
        x: pitch,
        y: yaw,
        z: 0,
      },
      scale: ipd * 2,
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraState('initializing');
      setError(null);

      // Initialize scene
      initializeScene();

      // Initialize simple face tracking (always succeeds)
      initializeFaceTracking();

      // Request camera access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Wait for video to be ready before setting active
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current!;
            video.onloadedmetadata = () => {
              video.play()
                .then(() => resolve())
                .catch(reject);
            };
            video.onerror = () => reject(new Error('Video failed to load'));
            // Timeout after 5 seconds
            setTimeout(() => resolve(), 5000);
          });
        }

        console.log('Camera active, video playing');
        setCameraState('active');
      } catch (cameraErr) {
        const message = cameraErr instanceof Error ? cameraErr.message : 'Failed to access camera';
        console.error('Camera error:', message);
        setError(message);
        setCameraState('error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize';
      console.error('Init error:', message);
      setError(message);
      setCameraState('error');
    }
  }, [initializeScene, initializeFaceTracking]);

  // Main rendering loop
  const startRenderingLoop = useCallback(() => {
    const render = () => {
      if (!rendererRef.current) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      try {
        // Try to detect faces using simple canvas-based detection
        if (videoRef.current && videoRef.current.readyState >= 2) {
          if (faceDetectorRef.current) {
            try {
              const detections = faceDetectorRef.current.detectForVideo(videoRef.current, Date.now());
              const faceLandmarks = processFaceLandmarks(detections.detections);
              updateGlassesTransform(faceLandmarks);
            } catch (detectionErr) {
              // Fallback to simple detection
              const simpleLandmarks = detectFaceLandmarksSimple(videoRef.current);
              updateGlassesTransform(simpleLandmarks);
            }
          } else {
            // Use simple canvas-based face detection as fallback
            const simpleLandmarks = detectFaceLandmarksSimple(videoRef.current);
            updateGlassesTransform(simpleLandmarks);
          }
        }

        // Always render the Three.js scene (transparent overlay on top of video)
        if (sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      } catch (err) {
        console.error('Error in rendering loop:', err);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
  }, [processFaceLandmarks, updateGlassesTransform, detectFaceLandmarksSimple]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    cleanupThreeJS();

    // Dispose face detector
    if (faceDetectorRef.current) {
      faceDetectorRef.current = null;
    }
  }, [cleanupThreeJS]);

  // Update glasses model
  const updateSelectedGlasses = useCallback(
    async (frameId: string) => {
      const selectedFrame = glassesList.find((g) => g.id === frameId);
      if (!selectedFrame) return;

      onSelectGlasses?.(selectedFrame);

      if (!glassesGroupRef.current) return;

      try {
        // Clear old model
        while (glassesGroupRef.current.children.length > 0) {
          glassesGroupRef.current.remove(glassesGroupRef.current.children[0]);
        }

        // Load new model - use modelFile from glassesData
        const modelFile = selectedFrame.modelFile || `${frameId}.glb`;
        const model = await loadGlassesModel(frameId, modelFile);
        glassesGroupRef.current.add(model);
      } catch (err) {
        console.error('Failed to update glasses:', err);
        setError('Failed to load glasses model');
      }
    },
    [loadGlassesModel, onSelectGlasses]
  );

  // Initialize camera on mount - only when imageUrl is provided
  // Using a ref to prevent the infinite loop caused by cameraState in deps
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (imageUrl && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startCamera();
    }

    return () => {
      // Only cleanup on unmount
      hasStartedRef.current = false;
      stopCamera();
      setCameraState('idle');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // Start rendering loop when camera becomes active
  useEffect(() => {
    if (cameraState === 'active') {
      startRenderingLoop();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraState, startRenderingLoop]);

  // Load selected glasses - handle both Glasses object and string ID
  useEffect(() => {
    if (selectedGlasses && cameraState === 'active') {
      const glassesId = typeof selectedGlasses === 'string' ? selectedGlasses : selectedGlasses.id;
      updateSelectedGlasses(glassesId);
    }
  }, [selectedGlasses, cameraState, updateSelectedGlasses]);

  const handleAdjustmentChange = (key: 'scale' | 'verticalOffset', value: number) => {
    setAdjustments((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!imageUrl) {
    return <div className="p-4 text-center text-gray-500">No image selected for try-on</div>;
  }

  return (
    <div className="virtual-tryon-container">
      {cameraState === 'error' && (
        <div className="error-alert">
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Video + Canvas container - ALWAYS in DOM so refs work during init */}
      <div className="tryon-active-view">
        <video ref={videoRef} className="tryon-video" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="tryon-canvas" />

        {/* Loading overlay - shown on top during initialization */}
        {cameraState === 'initializing' && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Initializing camera and 3D engine...</p>
          </div>
        )}

        {/* Floating Elements - only when active */}
        {cameraState === 'active' && (
          <>
            <div className="virtual-try-on_vtoFloatingElementsWrapper__ugBOJ">
              {/* Refit Button */}
              <button
                type="button"
                className="base-button_core__2MWzV base-button_pill__Ev5jb base-button_white__bajcz virtual-try-on_refitButton__OxXdc base-button_small__CXjMx"
                onClick={() => setShowSettings(!showSettings)}
                title="Adjust fit"
              >
                <div className="button_loadingOverlay__M7YRG button_small__V9PlX">
                  <div className="wp-inline wp-font-semibold ui-button-text_base__Ve_jy wp-uibutton200">
                    Refit
                  </div>
                </div>
              </button>

              {/* Notifications container */}
              <div role="region" aria-label="Notifications" tabIndex={-1} style={{ pointerEvents: 'none' }}>
                <ol tabIndex={-1} className="base-notification_notificationViewport__nSGPM"></ol>
              </div>

              {/* Favorite Heart Button */}
              <div className="virtual-try-on_vtoFavoriteHeartWrapper__3QMsq">
                <button
                  className="icon-button_core__dCHzh icon-button_circle__SxHMS icon-button_small__j4eMD icon-button_white__2LYb0 favorite-heart-round_button__PhIjF"
                  title="Save to favorites"
                >
                  <svg width="18" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="favorite-heart-round_icon__m7CCc">
                    <path fillRule="evenodd" clipRule="evenodd" d="M11.3297 2.60984C9.92275 2.58315 8.83942 3.76278 8.32638 4.45457C8.17207 4.66264 7.8276 4.66274 7.67318 4.45475C7.15989 3.76344 6.07639 2.58486 4.67013 2.61155H4.59088C2.7556 2.61155 1.33325 4.15435 1.33325 6.03999V6.11713C1.33325 8.00277 3.31452 10.6332 4.67013 12.08C5.30903 12.7614 6.96008 14.1594 7.77482 14.5303C7.91449 14.5939 8.07267 14.5941 8.21268 14.5313C9.03902 14.1605 10.6905 12.7618 11.3297 12.08C12.6853 10.6332 14.6666 8.00106 14.6666 6.11542V6.03828C14.6666 4.15263 13.2442 2.60984 11.409 2.60984H11.3297Z"></path>
                  </svg>
                  <span style={{ position: 'absolute', border: 0, width: 1, height: 1, padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0px, 0px, 0px, 0px)', whiteSpace: 'nowrap', overflowWrap: 'normal' }}>
                    favorite-icon-button
                  </span>
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="settings-panel">
                <h4>Adjust Fit</h4>
                <div className="slider-group">
                  <label>Size</label>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={adjustments.scale}
                    onChange={(e) => handleAdjustmentChange('scale', parseInt(e.target.value))}
                  />
                  <span>{adjustments.scale}%</span>
                </div>
                <div className="slider-group">
                  <label>Position (Up/Down)</label>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={adjustments.verticalOffset}
                    onChange={(e) => handleAdjustmentChange('verticalOffset', parseInt(e.target.value))}
                  />
                  <span>{adjustments.verticalOffset > 0 ? '↑' : '↓'} {Math.abs(adjustments.verticalOffset)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Glasses Selector */}
      <div className="glasses-selector-section">
        <h4>Select Glasses Frame</h4>
        <div className="glasses-grid">
          {glassesList.map((glasses) => (
            <div
              key={glasses.id}
              className={`glasses-card ${selectedGlasses && (typeof selectedGlasses === 'string' ? selectedGlasses : selectedGlasses.id) === glasses.id ? 'active' : ''}`}
              onClick={() => updateSelectedGlasses(glasses.id)}
            >
              <img src={glasses.image} alt={glasses.name} />
              <span>{glasses.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
