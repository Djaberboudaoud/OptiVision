/**
 * JeelizCanvas - Live webcam glasses try-on using Jeeliz FaceFilter engine
 * 
 * This component:
 * 1. Initializes JeelizFaceFilter for face tracking
 * 2. Uses Three.js (via JeelizThreeHelper) to render glasses on the detected face
 * 3. Supports occlusion (hiding glasses arms behind the head)
 * 4. Supports environment-map reflections on lenses
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Backend URL for serving model assets
const BACKEND_URL = 'http://localhost:8001';

interface JeelizCanvasProps {
    /** JSON model (BufferGeometry frame + lenses) */
    glassesModel?: {
        frame: string;
        lenses: string;
    };
    /** Path to GLB model file (alternative to JSON) */
    glbModelFile?: string;
    /** Callback when face is detected or lost */
    onFaceDetection?: (detected: boolean) => void;
    /** Width of the canvas */
    width?: number;
    /** Height of the canvas */
    height?: number;
    /** Whether to show the component */
    visible?: boolean;
    /** Callback to close */
    onClose?: () => void;
}

// Build 3D glasses with custom shaders (ported from JeelizThreeGlassesCreator.js)
function createGlasses(spec: {
    envMapURL: string;
    frameMeshURL: string;
    lensesMeshURL: string;
    occluderURL: string;
}, JeelizThreeHelper: any): { glasses: THREE.Object3D; occluder: THREE.Mesh } {
    const threeGlasses = new THREE.Object3D();

    // Environment map texture for reflections
    const textureEquirec = new THREE.TextureLoader().load(spec.envMapURL);
    textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
    textureEquirec.magFilter = THREE.LinearFilter;
    textureEquirec.minFilter = THREE.LinearMipmapLinearFilter;

    // Load glasses frames
    new THREE.BufferGeometryLoader().load(spec.frameMeshURL, (glassesFramesGeometry: THREE.BufferGeometry) => {
        glassesFramesGeometry.computeVertexNormals();

        // Custom material with fading at the end of the branches
        const uniforms = {
            roughness: { value: 0 },
            metalness: { value: 0.05 },
            reflectivity: { value: 1 },
            envMap: { value: textureEquirec },
            envMapIntensity: { value: 1 },
            diffuse: { value: new THREE.Color().setHex(0xffffff) },
            uBranchFading: { value: new THREE.Vector2(-90, 60) }
        };

        // Tweak vertex shader for branch Z position
        let vertexShaderSource = "varying float vPosZ;\n" + THREE.ShaderLib.standard.vertexShader;
        vertexShaderSource = vertexShaderSource.replace('#include <fog_vertex>', 'vPosZ = position.z;');

        // Tweak fragment shader for transparency fading at branch ends
        let fragmentShaderSource = "uniform vec2 uBranchFading;\n varying float vPosZ;\n" + THREE.ShaderLib.standard.fragmentShader;
        const GLSLcomputeAlpha = 'gl_FragColor.a = smoothstep(uBranchFading.x - uBranchFading.y*0.5, uBranchFading.x + uBranchFading.y*0.5, vPosZ);';
        fragmentShaderSource = fragmentShaderSource.replace('#include <fog_fragment>', GLSLcomputeAlpha);

        const mat = new THREE.ShaderMaterial({
            vertexShader: vertexShaderSource,
            fragmentShader: fragmentShaderSource,
            uniforms: uniforms,
            transparent: true,
        });

        (mat as any).envMap = textureEquirec;
        const glassesFramesMesh = new THREE.Mesh(glassesFramesGeometry, mat);
        threeGlasses.add(glassesFramesMesh);
    });

    // Load glasses lenses
    new THREE.BufferGeometryLoader().load(spec.lensesMeshURL, (glassesLensesGeometry: THREE.BufferGeometry) => {
        glassesLensesGeometry.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({
            envMap: textureEquirec,
            opacity: 0.7,
            color: new THREE.Color().setHex(0x2233aa),
            transparent: true,
            fog: false
        });
        const glassesLensesMesh = new THREE.Mesh(glassesLensesGeometry, mat);
        threeGlasses.add(glassesLensesMesh);
    });

    // Create occluder (transparent mesh that writes to depth buffer)
    const occluderMesh = JeelizThreeHelper.create_threejsOccluder(spec.occluderURL);

    return {
        glasses: threeGlasses,
        occluder: occluderMesh
    };
}

