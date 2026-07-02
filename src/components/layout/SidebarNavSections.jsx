import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Circle } from 'lucide-react';

/**
 * Renders nav items grouped by their `section` field, with section headers.
 * Items with section: null render as standalone (no header).
 */
export default function SidebarNavSections({ items, iconMap, onNavigate }) {
  const location = useLocation();

  // Group items by section, preserving declaration order
  const sections = [];
  let currentSection;
  let currentItems = [];
  for (const item of items) {
    if (item.section !== currentSection) {
      if (currentItems.length > 0) sections.push({ name: currentSection, items: currentItems });
      currentSection = item.section;
      currentItems = [item];
    } else {
      currentItems.push(item);
    }
  }
  if (currentItems.length > 0) sections.push({ name: currentSection, items: currentItems });

  return sections.map((section, si) => (
    <div key={section.name || `section-${si}`}>
      {section.name && (
        <p className="px-3 pt-4 pb-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60">
          {section.name}
        </p>
      )}
      {section.items.map(item => {
        const Icon = iconMap[item.icon] || Circle;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </div>
  ));
}