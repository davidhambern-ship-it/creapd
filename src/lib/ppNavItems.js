import { Mic2, Radio, FlaskConical } from 'lucide-react';

export const PP_NAV_ITEMS = [
  { icon: Radio, label: 'Radio', path: '/music/dashboard', roots: ['/music'] },
  { icon: Mic2, label: 'Podcast', path: '/podcast', roots: ['/podcast', '/news', '/talk'] },
  { icon: FlaskConical, label: 'Research', path: '/research', roots: ['/research'] },
];
