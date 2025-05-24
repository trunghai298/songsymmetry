import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StackProps {
  children: ReactNode;
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  direction?: 'horizontal' | 'vertical';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  className?: string;
}

interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

interface GridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12 | 'auto';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 12 | 'auto';
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 12 | 'auto';
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 12 | 'auto';
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 12 | 'auto';
  };
  className?: string;
}

interface SectionProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'muted' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Spacing utilities
const spacingClasses = {
  xs: '2',
  sm: '3',
  md: '4',
  lg: '6',
  xl: '8',
  '2xl': '10',
  '3xl': '12',
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

const gapClasses = {
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

// Stack component for flexible layouts
export const Stack = ({
  children,
  spacing = 'md',
  direction = 'vertical',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
}: StackProps) => {
  const isVertical = direction === 'vertical';
  
  const alignClasses = {
    start: isVertical ? 'items-start' : 'justify-start',
    center: isVertical ? 'items-center' : 'justify-center',
    end: isVertical ? 'items-end' : 'justify-end',
    stretch: isVertical ? 'items-stretch' : 'justify-stretch',
  };

  const justifyClasses = {
    start: isVertical ? 'justify-start' : 'items-start',
    center: isVertical ? 'justify-center' : 'items-center',
    end: isVertical ? 'justify-end' : 'items-end',
    between: isVertical ? 'justify-between' : 'items-between',
    around: isVertical ? 'justify-around' : 'items-around',
    evenly: isVertical ? 'justify-evenly' : 'items-evenly',
  };

  const classes = cn(
    'flex',
    isVertical ? 'flex-col' : 'flex-row',
    isVertical ? `space-y-${spacingClasses[spacing]}` : `space-x-${spacingClasses[spacing]}`,
    alignClasses[align],
    justifyClasses[justify],
    wrap && 'flex-wrap',
    className
  );

  return <div className={classes}>{children}</div>;
};

// Container component for consistent max-widths and centering
export const AppContainer = ({
  children,
  size = 'xl',
  padding = 'md',
  className,
}: ContainerProps) => {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  const classes = cn(
    'mx-auto',
    sizeClasses[size],
    paddingClasses[padding],
    className
  );

  return <div className={classes}>{children}</div>;
};

// Grid component for responsive layouts
export const Grid = ({
  children,
  cols = 'auto',
  gap = 'md',
  responsive,
  className,
}: GridProps) => {
  const getColClass = (colCount: GridProps['cols']) => {
    if (colCount === 'auto') return 'grid-cols-auto';
    return `grid-cols-${colCount}`;
  };

  const classes = cn(
    'grid',
    getColClass(cols),
    gapClasses[gap],
    responsive?.sm && `sm:${getColClass(responsive.sm)}`,
    responsive?.md && `md:${getColClass(responsive.md)}`,
    responsive?.lg && `lg:${getColClass(responsive.lg)}`,
    responsive?.xl && `xl:${getColClass(responsive.xl)}`,
    className
  );

  return <div className={classes}>{children}</div>;
};

// Section component for page sections with consistent styling
export const Section = ({
  children,
  variant = 'default',
  padding = 'lg',
  className,
}: SectionProps) => {
  const variantClasses = {
    default: 'bg-transparent',
    accent: 'bg-gradient-to-br from-purple-900/50 via-purple-800/30 to-indigo-900/50 border border-purple-600/30 rounded-xl',
    muted: 'bg-gray-800/50 border border-gray-600/30 rounded-xl',
    gradient: 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl',
  };

  const classes = cn(
    variantClasses[variant],
    paddingClasses[padding],
    className
  );

  return <section className={classes}>{children}</section>;
};

// Flexbox utilities
export const Flex = ({
  children,
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  gap = 'md',
  className,
}: {
  children: ReactNode;
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) => {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  const classes = cn(
    'flex',
    directionClasses[direction],
    alignClasses[align],
    justifyClasses[justify],
    wrap && 'flex-wrap',
    gapClasses[gap],
    className
  );

  return <div className={classes}>{children}</div>;
};

// Center component for quick centering
export const Center = ({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) => (
  <div className={cn('flex items-center justify-center', className)}>
    {children}
  </div>
);

// Spacer component for adding space between elements
export const Spacer = ({ 
  size = 'md',
  direction = 'vertical'
}: { 
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  direction?: 'vertical' | 'horizontal';
}) => {
  const classes = direction === 'vertical' 
    ? `h-${spacingClasses[size]}` 
    : `w-${spacingClasses[size]}`;
  
  return <div className={classes} />;
};