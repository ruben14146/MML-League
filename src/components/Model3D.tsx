"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, useTexture, Environment, Lightformer } from "@react-three/drei";
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

type ModelInnerProps = ModelProps & {
  /** Degrees — corrects the source file's default export orientation. */
  rotationX: number;
  rotationY: number;
  rotationZ: number;
};

function Model({
  modelUrl,
  modelType,
  colorMapUrl,
  normalMapUrl,
  metallicMapUrl,
  rotationX,
  rotationY,
  rotationZ,
}: ModelInnerProps) {
  const object = useLoader(modelType === "fbx" ? FBXLoader : OBJLoader, modelUrl);
  const textures = useTexture({
    map: colorMapUrl ?? BLANK_PIXEL,
    normalMap: normalMapUrl ?? BLANK_PIXEL,
    metalnessMap: metallicMapUrl ?? BLANK_PIXEL,
  });

  // Cloned per-mount so re-viewing the same item doesn't mutate a shared,
  // cached loader result out from under another instance.
  const cloned = useMemo(() => object.clone(true), [object]);

  // Scale/center are purely geometric properties of the pristine clone —
  // computed once and applied declaratively via the wrapping <group>
  // below, rather than mutated in place. Mutating cloned.scale/position
  // directly and re-measuring on a later re-render would measure the
  // *already* transformed object and compound (this is what caused the
  // render to intermittently blow up/flatten out previously).
  const { scale, centerOffset } = useMemo(() => {
    // FBX/OBJ exports carry wildly inconsistent units (cm vs m) and an
    // arbitrary pivot, which throws off framing far more than any camera
    // setting can compensate for.
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 1.6 / maxDim;
    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
    return { scale: s, centerOffset: [-center.x, -center.y, -center.z] as [number, number, number] };
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
          metalness: metallicMapUrl ? 1 : 0.3,
          roughness: metallicMapUrl ? 0.35 : 0.4,
          // Picked up by the procedural studio environment below, giving
          // items a bit of a glossy sheen instead of looking flat/matte.
          envMapIntensity: 1.3,
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

  // Outer group applies the orientation correction around the model's own
  // center (the inner group has already been centered on the origin at
  // unit scale), inner group applies the scale/centering worked out above.
  return (
    <group rotation={[THREE.MathUtils.degToRad(rotationX), THREE.MathUtils.degToRad(rotationY), THREE.MathUtils.degToRad(rotationZ)]}>
      <group scale={scale} position={centerOffset}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="animate-spin text-teal" size={28} />
    </div>
  );
}

export type LightRotation = { x: number; y: number; z: number };

function rotateAround([x, y, z]: [number, number, number], rot: LightRotation): [number, number, number] {
  const v = new THREE.Vector3(x, y, z);
  v.applyEuler(
    new THREE.Euler(THREE.MathUtils.degToRad(rot.x), THREE.MathUtils.degToRad(rot.y), THREE.MathUtils.degToRad(rot.z))
  );
  return [v.x, v.y, v.z];
}

function Lighting({ brightness, lightRotation }: { brightness: number; lightRotation: LightRotation }) {
  // Soft ambient fill so nothing goes fully black, a key light + two
  // colored accent lights that can be spun as a rig via lightRotation, and
  // a purely procedural "studio" environment (drei's Lightformer panels
  // rendered to an internal cubemap) for soft reflections/highlights on
  // glossy materials — no external HDRI fetch, so it stays CSP-safe.
  // `brightness` scales everything together from the viewer's slider.
  const key = useMemo(() => rotateAround([3, 4, 2], lightRotation), [lightRotation]);
  const fillA = useMemo(() => rotateAround([-3, 1.5, -2], lightRotation), [lightRotation]);
  const fillB = useMemo(() => rotateAround([0, -2, 3], lightRotation), [lightRotation]);

  return (
    <>
      <ambientLight intensity={0.5 * brightness} />
      <directionalLight position={key} intensity={1.8 * brightness} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={fillA} intensity={0.6 * brightness} color="#64ddff" />
      <pointLight position={fillB} intensity={0.3 * brightness} color="#f6a9f3" />

      <Environment resolution={128} background={false}>
        <Lightformer intensity={2.5 * brightness} color="white" position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1 * brightness} color="#64ddff" position={key} scale={[5, 5, 1]} />
        <Lightformer intensity={1 * brightness} color="#f6a9f3" position={fillB} scale={[5, 5, 1]} />
      </Environment>
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
  lightRotation = { x: 0, y: 0, z: 0 },
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  autoRotate = false,
  resetToken,
}: ModelProps & {
  className?: string;
  brightness?: number;
  lightRotation?: LightRotation;
  /** Degrees — corrects the source file's default export orientation. */
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
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
          <Lighting brightness={brightness} lightRotation={lightRotation} />

          <Model
            modelUrl={modelUrl}
            modelType={modelType}
            colorMapUrl={colorMapUrl}
            normalMapUrl={normalMapUrl}
            metallicMapUrl={metallicMapUrl}
            rotationX={rotationX}
            rotationY={rotationY}
            rotationZ={rotationZ}
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
