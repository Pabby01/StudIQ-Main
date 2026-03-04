'use client';
import React from 'react';
import clsx from 'clsx';

export const Dialog: React.FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode }> = ({
  open = true,
  onOpenChange,
  children,
}) => <div data-open={open}>{children}</div>;

export const DialogContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={clsx('fixed inset-0 flex items-center justify-center p-4 z-50', className)}>
    <div className="absolute inset-0 bg-black/40" />
    <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-4">{children}</div>
  </div>
);

export const DialogHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={clsx('mb-3', className)}>{children}</div>
);

export const DialogTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <h3 className={clsx('text-lg font-semibold', className)}>{children}</h3>
);

export const DialogDescription: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <p className={clsx('text-sm text-gray-600', className)}>{children}</p>
);

export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({ asChild, children }) => {
  if (asChild && React.isValidElement(children)) {
    return children as React.ReactElement;
  }
  return <button type="button">{children}</button>;
};

export default Dialog;
