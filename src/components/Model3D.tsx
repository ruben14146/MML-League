"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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

  // Runs exactly once per loaded model instance — deliberately depends
  // only on `cloned`, not on the textures/material effect below. Box3's
  // setFromObject measures *world-space* bounds, which already include
  // whatever scale is currently applied; re-running this after the first
  // pass would measure the already-normalized (small) model and rescale
  // again from that, compounding on every re-run (this is what caused the
  // render to intermittently blow up/flatten out — e.g. every other time
  // the brightness slider moved and re-rendered this component).
  useEffect(() => {
    // FBX/OBJ exports carry wildly inconsistent units (cm vs m) and an
    // arbitrary pivot, which throws off framing far more than any camera
    // setting can compensate for. Normalize scale so the model's longest
    // dimension is a fixed size, and re-center it on the origin, rather
    // than trusting the file's own coordinates.
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.6 / maxDim;
    cloned.scale.setScalar(scale);

    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
    cloned.position.set(-center.x, -center.y, -center.z);
  }, [cloned]);

  useEffect(() => {
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
          // Exported models frequently have some inverted-normal faces —
          // without this they render as solid black holes instead of the
          // backside of the mesh.
          side: THREE.DoubleSide,
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

function Lighting({ brightness }: { brightness: number }) {
  // Soft ambient fill so nothing goes fully black, plus a key light and
  // two colored accent lights for a simple, flattering setup — kept as
  // plain lights (no HDRI environment map) since the CSP doesn't allow
  // fetching one from an external CDN. `brightness` scales all of them
  // together from the slider in the viewer's controls.
  return (
    <>
      <ambientLight intensity={0.5 * brightness} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={1.8 * brightness}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-3, 1.5, -2]} intensity={0.6 * brightness} color="#64ddff" />
      <pointLight position={[0, -2, 3]} intensity={0.3 * brightness} color="#f6a9f3" />
    </>
  );
}

export default function Model3D({
  modelUrl,
  modelType,
  colorMapUrl,
  normalMapUrl,
  metallicMapUrl,
  className,
  brightness = 1,
  autoRotate = false,
  resetToken,
}: ModelProps & {
  className?: string;
  brightness?: number;
  autoRotate?: boolean;
  /** Bump this value to snap the camera back to its default framing. */
  resetToken?: number;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    controlsRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-background-elevated ${className ?? ""}`}>
      <Suspense fallback={<Loading />}>
        <Canvas shadows camera={{ position: [2.2, 1.6, 2.2], fov: 45, near: 0.05, far: 100 }} dpr={[1, 2]}>
          <Lighting brightness={brightness} />

          <Model
            modelUrl={modelUrl}
            modelType={modelType}
            colorMapUrl={colorMapUrl}
            normalMapUrl={normalMapUrl}
            metallicMapUrl={metallicMapUrl}
          />

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={0.8}
            maxDistance={6}
            target={[0, 0, 0]}
            autoRotate={autoRotate}
            autoRotateSpeed={1.2}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
