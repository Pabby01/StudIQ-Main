'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

type SheetCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<SheetCtx | null>(null);

export const Sheet: React.FC<{
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children: React.ReactNode;
}> = ({ open, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const value = useMemo<SheetCtx>(
    () => ({
      open: open ?? internalOpen,
      setOpen: (v: boolean) => {
        if (onOpenChange) onOpenChange(v);
        else setInternalOpen(v);
      },
    }),
    [open, internalOpen, onOpenChange]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const SheetTrigger: React.FC<{
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ asChild, className, children }) => {
  const ctx = useContext(Ctx)!;
  if (asChild && React.isValidElement(children)) {
    const el = children as React.ReactElement<{ onClick?: (e: unknown) => void }>;
    return React.cloneElement(el, {
      onClick: (e: unknown) => {
        el.props?.onClick?.(e);
        ctx.setOpen(true);
      },
    });
  }
  return (
    <button className={className} onClick={() => ctx.setOpen(true)}>
      {children}
    </button>
  );
};

export const SheetContent: React.FC<{
  side?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
  children: React.ReactNode;
}> = ({ side = 'right', className, children }) => {
  const ctx = useContext(Ctx)!;
  if (typeof document === 'undefined') return null;
  if (!ctx.open) return null;
  const horizontal = side === 'left' || side === 'right';
  const panelPos =
    side === 'left'
      ? 'left-0 top-0 h-full'
      : side === 'right'
      ? 'right-0 top-0 h-full'
      : side === 'top'
      ? 'top-0 left-0 w-full'
      : 'bottom-0 left-0 w-full';
  const panelSize = horizontal ? 'w-80 max-w-[90vw]' : 'h-80 max-h-[90vh]';
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => ctx.setOpen(false)}
      />
      <div
        className={clsx(
          'absolute bg-white shadow-xl border',
          panelPos,
          panelSize,
          'p-4',
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Sheet;
