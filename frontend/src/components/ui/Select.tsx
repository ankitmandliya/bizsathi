import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, icon, className = '', id, required, children, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="form-field">
        {label && (
          <label htmlFor={selectId} className="form-label">
            {icon && <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--muted)', marginRight: '4px' }}>{icon}</span>}
            {label}
            {required && <span className="form-required">*</span>}
          </label>
        )}
        <div className="select-wrapper">
          <select
            ref={ref}
            id={selectId}
            className={`form-select ${error ? 'error' : ''} ${className}`.trim()}
            {...props}
          >
            {children}
          </select>
        </div>
        {error && <span className="form-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{error}</span>}
        {hint && !error && <span className="form-hint">{hint}</span>}
      </div>
    );
  },
);

Select.displayName = 'Select';

