import { useRef, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useProgress } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

interface ThreeDViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
  isPreview?: boolean;
  onExpand?: () => void;
}

// ... imports ...
import { Maximize2, RotateCw, Move, MousePointer2 } from "lucide-react";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-center">
        <div className="mb-2">Loading 3D model...</div>
        <div className="w-32 h-2 bg-gray-300 rounded">
          <div
            className="h-full bg-blue-500 rounded transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Html>
  );
}

function Model({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const fileExtension = fileName.split(".").pop()?.toLowerCase();
  const spinEndRef = useRef<number>(0);

  // Load different file types
  const loadModel = useCallback(async () => {
    try {
      if (fileExtension === "stl") {
        const loader = new STLLoader();
        const geometry = await new Promise<THREE.BufferGeometry>(
          (resolve, reject) => {
            loader.load(fileUrl, resolve, undefined, reject);
          },
        );

        if (meshRef.current) {
          // Clear and add PBR shaded mesh
          meshRef.current.clear();
          const mat = new THREE.MeshPhysicalMaterial({
            color: "#FF5722",
            metalness: 0.1,
            roughness: 0.6,
          });
          const mesh = new THREE.Mesh(geometry, mat);
          mesh.castShadow = true;
          meshRef.current.add(mesh);
          // Center and scale
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          if (box) {
            const center = box.getCenter(new THREE.Vector3());
            geometry.translate(-center.x, -center.y, -center.z);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3.5 / maxDim;
            geometry.scale(scale, scale, scale);
          }
        }
      } else if (fileExtension === "gltf" || fileExtension === "glb") {
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(fileUrl, resolve, undefined, reject);
        });

        // Handle GLTF scene
        if (meshRef.current && gltf.scene) {
          // Clear existing children
          while (meshRef.current.children.length > 0) {
            meshRef.current.remove(meshRef.current.children[0]);
          }
          meshRef.current.add(gltf.scene);

          // Center and scale
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          gltf.scene.position.sub(center);

          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3.5 / maxDim;
          gltf.scene.scale.setScalar(scale);
        }
      }
    } catch (error) {
      console.error("Error loading 3D model:", error);
    }
  }, [fileUrl, fileName, fileExtension]);

  useEffect(() => {
    loadModel().then(() => {
      spinEndRef.current = performance.now() + 2500;
    });
  }, [loadModel]);

  // Inertia spin for first ~2.5s
  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const now = performance.now();
    if (now < spinEndRef.current) {
      const t = (spinEndRef.current - now) / 2500;
      meshRef.current.rotation.y += delta * 0.8 * t;
    }
  });

  return <group ref={meshRef} />;
}

export default function ThreeDViewer({
  fileUrl,
  fileName,
  className,
  isPreview = false,
  onExpand,
}: ThreeDViewerProps) {
  const supportedFormats = ["stl", "gltf", "glb"];
  const fileExtension = fileName.split(".").pop()?.toLowerCase();
  const isSupported = supportedFormats.includes(fileExtension || "");

  if (!isSupported) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
      >
        <div className="text-center p-4">
          <div className="text-4xl mb-2">📄</div>
          <div className="text-sm text-gray-600">
            {fileExtension?.toUpperCase()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Preview not available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-[#f5f5f5] ${className} group`}>
      {onExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="absolute top-4 right-4 z-20 p-2 bg-white/90 backdrop-blur rounded-md shadow-sm border border-gray-200 hover:bg-white text-gray-700 transition-all hover:scale-105 active:scale-95"
          title="Fullscreen"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      )}
      <Canvas
        shadows
        camera={{ position: [4, 4, 4], fov: 45 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor("#f5f5f5", 1);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          scene.background = new THREE.Color("#f5f5f5");
        }}
      >
        {/* Lighting: ambient + hemisphere + key/fill/rim */}
        <ambientLight intensity={0.35} />
        <hemisphereLight
          intensity={0.25}
          groundColor={new THREE.Color("#e5e5e5")}
        />
        <directionalLight
          position={[3, 6, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 3, 2]} intensity={0.6} />
        <directionalLight position={[5, -3, -5]} intensity={0.4} />

        <Model fileUrl={fileUrl} fileName={fileName} />

        {/* Soft shadow plane */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.2, 0]}
          receiveShadow
        >
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.15} />
        </mesh>

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={0}
          maxDistance={Infinity}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>
    </div>
  );
}
