// ============================================
// Footer Component
// Consistent site footer
// ============================================

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-secondary py-8 border-t">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <p>&copy; {currentYear} Spiritual Learning Portal. All rights reserved.</p>
      </div>
    </footer>
  );
};
