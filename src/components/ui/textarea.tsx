import React from 'react';
import clsx from 'clsx';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={clsx('border rounded px-3 py-2 w-full min-h-[80px]', className)}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export default Textarea;
