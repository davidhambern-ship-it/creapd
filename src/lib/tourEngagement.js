import { base44 } from '@/api/base44Client';

/**
 * Log a tour engagement event — fires and forgets.
 * Called when a producer completes or skips a guided tour.
 */
export async function logTourEngagement({
  tour_script_id,
  route_path,
  script_name,
  last_scene_id,
  last_scene_index,
  total_scenes,
  action,
}) {
  try {
    await base44.entities.TourEngagement.create({
      tour_script_id: tour_script_id || '',
      route_path,
      script_name: script_name || '',
      last_scene_id: last_scene_id || '',
      last_scene_index: last_scene_index ?? 0,
      total_scenes: total_scenes ?? 0,
      action,
    });
  } catch (err) {
    // Silent fail — tracking should never block the UX
    console.error('Tour engagement log failed:', err);
  }
}