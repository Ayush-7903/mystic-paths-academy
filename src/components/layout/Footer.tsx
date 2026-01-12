import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary border-t py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold">Spiritual Academy</span>
            </div>
            <p className="text-muted-foreground max-w-md">
              Empowering souls worldwide with sacred teachings and transformative 
              wisdom for spiritual awakening and personal growth.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-primary transition-colors">
                  Courses
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary transition-colors">
                  My Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/auth" className="hover:text-primary transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-primary transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-primary transition-colors">
                  Reset Password
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 text-center text-muted-foreground">
          <p>&copy; {currentYear} Spiritual Academy. All rights reserved.</p>
          <p className="text-sm mt-2">
            Transforming lives through sacred wisdom and spiritual teachings.
          </p>
        </div>
      </div>
    </footer>
  );
};