import { Link, NavLink, useInRouterContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CloudSun, MapPin, LogIn, LogOut, Sun, Moon, User } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
  }`;

function SafeLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  const inRouter = useInRouterContext();
  if (inRouter) return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}

function SafeNav({ to, children }: { to: string; children: React.ReactNode }) {
  const inRouter = useInRouterContext();
  if (inRouter) return <NavLink to={to} className={navLinkClass}>{children}</NavLink>;
  return (
    <a href={to} className={navLinkClass({ isActive: false })}>
      {children}
    </a>
  );
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle} className="rounded-full">
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

export default function Header() {
  const { user, loading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully!');
    // Force a full page reload to clear all state
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <SafeLink to="/" className="flex items-center gap-2">
          <CloudSun className="h-6 w-6 text-primary" />
          <span className="font-semibold tracking-tight">WeatherComfort</span>
        </SafeLink>
        <nav className="hidden items-center gap-1 md:flex">
          <SafeNav to="/results">Results</SafeNav>
          <SafeNav to="/model">Model</SafeNav>
          <SafeNav to="/contribute">Contribute</SafeNav>
          <SafeNav to="/about">About</SafeNav>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeButton />
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <SafeLink to="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Profile</span>
                    </SafeLink>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Logout</span>
                  </Button>
                </div>
              ) : (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <SafeLink to="/login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </SafeLink>
                </Button>
              )}
            </>
          )}
          <Button asChild size="sm" className="gap-2">
            <SafeLink to="/results">
              <MapPin className="h-4 w-4" />
              <span>Check Weather</span>
            </SafeLink>
          </Button>
        </div>
      </div>
    </header>
  );
}
