import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  style,
  disabled,
  ...rest
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    transition: 'var(--transition-fast)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    ...style
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 10px', fontSize: '12px' },
    md: { padding: '8px 14px', fontSize: '13px' },
    lg: { padding: '10px 18px', fontSize: '14px' }
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--navy-800)',
      color: '#FFFFFF',
      border: '1px solid var(--navy-900)',
      boxShadow: 'var(--shadow-xs)'
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-xs)'
    },
    success: {
      backgroundColor: 'var(--status-autopass)',
      color: '#FFFFFF',
      border: '1px solid #047857',
      boxShadow: 'var(--shadow-xs)'
    },
    warning: {
      backgroundColor: 'var(--status-review)',
      color: '#FFFFFF',
      border: '1px solid #B45309',
      boxShadow: 'var(--shadow-xs)'
    },
    danger: {
      backgroundColor: 'var(--status-manual)',
      color: '#FFFFFF',
      border: '1px solid #BE123C',
      boxShadow: 'var(--shadow-xs)'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent'
    }
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant]
      }}
      disabled={disabled}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
};
