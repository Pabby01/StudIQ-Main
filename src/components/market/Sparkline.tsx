import { SparklineProps } from '@/types/market';

export function Sparkline({
  data,
  width = 100,
  height = 40,
  color = '#10b981',
  strokeWidth = 1.5,
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded"
        style={{ width, height }}
      >
        <span className="text-xs text-gray-400">No data</span>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  // Handle case where all values are the same
  if (range === 0) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </svg>
    );
  }

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  // Determine if trend is positive or negative
  const firstValue = data[0];
  const lastValue = data[data.length - 1];
  const isPositive = lastValue > firstValue;
  
  const strokeColor = isPositive ? '#10b981' : '#ef4444'; // green or red

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}