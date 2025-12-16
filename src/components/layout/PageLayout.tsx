// ============================================
// Page Layout Component
// Consistent page structure wrapper
// ============================================

import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface PageLayoutProps {
  children: ReactNode;
  loading?: boolean;
  loadingMessage?: string;
}

export const PageLayout = ({ 
  children, 
  loading = false,
  loadingMessage,
}: PageLayoutProps) => {
  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <LoadingSpinner fullScreen message={loadingMessage} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      {children}
    </div>
  );
};

// ============================================
// Page Header Component
// Consistent page header styling
// ============================================

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export const PageHeader = ({ title, description, children }: PageHeaderProps) => {
  return (
    <div className="pt-24 pb-16 gradient-hero">
      <div className="container mx-auto px-4">
        {children}
        <h1 className="text-5xl md:text-6xl mb-4">{title}</h1>
        {description && (
          <p className="text-xl text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
};

// ============================================
// Page Content Component
// Consistent page content wrapper
// ============================================

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export const PageContent = ({ children, className = '' }: PageContentProps) => {
  return (
    <div className={`container mx-auto px-4 py-16 ${className}`}>
      {children}
    </div>
  );
};
