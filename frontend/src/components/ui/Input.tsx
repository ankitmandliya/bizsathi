import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', id, required, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="form-field">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {icon && <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--muted)', marginRight: '4px' }}>{icon}</span>}
            {label}
            {required && <span className="form-required">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`form-input ${error ? 'error' : ''} ${className}`.trim()}
          {...props}
        />
        {error && <span className="form-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{error}</span>}
        {hint && !error && <span className="form-hint">{hint}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';

