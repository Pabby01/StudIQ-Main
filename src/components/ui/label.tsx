import React from 'react';
import clsx from 'clsx';

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, children, ...props }) => (
  <label className={clsx('text-sm font-medium text-gray-700', className)} {...props}>
    {children}
  </label>
);

export default Label;
