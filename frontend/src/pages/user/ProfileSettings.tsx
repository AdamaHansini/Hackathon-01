import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../../api/usersApi';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from '../../store/useToastStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { User, Shield, Bell } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  city: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export const ProfileSettings: React.FC = () => {
  const { user, setAuth } = useAuthStore();

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      city: user?.city || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => usersApi.updateMe(data),
    onSuccess: (response) => {
      if (response.data?.user) {
        setAuth(response.data.user);
        toast.success('Profile updated successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => authApi.changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPasswordForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    }
  });

  // Notification Preferences Form (Direct mutations for simplicity here)
  const updateNotificationsMutation = useMutation({
    mutationFn: (data: any) => usersApi.updateNotificationPreferences(data),
    onSuccess: (response) => {
      if (response.data?.user) {
        setAuth(response.data.user);
        toast.success('Preferences updated');
      }
    },
  });

  const handleTogglePreference = (key: string, currentValue: boolean) => {
    updateNotificationsMutation.mutate({
      [key]: !currentValue
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-dark-text">Profile Settings</h1>
        <p className="text-muted-text mt-1">Manage your account details and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-5 w-5 text-primary-button" />
            <h2 className="text-lg font-semibold text-dark-text">Personal Info</h2>
          </div>
          <p className="text-sm text-muted-text">Update your personal details. Your email address cannot be changed.</p>
        </div>
        
        <div className="md:col-span-2 bg-surface border border-taupe-border rounded-xl p-6">
          <form onSubmit={handleProfileSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="h-20 w-20 rounded-full bg-light-beige flex items-center justify-center text-primary-button font-bold text-2xl border border-taupe-border overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user?.name.charAt(0).toUpperCase()
                )}
              </div>
              <Button variant="outline" type="button" size="sm">Change Avatar</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                {...registerProfile('name')}
                error={profileErrors.name?.message}
              />
              <Input
                label="Email Address"
                value={user?.email || ''}
                disabled
                className="bg-background text-muted-text"
              />
            </div>
            
            <Input
              label="City"
              placeholder="e.g. Hyderabad"
              {...registerProfile('city')}
              error={profileErrors.city?.message}
            />

            <div className="flex justify-end">
              <Button type="submit" isLoading={updateProfileMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>

      <hr className="border-taupe-border" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary-button" />
            <h2 className="text-lg font-semibold text-dark-text">Security</h2>
          </div>
          <p className="text-sm text-muted-text">Ensure your account is using a long, random password to stay secure.</p>
        </div>
        
        <div className="md:col-span-2 bg-surface border border-taupe-border rounded-xl p-6">
          <form onSubmit={handlePasswordSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-6">
            <Input
              label="Current Password"
              type="password"
              {...registerPassword('currentPassword')}
              error={passwordErrors.currentPassword?.message}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="New Password"
                type="password"
                {...registerPassword('newPassword')}
                error={passwordErrors.newPassword?.message}
              />
              <Input
                label="Confirm New Password"
                type="password"
                {...registerPassword('confirmPassword')}
                error={passwordErrors.confirmPassword?.message}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" isLoading={updatePasswordMutation.isPending}>
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>

      <hr className="border-taupe-border" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-5 w-5 text-primary-button" />
            <h2 className="text-lg font-semibold text-dark-text">Notifications</h2>
          </div>
          <p className="text-sm text-muted-text">Manage how and when you receive notifications.</p>
        </div>
        
        <div className="md:col-span-2 bg-surface border border-taupe-border rounded-xl p-6">
          <div className="space-y-4">
            {[
              { id: 'emailNotifications', label: 'Email Notifications', desc: 'Receive daily summaries and important alerts via email.' },
              { id: 'pushNotifications', label: 'Push Notifications', desc: 'Get real-time alerts in your browser.' },
              { id: 'matchAlerts', label: 'Smart Match Alerts', desc: 'Get notified immediately when AI finds a potential match.' },
            ].map((pref) => {
              const isChecked = user?.notificationPreferences?.[pref.id as keyof typeof user.notificationPreferences] ?? true;
              return (
                <div key={pref.id} className="flex items-start justify-between gap-4 py-3 border-b border-taupe-border last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-dark-text">{pref.label}</p>
                    <p className="text-sm text-muted-text">{pref.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isChecked}
                    onClick={() => handleTogglePreference(pref.id, isChecked)}
                    disabled={updateNotificationsMutation.isPending}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-button focus:ring-offset-2 ${isChecked ? 'bg-primary-button' : 'bg-taupe-border'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isChecked ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
