import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Save } from 'lucide-react';
import { getCurrentUser, updateUserProfile, type User as UserType, type UserUpdateRequest } from '@/lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // Profile form state - only personal information
  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setProfileData({
          full_name: userData.full_name || '',
          bio: userData.bio || '',
          avatar_url: userData.avatar_url || '',
        });
      } catch {
        // Not authenticated, redirect to login
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: UserUpdateRequest = {
        ...(profileData.full_name && { full_name: profileData.full_name }),
        ...(profileData.bio && { bio: profileData.bio }),
        ...(profileData.avatar_url && { avatar_url: profileData.avatar_url }),
      };

      const updatedUser = await updateUserProfile(updateData);
      setUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
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
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">{user.full_name || 'User'}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Active</Badge>
                  {user.is_verified && <Badge variant="outline">Verified</Badge>}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details and profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={profileData.avatar_url}
                    onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
