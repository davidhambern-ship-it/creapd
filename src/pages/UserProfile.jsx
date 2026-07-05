import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User, Save, Loader2, Building2, Globe, Clock, Mail, Briefcase, Camera, Check, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
];

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setProfile({
        full_name: u.full_name || '',
        email: u.email || '',
        organization_name: u.organization_name || '',
        job_title: u.job_title || '',
        website: u.website || '',
        phone: u.phone || '',
        timezone: u.timezone || 'America/New_York',
        language: u.language || 'en',
        profile_photo_url: u.profile_photo_url || '',
      });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: profile.full_name,
        organization_name: profile.organization_name,
        job_title: profile.job_title,
        website: profile.website,
        phone: profile.phone,
        timezone: profile.timezone,
        language: profile.language,
        profile_photo_url: profile.profile_photo_url,
      });
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfile(prev => ({ ...prev, profile_photo_url: file_url }));
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  const update = (key, value) => setProfile(prev => ({ ...prev, [key]: value }));

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">My Profile</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage your personal account information</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>

      {/* Profile header card */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-berna-purple/30" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-card border border-white/10 flex items-center justify-center cursor-pointer hover:bg-berna-purple/20 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 text-berna-purple animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{profile.full_name || 'Your Name'}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3" />{profile.email}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {profile.job_title && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" />{profile.job_title}</span>
              )}
              {profile.organization_name && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{profile.organization_name}</span>
              )}
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] uppercase tracking-wider text-berna-purple font-semibold px-3 py-1 rounded-full bg-berna-purple/10 border border-berna-purple/20">
              {user.role || 'user'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin tools */}
      {user.role === 'admin' && (
        <div className="glass-panel p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white neon-underline">Admin Tools</h3>
          <Link to="/news/checklist">
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <ClipboardCheck className="w-4 h-4 text-berna-purple" />
              Requirements & Acceptance Checklist
            </Button>
          </Link>
        </div>
      )}

      {/* Personal info */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white neon-underline">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
            <Input value={profile.full_name} onChange={e => update('full_name', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email (read-only)</label>
            <Input value={profile.email} disabled className="bg-white/[0.02] border-white/[0.06] text-muted-foreground text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Organization</label>
            <Input value={profile.organization_name} onChange={e => update('organization_name', e.target.value)} placeholder="Company or organization" className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Job Title</label>
            <Input value={profile.job_title} onChange={e => update('job_title', e.target.value)} placeholder="Your role" className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Website</label>
            <Input value={profile.website} onChange={e => update('website', e.target.value)} placeholder="https://..." className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <Input value={profile.phone} onChange={e => update('phone', e.target.value)} placeholder="Phone number" className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white neon-underline">Regional Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Clock className="w-3 h-3" />Time Zone</label>
            <Select value={profile.timezone} onValueChange={v => update('timezone', v)}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" />Language</label>
            <Select value={profile.language} onValueChange={v => update('language', v)}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {LANGUAGES.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}