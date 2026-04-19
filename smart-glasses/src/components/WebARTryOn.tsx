/**
 * WebARTryOn — Production WebAR glasses virtual try-on component.
 *
 * Architecture:
 *  ┌──────────────────────────────────┐
 *  │  React Three Fiber <Canvas>      │  z-index: 2  (3D overlay)
 *  │   ├─ ThreeGrabber               │  bridges R3F ↔ mirrorHelper
 *  │   ├─ Suspense → VTOModelContainer│  GLB model loader + face follow
 *  │   └─ EffectComposer → Bloom     │  post-processing
 *  ├──────────────────────────────────┤
 *  │  <canvas> (WebARRocksFace)       │  z-index: 1  (video feed)
 *  └──────────────────────────────────┘
 *
 * Lifecycle:
 *  • init() on mount → destroy() on unmount (full cleanup)
 *  • Visibility pause: auto-pauses when tab becomes hidden
 *  • Controlled model switching: parent passes GLB URL, component reacts
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// @ts-ignore — vendor JS, no types
import mirrorHelper from '../contrib/WebARRocksFace/helpers/WebARRocksMirror.js';

import './WebARTryOn.css';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface WebARTryOnProps {
    /** URL or public path to the GLB model to display */
    glbModelUrl?: string;
    /** Called when user clicks Close */
    onClose?: () => void;
    /** Called with a canvas data-URL after capture */
    onCapture?: (dataUrl: string) => void;
    /** Additional className on root container */
    className?: string;
    /** Override branch bending settings */
    glassesBranches?: {
        fadingZ?: number;
        fadingTransition?: number;
        bendingAngle?: number;
        bendingZ?: number;
    };
}

// ────────────────────────────────────────────────────────────────
// Module-level ref so ThreeGrabber can access the R3F renderer
// ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _threeFiber: any = null;

// ────────────────────────────────────────────────────────────────
// Compute canvas sizing (fullscreen aspect-aware)
// ────────────────────────────────────────────────────────────────

function computeSizing() {
    const height = window.innerHeight;
    const wWidth = window.innerWidth;
    const width = Math.min(wWidth, height);
    const top = 0;
    const left = (wWidth - width) / 2;
    return { width, height, top, left };
}

// ────────────────────────────────────────────────────────────────
// Inner component: ThreeGrabber
// Invisible — bridges React Three Fiber to WebARRocksMirror
// ────────────────────────────────────────────────────────────────

interface ThreeGrabberProps {
    sizing: ReturnType<typeof computeSizing>;
    lighting: Record<string, unknown>;
}

const ThreeGrabber: React.FC<ThreeGrabberProps> = ({ sizing, lighting }) => {
    const threeFiber = useThree();
    _threeFiber = threeFiber;

    useFrame(() => {
        mirrorHelper.update(sizing, threeFiber.camera);
    });

    mirrorHelper.set_lighting(threeFiber.gl, threeFiber.scene, lighting);

    return null;
};

// ────────────────────────────────────────────────────────────────
// Inner component: VTOModelContainer
// Loads a GLB, applies pose / material tweaks / face following
// ────────────────────────────────────────────────────────────────

interface VTOModelContainerProps {
    sizing: ReturnType<typeof computeSizing>;
    GLTFModel: string;
    faceIndex: number;
    glassesBranches: NonNullable<WebARTryOnProps['glassesBranches']>;
}

const VTOModelContainer: React.FC<VTOModelContainerProps> = ({
    sizing,
    GLTFModel,
    faceIndex,
    glassesBranches,
}) => {
    const objRef = useRef<THREE.Object3D>(null!);

    useEffect(() => {
        // Clean previous face slots before setting up new ones.
        // IMPORTANT: This must be inside useEffect, NOT in the component body,
        // because clean() destroys face tracking slots. If called on every
        // re-render (e.g. when parent state like isInitialized changes),
        // it would break tracking permanently since set_faceFollower only
        // runs when these specific deps change.
        mirrorHelper.clean();

        const threeObject3DParent = objRef.current;
        if (!threeObject3DParent || threeObject3DParent.children.length === 0) return;
        const threeObject3D = threeObject3DParent.children[0];
        if (!threeObject3D || threeObject3D.children.length === 0) return;
        const model = threeObject3D.children[0];

        mirrorHelper.set_glassesPose(model);
        mirrorHelper.tweak_materials(model, glassesBranches);
        mirrorHelper.set_faceFollower(threeObject3DParent, threeObject3D, faceIndex);
    }, [GLTFModel, sizing, faceIndex, glassesBranches]);

    const gltf = useLoader(GLTFLoader, GLTFModel);
    const model = useMemo(() => gltf.scene.clone(), [gltf]);

    return (
        <object3D ref={objRef}>
            <object3D>
                <primitive object={model} />
            </object3D>
        </object3D>
    );
};

