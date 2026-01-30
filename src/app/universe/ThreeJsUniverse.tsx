"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  Noise,
  Scanline,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { BlendFunction } from "postprocessing";
import { CubeCamera, Detailed, Loader, Stars } from "@react-three/drei";
import { NoisySphere } from "@/components/3D/NoisySphere";
import { RX7Model } from "@/components/3D/RX7Model";
import { CameraRig, VIEWS } from "@/components/3D/CameraRig";
import { UniverseTitle } from "@/app/universe/UniverseTitle";

export const ThreeJsUniverse = () => {
  const edgeBrightness = 0.2;
  const edgeColor = useMemo(
    () =>
      new THREE.Color(
        10 * edgeBrightness,
        1.2 * edgeBrightness,
        7 * edgeBrightness,
      ),
    [],
  );
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [noiseAmount, setNoiseAmount] = useState(0.3);
  const [displaceYScale, setDisplaceYScale] = useState(0.0);
  const [poleNoiseFloor, setPoleNoiseFloor] = useState(0.0);
  const [equatorPower, setEquatorPower] = useState(0.85);
  const [yNoiseScale, setYNoiseScale] = useState(0.4);
  const [cylinderMorph, setCylinderMorph] = useState(0.25);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setActiveViewIndex((current) => (current + 1) % VIEWS.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeView = VIEWS[activeViewIndex];
  const noiseControls = [
    {
      label: "Noise",
      value: noiseAmount,
      min: 0,
      max: 0.6,
      step: 0.01,
      onChange: setNoiseAmount,
    },
    {
      label: "Y Displace",
      value: displaceYScale,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: setDisplaceYScale,
    },
    {
      label: "Pole Floor",
      value: poleNoiseFloor,
      min: 0,
      max: 0.8,
      step: 0.01,
      onChange: setPoleNoiseFloor,
    },
    {
      label: "Equator Power",
      value: equatorPower,
      min: 0.5,
      max: 3,
      step: 0.05,
      onChange: setEquatorPower,
    },
    {
      label: "Noise Y Scale",
      value: yNoiseScale,
      min: 0.1,
      max: 1.5,
      step: 0.05,
      onChange: setYNoiseScale,
    },
    {
      label: "Sphere → Cylinder",
      value: cylinderMorph,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: setCylinderMorph,
    },
  ];

  return (
    <>
      <Canvas camera={{ fov: 75 }} dpr={[1 / 2, 1]} gl={{ alpha: false }}>
        <color attach="background" args={["black"]} />
        <CameraRig viewIndex={activeViewIndex} />
        <UniverseTitle viewIndex={activeViewIndex} />
        <Detailed distances={[5, 15]}>
          <NoisySphere
            radius={10}
            widthSegments={350}
            heightSegments={70}
            noiseAmount={noiseAmount}
            edgeColor={edgeColor}
            flatCenter={true}
            poleNoiseFloor={poleNoiseFloor}
            equatorPower={equatorPower}
            yNoiseScale={yNoiseScale}
            displaceYScale={displaceYScale}
            cylinderMorph={cylinderMorph}
          />
          <NoisySphere
            radius={10}
            widthSegments={32}
            heightSegments={32}
            noiseAmount={noiseAmount}
            edgeColor={edgeColor}
            flatCenter={true}
            poleNoiseFloor={poleNoiseFloor}
            equatorPower={equatorPower}
            yNoiseScale={yNoiseScale}
            displaceYScale={displaceYScale}
            cylinderMorph={cylinderMorph}
          />
        </Detailed>
        <Stars
          radius={50}
          depth={500}
          count={2000}
          factor={5}
          saturation={1}
          speed={1}
        />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0}
            intensity={1}
            levels={7}
            mipmapBlur
            opacity={0.9}
          />
          <Noise opacity={0.01} />
          <Vignette
            offset={0.4}
            darkness={0.6}
            blendFunction={BlendFunction.DARKEN}
          />
          <BrightnessContrast brightness={0} contrast={0.1} />
          <Scanline density={1} opacity={0.1} scrollSpeed={0.01} />
        </EffectComposer>
      </Canvas>

      {activeView && (
        <div
          className="universe-view-indicator"
          style={{ position: "absolute", top: 20, left: 20, color: "white" }}
        >
          {`${activeView.label}`}
        </div>
      )}
      {/* <div className="universe-controls">
        {noiseControls.map((control) => (
          <label className="universe-control" key={control.label}>
            <span className="universe-control__label">
              <span>{control.label}</span>
              <span className="universe-control__value">
                {control.value.toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={control.value}
              onChange={(event) =>
                control.onChange(parseFloat(event.target.value))
              }
            />
          </label>
        ))}
      </div> */}
      <Loader />
    </>
  );
};
