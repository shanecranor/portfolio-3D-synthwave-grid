import "./PlaceholderImage.scss";
export const PlaceholderImage = ({
  seed,
  animate,
}: {
  seed: string;
  animate?: boolean;
}) => {
  const numBlobs = 10;
  const blobs = [];
  const hash = cyrb128(seed);
  const rand = splitmix32(hash[0]);
  for (let i = 0; i < numBlobs; i++) {
    blobs.push(
      <div
        key={i}
        className={`blob ${animate ? "animated" : ""}`}
        style={{
          left: `${rand() * 100}%`,
          top: `${rand() * 100}%`,
          width: `${rand() * 120}%`,
          height: `${rand() * 120}%`,
          animationDuration: `${rand() * 10 + 8}s`,
          backgroundColor: `hsl(${rand() * 360}, 100%, 50%)`,
        }}
      />
    );
  }
  return (
    <div className="placeholder-image-outer">
      <div className="placeholder-image">{blobs}</div>
    </div>
  );
};

// seeded random number generator for consistancy
function splitmix32(seed: number) {
  let state = seed | 0;
  return function () {
    state = (state + 0x9e3779b9) | 0;
    let t = state ^ (state >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return (t >>> 0) / 4294967296;
  };
}
function cyrb128(str: string) {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  (h1 ^= h2 ^ h3 ^ h4), (h2 ^= h1), (h3 ^= h1), (h4 ^= h1);
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
//
