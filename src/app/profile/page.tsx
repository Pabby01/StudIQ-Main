'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/AppLayout';
import AuthWrapper from '@/components/AuthWrapper';
import { secureLogger } from '@/lib/secure-logger';
import { userProfileManager, formatDisplayName, generateAvatar, getGreeting, UserProfile } from '@/lib/user-data';
import { 
  User, 
  Mail, 
  Phone, 
  Wallet, 
  Edit3, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Settings,
  Shield,
  Bell,
  Globe,
  Loader2
} from 'lucide-react';

export default function ProfilePage() {
  const { user, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (authenticated && wallets.length > 0) {
        const walletAddress = wallets[0].address;
        const userProfile = await userProfileManager.getProfile(walletAddress);
        setProfile(userProfile);
        if (userProfile) {
          setEditedName(userProfile.displayName);
        }
      }
    };
    
    loadProfile();
  }, [authenticated, wallets]);

  const handleSaveProfile = async () => {
    setNameError(null);
    setSaveSuccess(false);
    
    if (!editedName.trim()) {
      setNameError('Please enter your name');
      return;
    }

    if (editedName.trim().length < 2) {
      setNameError('Name must be at least 2 characters long');
      return;
    }

    if (!wallets.length || !profile) {
      setNameError('No wallet or profile found');
      return;
    }

    setIsLoading(true);

    try {
      const formattedName = formatDisplayName(editedName.trim());
      const updatedProfile = await userProfileManager.updateProfile(profile.walletAddress, {
        displayName: formattedName
      });
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      setNameError('Failed to update profile. Please try again.');
      secureLogger.error('Profile update error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName(profile?.displayName || '');
    setNameError(null);
  };

  // Show loading while Privy is initializing
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-2">
              Manage your personal information and preferences
            </p>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-6 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Basic Information</span>
                  </CardTitle>
                  <CardDescription>
                    Your personal details and display preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Avatar and Name */}
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="text-lg font-semibold bg-blue-100 text-blue-600">
                        {profile ? generateAvatar(profile.displayName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-4">
                      {profile && (
                        <div className="text-sm text-gray-600">
                          {getGreeting(profile.displayName)}
                        </div>
                      )}
                      
                      {/* Display Name */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Display Name
                        </label>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editedName}
                              onChange={(e) => {
                                setEditedName(e.target.value);
                                setNameError(null);
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveProfile();
                                }
                              }}
                              className={nameError ? 'border-red-300 focus:border-red-500' : ''}
                              placeholder="Enter your full name"
                            />
                            {nameError && (
                              <p className="text-sm text-red-600">{nameError}</p>
                            )}
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={handleSaveProfile}
                                disabled={isLoading || !editedName.trim()}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Save className="h-4 w-4 mr-1" />
                                )}
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isLoading}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-medium">
                              {profile?.displayName || 'Not set'}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsEditing(true)}
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Account Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Account Information</h3>
                    
                    {/* Email */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Email</div>
                          <div className="text-sm text-gray-600">
                            {user?.email?.address || 'Not connected'}
                          </div>
                        </div>
                      </div>
                      <Badge variant={user?.email?.address ? 'default' : 'secondary'}>
                        {user?.email?.address ? 'Connected' : 'Not connected'}
                      </Badge>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Phone</div>
                          <div className="text-sm text-gray-600">
                            {user?.phone?.number || 'Not connected'}
                          </div>
                        </div>
                      </div>
                      <Badge variant={user?.phone?.number ? 'default' : 'secondary'}>
                        {user?.phone?.number ? 'Connected' : 'Not connected'}
                      </Badge>
                    </div>

                    {/* Wallet */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Wallet className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Wallet</div>
                          <div className="text-sm text-gray-600 font-mono">
                            {wallets.length > 0 
                              ? `${wallets[0].address.slice(0, 6)}...${wallets[0].address.slice(-4)}`
                              : 'Not connected'
                            }
                          </div>
                        </div>
                      </div>
                      <Badge variant={wallets.length > 0 ? 'default' : 'secondary'}>
                        {wallets.length > 0 ? 'Connected' : 'Not connected'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Customize your StudIQ experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Theme */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">Theme</div>
                        <div className="text-sm text-gray-600">Light mode</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Default</Badge>
                  </div>

                  {/* Notifications */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">Notifications</div>
                        <div className="text-sm text-gray-600">Enabled</div>
                      </div>
                    </div>
                    <Badge variant="default">On</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {profile ? '100%' : '0%'}
                    </div>
                    <div className="text-sm text-gray-600">Profile Complete</div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Display Name</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Wallet Connected</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Email Verified</span>
                      {user?.email?.address ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Security</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Your account is secured with:
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Wallet Authentication</span>
                    </div>
                    {user?.email?.address && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Email Verification</span>
                      </div>
                    )}
                    {user?.phone?.number && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Phone Verification</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthWrapper>
  );
}