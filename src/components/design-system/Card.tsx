import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { IconButton } from './Button';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'muted' | 'gradient' | 'spotify' | 'transparent';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

const baseClasses = 'rounded-lg transition-all duration-200';

const variantClasses = {
  default: 'bg-gray-800 border border-gray-700',
  accent: 'bg-gradient-to-br from-purple-900/50 via-purple-800/30 to-indigo-900/50 border border-purple-600/30',
  muted: 'bg-gray-800/50 border border-gray-600/30',
  gradient: 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30',
  spotify: 'bg-gradient-to-br from-spotify-green/20 to-green-600/20 border border-spotify-green/30',
  transparent: 'bg-transparent border border-gray-600/30',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const hoverClasses = {
  default: 'hover:bg-gray-750 hover:border-gray-600',
  accent: 'hover:border-purple-500/50 hover:bg-purple-800/40',
  muted: 'hover:bg-gray-700/50 hover:border-gray-500/50',
  gradient: 'hover:border-purple-400/50',
  spotify: 'hover:border-spotify-green/50',
  transparent: 'hover:bg-gray-800/30 hover:border-gray-500/50',
};

export const AppCard = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  onClick,
  className,
}: CardProps) => {
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    (hoverable || clickable) && hoverClasses[variant],
    clickable && 'cursor-pointer',
    clickable && 'active:scale-[0.98]',
    className
  );

  const Component = clickable ? 'button' : 'div';

  return (
    <Component 
      className={classes} 
      onClick={clickable ? onClick : undefined}
    >
      {children}
    </Component>
  );
};

export const CardHeader = ({ children, className }: CardHeaderProps) => (
  <div className={cn('mb-4', className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }: CardContentProps) => (
  <div className={cn('flex-1', className)}>
    {children}
  </div>
);

export const CardFooter = ({ children, className }: CardFooterProps) => (
  <div className={cn('mt-4 pt-4 border-t border-gray-600/30', className)}>
    {children}
  </div>
);

// Specialized card variants
export const StatCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
  variant = 'default',
  className,
}: {
  title: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  variant?: CardProps['variant'];
  className?: string;
}) => (
  <AppCard variant={variant} className={className}>
    <div className="text-center">
      {Icon && (
        <Icon className="w-12 h-12 mx-auto mb-4 text-current" />
      )}
      <div className="text-3xl font-bold mb-2 text-white">
        {value}
      </div>
      <div className="text-sm font-medium text-gray-300">
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-400 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  </AppCard>
);

export const PlaylistCard = ({
  image,
  title,
  subtitle,
  year,
  trackCount,
  onClick,
  onPlay,
  onExternalLink,
  className,
}: {
  image: string;
  title: string;
  subtitle?: string;
  year?: number;
  trackCount?: number;
  onClick?: () => void;
  onPlay?: () => void;
  onExternalLink?: () => void;
  className?: string;
}) => (
  <AppCard 
    variant="accent" 
    padding="sm"
    clickable={!!onClick}
    onClick={onClick}
    className={cn('group', className)}
  >
    <div className="relative mb-3">
      <img
        src={image}
        alt={title}
        className="w-full aspect-square rounded-md object-cover"
      />
      {year && (
        <div className="absolute top-2 right-2">
          <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-semibold">
            {year}
          </span>
        </div>
      )}
    </div>
    
    <div className="space-y-2">
      <h3 className="font-semibold text-white text-sm truncate">
        {title}
      </h3>
      
      {(subtitle || trackCount) && (
        <div className="flex items-center justify-between text-xs text-purple-100">
          {subtitle && (
            <span className="truncate">
              {subtitle}
            </span>
          )}
          {trackCount && (
            <span className="flex items-center gap-1">
              <span>{trackCount} tracks</span>
            </span>
          )}
        </div>
      )}
      
      {(onPlay || onExternalLink) && (
        <div className="flex gap-2 pt-2">
          {onPlay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className="flex-1 bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold text-xs py-1 px-2 rounded-md transition-colors"
            >
              Play
            </button>
          )}
          
          {onExternalLink && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExternalLink();
              }}
              className="bg-purple-600/80 border border-purple-400 text-white hover:bg-purple-500 hover:border-purple-300 text-xs py-1 px-2 rounded-md transition-colors"
            >
              <span className="sr-only">Open in Spotify</span>
              ↗
            </button>
          )}
        </div>
      )}
    </div>
  </AppCard>
);

export const TrackCard = ({
  image,
  title,
  artist,
  album,
  duration,
  popularity,
  index,
  onPlay,
  className,
}: {
  image: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  popularity?: number;
  index?: number;
  onPlay?: () => void;
  className?: string;
}) => (
  <div className={cn(
    'flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors group',
    className
  )}>
    <div className="flex items-center gap-4 min-w-0 flex-1">
      {index && (
        <span className="text-gray-400 font-medium w-8 text-right">
          {index}
        </span>
      )}
      
      <img
        src={image}
        alt={album || title}
        className="w-12 h-12 rounded-md object-cover"
      />
      
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white truncate">{title}</p>
        <p className="text-gray-400 text-sm truncate">{artist}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-4">
      {popularity && (
        <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
          {popularity}%
        </span>
      )}
      
      <span className="text-gray-400 text-sm min-w-[3rem] text-right">
        {duration}
      </span>
      
      {onPlay && (
        <IconButton
          icon={Play}
          label="Play track"
          variant="spotify"
          size="md"
          onClick={onPlay}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </div>
  </div>
);