// ────────────────────────────────────────────────────────────────
// Debug cube (shown while model is loading via Suspense)
// ────────────────────────────────────────────────────────────────

const DebugCube: React.FC<{ size?: number }> = ({ size = 1 }) => (
    <mesh name="debugCube">
        <boxGeometry args={[size, size, size]} />
        <meshNormalMaterial />
    </mesh>
);

// ────────────────────────────────────────────────────────────────
// Default settings
// ────────────────────────────────────────────────────────────────

const DEFAULT_BRANCHES = {
    fadingZ: -0.9,
    fadingTransition: 0.6,
    bendingAngle: 5,
    bendingZ: 0,
} as const;

const DEFAULT_BLOOM = {
    threshold: 0.5,
    intensity: 8,
    kernelSizeLevel: 0,
    computeScale: 0.5,
    luminanceSmoothing: 0.7,
} as const;

// ────────────────────────────────────────────────────────────────
// Main Component: WebARTryOn
// ────────────────────────────────────────────────────────────────

const WebARTryOn: React.FC<WebARTryOnProps> = ({
    glbModelUrl,
    onClose,
    onCapture,
    className = '',
    glassesBranches: glassesBranchesProp,
}) => {
    // ─── State ──────────────────────────────────
    const [sizing, setSizing] = useState(computeSizing);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The active GLB URL — controlled from parent via props
    const activeModel = glbModelUrl || '/models/webar/glasses1.glb';

    // ─── Refs ───────────────────────────────────
    const canvasFaceRef = useRef<HTMLCanvasElement>(null!);
    const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    // ─── Merged branch settings ─────────────────
    const glassesBranches = useMemo(
        () => ({ ...DEFAULT_BRANCHES, ...glassesBranchesProp }),
        [glassesBranchesProp]
    );

    // ─── Lighting config (uses public env map) ──
    const lighting = useMemo(
        () => ({
            envMap: '/envmaps/venice_sunset_512.hdr',
            pointLightIntensity: 0.8,
            pointLightY: 200,
            hemiLightIntensity: 0,
        }),
        []
    );

    // ─── Resize handler (debounced) ─────────────
    const handleResize = useCallback(() => {
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = setTimeout(() => {
            resizeTimerRef.current = null;
            if (mountedRef.current) setSizing(computeSizing());
        }, 200);
    }, []);

    // Sync mirrorHelper.resize with sizing state
    useEffect(() => {
        if (isInitialized) {
            mirrorHelper.resize();
        }
    }, [sizing, isInitialized]);

    // ─── Init / Destroy lifecycle ───────────────
    useEffect(() => {
        mountedRef.current = true;

        // The neural net JSON is loaded from public/ at runtime
        // We fetch it dynamically so it stays out of the bundle
        const nnUrl = '/neuralNets/NN_GLASSES_9.json';

        fetch(nnUrl)
            .then((r) => r.json())
            .then((NN) => {
                if (!mountedRef.current) return;

                return mirrorHelper.init({
                    NN,
                    scanSettings: { threshold: 0.8 },
                    landmarksStabilizerSpec: {
                        beta: 10,
                        minCutOff: 0.001,
                        freqRange: [2, 144],
                        forceFilterNNInputPxRange: [2.5, 6],
                    },
                    solvePnPImgPointsLabels: [
                        'leftEarBottom',
                        'rightEarBottom',
                        'noseBottom',
                        'noseLeft',
                        'noseRight',
                        'leftEyeExt',
                        'rightEyeExt',
                    ],
                    canvasFace: canvasFaceRef.current,
                    maxFacesDetected: 1,
                });
            })
            .then(() => {
                if (!mountedRef.current) return;
                setIsInitialized(true);

                window.addEventListener('resize', handleResize);
                window.addEventListener('orientationchange', handleResize);
                console.log('[WebARTryOn] Initialized successfully');
            })
            .catch((err) => {
                console.error('[WebARTryOn] Init failed:', err);
                if (mountedRef.current) setError(String(err));
            });

        // ─── CLEANUP / DESTROY ─────────────────────
        return () => {
            mountedRef.current = false;
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);

            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
                resizeTimerRef.current = null;
            }

            _threeFiber = null;

            // Destroy mirrorHelper (stops WebGL, releases camera, cleans face slots)
            mirrorHelper.destroy().catch((e: unknown) => {
                console.warn('[WebARTryOn] Destroy warning:', e);
            });

            console.log('[WebARTryOn] Destroyed & cleaned up');
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Visibility pause/resume (tab hidden) ───
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                if (!isPaused) {
                    mirrorHelper.pause(true);
                    setIsPaused(true);
                }
            } else {
                if (isPaused) {
                    mirrorHelper.resume(true);
                    setIsPaused(false);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [isPaused]);

    // ─── Manual pause/resume ────────────────────
    const togglePause = useCallback(() => {
        if (isPaused) {
            mirrorHelper.resume(true);
            setIsPaused(false);
        } else {
            mirrorHelper.pause(true);
            setIsPaused(true);
        }
    }, [isPaused]);

    // ─── Capture image ─────────────────────────
    const captureImage = useCallback(() => {
        if (!_threeFiber) return;
        const threeCanvas = _threeFiber.gl.domElement;
        mirrorHelper.capture_image(threeCanvas).then((cv: HTMLCanvasElement) => {
            const dataUrl = cv.toDataURL('image/png');
            if (onCapture) {
                onCapture(dataUrl);
            } else {
                // Fallback: open in new window
                const img = new Image();
                img.src = dataUrl;
                img.onload = () => {
                    const win = window.open('');
                    win?.document.write(img.outerHTML);
                };
            }
        });
    }, [onCapture]);

    // ────────────────────────────────────────────
    // Render
    // ────────────────────────────────────────────

    return (
        <div className={`webar-tryon-container ${className}`}>
            <div className="webar-tryon-wrapper">
                {/* Status indicator */}
                {isInitialized && (
                    <div className="webar-status">
                        <span
                            className={`webar-status-dot ${isPaused ? 'webar-status-dot--paused' : ''
                                } ${error ? 'webar-status-dot--error' : ''}`}
                        />
                        {isPaused ? 'Paused' : 'Tracking'}
                    </div>
                )}

                {/* Loading overlay */}
                {!isInitialized && !error && (
                    <div className="webar-loading-overlay">
                        <div className="webar-loading-spinner" />
                        <span className="webar-loading-text">Initializing face tracking…</span>
                    </div>
                )}

                {/* Error overlay */}
                {error && (
                    <div className="webar-error-overlay">
                        <span className="webar-error-icon">⚠️</span>
                        <span className="webar-error-text">{error}</span>
                    </div>
                )}

                {/* React Three Fiber canvas — 3D glasses overlay */}
                <Canvas
                    className="mirrorX webar-canvas-three"
                    gl={{ preserveDrawingBuffer: true }}
                >
                    <ThreeGrabber sizing={sizing} lighting={lighting} />

                    <React.Suspense fallback={<DebugCube />}>
                        <VTOModelContainer
                            sizing={sizing}
                            GLTFModel={activeModel}
                            faceIndex={0}
                            glassesBranches={glassesBranches}
                        />
                    </React.Suspense>

                    <EffectComposer>
                        <Bloom
                            luminanceThreshold={DEFAULT_BLOOM.threshold}
                            luminanceSmoothing={DEFAULT_BLOOM.luminanceSmoothing}
                            intensity={DEFAULT_BLOOM.intensity}
                            // @ts-ignore — kernelSize enum mapping
                            kernelSize={DEFAULT_BLOOM.kernelSizeLevel}
                            height={DEFAULT_BLOOM.computeScale * sizing.height}
                        />
                    </EffectComposer>
                </Canvas>

                {/* Raw canvas for WebARRocksFace video + WebGL compute */}
                <canvas
                    className="mirrorX webar-canvas-face"
                    ref={canvasFaceRef}
                    width={sizing.width}
                    height={sizing.height}
                />
            </div>

            {/* Controls removed — parent modal handles close via X button */}
        </div>
    );
};

export default WebARTryOn;
