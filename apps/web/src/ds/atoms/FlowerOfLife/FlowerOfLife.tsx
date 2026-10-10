/**
 * A flor da vida como figura única — login, estado vazio e marca d'água.
 * Ladrilhada, no papel das telas internas, ela é outra coisa: uma malha que
 * fecha nas bordas, e mora em `styles/marca.css`.
 */
export function FlowerOfLife() {
  const centros: readonly [number, number][] = [
    [100, 100],
    [100, 66],
    [100, 134],
    [129, 83],
    [129, 117],
    [71, 83],
    [71, 117],
  ];
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}
    >
      <g fill="none" stroke="var(--color-label)" strokeWidth="1.4">
        {centros.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={34} />
        ))}
      </g>
    </svg>
  );
}
