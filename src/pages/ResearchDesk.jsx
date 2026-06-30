import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getProfileConfig } from '@/lib/productionProfiles';
import {
  Search as SearchIcon, ExternalLink, Send, FileText,
  AlertTriangle, MessageSquare, Clock, ChevronRight, Loader2,
  Music, BookOpen, ChefHat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import OpportunityScore from '@/components/shared/OpportunityScore';
import CategoryBadge from '@/components/shared/CategoryBadge';
import StatusBadge from '@/components/shared/StatusBadge';

const iconMap = { Music, BookOpen, ChefHat };

export default function ResearchDesk() {
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [echoPrompt, setEchoPrompt] = useState('');
  const [echoResponse, setEchoResponse] = useState('');
  const [echoLoading, setEchoLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profileKey = searchParams.get('profile') || 'news';
    const profileConfig = getProfileConfig(profileKey);
    setProfile(profileConfig);
    
    if (profileKey === 'news') {
      base44.entities.Article.filter({}, '-opportunity_score', 50)
        .then(arts => { 
          setArticles(arts); 
          if (arts.length > 0) setSelected(arts[0]); 
        })
        .finally(() => setLoading(false));
    } else {
      base44.entities.ContentItem.filter({}, '-created_date', 50)
        .then(items => { 
          setContentItems(items); 
          if (items.length > 0) setSelectedItem(items[0]); 
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  useEffect(() => {
    const entityId = profile?.profileKey === 'news' ? selected?.id : selectedItem?.id;
    if (entityId) {
      base44.entities.ProducerNote.filter({ article_id: entityId }, '-created_date', 20)
        .then(setNotes)
        .catch(() => setNotes([]));
    }
  }, [selected?.id, selectedItem?.id, profile?.profileKey]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const entityId = profile?.profileKey === 'news' ? selected?.id : selectedItem?.id;
    if (!entityId) return;
    
    const note = await base44.entities.ProducerNote.create({ 
      article_id: entityId, 
      note: newNote, 
      note_type: 'general' 
    });
    setNotes(prev => [note, ...prev]);
    setNewNote('');
  };

  const askEcho = async () => {
    if (!echoPrompt.trim()) return;
    const entity = profile?.profileKey === 'news' ? selected : selectedItem;
    if (!entity) return;
    
    setEchoLoading(true);
    setEchoResponse('');
    const prompt = `You are Echo, a newsroom AI assistant. Analyze this ${profile?.itemSingular || 'story'}:\n\nTitle: ${entity.title}\nSummary: ${entity.summary || 'N/A'}\nCategory: ${entity.category || 'N/A'}\n\nUser request: ${echoPrompt}\n\nProvide concise, actionable insights.`;
    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setEchoResponse(response);
    
    await base44.entities.ProducerNote.create({ 
      article_id: entity.id, 
      note: response, 
      note_type: 'echo_note' 
    });
    setNotes(prev => [{ note: response, note_type: 'echo_note', created_date: new Date().toISOString() }, ...prev]);
    setEchoLoading(false);
  };

  const filteredItems = profile?.profileKey === 'news' 
    ? articles.filter(a => !searchTerm || a.title?.toLowerCase().includes(searchTerm.toLowerCase()))
    : contentItems.filter(i => !searchTerm || i.title?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  const ProfileIcon = profile ? iconMap[profile.icon] : null;

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left: Item list */}
      <div className="lg:w-72 border-b lg:border-b-0 lg:border-r border-white/[0.06] flex flex-col max-h-64 lg:max-h-full">
        <div className="p-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            {ProfileIcon && <ProfileIcon className="w-4 h-4 text-berna-purple" />}
            <h2 className="text-sm font-semibold text-white">{profile?.name || 'Research'}</h2>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${profile?.itemPlural?.toLowerCase() || 'items'}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => profile?.profileKey === 'news' ? setSelected(item) : setSelectedItem(item)}
              className={`w-full text-left p-3 border-b border-white/[0.04] transition-colors ${
                (profile?.profileKey === 'news' ? selected?.id === item.id : selectedItem?.id === item.id)
                  ? 'bg-white/[0.06] border-l-2 border-l-berna-purple' 
                  : 'hover:bg-white/[0.03]'
              }`}
            >
              <p className="text-xs text-white font-medium leading-snug line-clamp-2">{item.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {item.opportunity_score !== undefined && <OpportunityScore score={item.opportunity_score} />}
                <StatusBadge status={item.status} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center: Item details */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {profile?.profileKey === 'news' ? selected : selectedItem ? (
          <div className="max-w-2xl space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={(profile?.profileKey === 'news' ? selected : selectedItem).status} />
                {(profile?.profileKey === 'news' ? selected : selectedItem).category && (
                  <CategoryBadge category={(profile?.profileKey === 'news' ? selected : selectedItem).category} />
                )}
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {(profile?.profileKey === 'news' ? selected : selectedItem).title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {(profile?.profileKey === 'news' ? selected : selectedItem).source && (
                  <span>{(profile?.profileKey === 'news' ? selected : selectedItem).source}</span>
                )}
                {(profile?.profileKey === 'news' ? selected : selectedItem).created_date && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date((profile?.profileKey === 'news' ? selected : selectedItem).created_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {(profile?.profileKey === 'news' ? selected : selectedItem).summary && (
              <div className="glass-panel p-4">
                <h3 className="text-xs font-semibold text-berna-purple uppercase tracking-wider mb-2">Summary</h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  {(profile?.profileKey === 'news' ? selected : selectedItem).summary}
                </p>
              </div>
            )}

            {/* Profile-specific fields */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {(profile?.profileKey === 'news' ? selected : selectedItem).source_url && (
                <div className="glass-panel p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Source URL</p>
                  <a 
                    href={(profile?.profileKey === 'news' ? selected : selectedItem).source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-berna-purple hover:underline"
                  >
                    Open Link <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>
                </div>
              )}
              {(profile?.profileKey === 'news' ? selected : selectedItem).duration && (
                <div className="glass-panel p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Duration</p>
                  <p className="text-sm text-white">{(profile?.profileKey === 'news' ? selected : selectedItem).duration} seconds</p>
                </div>
              )}
            </div>

            {/* Producer Notes */}
            <div className="glass-panel p-4">
              <h3 className="text-xs font-semibold text-berna-purple uppercase tracking-wider mb-3">Producer Notes</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                  className="bg-white/[0.03] border-white/[0.08] text-white text-xs"
                />
                <Button 
                  onClick={addNote} 
                  size="sm"
                  className="bg-berna-purple hover:bg-berna-purple/90"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
              {notes.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notes.map((note, idx) => (
                    <div key={idx} className="text-xs p-2 bg-white/[0.03] rounded">
                      <p className="text-white/80">{note.note}</p>
                      <span className="text-[10px] text-muted-foreground">{note.note_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Echo AI */}
            <div className="glass-panel p-4">
              <h3 className="text-xs font-semibold text-berna-purple uppercase tracking-wider mb-3">Ask Echo AI</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Ask for insights..."
                  value={echoPrompt}
                  onChange={e => setEchoPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askEcho()}
                  className="bg-white/[0.03] border-white/[0.08] text-white text-xs"
                />
                <Button 
                  onClick={askEcho} 
                  size="sm"
                  disabled={echoLoading}
                  className="bg-berna-orange hover:bg-berna-orange/90"
                >
                  {echoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                </Button>
              </div>
              {echoResponse && (
                <div className="text-xs p-3 bg-berna-purple/[0.1] rounded border border-berna-purple/[0.2]">
                  <p className="text-white/90 whitespace-pre-wrap">{echoResponse}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a {profile?.itemSingular || 'item'} to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}