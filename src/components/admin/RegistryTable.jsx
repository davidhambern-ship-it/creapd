import React from 'react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Edit, ExternalLink, Download, KeyRound, ShieldCheck, Archive } from 'lucide-react';
import {
  getStatusBadge, REGISTRY_ACCESS_STATUS, REGISTRY_LICENSE_STATUS,
  REGISTRY_IMPORT_STATUS, REGISTRY_PRIORITY, REGISTRY_COLLECTIONS
} from '@/lib/registryConstants';

export default function RegistryTable({ records, onAction }) {
  if (records.length === 0) {
    return (
      <div className="glass-panel p-12 text-center">
        <p className="text-sm text-muted-foreground">No registry records found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Tradition</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Access</th>
              <th className="px-4 py-3 font-medium">License</th>
              <th className="px-4 py-3 font-medium">Import</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium text-center">Demand</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => {
              const access = getStatusBadge(REGISTRY_ACCESS_STATUS, record.access_status);
              const license = getStatusBadge(REGISTRY_LICENSE_STATUS, record.license_status);
              const imp = getStatusBadge(REGISTRY_IMPORT_STATUS, record.import_status);
              const priority = getStatusBadge(REGISTRY_PRIORITY, record.acquisition_priority);
              return (
                <tr key={record.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => onAction('view', record)} className="text-left">
                      <p className="font-medium hover:text-primary">{record.title}</p>
                      <p className="text-xs text-muted-foreground">{REGISTRY_COLLECTIONS[record.collection] || record.collection}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{record.tradition}</td>
                  <td className="px-4 py-3 text-muted-foreground">{record.original_language || '—'}</td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs ${access.className}`}>{access.label}</span></td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs ${license.className}`}>{license.label}</span></td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs ${imp.className}`}>{imp.label}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{record.source_provider || '—'}</td>
                  <td className="px-4 py-3 text-center">{record.user_demand_count > 0 ? <span className="text-accent font-medium">{record.user_demand_count}</span> : <span className="text-muted-foreground">0</span>}</td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs ${priority.className}`}>{priority.label}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{record.last_verified_at ? new Date(record.last_verified_at).toLocaleDateString() : 'Never'}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onAction('view', record)}><Eye className="w-3.5 h-3.5 mr-2" /> View Record</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction('edit', record)}><Edit className="w-3.5 h-3.5 mr-2" /> Edit Metadata</DropdownMenuItem>
                        {record.source_url && <DropdownMenuItem onClick={() => onAction('open_source', record)}><ExternalLink className="w-3.5 h-3.5 mr-2" /> Open Source</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onAction('queue_import', record)}><Download className="w-3.5 h-3.5 mr-2" /> Queue Import</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction('request_license', record)}><KeyRound className="w-3.5 h-3.5 mr-2" /> Request License</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction('mark_licensed', record)}><ShieldCheck className="w-3.5 h-3.5 mr-2" /> Mark as Licensed</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onAction('verify', record)}><ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verify Source</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction('archive', record)} className="text-destructive"><Archive className="w-3.5 h-3.5 mr-2" /> Archive Record</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}