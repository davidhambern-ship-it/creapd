import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Lock, Activity, FileCheck } from 'lucide-react';
import ConnectedServicesPanel from '@/components/security/ConnectedServicesPanel';
import SessionActivityPanel from '@/components/security/SessionActivityPanel';
import AIProviderPrivacyPanel from '@/components/security/AIProviderPrivacyPanel';
import PrivacyTransparencyPanel from '@/components/security/PrivacyTransparencyPanel';
import DiagnosticsPanel from '@/components/security/DiagnosticsPanel';
import CompliancePanel from '@/components/security/CompliancePanel';

export default function SecurityCenter() {
  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-berna-purple/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-berna-purple" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-display">Security & Privacy Center</h1>
            <p className="text-xs text-muted-foreground">Protecting your data, securing connected services, and ensuring production continuity</p>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="text-center">
            <ShieldCheck className="w-5 h-5 text-berna-emerald mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Data Protected</p>
          </div>
          <div className="text-center">
            <Lock className="w-5 h-5 text-berna-emerald mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Encrypted Transit</p>
          </div>
          <div className="text-center">
            <Activity className="w-5 h-5 text-berna-emerald mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Auto-Save Active</p>
          </div>
          <div className="text-center">
            <FileCheck className="w-5 h-5 text-berna-emerald mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Compliance Ready</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="security">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs">Privacy</TabsTrigger>
          <TabsTrigger value="reliability" className="text-xs">Reliability</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-6 mt-4">
          <ConnectedServicesPanel />
          <SessionActivityPanel />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6 mt-4">
          <AIProviderPrivacyPanel />
          <PrivacyTransparencyPanel />
        </TabsContent>

        <TabsContent value="reliability" className="space-y-6 mt-4">
          <DiagnosticsPanel />
          <div className="glass-panel p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-berna-purple" />
              <h4 className="text-xs font-semibold text-white">Auto-Save & Recovery</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Producer automatically saves production progress throughout the workflow — story selections, production order, scripts, images, producer notes, templates, and approval status. If an unexpected interruption occurs (browser refresh, app restart, network loss), recovery restores your production to its most recently saved state.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              During AI operations, progress indicators keep you informed, and you can continue working on other tasks while generation completes. Error messages always explain what happened, whether your work is preserved, and what you can do next.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6 mt-4">
          <CompliancePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}