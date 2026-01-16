"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./page.scss";
import { fragmentShaderSource, vertexShaderSource } from "./shaders";

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS )) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export default function ShaderGridPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settingsRef = useRef({
    gridScale: 6,
    horizon: 0.38,
    glowStrength: 1,
    speed: 0.7,
  });
  const [settings, setSettings] = useState(settingsRef.current);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const program = createProgram(
      gl,
      vertexShaderSource,
      fragmentShaderSource,
    );
    if (!program) return;

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const gridScaleLocation = gl.getUniformLocation(program, "u_gridScale");
    const horizonLocation = gl.getUniformLocation(program, "u_horizon");
    const glowStrengthLocation = gl.getUniformLocation(
      program,
      "u_glowStrength",
    );
    const speedLocation = gl.getUniformLocation(program, "u_speed");

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    let animationFrame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      return { width, height };
    };

    const render = (time: number) => {
      const { width, height } = resize();
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      const { gridScale, horizon, glowStrength, speed } = settingsRef.current;
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform2f(resolutionLocation, width, height);
      gl.uniform1f(gridScaleLocation, gridScale);
      gl.uniform1f(horizonLocation, horizon);
      gl.uniform1f(glowStrengthLocation, glowStrength);
      gl.uniform1f(speedLocation, speed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const updateSetting = (
    key: keyof typeof settingsRef.current,
    value: number,
  ) => {
    settingsRef.current = { ...settingsRef.current, [key]: value };
    setSettings(settingsRef.current);
  };

  return (
    <div className="p-shader-grid">
      <canvas ref={canvasRef} className="shader-grid-canvas" />
      <div className="shader-grid-overlay">
        <div className="shader-grid-copy">
          <p>Raw WebGL shader grid experiment.</p>
          <p>No ThreeJS, just a full-screen fragment shader.</p>
        </div>
        <div className="shader-grid-controls">
          <label>
            Grid scale
            <input
              type="range"
              min="2"
              max="12"
              step="0.1"
              value={settings.gridScale}
              onChange={(event) =>
                updateSetting("gridScale", Number(event.target.value))
              }
            />
          </label>
          <label>
            Horizon
            <input
              type="range"
              min="0.25"
              max="0.6"
              step="0.01"
              value={settings.horizon}
              onChange={(event) =>
                updateSetting("horizon", Number(event.target.value))
              }
            />
          </label>
          <label>
            Glow
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.05"
              value={settings.glowStrength}
              onChange={(event) =>
                updateSetting("glowStrength", Number(event.target.value))
              }
            />
          </label>
          <label>
            Speed
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={settings.speed}
              onChange={(event) =>
                updateSetting("speed", Number(event.target.value))
              }
            />
          </label>
        </div>
        <Link href="/" className="shader-grid-link">
          Back home
        </Link>
      </div>
    </div>
  );
}
