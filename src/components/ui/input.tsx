import React from 'react';
import clsx from 'clsx';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx('border rounded px-3 py-2 w-full', className)}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export default Input;
