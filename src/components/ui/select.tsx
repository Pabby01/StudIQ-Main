'use client';
import React, { createContext, useContext } from 'react';
import clsx from 'clsx';

type Ctx = {
  value?: string;
  onValueChange?: (v: string) => void;
};
const SelectCtx = createContext<Ctx>({});

export const Select: React.FC<{ value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; disabled?: boolean }> = ({
  value,
  onValueChange,
  children,
}) => {
  return <SelectCtx.Provider value={{ value, onValueChange }}>{children}</SelectCtx.Provider>;
};

export const SelectTrigger: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <button className={clsx('border rounded px-3 py-2 bg-white', className)} type="button">
    {children}
  </button>
);

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const { value } = useContext(SelectCtx);
  return <span>{value || placeholder || ''}</span>;
};

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-2 border rounded bg-white shadow-lg">{children}</div>
);

export const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const ctx = useContext(SelectCtx);
  return (
    <div
      role="option"
      aria-selected={false}
      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
      onClick={() => ctx.onValueChange?.(value)}
    >
      {children}
    </div>
  );
};

export default Select;
