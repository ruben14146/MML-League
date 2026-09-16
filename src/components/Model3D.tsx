"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, useTexture, Center, Bounds } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { Loader2 } from "lucide-react";
import type { ModelType } from "@/lib/db.types";

// A fully transparent 1x1 pixel, used so useTexture can always be called
// with a real URL for each map slot even when that map wasn't provided —
// hooks can't be called conditionally.
const BLANK_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type ModelProps = {
  modelUrl: string;
  modelType: ModelType;
  colorMapUrl: string | null;
  normalMapUrl: string | null;
  metallicMapUrl: string | null;
};

function Model({ modelUrl, modelType, colorMapUrl, normalMapUrl, metallicMapUrl }: ModelProps) {
  const object = useLoader(modelType === "fbx" ? FBXLoader : OBJLoader, modelUrl);
  const textures = useTexture({
    map: colorMapUrl ?? BLANK_PIXEL,
    normalMap: normalMapUrl ?? BLANK_PIXEL,
    metalnessMap: metallicMapUrl ?? BLANK_PIXEL,
  });

  // Cloned per-mount so re-viewing the same item doesn't mutate a shared,
  // cached loader result out from under another instance.
  const cloned = useMemo(() => object.clone(true), [object]);

  useEffect(() => {
    for (const t of Object.values(textures)) {
      t.colorSpace = THREE.SRGBColorSpace;
    }
    textures.map.colorSpace = THREE.SRGBColorSpace;
    textures.normalMap.colorSpace = THREE.NoColorSpace;
    textures.metalnessMap.colorSpace = THREE.NoColorSpace;

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: colorMapUrl ? textures.map : undefined,
          normalMap: normalMapUrl ? textures.normalMap : undefined,
          metalnessMap: metallicMapUrl ? textures.metalnessMap : undefined,
          metalness: metallicMapUrl ? 1 : 0.15,
          roughness: 0.55,
          color: colorMapUrl ? undefined : new THREE.Color("#8fb8c9"),
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [cloned, textures, colorMapUrl, normalMapUrl, metallicMapUrl]);

  return <primitive object={cloned} />;
}

function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="animate-spin text-teal" size={28} />
    </div>
  );
}

export default function Model3D({
  modelUrl,
  modelType,
  colorMapUrl,
  normalMapUrl,
  metallicMapUrl,
  className,
}: ModelProps & { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-background-elevated ${className ?? ""}`}>
      <Suspense fallback={<Loading />}>
        <Canvas shadows camera={{ position: [2.4, 1.8, 2.4], fov: 40 }} dpr={[1, 2]}>
          {/* Soft ambient fill so nothing goes fully black, plus a key
              light and a rim/fill light for a simple, flattering 3-point
              setup — kept as plain lights (no HDRI environment map) since
              the CSP doesn't allow fetching one from an external CDN. */}
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[3, 4, 2]}
            intensity={1.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-3, 1.5, -2]} intensity={0.5} color="#64ddff" />
          <pointLight position={[0, -2, 3]} intensity={0.25} color="#f6a9f3" />

          <Bounds fit clip observe margin={1.3}>
            <Center>
              <Model
                modelUrl={modelUrl}
                modelType={modelType}
                colorMapUrl={colorMapUrl}
                normalMapUrl={normalMapUrl}
                metallicMapUrl={metallicMapUrl}
              />
            </Center>
          </Bounds>

          <OrbitControls
            enablePan={false}
            minDistance={1}
            maxDistance={8}
            autoRotate
            autoRotateSpeed={1.2}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
