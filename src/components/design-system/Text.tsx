import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TextProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  variant?: 
    | 'display-large'
    | 'display-medium' 
    | 'display-small'
    | 'heading-large'
    | 'heading-medium'
    | 'heading-small'
    | 'body-large'
    | 'body-medium'
    | 'body-small'
    | 'caption-large'
    | 'caption-small';
  color?: 
    | 'primary'
    | 'secondary' 
    | 'muted'
    | 'accent'
    | 'success'
    | 'warning'
    | 'error'
    | 'spotify'
    | 'gradient-primary'
    | 'gradient-secondary';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  truncate?: boolean;
}

const variantClasses = {
  'display-large': 'text-6xl font-bold leading-tight',
  'display-medium': 'text-5xl font-bold leading-tight',
  'display-small': 'text-4xl font-bold leading-tight',
  'heading-large': 'text-3xl font-bold leading-snug',
  'heading-medium': 'text-2xl font-bold leading-snug',
  'heading-small': 'text-xl font-semibold leading-snug',
  'body-large': 'text-lg leading-relaxed',
  'body-medium': 'text-base leading-relaxed',
  'body-small': 'text-sm leading-normal',
  'caption-large': 'text-sm leading-tight',
  'caption-small': 'text-xs leading-tight',
};

const colorClasses = {
  primary: 'text-white',
  secondary: 'text-gray-200',
  muted: 'text-gray-400',
  accent: 'text-purple-300',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  spotify: 'text-spotify-green',
  'gradient-primary': 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent',
  'gradient-secondary': 'bg-gradient-to-r from-spotify-green via-purple-400 to-pink-400 bg-clip-text text-transparent',
};

const weightClasses = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const Text = ({
  children,
  className,
  as: Component = 'p',
  variant = 'body-medium',
  color = 'primary',
  weight,
  align,
  truncate = false,
  ...props
}: TextProps) => {
  const classes = cn(
    variantClasses[variant],
    colorClasses[color],
    weight && weightClasses[weight],
    align && alignClasses[align],
    truncate && 'truncate',
    className
  );

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

// Specialized heading components for better semantics
export const Heading = ({ children, level = 2, ...props }: Omit<TextProps, 'as'> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) => {
  const variants = {
    1: 'display-large',
    2: 'heading-large',
    3: 'heading-medium',
    4: 'heading-small',
    5: 'body-large',
    6: 'body-medium',
  } as const;

  return (
    <Text
      as={`h${level}` as any}
      variant={variants[level]}
      {...props}
    >
      {children}
    </Text>
  );
};

// Display text for hero sections
export const Display = ({ children, size = 'medium', ...props }: Omit<TextProps, 'variant'> & { size?: 'small' | 'medium' | 'large' }) => {
  const variants = {
    small: 'display-small',
    medium: 'display-medium',
    large: 'display-large',
  } as const;

  return (
    <Text variant={variants[size]} {...props}>
      {children}
    </Text>
  );
};

// Caption text for small details
export const Caption = ({ children, size = 'large', ...props }: Omit<TextProps, 'variant'> & { size?: 'small' | 'large' }) => {
  const variants = {
    small: 'caption-small',
    large: 'caption-large',
  } as const;

  return (
    <Text variant={variants[size]} color="muted" {...props}>
      {children}
    </Text>
  );
};