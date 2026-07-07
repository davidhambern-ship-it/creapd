import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearch } from '@/context/ResearchContext';
import { base44 } from '@/api/base44Client';
import { DEPARTMENTS, getProjectStatus } from '@/lib/researchConstants';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResearchLobby() {
  const { activeProject, setActiveProject, creaprSay, clearMessages } = useResearch();
  const navigate = useNavigate();
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ production_name: '', description: '' });

  useEffect(() => {
    clearMessages();
    loadProjects();
    if (activeProject) {
      creaprSay(`Welcome back to the Research Institute. Your project "${activeProject.production_name}" is ready. Where would you like to work?`);
    } else {
      creaprSay('Welcome to the CREAPr Research Institute. I am CREAPr, your research guide. Create a new project to begin, or select a recent one to continue your work.');
    }
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projects = await base44.entities.ResearchProject.list('-created_date', 10);
      setRecentProjects(projects || []);
    } catch { setRecentProjects([]); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.production_name.trim()) return;
    setCreating(true);
    try {
      const project = await base44.entities.ResearchProject.create({
        production_name: form.production_name.trim(),
        description: form.description.trim(),
        status: 'configuring',
        active_department: 'lobby',
      });
      setActiveProject(project);
      creaprSay(`Project "${project.production_name}" created. Let's head to the Topics Department to define what you'd like to research.`);
      navigate('/research/topics');
    } catch (e) {
      creaprSay('I encountered an issue creating the project. Please try again.');
    }
    setCreating(false);
  };

  const handleSelectProject = (project) => {
    setActiveProject(project);
    creaprSay(`Project "${project.production_name}" loaded. Where would you like to work?`);
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {!activeProject ? (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl lg:text-3xl font-heading font-bold text-white">Research Institute Lobby</h2>
            <p className="text-sm text-muted-foreground mt-2">Create a new research project to begin your pre-production journey.</p>
          </div>

          <div className="glass-panel p-6 max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-heading font-semibold text-white">New Research Project</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Project Name</label>
                <input
                  value={form.production_name}
                  onChange={(e) => setForm({ ...form, production_name: e.target.value })}
                  placeholder="e.g., AI Impact on Healthcare"
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of what you want to investigate..."
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!form.production_name.trim() || creating}
                className="w-full bg-gradient-to-r from-cyan-500/30 to-blue-500/20 hover:from-cyan-500/40 hover:to-blue-500/30 text-white border border-cyan-500/20"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>

          {recentProjects.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-heading font-semibold mb-3">Recent Projects</h3>
              <div className="grid gap-2">
                {recentProjects.map((p) => {
                  const status = getProjectStatus(p.status);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProject(p)}
                      className="glass-panel p-3 flex items-center justify-between hover:border-cyan-500/20 transition-all text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{p.production_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-md">{p.research_question || p.description || 'No topic defined yet'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full', status.bg, status.color)}>{status.label}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl lg:text-2xl font-heading font-bold text-white">{activeProject.production_name}</h2>
            <p className="text-xs text-muted-foreground mt-1">{activeProject.description || activeProject.research_question || 'No research question defined yet'}</p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-heading font-semibold mb-3">Departments</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {DEPARTMENTS.map((dept) => {
                const Icon = dept.icon;
                return (
                  <button
                    key={dept.key}
                    onClick={() => navigate(dept.path)}
                    className={cn(
                      'glass-panel p-4 text-left hover:border-white/20 transition-all group',
                      dept.colorBorder
                    )}
                  >
                    <Icon className={cn('w-5 h-5 mb-2', dept.color)} />
                    <p className="text-sm font-heading font-semibold text-white">{dept.shortLabel}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{dept.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground group-hover:text-white transition-colors">
                      Enter <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {recentProjects.length > 1 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-heading font-semibold mb-3">Switch Project</h3>
              <div className="grid gap-2">
                {recentProjects.filter(p => p.id !== activeProject.id).slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProject(p)}
                    className="glass-panel p-2.5 flex items-center justify-between hover:border-white/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs font-medium text-white">{p.production_name}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}