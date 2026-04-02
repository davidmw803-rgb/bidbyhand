import React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

const baseInputStyles =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0';

const stateStyles = {
  default: 'border-gray-300 focus:border-brand-500 focus:ring-brand-500',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
};

function Input(props: InputProps) {
  const { label, error, helperText, variant = 'text', className, options = [], children, ...rest } = props;
  const id = rest.id || rest.name;
  const state = error ? 'error' : 'default';
  const inputClasses = cn(baseInputStyles, stateStyles[state], className);

  const renderInput = () => {
    if (variant === 'textarea') {
      return (
        <textarea
          id={id}
          rows={4}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
      );
    }

    if (variant === 'select') {
      return (
        <select
          id={id}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        >
          {children ??
            options.map((opt: { value: string; label: string }) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
      );
    }

    const typeMap: Record<string, string> = {
      text: 'text',
      email: 'email',
      phone: 'tel',
      number: 'number',
    };

    return (
      <input
        id={id}
        type={rest.type || typeMap[variant] || 'text'}
        className={inputClasses}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
    );
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      {renderInput()}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

Input.displayName = 'Input';

export { Input };
