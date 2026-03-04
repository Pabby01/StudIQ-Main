import React from 'react';
import clsx from 'clsx';

export const Separator: React.FC<{ orientation?: 'horizontal' | 'vertical'; className?: string }> = ({
  orientation = 'horizontal',
  className,
}) => (
  <div
    className={clsx(
      orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px',
      'bg-gray-200',
      className
    )}
  />
);

export default Separator;
