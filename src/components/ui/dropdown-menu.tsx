'use client';
import React, { createContext, useContext, useState } from 'react';
import clsx from 'clsx';

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const C = createContext<Ctx | null>(null);

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div role="menu" aria-hidden={!open}>
      <C.Provider value={{ open, setOpen }}>{children}</C.Provider>
    </div>
  );
};

export const DropdownMenuTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({ asChild, children }) => {
  const ctx = useContext(C)!;
  if (asChild && React.isValidElement(children)) {
    const el = children as React.ReactElement<Record<string, unknown>>;
    const ariaProps: Record<string, unknown> = { 'aria-haspopup': 'menu', 'aria-expanded': ctx.open };
    return React.cloneElement(el, {
      onClick: (e: unknown) => {
        const handler = (el.props as { onClick?: (e: unknown) => void }).onClick;
        handler?.(e);
        ctx.setOpen(!ctx.open);
      },
      ...ariaProps,
      onKeyDown: (e: unknown) => {
        const ev = e as KeyboardEvent;
        if (ev.key === 'Enter' || ev.key === ' ') ctx.setOpen(!ctx.open);
        const kd = (el.props as { onKeyDown?: (e: unknown) => void }).onKeyDown;
        if (typeof kd === 'function') kd(e);
      },
    });
  }
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') ctx.setOpen(!ctx.open);
        if (e.key === 'Escape') ctx.setOpen(false);
      }}
    >
      {children}
    </button>
  );
};

export const DropdownMenuContent: React.FC<{ className?: string; children: React.ReactNode; align?: string }> = ({ className, children }) => {
  const ctx = useContext(C)!;
  if (!ctx.open) return null;
  return <div role="menu" className={clsx('mt-2 border rounded bg-white shadow-lg', className)}>{children}</div>;
};

export const DropdownMenuItem: React.FC<{ onClick?: () => void; children: React.ReactNode; disabled?: boolean; asChild?: boolean; className?: string }> = ({ onClick, children, disabled, asChild, className }) => {
  if (asChild && React.isValidElement(children)) {
    const el = children as React.ReactElement<{ onClick?: (e: unknown) => void }>;
    return React.cloneElement(el, {
      onClick: (e: unknown) => {
        if (!disabled) el.props?.onClick?.(e);
      },
    });
  }
  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={clsx('px-3 py-2 cursor-pointer', disabled ? 'opacity-60 pointer-events-none' : 'hover:bg-gray-100', className)}
      onClick={() => !disabled && onClick?.()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
    >
      {children}
    </div>
  );
};

export const DropdownMenuSeparator: React.FC = () => <div className="h-px bg-gray-200 my-1" />;
export const DropdownMenuLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx('px-3 py-1 text-xs text-gray-500', className)}>{children}</div>
);

export default DropdownMenu;
