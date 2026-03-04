import React from 'react';
import clsx from 'clsx';

export const Progress: React.FC<{ value: number; className?: string; style?: React.CSSProperties }> = ({ value, className, style }) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('w-full h-2 bg-gray-200 rounded', className)} style={style}>
      <div
        className="h-2 bg-blue-600 rounded"
        style={{ width: `${clamped}%` }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        role="progressbar"
      />
    </div>
  );
};

export default Progress;
