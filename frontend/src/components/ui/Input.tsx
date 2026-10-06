import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: ReactNode;
  rightElement?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, rightElement, className = '', id, required, style, ...props }, ref) => {
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
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={ref}
            id={inputId}
            className={`form-input ${error ? 'error' : ''} ${className}`.trim()}
            style={{
              ...style,
              paddingRight: rightElement ? '42px' : style?.paddingRight,
            }}
            {...props}
          />
          {rightElement && (
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              {rightElement}
            </div>
          )}
        </div>
        {error && <span className="form-error" style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{error}</span>}
        {hint && !error && <span className="form-hint">{hint}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';

