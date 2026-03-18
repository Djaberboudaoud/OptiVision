import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei';
import { Loader2 } from 'lucide-react';

interface Glasses3DViewerProps {
    modelUrl: string;
}

function Model({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    // Clone to avoid mutation issues if reused
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);
    return <primitive object={clonedScene} />;
}

export const Glasses3DViewer: React.FC<Glasses3DViewerProps> = ({ modelUrl }) => {
    return (
        <div className="w-full h-full min-h-[300px] bg-gray-100 rounded-lg overflow-hidden relative">
            <Canvas shadows dpr={[1, 2]} camera={{ fov: 50 }}>
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.6}>
                        <Model url={modelUrl} />
                    </Stage>
                    <OrbitControls makeDefault autoRotate autoRotateSpeed={4} />
                </Suspense>
            </Canvas>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs pointer-events-none">
                Drag to rotate • Scroll to zoom
            </div>
        </div>
    );
};
