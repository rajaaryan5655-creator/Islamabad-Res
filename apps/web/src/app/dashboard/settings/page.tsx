'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock, User } from 'lucide-react';
import { ALLERGENS } from '@islamabad/shared';
import { api, type AuthUser } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { NotificationSettings } from '@/components/dashboard/notification-settings';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: '', phone: '', marketingOptIn: false });
  const [prefs, setPrefs] = useState<string[]>([]);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name, phone: user.phone ?? '', marketingOptIn: user.marketingOptIn });
      setPrefs(user.dietaryPrefs ?? []);
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: () => api.patch<{ user: AuthUser }>('/api/auth/me', { ...profile, dietaryPrefs: prefs }),
    onSuccess: (res) => {
      setUser(res.user);
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const changePassword = useMutation({
    mutationFn: () => api.post<{ message: string }>('/api/auth/change-password', passwords),
    onSuccess: (res) => {
      toast.success(res.message);
      setPasswords({ currentPassword: '', newPassword: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-7">
      <header>
        <h1 className="font-display text-4xl">Settings</h1>
        <p className="mt-1 text-black/55">Your details, preferences and password</p>
      </header>

      {/* profile */}
      <section className="rounded-sm border border-black/10 bg-white p-6">
        <h2 className="mb-5 flex items-center gap-2 font-display text-2xl">
          <User className="size-5 text-ember-500" />
          Personal information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <Input label="Mobile number" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <Input label="Email" value={user.email} disabled className="sm:col-span-2" hint="Contact us to change your email address" />
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-black/70">
            Allergies we should know about
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setPrefs((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs capitalize transition',
                  prefs.includes(a) ? 'border-ember-500 bg-ember-500 text-white' : 'border-black/15 hover:border-black/40',
                )}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-black/45">
            We flag these on every order ticket so the kitchen sees them.
          </p>
        </fieldset>

        <label className="mt-5 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={profile.marketingOptIn}
            onChange={(e) => setProfile({ ...profile, marketingOptIn: e.target.checked })}
            className="mt-0.5 size-4 accent-ember-500"
          />
          <span>
            Email me offers and seasonal menus
            <span className="block text-xs text-black/45">One email a week. Unsubscribe anytime.</span>
          </span>
        </label>

        <Button variant="primary" className="mt-6" loading={updateProfile.isPending} onClick={() => updateProfile.mutate()}>
          Save changes
        </Button>
      </section>

      <NotificationSettings />

      {/* password */}
      <section className="rounded-sm border border-black/10 bg-white p-6">
        <h2 className="mb-5 flex items-center gap-2 font-display text-2xl">
          <Lock className="size-5 text-ember-500" />
          Change password
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            hint="At least 8 characters"
          />
        </div>
        <Button
          variant="dark"
          className="mt-5"
          loading={changePassword.isPending}
          disabled={!passwords.currentPassword || passwords.newPassword.length < 8}
          onClick={() => changePassword.mutate()}
        >
          Update password
        </Button>
        <p className="mt-3 text-xs text-black/45">
          Changing your password signs you out of all other devices.
        </p>
      </section>
    </div>
  );
}
