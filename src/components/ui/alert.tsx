import React from 'react';
import clsx from 'clsx';

export const Alert: React.FC<{ variant?: 'default' | 'destructive'; className?: string; children: React.ReactNode }> = ({
  variant = 'default',
  className,
  children,
}) => {
  const styles =
    variant === 'destructive'
      ? 'bg-red-50 border border-red-200 text-red-800'
      : 'bg-gray-50 border border-gray-200 text-gray-800';
  return <div className={clsx('rounded p-3', styles, className)}>{children}</div>;
};

export const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm">{children}</div>
);

export default Alert;
