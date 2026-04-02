import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'text' | 'email' | 'phone' | 'number';
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'textarea';
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'select';
  options?: { value: string; label: string }[];
}

type FormInputProps = InputProps | TextareaProps | SelectProps;

const baseInputStyles =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0';

const stateStyles = {
  default: 'border-gray-300 focus:border-brand-500 focus:ring-brand-500',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
};

const Input = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  FormInputProps
>((props, ref) => {
  const { label, error, helperText, variant = 'text', className, ...rest } = props;
  const id = rest.id || rest.name;
  const state = error ? 'error' : 'default';

  const inputClasses = cn(baseInputStyles, stateStyles[state], className);

  const renderInput = () => {
    if (variant === 'textarea') {
      const { ...textareaRest } = rest as TextareaProps;
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={id}
          rows={4}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...textareaRest}
        />
      );
    }

    if (variant === 'select') {
      const { options = [], children, ...selectRest } = rest as SelectProps;
      return (
        <select
          ref={ref as React.Ref<HTMLSelectElement>}
          id={id}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...selectRest}
        >
          {children ??
            options.map((opt) => (
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

    const { ...inputRest } = rest as InputProps;
    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        id={id}
        type={typeMap[variant] || 'text'}
        className={inputClasses}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputRest}
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
});

Input.displayName = 'Input';

export { Input };
