'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';

type Ctx = {
  value?: string;
  onValueChange?: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};
const SelectCtx = createContext<Ctx>({ open: false, setOpen: () => {} });

export const Select: React.FC<{ value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; disabled?: boolean }> = ({
  value,
  onValueChange,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const setValue = useCallback(
    (v: string) => {
      onValueChange?.(v);
      setOpen(false);
    },
    [onValueChange]
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return <SelectCtx.Provider value={{ value, onValueChange: setValue, open, setOpen }}>{children}</SelectCtx.Provider>;
};

export const SelectTrigger: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  const ctx = useContext(SelectCtx);
  return (
    <button
      className={clsx('border rounded px-3 py-2 bg-white', className)}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      onClick={() => ctx.setOpen(!ctx.open)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') ctx.setOpen(!ctx.open);
      }}
    >
      {children}
    </button>
  );
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const { value } = useContext(SelectCtx);
  return <span>{value || placeholder || ''}</span>;
};

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ctx = useContext(SelectCtx);
  if (!ctx.open) return null;
  return (
    <div role="listbox" className="mt-2 border rounded bg-white shadow-lg">
      {children}
    </div>
  );
};

export const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const ctx = useContext(SelectCtx);
  return (
    <div
      role="option"
      aria-selected={ctx.value === value}
      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
      onClick={() => ctx.onValueChange?.(value)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') ctx.onValueChange?.(value);
      }}
    >
      {children}
    </div>
  );
};

export default Select;
