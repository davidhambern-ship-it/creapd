import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Plus, ArrowLeft, Lock } from 'lucide-react';
import RegistryStats from '@/components/admin/RegistryStats';
import RegistryFilters from '@/components/admin/RegistryFilters';
import RegistryTable from '@/components/admin/RegistryTable';

export default function WorldScriptureRegistry() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState('all');
  const [licenseFilter, setLicenseFilter] = useState('all');
  const [importFilter, setImportFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showHighDemandOnly, setShowHighDemandOnly] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setAuthChecked(true));
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const all = await base44.entities.WorldScriptureRegistry.list('-updated_date', 500);
      setRecords(all || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.role === 'admin') loadRecords(); }, [user, loadRecords]);

  const handleAction = async (action, record) => {
    switch (action) {
      case 'view': navigate(`/admin/world-scripture-registry/${record.id}`); break;
      case 'edit': navigate(`/admin/world-scripture-registry/${record.id}?mode=edit`); break;
      case 'open_source': if (record.source_url) window.open(record.source_url, '_blank'); break;
      case 'queue_import':
        await base44.entities.WorldScriptureRegistry.update(record.id, { import_status: 'import_queued' });
        loadRecords(); break;
      case 'request_license':
        await base44.entities.WorldScriptureRegistry.update(record.id, { license_request_status: 'requested', license_status: 'license_needed' });
        await base44.entities.LicensingIssue.create({
          text_id: record.id, title: record.title, issue_type: 'license_needed',
          requested_by_user_id: user.id, requested_by_user_name: user.full_name,
          access_attempt_date: new Date().toISOString(), source_url: record.source_url || '',
          license_status: record.license_status, estimated_priority: 'high', admin_status: 'open'
        });
        loadRecords(); break;
      case 'mark_licensed':
        await base44.entities.WorldScriptureRegistry.update(record.id, {
          license_status: 'licensed', access_status: 'available_in_producer', license_request_status: 'approved'
        });
        loadRecords(); break;
      case 'verify':
        await base44.entities.WorldScriptureRegistry.update(record.id, {
          verification_status: 'admin_verified', last_verified_at: new Date().toISOString(), confidence_level: 'high'
        });
        loadRecords(); break;
      case 'archive':
        await base44.entities.WorldScriptureRegistry.update(record.id, { is_archived: true });
        loadRecords(); break;
    }
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Lock className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-6">The World Scripture Registry is restricted to administrators.</p>
          <Button asChild><Link to="/spiritual/library">Back to Library</Link></Button>
        </div>
      </div>
    );
  }

  const stats = {
    total: records.length,
    available: records.filter(r => r.access_status === 'available_in_producer').length,
    publicDomain: records.filter(r => r.license_status === 'public_domain').length,
    licensed: records.filter(r => r.license_status === 'licensed').length,
    licenseRequired: records.filter(r => r.license_status === 'license_needed').length,
    permissionRequired: records.filter(r => r.license_status === 'permission_needed').length,
    metadataOnly: records.filter(r => r.access_status === 'metadata_only').length,
    failedImports: records.filter(r => r.import_status === 'failed').length,
    highDemand: records.filter(r => r.user_demand_count > 0 && !['available_in_producer', 'available_through_api'].includes(r.access_status)).length,
    recentlyAdded: records.filter(r => new Date(r.created_date) > new Date(Date.now() - 7 * 86400000)).length,
    recentlyImported: records.filter(r => ['imported', 'indexed'].includes(r.import_status)).length
  };

  let filtered = records.filter(r => !r.is_archived);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      r.title?.toLowerCase().includes(q) || r.tradition?.toLowerCase().includes(q) ||
      r.original_language?.toLowerCase().includes(q) || r.source_provider?.toLowerCase().includes(q)
    );
  }
  if (accessFilter !== 'all') filtered = filtered.filter(r => r.access_status === accessFilter);
  if (licenseFilter !== 'all') filtered = filtered.filter(r => r.license_status === licenseFilter);
  if (importFilter !== 'all') filtered = filtered.filter(r => r.import_status === importFilter);
  if (priorityFilter !== 'all') filtered = filtered.filter(r => r.acquisition_priority === priorityFilter);
  if (showHighDemandOnly) filtered = filtered.filter(r => r.user_demand_count > 0);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/spiritual/library')}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Database className="w-6 h-6 text-primary" /> World Scripture Registry</h1>
              <p className="text-sm text-muted-foreground">Master catalog for all texts in the World Scripture Library</p>
            </div>
          </div>
          <Button onClick={() => navigate('/admin/world-scripture-registry/new')}><Plus className="w-4 h-4 mr-2" /> Add Record</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <RegistryStats stats={stats} />
            <RegistryFilters
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              accessFilter={accessFilter} setAccessFilter={setAccessFilter}
              licenseFilter={licenseFilter} setLicenseFilter={setLicenseFilter}
              importFilter={importFilter} setImportFilter={setImportFilter}
              priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
              showHighDemandOnly={showHighDemandOnly} setShowHighDemandOnly={setShowHighDemandOnly}
            />
            <RegistryTable records={filtered} onAction={handleAction} />
          </>
        )}
      </div>
    </div>
  );
}