export function stepDampedSpring(
  current: number,
  velocity: number,
  target: number,
  delta: number,
  angularFrequency: number,
  dampingRatio: number,
) {
  if (delta <= 0) {
    return { value: current, velocity };
  }

  const displacement = current - target;
  const omega = angularFrequency;
  const zeta = dampingRatio;

  if (zeta < 1) {
    const dampedOmega = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega * delta);
    const cosTerm = Math.cos(dampedOmega * delta);
    const sinTerm = Math.sin(dampedOmega * delta);
    const displacementScale =
      (velocity + zeta * omega * displacement) / dampedOmega;
    const nextDisplacement =
      decay * (displacement * cosTerm + displacementScale * sinTerm);
    const nextVelocity =
      decay *
      (velocity * (cosTerm - (zeta * omega * sinTerm) / dampedOmega) -
        displacement * ((omega * omega * sinTerm) / dampedOmega));

    return {
      value: target + nextDisplacement,
      velocity: nextVelocity,
    };
  }

  if (zeta === 1) {
    const decay = Math.exp(-omega * delta);
    const displacementScale = velocity + omega * displacement;
    const nextDisplacement = decay * (displacement + displacementScale * delta);
    const nextVelocity =
      decay * (velocity - omega * (displacement + displacementScale * delta));

    return {
      value: target + nextDisplacement,
      velocity: nextVelocity,
    };
  }

  const dampedOmega = omega * Math.sqrt(zeta * zeta - 1);
  const r1 = -omega * zeta + dampedOmega;
  const r2 = -omega * zeta - dampedOmega;
  const c1 = (velocity - r2 * displacement) / (r1 - r2);
  const c2 = displacement - c1;
  const nextDisplacement =
    c1 * Math.exp(r1 * delta) + c2 * Math.exp(r2 * delta);
  const nextVelocity =
    c1 * r1 * Math.exp(r1 * delta) + c2 * r2 * Math.exp(r2 * delta);

  return {
    value: target + nextDisplacement,
    velocity: nextVelocity,
  };
}
