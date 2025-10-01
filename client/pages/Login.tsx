import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogIn, Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { login, register, getCurrentUser, setToken, removeToken, type User } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [loginShowPwd, setLoginShowPwd] = useState(false);
  const [signupShowPwd, setSignupShowPwd] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, login: loginUser } = useAuth();

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 1, label: 'Weak', color: 'text-red-500' };
    if (password.length < 8) return { strength: 2, label: 'Fair', color: 'text-yellow-500' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 4, label: 'Strong', color: 'text-green-500' };
    }
    return { strength: 3, label: 'Good', color: 'text-blue-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      toast.error('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await login({ email, password });
      setToken(response.accessToken);
      const userData = await getCurrentUser();
      loginUser(userData);
      setEmail('');
      setPassword('');
      toast.success('Login successful!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      toast.error('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await register({ email, password });
      setError('');
      toast.success('Registration successful! Please login.');
      setEmail('');
      setPassword('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    // Force logout in auth context
    window.location.href = '/login';
  };


  if (user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-10">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>You are logged in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Email: {user.email}</p>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Log in to save locations, or create a new account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <div className="flex items-center justify-center">
              <TabsList>
                <TabsTrigger value="signin">Log in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="signin">
              <div className="space-y-4">
                <div className="text-center text-xs text-muted-foreground">Continue with email</div>
                <form className="grid gap-3" onSubmit={handleLogin}>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={loginShowPwd ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2" aria-label="Toggle password visibility" onClick={() => setLoginShowPwd((v) => !v)}>
                        {loginShowPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Forgot password?</span>
                  </div>
                  <Button className="mt-1 w-full gap-2" type="submit" disabled={loading}>
                    <Mail className="h-4 w-4" /> {loading ? 'Logging in...' : 'Continue'}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <form className="grid gap-3" onSubmit={handleRegister}>
                <div className="grid gap-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <Input 
                    id="signupEmail" 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <div className="relative">
                    <Input 
                      id="signupPassword" 
                      type={signupShowPwd ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2" aria-label="Toggle password visibility" onClick={() => setSignupShowPwd((v) => !v)}>
                      {signupShowPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Use 8+ characters with a mix of letters and numbers.</p>
                    {password && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                                passwordStrength.strength === 2 ? 'bg-yellow-500 w-1/2' :
                                passwordStrength.strength === 3 ? 'bg-blue-500 w-3/4' :
                                passwordStrength.strength === 4 ? 'bg-green-500 w-full' :
                                'w-0'
                              }`}
                            />
                          </div>
                          <span className={`text-xs font-medium ${passwordStrength.color}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button className="mt-1 w-full" type="submit" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">By continuing you agree to our Terms and Privacy Policy.</p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
