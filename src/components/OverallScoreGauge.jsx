/**
 * Overall score gauge using MUI X Charts.
 * Uses the GaugeContainer approach you pasted:
 * GaugeContainer + GaugeReferenceArc + GaugeValueArc + custom pointer.
 */
import { GaugeContainer, GaugeReferenceArc, GaugeValueArc, useGaugeState } from '@mui/x-charts/Gauge';

function scoreColor(value) {
  if (value >= 4) return 'var(--forge-theme-success)'; // success
  if (value >= 3) return 'var(--forge-theme-primary)'; // primary-ish
  if (value >= 2) return 'var(--forge-theme-warning)'; // warning-ish
  return '#b00020'; // error-ish
}

function GaugePointer({ color }) {
  const { valueAngle, outerRadius, cx, cy } = useGaugeState();
  if (valueAngle === null) return null;

  const target = {
    x: cx + outerRadius * Math.sin(valueAngle),
    y: cy - outerRadius * Math.cos(valueAngle),
  };

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} />
      <path
        d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  );
}

export default function OverallScoreGauge({
  value,
  max = 5,
  width = 240,
  height = 110,
  // numeric overlay sizing
  valueFontSize = 50,
  titleFontSize = 18,
  // overlay positioning (CSS top percent string)
  valueTopPercent = '98%',
  // label positioning: CSS top percent string
  labelPositionY = '110%',
  labelYAdjust = 0,
}) {
  const clamped = Math.min(max, Math.max(1, Number(value)));
  const displayValue = max <= 10 && Math.floor(clamped) !== clamped ? clamped.toFixed(1) : Math.round(clamped);
  const arcColor = scoreColor(clamped);

  return (
    <div style={{ width, height, position: 'relative' }} role="img" aria-label={`Overall score ${displayValue} out of ${max}`}>
      <GaugeContainer
        width={width}
        height={height}
        startAngle={-110}
        endAngle={110}
        value={clamped}
        valueMin={1}
        valueMax={max}
      >
        <GaugeReferenceArc sx={{ fill: 'rgba(0,0,0,0.08)' }} />
        <GaugeValueArc sx={{ fill: arcColor }} />
        <GaugePointer color={arcColor} />
      </GaugeContainer>

      {/* Numeric overlay (SVG text from MUI is sometimes hard to style precisely across themes) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: valueTopPercent,
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 54, valueFontSize, fontWeight: 400, color: 'var(--forge-theme-text-high, #1a1a1a)' }}>
          {displayValue}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: labelPositionY,
          transform: `translate(-50%, 0)`,
          textAlign: 'center',
          pointerEvents: 'none',
          fontSize: 15,
          fontWeight: 400,
          color: 'var(--forge-theme-text-medium, #666)',
          marginTop: 90,
          whiteSpace: 'nowrap',
        }}
      >
        Overall score
      </div>
    </div>
  );
}
