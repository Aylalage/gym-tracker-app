export default function LineChart({ points, color = '#3aa9ff', highlightColor = '#d7ff3d', unit = '' }) {
  if (!points || points.length === 0) return null;

  const width = 320;
  const height = 140;
  const padTop = 16;
  const padBottom = 24;
  const padX = 8;

  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const usableW = width - padX * 2;
  const usableH = height - padTop - padBottom;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : padX + (i / (points.length - 1)) * usableW;
    const y = padTop + usableH - ((p.value - min) / range) * usableH;
    return { x, y, value: p.value, label: p.label };
  });

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

  const firstLabel = points[0].label;
  const lastLabel = points[points.length - 1].label;
  const midLabel = points[Math.floor(points.length / 2)]?.label;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <text x={width} y={padTop} textAnchor="end" fontSize="11" fontWeight="700" fill="#9aa0a6">{max}{unit}</text>
      <line x1={0} y1={padTop + 4} x2={width} y2={padTop + 4} stroke="#eee" strokeWidth="1" />
      <text x={width} y={height - padBottom + 14} textAnchor="end" fontSize="11" fontWeight="700" fill="#9aa0a6">{min}{unit}</text>
      <line x1={0} y1={height - padBottom} x2={width} y2={height - padBottom} stroke="#eee" strokeWidth="1" />

      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => {
        const isMax = c.value === max;
        return <circle key={i} cx={c.x} cy={c.y} r={isMax ? 5 : 3.5} fill={isMax ? highlightColor : color} />;
      })}

      <text x={padX} y={height - 4} fontSize="10" fontWeight="700" fill="#9aa0a6">{firstLabel}</text>
      {midLabel && midLabel !== firstLabel && midLabel !== lastLabel && (
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#9aa0a6">{midLabel}</text>
      )}
      <text x={width - padX} y={height - 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#9aa0a6">{lastLabel}</text>
    </svg>
  );
}
