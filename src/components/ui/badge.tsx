import React from 'react';
import clsx from 'clsx';

export type BadgeProps = {
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  className?: string;
  children: React.ReactNode;
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  className,
  children,
}) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    outline: 'border border-gray-300 text-gray-700',
    destructive: 'bg-red-100 text-red-700',
    secondary: 'bg-gray-100 text-gray-800',
  } as const;
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
