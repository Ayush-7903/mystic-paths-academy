// ============================================
// Empty State Component
// Reusable empty state presentation
// ============================================

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) => {
  return (
    <Card className="gradient-card shadow-soft text-center p-12">
      <Icon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-2xl mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Link to={actionHref}>
            <Button className="shadow-glow">{actionLabel}</Button>
          </Link>
        ) : (
          <Button onClick={onAction} className="shadow-glow">
            {actionLabel}
          </Button>
        )
      )}
    </Card>
  );
};
