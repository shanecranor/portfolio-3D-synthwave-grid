import { VIEWS } from "@/components/3D/CameraRig";

const DEFAULT_VIEW_POSITION = VIEWS[0].position;
const DEFAULT_ANCHOR_ANGLE =
  Math.atan2(DEFAULT_VIEW_POSITION[2], DEFAULT_VIEW_POSITION[1]) - 0.2;
const DEFAULT_ANCHOR_RADIUS =
  Math.hypot(DEFAULT_VIEW_POSITION[1], DEFAULT_VIEW_POSITION[2]) + 0.1;
const UNIVERSE_MIN_VIEWPORT_WIDTH = 6;
const UNIVERSE_MAX_VIEWPORT_WIDTH = 24;
const TITLE_MIN_SCALE_FACTOR = 0.15;
const TITLE_MAX_SCALE_FACTOR = 0.8;

export const DEFAULT_UNIVERSE_X_OFFSET = -0.2;
export const DEFAULT_UNIVERSE_TITLE_SCALE = 0.3;
export const DEFAULT_UNIVERSE_ANCHOR_Y =
  Math.cos(DEFAULT_ANCHOR_ANGLE) * DEFAULT_ANCHOR_RADIUS;
export const DEFAULT_UNIVERSE_ANCHOR_Z =
  Math.sin(DEFAULT_ANCHOR_ANGLE) * DEFAULT_ANCHOR_RADIUS;

export function getUniverseTitleScale(
  viewportWidth: number,
  textScale = DEFAULT_UNIVERSE_TITLE_SCALE,
) {
  const t = Math.min(
    Math.max(
      (viewportWidth - UNIVERSE_MIN_VIEWPORT_WIDTH) /
        (UNIVERSE_MAX_VIEWPORT_WIDTH - UNIVERSE_MIN_VIEWPORT_WIDTH),
      0,
    ),
    1,
  );

  return (
    textScale *
    (TITLE_MIN_SCALE_FACTOR +
      (TITLE_MAX_SCALE_FACTOR - TITLE_MIN_SCALE_FACTOR) * t)
  );
}

export function getUniverseTitleAnchorX(
  viewportWidth: number,
  textScale = DEFAULT_UNIVERSE_TITLE_SCALE,
) {
  return DEFAULT_UNIVERSE_X_OFFSET * getUniverseTitleScale(viewportWidth, textScale);
}
