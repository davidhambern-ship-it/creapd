import React from 'react';
import { Lock, Database, Users, FolderLock, FileText, Eye } from 'lucide-react';

const PRIVACY_ITEMS = [
  { icon: Database, title: 'What Information Is Stored', body: 'Productions, scripts, stories, briefings, brand profiles, show profiles, image/video assets, templates, production notes, export profiles, and activity logs.' },
  { icon: Eye, title: 'Why It Is Stored', body: 'To power your production workflow — generating packages, maintaining branding consistency, tracking progress, and enabling export of finished content.' },
  { icon: Lock, title: 'How It Is Used', body: 'Your data is used exclusively within your workspace to assist with production tasks. AI providers receive only the minimal context needed to complete a specific generation request.' },
  { icon: Users, title: 'Who Can Access It', body: 'Only you and members of your organization (for organization-scoped assets). Administrators can manage users within their organization. No third parties have access to your production data.' },
];

export default function PrivacyTransparencyPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-berna-purple" />
        <h3 className="text-sm font-semibold text-white">Privacy Principles</h3>
      </div>
      <p className="text-xs text-muted-foreground">Producer respects your privacy. You should always understand what is stored, why it is stored, how it is used, and who can access it.</p>

      <div className="grid gap-3">
        {PRIVACY_ITEMS.map(item => (
          <div key={item.title} className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <item.icon className="w-3.5 h-3.5 text-berna-purple" />
              <h4 className="text-xs font-semibold text-white">{item.title}</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-berna-purple" />
          <h4 className="text-xs font-semibold text-white">Data Ownership</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You retain ownership of all content you create or upload, including productions, scripts, templates, brand assets, images, graphics, production notes, and uploaded files. Producer-generated content belongs to your workspace. Producer shall not claim ownership of user-created content.
        </p>
      </div>

      <div className="glass-panel p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FolderLock className="w-3.5 h-3.5 text-berna-purple" />
          <h4 className="text-xs font-semibold text-white">Organizational Data Boundaries</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Organizations control access only to assets created within their workspace. Personal workspaces are not exposed to organizations, and organizational assets are not exposed to personal workspaces. Workspace boundaries remain clearly defined at all times.
        </p>
      </div>
    </div>
  );
}