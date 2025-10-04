import { Link, NavLink, useInRouterContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CloudSun, MapPin, LogIn, LogOut, Sun, Moon, User, Settings } from "lucide-react";
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
    <motion.header 
      className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      initial={{ y: -100, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.25, 0.46, 0.45, 0.94],
        type: "spring",
        stiffness: 100,
        damping: 25
      }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            duration: 0.6,
            delay: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          <SafeLink to="/?new=true" className="flex items-center gap-2">
            <CloudSun className="h-6 w-6 text-primary" />
            <span className="font-semibold tracking-tight">SkyBird ForeCasting </span>
          </SafeLink>
        </motion.div>
        <motion.nav 
          className="hidden items-center gap-1 md:flex"
          initial={{ opacity: 0, x: 30, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ 
            duration: 0.7, 
            delay: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94]  
          }}
        >
          {[
            { to: "/results", label: "Results" },
            { to: "/model", label: "Model" },
            { to: "/contribute", label: "Contribute" },
            { to: "/about", label: "About" },
          ].map((item, index) => (
            <motion.div 
              key={item.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.4,
                delay: 0.5 + (index * 0.1),
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <SafeNav to={item.to}>{item.label}</SafeNav>
            </motion.div>
          ))}
        </motion.nav>
        <motion.div 
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ThemeButton />
          {!loading && (
            <>
              {user ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                          <AvatarFallback>
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          {user.full_name && (
                            <p className="font-medium">{user.full_name}</p>
                          )}
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <SafeLink to="/profile" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </SafeLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <SafeLink to="/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </SafeLink>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                    <SafeLink to="/login" className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      <span>Login</span>
                    </SafeLink>
                  </Button>
                </motion.div>
              )}
            </>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <Button asChild size="sm" className="gap-2">
              <SafeLink to="/results">
                <MapPin className="h-4 w-4" />
                <span>Check Weather</span>
              </SafeLink>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.header>
  );
}