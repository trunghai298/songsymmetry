import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

interface IconProps {
  name?: keyof typeof Icons;
  icon?: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  color?:
    | "primary"
    | "secondary"
    | "muted"
    | "accent"
    | "success"
    | "warning"
    | "error"
    | "spotify"
    | "current";
  className?: string;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
  "2xl": "w-10 h-10",
  "3xl": "w-12 h-12",
};

const colorClasses = {
  primary: "text-white",
  secondary: "text-gray-200",
  muted: "text-gray-400",
  accent: "text-purple-400",
  success: "text-green-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  spotify: "text-spotify-green",
  current: "text-current",
};

export const Icon = ({
  name,
  icon: IconComponent,
  size = "md",
  color = "current",
  className,
  ...props
}: IconProps) => {
  const Component =
    IconComponent || (name ? (Icons[name] as LucideIcon) : null);

  if (!Component) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  const classes = cn(sizeClasses[size], colorClasses[color], className);

  return <Component className={classes} {...props} />;
};

// Predefined icons for common use cases
export const MusicIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.Music} {...props} />
);

export const PlayIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.Play} {...props} />
);

export const PauseIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.Pause} {...props} />
);

export const HeartIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.Heart} {...props} />
);

export const ShareIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.Share2} {...props} />
);

export const MoreIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.MoreHorizontal} {...props} />
);

export const SearchIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.Search} {...props} />
);

export const UserIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.User} {...props} />
);

export const ArrowLeftIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.ArrowLeft} {...props} />
);

export const ExternalLinkIcon = (props: Omit<IconProps, "name">) => (
  <Icon icon={Icons.ExternalLink} {...props} />
);

export const LoadingIcon = (
  props: Omit<IconProps, "name" | "className"> & { className?: string }
) => (
  <Icon
    icon={Icons.Loader2}
    className={cn("animate-spin", props.className)}
    {...props}
  />
);

// Icon with background for avatar-like usage
export const IconAvatar = ({
  icon,
  name,
  size = "lg",
  variant = "default",
  className,
  ...props
}: IconProps & {
  variant?: "default" | "spotify" | "accent" | "muted";
}) => {
  const variantClasses = {
    default: "bg-gray-700 text-gray-200",
    spotify: "bg-spotify-green text-black",
    accent: "bg-purple-600 text-white",
    muted: "bg-gray-600 text-gray-300",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      <Icon
        icon={icon}
        name={name}
        size={
          size === "3xl"
            ? "xl"
            : size === "2xl"
            ? "lg"
            : size === "xl"
            ? "md"
            : "sm"
        }
        color="current"
        {...props}
      />
    </div>
  );
};
