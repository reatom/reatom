export const Defs = () => (
  <svg:defs>
    <svg:pattern
      id="hatch-metal"
      patternUnits="userSpaceOnUse"
      width={5}
      height={5}
      patternTransform="rotate(45)"
    >
      <svg:line
        x1={0}
        y1={0}
        x2={0}
        y2={5}
        stroke="var(--metal)"
        stroke-width={0.8}
      />
    </svg:pattern>

    <svg:pattern
      id="hatch-glass"
      patternUnits="userSpaceOnUse"
      width={7}
      height={7}
      patternTransform="rotate(-45)"
    >
      <svg:rect width={7} height={7} fill="var(--glass-fill)" />
      <svg:line
        x1={0}
        y1={0}
        x2={0}
        y2={7}
        stroke="var(--glass)"
        stroke-opacity={0.35}
        stroke-width={0.7}
      />
    </svg:pattern>

    <svg:marker
      id="arrow"
      viewBox="0 0 10 10"
      refX={9}
      refY={5}
      markerWidth={7}
      markerHeight={7}
      orient="auto-start-reverse"
    >
      <svg:path d="M 0 1.5 L 10 5 L 0 8.5 Z" fill="var(--accent)" />
    </svg:marker>
  </svg:defs>
)