const JeelizCanvas: React.FC<JeelizCanvasProps> = ({
    glassesModel,
    glbModelFile,
    onFaceDetection,
    width = 640,
    height = 480,
    visible = true,
    onClose
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const jeelizRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const glassesObjRef = useRef<THREE.Object3D | null>(null);
    const occluderObjRef = useRef<THREE.Mesh | null>(null);
    const faceObjectRef = useRef<THREE.Object3D | null>(null);
    const initRef = useRef(false);

    // Stabilizer reference
    const stabilizerRef = useRef<any>(null);

    // Default model (JSON)
    const model = glassesModel || (!glbModelFile ? {
        frame: '/new_caders/jeeliz/frame.json',
        lenses: '/new_caders/jeeliz/lenses.json'
    } : undefined);

    const initJeeliz = useCallback(async () => {
        if (!canvasRef.current || initRef.current) return;
        initRef.current = true;

        try {
            // Dynamic imports for the Jeeliz scripts
            const JEELIZFACEFILTER = (await import('../utils/jeeliz/jeelizFaceFilter.js')).default;
            const JeelizResizer = (await import('../utils/jeeliz/JeelizResizer.js')).default;
            const JeelizThreeHelper = (await import('../utils/jeeliz/JeelizThreeHelper.js')).default;
            const { LandmarksStabilizer } = await import('../utils/jeeliz/LandmarksStabilizer.ts');

            jeelizRef.current = JEELIZFACEFILTER;
            stabilizerRef.current = new LandmarksStabilizer();

            // Size the canvas
            JeelizResizer.size_canvas({
                canvas: canvasRef.current,
                callback: (isError: any, bestVideoSettings: any) => {
                    if (isError) {
                        setError('Failed to size canvas');
                        setIsLoading(false);
                        return;
                    }

                    // Initialize the face filter
                    JEELIZFACEFILTER.init({
                        followZRot: true,
                        canvas: canvasRef.current,
                        NNCPath: '/neuralNets/',
                        maxFacesDetected: 1,

                        callbackReady: (errCode: any, spec: any) => {
                            if (errCode) {
                                console.error('JeelizFaceFilter error:', errCode);
                                setError(`Face filter error: ${errCode}`);
                                setIsLoading(false);
                                return;
                            }

                            console.log('INFO: JEELIZFACEFILTER IS READY');

                            // Initialize Three.js scene via helper
                            const threeStuffs = JeelizThreeHelper.init(spec, (faceIndex: number, isDetected: boolean) => {
                                setFaceDetected(isDetected);
                                onFaceDetection?.(isDetected);
                                if (isDetected) {
                                    // console.log('Face DETECTED');
                                } else {
                                    // console.log('Face LOST');
                                    stabilizerRef.current?.reset();
                                }
                            });

                            // Improve renderer
                            threeStuffs.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                            threeStuffs.renderer.outputColorSpace = THREE.SRGBColorSpace;

                            // Add lighting for GLB models (PBR materials need light)
                            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
                            threeStuffs.scene.add(ambientLight);
                            const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
                            dirLight.position.set(0, 1, 2);
                            threeStuffs.scene.add(dirLight);

                            faceObjectRef.current = threeStuffs.faceObject;

                            // Default glasses branch settings (can be prop-driven later)
                            const GLASSES_BRANCH_SPEC = {
                                fadingZ: -0.9,
                                fadingTransition: 0.6,
                                bendingAngle: 5,
                                bendingZ: 0
                            };

                            const _d2r = Math.PI / 180;

                            function insert_GLSLAfter(GLSLSource: string, GLSLSearched: string, GLSLInserted: string) {
                                return GLSLSource.replace(GLSLSearched, GLSLSearched + '\n' + GLSLInserted);
                            }

                            function tweak_material(threeMat: THREE.Material, glassesBranchesSpec: any) {
                                const newMat = threeMat.clone();
                                (newMat as any).fog = false;

                                newMat.onBeforeCompile = function (shaders) {
                                    let vertexShaderSource = shaders.vertexShader;
                                    let fragmentShaderSource = shaders.fragmentShader;

                                    if (glassesBranchesSpec) {
                                        const glassesBranchUniforms = {
                                            uBranchFading: { value: new THREE.Vector2(glassesBranchesSpec.fadingZ, glassesBranchesSpec.fadingTransition) },
                                            uBranchBendingAngle: { value: glassesBranchesSpec.bendingAngle * _d2r },
                                            uBranchBendingZ: { value: glassesBranchesSpec.bendingZ }
                                        };
                                        Object.assign(shaders.uniforms, glassesBranchUniforms);

                                        // tweak vertex shader to bend the branches:
                                        vertexShaderSource = "uniform float uBranchBendingAngle, uBranchBendingZ;\n" + vertexShaderSource;
                                        let GLSLBendBranch = 'float zBranch = max(0.0, uBranchBendingZ-position.z);\n';
                                        GLSLBendBranch += 'float bendBranchDx = tan(uBranchBendingAngle) * zBranch;\n';
                                        GLSLBendBranch += 'transformed.x += sign(transformed.x) * bendBranchDx;\n';
                                        GLSLBendBranch += 'transformed.z *= (1.0 - bendBranchDx);\n';
                                        vertexShaderSource = insert_GLSLAfter(vertexShaderSource, '#include <begin_vertex>', GLSLBendBranch);

                                        // tweak vertex shader to give the Z of the current point. It will be used for branch fading:
                                        vertexShaderSource = "varying float vPosZ;\n" + vertexShaderSource;
                                        vertexShaderSource = insert_GLSLAfter(vertexShaderSource, '#include <fog_vertex>', 'vPosZ = position.z;');

                                        // tweak fragment shader to apply transparency at the end of the branches:
                                        fragmentShaderSource = "uniform vec2 uBranchFading;\n varying float vPosZ;\n" + fragmentShaderSource;
                                        const GLSLcomputeAlpha = 'gl_FragColor *= smoothstep(uBranchFading.x - uBranchFading.y * 0.5, uBranchFading.x + uBranchFading.y * 0.5, vPosZ);'
                                        fragmentShaderSource = insert_GLSLAfter(fragmentShaderSource, '#include <dithering_fragment>', GLSLcomputeAlpha);
                                    }

                                    shaders.vertexShader = vertexShaderSource;
                                    shaders.fragmentShader = fragmentShaderSource;
                                };

                                return newMat;
                            }

                            if (glbModelFile) {
                                // ===== GLB MODEL =====
                                console.log('Loading GLB model:', glbModelFile);
                                const loader = new GLTFLoader();

                                // Load occlusion model first (or in parallel, but here simplified)
                                // We assume occluder is always at this path for GLB mode
                                const occluderPath = '/models/occluder.glb';

                                loader.load(occluderPath, (occluderGltf) => {
                                    const occluderScene = occluderGltf.scene;

                                    // Manually set up the occluder as a depth-write only mesh
                                    occluderScene.traverse((child: any) => {
                                        if (child.isMesh) {
                                            child.renderOrder = -1; // Render first
                                            child.material = new THREE.MeshBasicMaterial({ color: 0x000000, colorWrite: false });
                                        }
                                    });

                                    threeStuffs.faceObject.add(occluderScene);
                                    occluderObjRef.current = occluderScene as any;
                                }, undefined, (err) => console.log('Occluder load missing/error', err)); // Optional

                                loader.load(
                                    glbModelFile,
                                    (gltf) => {
                                        const glbScene = gltf.scene;

                                        // Tweak materials for branch bending/fading
                                        glbScene.traverse((child: any) => {
                                            if (child.isMesh && child.material) {
                                                // Check if it's a frame (for branching) vs lens
                                                // Heuristic: if name contains 'frame' or just apply to all opacity-supporting meshes that aren't lenses?
                                                // Reference logic: isGlassesBranch = mat.name.indexOf('frame') !== -1
                                                const isFrame = child.name.toLowerCase().includes('frame') || child.name.toLowerCase().includes('glass'); // broaden search
                                                child.material = tweak_material(child.material, isFrame ? GLASSES_BRANCH_SPEC : null);
                                            }
                                        });

                                        // Auto-scale: compute bounding box and normalize
                                        const box = new THREE.Box3().setFromObject(glbScene);
                                        const size = new THREE.Vector3();
                                        box.getSize(size);
                                        const maxDim = Math.max(size.x, size.y, size.z);
                                        // Target size values:
                                        // 2.0 = too big
                                        // 1.65 = better fit
                                        const targetSize = 0.85;
                                        const scaleFactor = targetSize / maxDim;
                                        glbScene.scale.setScalar(scaleFactor);

                                        // Center the model
                                        const center = new THREE.Vector3();
                                        box.getCenter(center);
                                        glbScene.position.set(
                                            -center.x * scaleFactor - 0.15,
                                            -center.y * scaleFactor + 0.22,
                                            -center.z * scaleFactor + 0.4
                                        );

                                        glbScene.frustumCulled = false;
                                        glbScene.traverse((child: any) => {
                                            child.frustumCulled = false;
                                        });

                                        threeStuffs.faceObject.add(glbScene);
                                        glassesObjRef.current = glbScene;

                                        console.log('GLB model loaded successfully, scale:', scaleFactor);
                                        setIsLoading(false);
                                    },
                                    (progress) => {
                                        console.log('GLB loading progress:', Math.round((progress.loaded / (progress.total || 1)) * 100) + '%');
                                    },
                                    (err) => {
                                        console.error('Failed to load GLB model:', err);
                                        setError('Failed to load glasses model');
                                        setIsLoading(false);
                                    }
                                );
                            } else if (model) {
                                // ===== JSON BUFFER GEOMETRY MODEL =====
                                const framePath = `${BACKEND_URL}${model.frame}`;
                                const lensesPath = `${BACKEND_URL}${model.lenses}`;
                                const occluderPath = `${BACKEND_URL}/new_caders/jeeliz/face.json`;
                                const envMapPath = `${BACKEND_URL}/new_caders/jeeliz/envMap.jpg`;

                                const r = createGlasses({
                                    envMapURL: envMapPath,
                                    frameMeshURL: framePath,
                                    lensesMeshURL: lensesPath,
                                    occluderURL: occluderPath,
                                }, JeelizThreeHelper);

                                // Vertical offset
                                const dy = 0.07;

                                // Occluder positioning
                                r.occluder.rotation.set(0.3, 0, 0);
                                r.occluder.position.set(0, 0.03 + dy, -0.04);
                                r.occluder.scale.multiplyScalar(0.0084);
                                threeStuffs.faceObject.add(r.occluder);
                                occluderObjRef.current = r.occluder;

                                // Glasses positioning
                                const threeGlasses = r.glasses;
                                threeGlasses.position.set(0, dy, 0.4);
                                threeGlasses.scale.multiplyScalar(0.006);
                                threeStuffs.faceObject.add(threeGlasses);
                                glassesObjRef.current = threeGlasses;

                                setIsLoading(false);
                            }

                            // Create camera
                            cameraRef.current = JeelizThreeHelper.create_camera();
                        },

                        callbackTrack: (detectState: any) => {
                            // Stabilize the detection state before rendering
                            const now = Date.now() / 1000;
                            const stabilizedState = stabilizerRef.current
                                ? stabilizerRef.current.update(detectState, now)
                                : detectState;

                            JeelizThreeHelper.render(stabilizedState, cameraRef.current);
                        }
                    });
                }
            });
        } catch (err) {
            console.error('Failed to initialize Jeeliz:', err);
            setError(`Initialization failed: ${err}`);
            setIsLoading(false);
        }
    }, [model, onFaceDetection]);

    useEffect(() => {
        if (visible) {
            initJeeliz();
        }

        return () => {
            // Cleanup
            if (jeelizRef.current) {
                try {
                    jeelizRef.current.destroy();
                } catch (e) {
                    console.warn('Jeeliz cleanup error:', e);
                }
                jeelizRef.current = null;
                initRef.current = false;
            }
        };
    }, [visible, initJeeliz]);

    // Fast Switching Effect: Handle GLB model changes without re-initializing Jeeliz
    useEffect(() => {
        if (!faceObjectRef.current || !glbModelFile) return;

        // Skip if we don't have a valid scene yet
        // We will just reload the GLB on prop change.

        console.log('Switching GLB model to:', glbModelFile);
        const loader = new GLTFLoader();

        loader.load(glbModelFile, (gltf) => {
            const glbScene = gltf.scene;

            // Tweak materials
            const glassesBranchesSpec = {
                fadingZ: -0.9,
                fadingTransition: 0.6,
                bendingAngle: 5,
                bendingZ: 0
            };
            const _d2r = Math.PI / 180;

            // Copy of helper function for effect scope
            function insert_GLSLAfter(GLSLSource: string, GLSLSearched: string, GLSLInserted: string) {
                return GLSLSource.replace(GLSLSearched, GLSLSearched + '\n' + GLSLInserted);
            }

            function tweak_material(threeMat: THREE.Material, glassesBranchesSpec: any) {
                const newMat = threeMat.clone();
                (newMat as any).fog = false;
                newMat.onBeforeCompile = function (shaders) {
                    let vertexShaderSource = shaders.vertexShader;
                    let fragmentShaderSource = shaders.fragmentShader;
                    if (glassesBranchesSpec) {
                        const glassesBranchUniforms = {
                            uBranchFading: { value: new THREE.Vector2(glassesBranchesSpec.fadingZ, glassesBranchesSpec.fadingTransition) },
                            uBranchBendingAngle: { value: glassesBranchesSpec.bendingAngle * _d2r },
                            uBranchBendingZ: { value: glassesBranchesSpec.bendingZ }
                        };
                        Object.assign(shaders.uniforms, glassesBranchUniforms);
                        vertexShaderSource = "uniform float uBranchBendingAngle, uBranchBendingZ;\n" + vertexShaderSource;
                        let GLSLBendBranch = 'float zBranch = max(0.0, uBranchBendingZ-position.z);\n';
                        GLSLBendBranch += 'float bendBranchDx = tan(uBranchBendingAngle) * zBranch;\n';
                        GLSLBendBranch += 'transformed.x += sign(transformed.x) * bendBranchDx;\n';
                        GLSLBendBranch += 'transformed.z *= (1.0 - bendBranchDx);\n';
                        vertexShaderSource = insert_GLSLAfter(vertexShaderSource, '#include <begin_vertex>', GLSLBendBranch);
                        vertexShaderSource = "varying float vPosZ;\n" + vertexShaderSource;
                        vertexShaderSource = insert_GLSLAfter(vertexShaderSource, '#include <fog_vertex>', 'vPosZ = position.z;');
                        fragmentShaderSource = "uniform vec2 uBranchFading;\n varying float vPosZ;\n" + fragmentShaderSource;
                        const GLSLcomputeAlpha = 'gl_FragColor *= smoothstep(uBranchFading.x - uBranchFading.y * 0.5, uBranchFading.x + uBranchFading.y * 0.5, vPosZ);'
                        fragmentShaderSource = insert_GLSLAfter(fragmentShaderSource, '#include <dithering_fragment>', GLSLcomputeAlpha);
                    }
                    shaders.vertexShader = vertexShaderSource;
                    shaders.fragmentShader = fragmentShaderSource;
                };
                return newMat;
            }

            glbScene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    const isFrame = child.name.toLowerCase().includes('frame') || child.name.toLowerCase().includes('glass');
                    child.material = tweak_material(child.material, isFrame ? glassesBranchesSpec : null);
                }
            });

            // Scale logic - MINIMIZED SIZE (0.85)
            const box = new THREE.Box3().setFromObject(glbScene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 0.85; // Requested "half" size (was 1.65)
            const scaleFactor = targetSize / maxDim;
            glbScene.scale.setScalar(scaleFactor);

            const center = new THREE.Vector3();
            box.getCenter(center);
            glbScene.position.set(
                -center.x * scaleFactor,
                -center.y * scaleFactor + 0.18,
                -center.z * scaleFactor + 0.4
            );

            glbScene.frustumCulled = false;
            glbScene.traverse((child: any) => { child.frustumCulled = false; });

            // Swap models
            if (faceObjectRef.current) {
                if (glassesObjRef.current) {
                    faceObjectRef.current.remove(glassesObjRef.current);
                }
                faceObjectRef.current.add(glbScene);
                glassesObjRef.current = glbScene;
            }
        });

    }, [glbModelFile]);

    // Fast Switching Effect: Handle GLB model changes without re-initializing Jeeliz
    useEffect(() => {
        if (!faceObjectRef.current || !glbModelFile) return;

        // Skip if the current model is already the one we want (optional optimization)
        // But since we don't track the loaded file path in a ref, we just reload conformantly.

        console.log('Switching GLB model to:', glbModelFile);
        const loader = new GLTFLoader();

        loader.load(glbModelFile, (gltf) => {
            const glbScene = gltf.scene;

            // Tweak materials
            const glassesBranchesSpec = {
                fadingZ: -0.9,
                fadingTransition: 0.6,
                bendingAngle: 5,
                bendingZ: 0
            };
            const _d2r = Math.PI / 180;

            // Re-define helper inside effect or move to component scope?
            // Moving helper to component scope would be cleaner but let's duplicate for safety/speed in this patch
            // actually, tweak_material is defined inside initJeeliz scope which is closed.
            // We need to duplicate the logic or refactor. duplicating for now to avoid massive refactor risk.

            function insert_GLSLAfter(GLSLSource: string, GLSLSearched: string, GLSLInserted: string) {
                return GLSLSource.replace(GLSLSearched, GLSLSearched + '\n' + GLSLInserted);
            }

            function tweak_material(threeMat: THREE.Material, glassesBranchesSpec: any) {
                const newMat = threeMat.clone();
                (newMat as any).fog = false;
                newMat.onBeforeCompile = function (shaders) {
                    let vertexShaderSource = shaders.vertexShader;
                    let fragmentShaderSource = shaders.fragmentShader;
                    if (glassesBranchesSpec) {
                        const glassesBranchUniforms = {
                            uBranchFading: { value: new THREE.Vector2(glassesBranchesSpec.fadingZ, glassesBranchesSpec.fadingTransition) },
                            uBranchBendingAngle: { value: glassesBranchesSpec.bendingAngle * _d2r },
                            uBranchBendingZ: { value: glassesBranchesSpec.bendingZ }
                        };
                        Object.assign(shaders.uniforms, glassesBranchUniforms);
                        vertexShaderSource = "uniform float uBranchBendingAngle, uBranchBendingZ;\n" + vertexShaderSource;
                        let GLSLBendBranch = 'float zBranch = max(0.0, uBranchBendingZ-position.z);\n';
                        GLSLBendBranch += 'float bendBranchDx = tan(uBranchBendingAngle) * zBranch;\n';
                        GLSLBendBranch += 'transformed.x += sign(transformed.x) * bendBranchDx;\n';
                        GLSLBendBranch += 'transformed.z *= (1.0 - bendBranchDx);\n';
                        vertexShaderSource = insert_GLSLAfter(vertexShaderSource, '#include <begin_vertex>', GLSLBendBranch);
                        vertexShaderSource = "varying float vPosZ;\n" + vertexShaderSource;
                        vertexShaderSource = insert_GLSLAfter(vertexShaderSource, '#include <fog_vertex>', 'vPosZ = position.z;');
                        fragmentShaderSource = "uniform vec2 uBranchFading;\n varying float vPosZ;\n" + fragmentShaderSource;
                        const GLSLcomputeAlpha = 'gl_FragColor *= smoothstep(uBranchFading.x - uBranchFading.y * 0.5, uBranchFading.x + uBranchFading.y * 0.5, vPosZ);'
                        fragmentShaderSource = insert_GLSLAfter(fragmentShaderSource, '#include <dithering_fragment>', GLSLcomputeAlpha);
                    }
                    shaders.vertexShader = vertexShaderSource;
                    shaders.fragmentShader = fragmentShaderSource;
                };
                return newMat;
            }

            glbScene.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    const isFrame = child.name.toLowerCase().includes('frame') || child.name.toLowerCase().includes('glass');
                    child.material = tweak_material(child.material, isFrame ? glassesBranchesSpec : null);
                }
            });

            // Scale logic
            const box = new THREE.Box3().setFromObject(glbScene);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 1.4; // Minimized size per user request
            const scaleFactor = targetSize / maxDim;
            glbScene.scale.setScalar(scaleFactor);

            const center = new THREE.Vector3();
            box.getCenter(center);
            glbScene.position.set(
                -center.x * scaleFactor,
                -center.y * scaleFactor + 0.18,
                -center.z * scaleFactor + 0.4
            );

            glbScene.frustumCulled = false;
            glbScene.traverse((child: any) => { child.frustumCulled = false; });

            // Swap models
            if (faceObjectRef.current) {
                if (glassesObjRef.current) {
                    faceObjectRef.current.remove(glassesObjRef.current);
                }
                faceObjectRef.current.add(glbScene);
                glassesObjRef.current = glbScene;
            }
        });

    }, [glbModelFile]);

    if (!visible) return null;

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: `${width}px`,
            margin: '0 auto',
            background: '#000',
            borderRadius: '12px',
            overflow: 'hidden',

            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '18px',
                        backdropFilter: 'blur(4px)',
                    }}
                    title="Close"
                >
                    ✕
                </button>
            )}

            {/* Loading overlay */}
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    zIndex: 5,
                    gap: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#8b5cf6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <p style={{ fontSize: '14px', opacity: 0.8 }}>Loading Jeeliz Face Tracker...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.9)',
                    color: '#ff6b6b',
                    zIndex: 5,
                    padding: '24px',
                    textAlign: 'center',
                }}>
                    <p style={{ fontSize: '16px', fontWeight: 'bold' }}>⚠️ Error</p>
                    <p style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>{error}</p>
                </div>
            )}

            {/* Face detection indicator */}
            {!isLoading && !error && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backdropFilter: 'blur(4px)',
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: faceDetected ? '#4ade80' : '#f87171',
                        boxShadow: faceDetected ? '0 0 8px #4ade80' : '0 0 8px #f87171',
                    }} />
                    <span style={{ color: 'white', fontSize: '12px' }}>
                        {faceDetected ? 'Face Detected' : 'No Face'}
                    </span>
                </div>
            )}

            {/* The Jeeliz canvas */}
            <canvas
                ref={canvasRef}
                id="jeeFaceFilterCanvas"
                width={width}
                height={height}
                style={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    transform: 'rotateY(180deg)', // Mirror effect
                }}
            />
        </div>
    );
};

export default JeelizCanvas;
