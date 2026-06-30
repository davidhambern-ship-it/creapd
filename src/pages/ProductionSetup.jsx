import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getProfileConfig } from '@/lib/productionProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Settings, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ProductionSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const profileKey = searchParams.get('profile') || 'news';
  const productionId = searchParams.get('productionId');
  const profile = getProfileConfig(profileKey);

  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile.setupFields) {
      const initialData = {};
      profile.setupFields.forEach(field => {
        if (field.default) initialData[field.key] = field.default;
      });
      setFormData(initialData);
      setLoading(false);
    }
  }, [profile]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const missingRequired = profile.setupFields.filter(
      field => field.required && !formData[field.key]
    );

    if (missingRequired.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in: ${missingRequired.map(f => f.label).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      await base44.entities.Production.update(productionId, {
        title: formData.show_name || `${profile.name} Production`,
        setup_data: JSON.stringify(formData)
      });

      toast({ title: 'Production Created', description: `${profile.name} setup saved` });
      navigate(`/dashboard?production=${productionId}`);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.key] || '';

    if (field.type === 'text') {
      return (
        <Input
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          className="bg-white/[0.03] border-white/[0.08] text-white text-sm"
        />
      );
    }

    if (field.type === 'select') {
      return (
        <Select value={value} onValueChange={(v) => handleInputChange(field.key, v)}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'date') {
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          className="bg-white/[0.03] border-white/[0.08] text-white text-sm"
        />
      );
    }

    return (
      <Input
        value={value}
        onChange={(e) => handleInputChange(field.key, e.target.value)}
        className="bg-white/[0.03] border-white/[0.08] text-white text-sm"
      />
    );
  };

  if (!profile || !profile.isImplemented) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-panel p-8 max-w-md text-center">
          <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
          <p className="text-muted-foreground mb-6">{profile?.name} is not yet implemented.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Profiles
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-berna-purple" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-berna-navy/20">
      <div className="border-b border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">{profile.name} Setup</h1>
              <p className="text-sm text-muted-foreground">Configure your production settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-5 h-5 text-berna-purple" />
            <h2 className="text-lg font-semibold text-white">Production Settings</h2>
          </div>

          <div className="space-y-4">
            {profile.setupFields?.map((field) => (
              <div key={field.key}>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  {field.label} {field.required && <span className="text-berna-orange">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-white/10">
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-berna-purple hover:bg-berna-purple/90 text-white">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> Create Production</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}