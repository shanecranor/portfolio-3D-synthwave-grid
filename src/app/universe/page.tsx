"use client";
// TODO extract client code
import { useState } from "react";
import "./page.scss";
import { ThreeJsUniverse } from "./ThreeJsUniverse";
import Link from "next/link";

function Page() {
  const [tile, setTile] = useState(0);

  return (
    <>
      <main className="p-home"></main>
      <div className="three-js-canvas">
        <ThreeJsUniverse />
      </div>

      <div
        dangerouslySetInnerHTML={{
          __html: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%"><defs><filter id="filterNoGlitch" color-interpolation-filters="sRGB"><feFlood flood-color="#0060FF" result="COLOR-left"></feFlood><feFlood flood-color="#FF00FF" result="COLOR-right"></feFlood><feImage xlink:href="" result="MASK-left-shift"></feImage><feImage xlink:href="" result="MASK-right-shift"></feImage><feComposite in="SourceGraphic" in2="MASK-left-shift" operator="in" result="LEFT_SHIFT_10"></feComposite><feOffset dx="-3" dy="0" in="LEFT_SHIFT_10" result="LEFT_SHIFT_20"></feOffset><feComposite in="SourceGraphic" in2="MASK-right-shift" operator="in" result="RIGHT_SHIFT_10"></feComposite><feOffset dx="3" dy="0" in="RIGHT_SHIFT_10" result="RIGHT_SHIFT_20"></feOffset><feComposite in="SourceGraphic" in2="MASK-left-shift" operator="out" result="REMAINDER_10"></feComposite><feComposite in="REMAINDER_10" in2="MASK-right-shift" operator="out" result="REMAINDER_20"></feComposite><feMerge result="RESULT_10"><feMergeNode in="RIGHT_SHIFT_20"></feMergeNode><feMergeNode in="LEFT_SHIFT_20"></feMergeNode><feMergeNode in="REMAINDER_20"></feMergeNode></feMerge><feComposite in="COLOR-left" in2="RESULT_10" operator="in" result="RESULT_LEFT_10"></feComposite><feOffset dx="2" dy="2" in="RESULT_LEFT_10" result="RESULT_LEFT_20"></feOffset><feComposite in="COLOR-right" in2="RESULT_10" operator="in" result="RESULT_RIGHT_10"></feComposite><feOffset dx="-1" dy="-1" in="RESULT_RIGHT_10" result="RESULT_RIGHT_20"></feOffset><feGaussianBlur stdDeviation="3 2" x="0%" y="0%" width="100%" height="100%" in="RESULT_RIGHT_20" edgeMode="none" result="blurRight"></feGaussianBlur><feGaussianBlur stdDeviation="3 2" x="0%" y="0%" width="100%" height="100%" in="RESULT_LEFT_20" edgeMode="none" result="blurLeft"></feGaussianBlur><feBlend mode="screen" x="0%" y="0%" width="100%" height="100%" in="blurRight" in2="blurLeft" result="blend"></feBlend><feMerge result="RESULT_20"><feMergeNode in="blend"></feMergeNode><feMergeNode in="RESULT_10"></feMergeNode></feMerge></filter></defs></svg>`,
        }}
      ></div>
    </>
  );
}

export default Page;
