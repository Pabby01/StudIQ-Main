/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletAddress } from '@/lib/wallet-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/AppLayout';
import AuthWrapper from '@/components/AuthWrapper';
import { useAuth } from '@/hooks/useAuth';
import { secureLogger } from '@/lib/secure-logger';
import { userProfileManager, patchProfile, validateProfileUpdate, formatDisplayName, generateAvatar, getGreeting, UserProfile } from '@/lib/user-data';
import { validateImageFile, getUploadErrorMessage } from '@/lib/image-upload';
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
  Loader2,
  Camera,
  Twitter,
  Github,
  Linkedin,
  Globe as GlobeIcon,
  Lock
} from 'lucide-react';

export default function ProfilePage() {
  const { user, authenticated, ready, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = useWalletAddress();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshUser } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedSocials, setEditedSocials] = useState({
    twitter: '',
    github: '',
    linkedin: '',
    website: ''
  });
  const [editedUniversity, setEditedUniversity] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [editedPhone, setEditedPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (authenticated && walletAddress.isValid) {
        const walletAddr = walletAddress.address!;
        let userProfile = await userProfileManager.getProfile(walletAddr);
        
        // If no profile exists, create one with default values
        if (!userProfile && user) {
          try {
            const defaultDisplayName = user.email?.address?.split('@')[0] || 
                                     `User${walletAddr.slice(-4)}`;
            userProfile = await userProfileManager.createProfile(
              walletAddr, 
              defaultDisplayName, 
              user.email?.address
            );
          } catch (error) {
            secureLogger.error('Error creating default profile', error);
            // Create a minimal profile object for UI purposes
            userProfile = {
              id: walletAddr,
              walletAddress: walletAddr,
              displayName: user.email?.address?.split('@')[0] || `User${walletAddr.slice(-4)}`,
              email: user.email?.address,
              phone: user.phone?.number,
              createdAt: new Date(),
              updatedAt: new Date(),
              preferences: {
                theme: 'light' as const,
                notifications: true,
                language: 'en'
              }
            };
          }
        }
        
        setProfile(userProfile);
        if (userProfile) {
          setEditedName(userProfile.displayName || '');
          setEditedBio(userProfile.bio || '');
          setEditedUniversity(userProfile.university || '');
          setEditedPhone(userProfile.phone || '');
          setEditedSocials({
            twitter: userProfile.twitter || '',
            github: userProfile.github || '',
            linkedin: userProfile.linkedin || '',
            website: userProfile.website || ''
          });
        }
      }
    };
    
    loadProfile();
  }, [authenticated, walletAddress.isValid, walletAddress.address, user]);

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

    if (!walletAddress.isValid || !profile) {
      setNameError('No wallet or profile found');
      return;
    }

    setIsLoading(true);

    try {
      const formattedName = formatDisplayName(editedName.trim());
      
      // Prepare updates
      const updates = {
        displayName: formattedName,
        bio: editedBio.trim(),
        university: editedUniversity.trim(),
        phone: editedPhone.trim(),
        twitter: editedSocials.twitter.trim(),
        github: editedSocials.github.trim(),
        linkedin: editedSocials.linkedin.trim(),
        website: editedSocials.website.trim()
      };

      // Validate updates
      const validation = validateProfileUpdate(updates);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Use the comprehensive patch function
      const updatedProfile = await patchProfile(walletAddress.address!, updates, {
        validate: false, // Already validated above
        preserveSocial: true // Preserve existing social fields
      });
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await refreshUser();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update profile';
      setNameError(errorMsg);
      secureLogger.error('Profile update failed', {
        userId: walletAddress.address,
        error: errorMsg,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedName(profile?.displayName || '');
    setEditedBio(profile?.bio || '');
    setEditedUniversity(profile?.university || '');
    setEditedPhone(profile?.phone || '');
    setEditedSocials({
      twitter: profile?.twitter || '',
      github: profile?.github || '',
      linkedin: profile?.linkedin || '',
      website: profile?.website || ''
    });
    setIsEditing(false);
    setIsAddingPhone(false);
    setNameError(null);
    setPhoneError(null);
  };

  const handleSavePhone = async () => {
    setPhoneError(null);
    
    if (!editedPhone.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(editedPhone.trim().replace(/[\s\-\(\)]/g, ''))) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    if (!profile) {
      setPhoneError('No profile found');
      return;
    }

    setIsLoading(true);

    try {
      // Validate phone number
      const phoneValidation = validateProfileUpdate({ phone: editedPhone.trim() });
      if (!phoneValidation.isValid) {
        throw new Error(`Phone validation failed: ${phoneValidation.errors.join(', ')}`);
      }

      // Use the comprehensive patch function for phone update
      const updatedProfile = await patchProfile(profile.walletAddress, {
        phone: editedPhone.trim()
      }, {
        validate: false, // Already validated above
        preserveSocial: true // Preserve existing social fields
      });
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        setIsAddingPhone(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update phone number';
      setPhoneError(errorMsg);
      secureLogger.error('Phone update failed', {
        userId: profile?.walletAddress,
        error: errorMsg,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPhone = () => {
    setEditedPhone(profile?.phone || '');
    setIsAddingPhone(false);
    setPhoneError(null);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !walletAddress.isValid) return;

    try {
      setUploadingAvatar(true);
      setUploadProgress(0);

      // Get Privy token for authentication
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      // Upload image
      const formData = new FormData();
      formData.append('image', file);
      formData.append('user_id', walletAddress.address!);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      
      // Update profile with new avatar URL using comprehensive patch function
      if (profile) {
        const updatedProfile = await patchProfile(walletAddress.address!, {
          avatarUrl: result.imageUrl || result.url
        }, {
          validate: true, // Validate the avatar URL
          preserveSocial: true // Preserve existing social fields
        });
        
        if (updatedProfile) {
          setProfile(updatedProfile);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
          await refreshUser();
        }
      }

    } catch (err) {
      setAvatarError(getUploadErrorMessage(err));
      secureLogger.error('Avatar upload error', err, { walletAddress: walletAddress.address });
    } finally {
      setUploadingAvatar(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    if (!uploadingAvatar) {
      fileInputRef.current?.click();
    }
  };

  // Show loading while Privy is initializing
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage your personal information and preferences
            </p>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-6 flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
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
                    <div className="relative">
                      <Avatar className="h-20 w-20 cursor-pointer hover:opacity-80 transition-opacity">
                        {profile?.avatarUrl ? (
                          <Image 
                            src={profile.avatarUrl} 
                            alt="Profile Avatar"
                            className="h-full w-full object-cover"
                            fill
                            sizes="80px"
                          />
                        ) : (
                          <AvatarFallback className="text-lg font-semibold bg-blue-100 text-blue-600">
                            {profile ? generateAvatar(profile.displayName) : 'U'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      {/* Upload Progress Overlay */}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="text-white text-xs font-medium">
                            {uploadProgress}%
                          </div>
                        </div>
                      )}
                      
                      {/* Upload Button Overlay */}
                      <button
                        onClick={handleAvatarClick}
                        disabled={uploadingAvatar}
                        className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1.5 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3" />
                        )}
                      </button>
                      
                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      {profile && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {getGreeting(profile.displayName)}
                        </div>
                      )}
                      
                      {/* Display Name */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
                                onClick={handleCancel}
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

                  {/* Avatar Upload Error */}
                  {avatarError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm">{avatarError}</span>
                    </div>
                  )}

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Bio
                    </label>
                    {isEditing ? (
                      <Textarea
                        value={editedBio}
                        onChange={(e) => setEditedBio(e.target.value)}
                        placeholder="Tell us a bit about yourself..."
                        className="min-h-[80px] resize-none"
                        maxLength={500}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-300 min-h-[80px]">
                        {profile?.bio || 'No bio added yet'}
                      </p>
                    )}
                    {isEditing && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {editedBio.length}/500 characters
                      </p>
                    )}
                  </div>

                  {/* University */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      University
                    </label>
                    {isEditing ? (
                      <Input
                        value={editedUniversity}
                        onChange={(e) => setEditedUniversity(e.target.value)}
                        placeholder="Enter your university name..."
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {profile?.university || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Social Links</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Twitter */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Twitter className="h-4 w-4 text-blue-400" />
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Twitter</label>
                        </div>
                        {isEditing ? (
                          <Input
                            value={editedSocials.twitter}
                            onChange={(e) => setEditedSocials(prev => ({ ...prev, twitter: e.target.value }))}
                            placeholder="@username"
                            className="text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {profile?.twitter || 'Not set'}
                          </p>
                        )}
                      </div>

                      {/* GitHub */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Github className="h-4 w-4 text-gray-700" />
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">GitHub</label>
                        </div>
                        {isEditing ? (
                          <Input
                            value={editedSocials.github}
                            onChange={(e) => setEditedSocials(prev => ({ ...prev, github: e.target.value }))}
                            placeholder="username"
                            className="text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {profile?.github || 'Not set'}
                          </p>
                        )}
                      </div>

                      {/* LinkedIn */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Linkedin className="h-4 w-4 text-blue-600" />
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">LinkedIn</label>
                        </div>
                        {isEditing ? (
                          <Input
                            value={editedSocials.linkedin}
                            onChange={(e) => setEditedSocials(prev => ({ ...prev, linkedin: e.target.value }))}
                            placeholder="linkedin.com/in/username"
                            className="text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {profile?.linkedin || 'Not set'}
                          </p>
                        )}
                      </div>

                      {/* Website */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <GlobeIcon className="h-4 w-4 text-green-600" />
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Website</label>
                        </div>
                        {isEditing ? (
                          <Input
                            value={editedSocials.website}
                            onChange={(e) => setEditedSocials(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="https://example.com"
                            className="text-sm"
                          />
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {profile?.website || 'Not set'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Account Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Account Information</h3>
                    
                    {/* Email */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Email</span>
                            <Lock className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {user?.email?.address || 'Not connected'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user?.email?.address ? 'default' : 'secondary'}>
                          {user?.email?.address ? 'Verified' : 'Not connected'}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Read-only</span>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {isAddingPhone ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <div className="text-sm font-medium">Phone</div>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="tel"
                              value={editedPhone}
                              onChange={(e) => setEditedPhone(e.target.value)}
                              placeholder="Enter your phone number"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200"
                            />
                            {phoneError && (
                              <p className="text-red-500 text-xs">{phoneError}</p>
                            )}
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSavePhone}
                                disabled={isLoading}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancelPhone}
                                disabled={isLoading}
                                className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          <div>
                            <div className="text-sm font-medium">Phone</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {profile?.phone || user?.phone?.number || 'Not connected'}
                            </div>
                          </div>
                        </div>
                          <button
                            onClick={() => setIsAddingPhone(true)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            {profile?.phone || user?.phone?.number ? 'Edit' : 'Add'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Wallet */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <Wallet className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Wallet</span>
                            <Lock className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                            {walletAddress.displayAddress}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={walletAddress.isValid ? 'default' : 'secondary'}>
                          {walletAddress.isValid ? 'Connected' : 'Not connected'}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Read-only</span>
                      </div>
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
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">Theme</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Light mode</div>
                      </div>
                    </div>
                    <Badge variant="secondary">Default</Badge>
                  </div>

                  {/* Notifications */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">Notifications</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Enabled</div>
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
                    <div className="text-sm text-gray-600 dark:text-gray-300">Profile Complete</div>
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
                  <div className="text-sm text-gray-600 dark:text-gray-300">
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