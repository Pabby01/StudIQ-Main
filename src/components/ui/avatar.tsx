import React from 'react';
import clsx from 'clsx';

export const Avatar: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={clsx('inline-flex items-center justify-center rounded-full bg-gray-200 overflow-hidden', className)}>
    {children}
  </div>
);

export const AvatarFallback: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={clsx('w-full h-full flex items-center justify-center', className)}>{children}</div>
);

export default Avatar;
