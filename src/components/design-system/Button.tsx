import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AppButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  children: ReactNode;
  variant?: 
    | 'primary' 
    | 'secondary' 
    | 'outline' 
    | 'ghost' 
    | 'spotify' 
    | 'danger' 
    | 'success'
    | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'default' | 'rounded' | 'pill' | 'circle';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
}

const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses = {
  primary: 'bg-white text-black hover:bg-gray-100 focus:ring-gray-300 shadow-sm hover:shadow-md',
  secondary: 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500 shadow-sm hover:shadow-md',
  outline: 'bg-transparent border-2 border-gray-500 text-gray-200 hover:bg-gray-700 hover:border-gray-400 hover:text-white focus:ring-gray-500',
  ghost: 'bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white focus:ring-gray-500',
  spotify: 'bg-spotify-green text-black hover:bg-spotify-green/90 focus:ring-spotify-green shadow-sm hover:shadow-md',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md',
  gradient: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 focus:ring-purple-500 shadow-sm hover:shadow-md',
};

const sizeClasses = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
};

const shapeClasses = {
  default: 'rounded-md',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
  circle: 'rounded-full aspect-square p-0',
};

export const AppButton = ({
  children,
  variant = 'primary',
  size = 'md',
  shape = 'default',
  loading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  className,
  onClick,
  ...props
}: AppButtonProps) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    onClick?.(e);
  };

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    shapeClasses[shape],
    fullWidth && 'w-full',
    (loading || disabled) && 'pointer-events-none',
    className
  );

  const iconSize = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  }[size];

  return (
    <button
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className={cn('animate-spin rounded-full border-2 border-transparent border-t-current', iconSize, LeftIcon && 'mr-2')} />
          {children}
        </>
      ) : (
        <>
          {LeftIcon && <LeftIcon className={cn(iconSize, 'mr-2')} />}
          {children}
          {RightIcon && <RightIcon className={cn(iconSize, 'ml-2')} />}
        </>
      )}
    </button>
  );
};

// Specialized button variants for common use cases
export const PlayButton = ({ children, ...props }: Omit<AppButtonProps, 'variant'>) => (
  <AppButton variant="spotify" leftIcon={require('lucide-react').Play} {...props}>
    {children}
  </AppButton>
);

export const BackButton = ({ children = 'Back', ...props }: Omit<AppButtonProps, 'variant'>) => (
  <AppButton variant="outline" leftIcon={require('lucide-react').ArrowLeft} {...props}>
    {children}
  </AppButton>
);

export const ExternalLinkButton = ({ children, href, ...props }: Omit<AppButtonProps, 'variant' | 'onClick'> & { href: string }) => (
  <AppButton 
    variant="outline" 
    rightIcon={require('lucide-react').ExternalLink}
    onClick={() => window.open(href, '_blank')}
    {...props}
  >
    {children}
  </AppButton>
);

export const IconButton = ({ 
  icon: Icon, 
  label, 
  ...props 
}: Omit<AppButtonProps, 'children' | 'leftIcon' | 'rightIcon'> & { 
  icon: LucideIcon; 
  label: string;
}) => (
  <AppButton 
    shape="circle" 
    aria-label={label}
    title={label}
    {...props}
  >
    <Icon className="w-4 h-4" />
  </AppButton>
);