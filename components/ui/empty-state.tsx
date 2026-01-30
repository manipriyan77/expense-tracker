import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted/80 p-6 mb-5">
        <Icon className="h-14 w-14 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="default">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Animated Empty State with illustration
interface AnimatedEmptyStateProps {
  illustration?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AnimatedEmptyState({
  illustration = "💰",
  title,
  description,
  actionLabel,
  onAction,
}: AnimatedEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-8xl mb-6 animate-bounce">{illustration}</div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 mb-8 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
