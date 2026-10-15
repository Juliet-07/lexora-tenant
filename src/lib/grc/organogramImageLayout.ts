/** Tight, zoom-independent framing in chart coordinates, not viewport padding. */
export function getOrganogramImageLayout(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const margin = 32;
  return {
    width: Math.ceil(bounds.width + margin * 2),
    height: Math.ceil(bounds.height + margin * 2),
    transform: `translate(${margin - bounds.x}px, ${margin - bounds.y}px) scale(1)`,
  };
}