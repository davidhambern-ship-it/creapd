import React from 'react';
import { Search, Flame } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  REGISTRY_ACCESS_STATUS, REGISTRY_LICENSE_STATUS,
  REGISTRY_IMPORT_STATUS, REGISTRY_PRIORITY
} from '@/lib/registryConstants';

const toOpts = (obj) => Object.entries(obj).map(([value, d]) => ({ value, label: d.label }));

export default function RegistryFilters({
  searchQuery, setSearchQuery,
  accessFilter, setAccessFilter,
  licenseFilter, setLicenseFilter,
  importFilter, setImportFilter,
  priorityFilter, setPriorityFilter,
  showHighDemandOnly, setShowHighDemandOnly
}) {
  return (
    <div className="glass-panel p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, tradition, language, provider..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select value={accessFilter} onChange={e => setAccessFilter(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">All Access</option>
          {toOpts(REGISTRY_ACCESS_STATUS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={licenseFilter} onChange={e => setLicenseFilter(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">All Licenses</option>
          {toOpts(REGISTRY_LICENSE_STATUS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={importFilter} onChange={e => setImportFilter(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">All Imports</option>
          {toOpts(REGISTRY_IMPORT_STATUS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">All Priorities</option>
          {toOpts(REGISTRY_PRIORITY).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={() => setShowHighDemandOnly(!showHighDemandOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border transition-colors ${
            showHighDemandOnly ? 'bg-accent/20 text-accent border-accent/30' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Flame className="w-3.5 h-3.5" /> High Demand
        </button>
      </div>
    </div>
  );
}