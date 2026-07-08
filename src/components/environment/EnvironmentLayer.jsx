import React from 'react';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';
import NewsroomAtmosphere from './atmospheres/NewsroomAtmosphere';
import StudioAtmosphere from './atmospheres/StudioAtmosphere';
import StageAtmosphere from './atmospheres/StageAtmosphere';
import KitchenAtmosphere from './atmospheres/KitchenAtmosphere';
import SportsAtmosphere from './atmospheres/SportsAtmosphere';
import AgencyAtmosphere from './atmospheres/AgencyAtmosphere';
import SanctuaryAtmosphere from './atmospheres/SanctuaryAtmosphere';
import LibraryAtmosphere from './atmospheres/LibraryAtmosphere';

const ATMOSPHERE_COMPONENTS = {
  newsroom: NewsroomAtmosphere,
  studio: StudioAtmosphere,
  stage: StageAtmosphere,
  kitchen: KitchenAtmosphere,
  sports: SportsAtmosphere,
  agency: AgencyAtmosphere,
  sanctuary: SanctuaryAtmosphere,
  library: LibraryAtmosphere,
};

// PP-THEME-001: Persistent environmental background layer.
// Rendered once per Layout — stays mounted across room navigation so the environment never resets.
export default function EnvironmentLayer({ profileKey }) {
  const theme = PRODUCTION_PROFILE_THEMES[profileKey];
  if (!theme) return null;
  const Atmosphere = ATMOSPHERE_COMPONENTS[theme.atmosphere];
  if (!Atmosphere) return null;
  return (
    <div className="env-layer" aria-hidden="true">
      <Atmosphere />
    </div>
  );
}