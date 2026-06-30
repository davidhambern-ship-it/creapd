import React from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Square, Archive, Trash2, Bookmark, Layers, Copy, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CategoryBadge from '@/components/shared/CategoryBadge';
import ProductionProfileBadge from '@/components/production/ProductionProfileBadge';

export default function ItemCard({
  item,
  pkg,
  hasNotes,
  isSelected,
  onSelect,
  onDeselect,
  onStatusChange,
  onArchive,
  onDelete,
  tab,
  itemTypeLabel = 'Item',
}) {
  const statusColors = {
    new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    reviewing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    selected: 'bg-berna-emerald/20 text-berna-emerald border-berna-emerald/30',
    in_production: 'bg-berna-purple/20 text-berna-purple border-berna-purple/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const statusLabels = {
    new: 'New',
    reviewing: 'Reviewing',
    selected: 'Selected',
    in_production: 'In Production',
    completed: 'Completed',
    archived: 'Archived',
  };

  return (
    <div className={`glass-panel p-4 hover:border-white/[0.12] transition-colors ${isSelected ? 'border-berna-emerald/40 bg-berna-emerald/[0.02]' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {tab === 'active' && (
          <button
            onClick={() => isSelected ? onDeselect(item.id) : onSelect(item.id)}
            className="mt-1 text-berna-purple hover:text-berna-emerald flex-shrink-0"
          >
            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <Link to={`/story/${item.id}`} className="flex-1">
              <h3 className="text-sm font-semibold text-white leading-snug hover:text-berna-purple transition-colors">
                {item.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.production_profile_type && (
                <ProductionProfileBadge profileType={item.production_profile_type} size="sm" />
              )}
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusColors[item.status] || statusColors.new}`}>
                {statusLabels[item.status] || item.status}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {item.item_type && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {itemTypeLabel}
              </span>
            )}
            {item.category && <CategoryBadge category={item.category} />}
            {item.source && (
              <span className="text-[10px] text-muted-foreground">{item.source}</span>
            )}
            {item.priority && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                item.priority === 'breaking' ? 'bg-red-500/20 text-red-400' :
                item.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {item.priority}
              </span>
            )}
          </div>

          {/* Summary */}
          {item.summary && (
            <p className="text-xs text-white/60 mt-2 line-clamp-2">{item.summary}</p>
          )}

          {/* Tags */}
          {item.tags && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 5).map(tag => (
                <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-berna-purple/10 border border-berna-purple/20 text-[9px] text-berna-purple">
                  <Tag className="w-2 h-2" />{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-3">
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-white p-1"
                title="Open source"
              >
                <Copy className="w-3.5 h-3.5" />
              </a>
            )}
            <Link
              to="/production"
              className="text-berna-emerald hover:text-berna-emerald/80 p-1"
              title="Send to production"
            >
              <Layers className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => onArchive(item.id)}
              className="text-muted-foreground hover:text-yellow-400 p-1"
              title="Archive"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            {tab !== 'rejected' && (
              <>
                <button
                  onClick={() => onStatusChange(item.id, 'rejected', '')}
                  className="text-muted-foreground hover:text-red-400 p-1"
                  title="Reject"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-muted-foreground hover:text-red-400 p-1"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}