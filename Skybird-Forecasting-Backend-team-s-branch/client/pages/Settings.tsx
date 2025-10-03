import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  Save,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  Shield,
  Globe,
} from "lucide-react";
import {
  getCurrentUser,
  removeToken,
  updateUserProfile,
  changePassword,
  type User as UserType,
  type UserUpdateRequest,
  type PasswordChangeRequest,
} from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const navigate = useNavigate();

  // Preferences form state
  const [preferencesData, setPreferencesData] = useState({
    temperature_unit: "celsius",
    language: "en",
    timezone: "",
    preferred_city: "",
  });

  // Password change form state
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        console.log("Loading user data:", userData);
        console.log("User preferences:", userData.preferences);
        setPreferencesData({
          temperature_unit: userData.temperature_unit || "celsius",
          language: userData.language || "en",
          timezone: userData.timezone || "",
          preferred_city: userData.preferences?.preferred_city || "",
        });
      } catch {
        // Not authenticated, redirect to login
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    toast.success("Logged out successfully!");
    // Force a full page reload to clear all state
    window.location.href = "/login";
  };

  const handlePreferencesUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: UserUpdateRequest = {
        temperature_unit: preferencesData.temperature_unit,
        language: preferencesData.language,
        ...(preferencesData.timezone && { timezone: preferencesData.timezone }),
        preferences: {
          ...user?.preferences,
          ...(preferencesData.preferred_city && {
            preferred_city: preferencesData.preferred_city,
          }),
        },
      };

      console.log("Updating preferences with data:", updateData);
      const updatedUser = await updateUserProfile(updateData);
      console.log("Updated user data:", updatedUser);
      setUser(updatedUser);
      toast.success("Preferences updated successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update preferences",
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    setSaving(true);

    try {
      const passwordChangeData: PasswordChangeRequest = {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      };

      await changePassword(passwordChangeData);
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      toast.success("Password changed successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change password",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="space-y-6">
        {/* Settings Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and security settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Customize your experience and application settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePreferencesUpdate} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="temperature_unit">Temperature Unit</Label>
                      <Select
                        value={preferencesData.temperature_unit}
                        onValueChange={(value) =>
                          setPreferencesData({
                            ...preferencesData,
                            temperature_unit: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="celsius">Celsius (°C)</SelectItem>
                          <SelectItem value="fahrenheit">
                            Fahrenheit (°F)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={preferencesData.language}
                        onValueChange={(value) =>
                          setPreferencesData({
                            ...preferencesData,
                            language: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={preferencesData.timezone}
                      onChange={(e) =>
                        setPreferencesData({
                          ...preferencesData,
                          timezone: e.target.value,
                        })
                      }
                      placeholder="America/New_York"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_city">Preferred City</Label>
                    <Input
                      id="preferred_city"
                      value={preferencesData.preferred_city}
                      onChange={(e) =>
                        setPreferencesData({
                          ...preferencesData,
                          preferred_city: e.target.value,
                        })
                      }
                      placeholder="New York, NY"
                    />
                  </div>
                  <Button type="submit" disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Preferences"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password for better security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current_password"
                        type={showPassword ? "text" : "password"}
                        value={passwordData.current_password}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            current_password: e.target.value,
                          })
                        }
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.new_password}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            new_password: e.target.value,
                          })
                        }
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirm_password: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <Button type="submit" disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
