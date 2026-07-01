import { base44 } from '@/api/base44Client';

const ACCESSIBLE_STATUSES = ['available_in_producer', 'available_through_api', 'public_domain_import_available'];

export async function resolveTextAccess(libraryText, userId, userName) {
  // NATIVE LIBRARY POLICY: The LibraryText's own access_level takes precedence.
  // If the text has been natively acquired (full_text_available), it always opens in the Reader.
  // The internet is the acquisition source. Producer is the library.

  // 1. Native resource — open in the Reader immediately
  if (libraryText.full_text_available || libraryText.access_level === 'full_text') {
    return {
      canAccess: true,
      redirect: 'reader',
      accessStatus: 'available_in_producer',
      licenseStatus: libraryText.license_status || 'public_domain',
      registry: null
    };
  }

  // 2. Pending acquisition — the CAE is acquiring this resource
  if (libraryText.packaging_status === 'not_packaged' || libraryText.packaging_status === 'packaging' || libraryText.access_level === 'metadata_only') {
    return {
      canAccess: false,
      redirect: null,
      accessStatus: 'metadata_only',
      licenseStatus: libraryText.license_status || 'unknown',
      registry: null,
      pendingAcquisition: true
    };
  }

  // 3. For genuinely restricted content, check the World Scripture Registry
  let registry = null;
  try {
    const records = await base44.entities.WorldScriptureRegistry.filter(
      { title: libraryText.title },
      '-updated_date',
      1
    );
    registry = records?.[0] || null;
  } catch {}

  let accessStatus;
  let licenseStatus;

  if (registry) {
    accessStatus = registry.access_status;
    licenseStatus = registry.license_status;
  } else {
    accessStatus = 'metadata_only';
    licenseStatus = libraryText.license_status || 'unknown';
  }

  if (ACCESSIBLE_STATUSES.includes(accessStatus)) {
    return { canAccess: true, redirect: 'reader', accessStatus, licenseStatus, registry };
  }

  // Log demand for restricted content
  if (registry) {
    try {
      await base44.entities.RegistryDemandEvent.create({
        text_id: registry.id,
        text_title: libraryText.title,
        user_id: userId,
        user_name: userName,
        requested_action: 'read',
        current_access_status: accessStatus,
        current_license_status: licenseStatus
      });

      await base44.entities.WorldScriptureRegistry.update(registry.id, {
        user_demand_count: (registry.user_demand_count || 0) + 1
      });

      if (['license_required', 'permission_required', 'unavailable'].includes(accessStatus)) {
        const issueType = accessStatus === 'license_required' ? 'license_needed'
          : accessStatus === 'permission_required' ? 'permission_needed'
          : 'copyright_restricted';
        await base44.entities.LicensingIssue.create({
          text_id: registry.id,
          title: libraryText.title,
          issue_type: issueType,
          requested_by_user_id: userId,
          requested_by_user_name: userName,
          access_attempt_date: new Date().toISOString(),
          source_url: registry.source_url || '',
          license_status: licenseStatus,
          estimated_priority: (registry.user_demand_count || 0) > 5 ? 'high' : 'medium',
          admin_status: 'open'
        });
      }
    } catch (err) {
      console.error('Failed to log registry demand:', err);
    }
  }

  return { canAccess: false, redirect: null, accessStatus, licenseStatus, registry };
}