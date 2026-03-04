'use client';
import React, { createContext, useContext, useState } from 'react';
import clsx from 'clsx';

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const C = createContext<Ctx | null>(null);

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  return <C.Provider value={{ open, setOpen }}>{children}</C.Provider>;
};

export const DropdownMenuTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({ asChild, children }) => {
  const ctx = useContext(C)!;
  if (asChild && React.isValidElement(children)) {
    const el = children as React.ReactElement<any>;
    return React.cloneElement(el, {
      onClick: (e: any) => {
        el.props?.onClick?.(e);
        ctx.setOpen(!ctx.open);
      },
    });
  }
  return <button onClick={() => ctx.setOpen(!ctx.open)}>{children}</button>;
};

export const DropdownMenuContent: React.FC<{ className?: string; children: React.ReactNode; align?: string }> = ({ className, children }) => {
  const ctx = useContext(C)!;
  if (!ctx.open) return null;
  return <div className={clsx('mt-2 border rounded bg-white shadow-lg', className)}>{children}</div>;
};

export const DropdownMenuItem: React.FC<{ onClick?: () => void; children: React.ReactNode; disabled?: boolean; asChild?: boolean; className?: string }> = ({ onClick, children, disabled, asChild, className }) => {
  if (asChild && React.isValidElement(children)) {
    const el = children as React.ReactElement<any>;
    return React.cloneElement(el, {
      onClick: (e: any) => {
        if (!disabled) el.props?.onClick?.(e);
      },
    });
  }
  return (
    <div
      className={clsx('px-3 py-2 cursor-pointer', disabled ? 'opacity-60 pointer-events-none' : 'hover:bg-gray-100', className)}
      onClick={() => !disabled && onClick?.()}
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
