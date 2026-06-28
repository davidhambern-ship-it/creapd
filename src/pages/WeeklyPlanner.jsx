import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Sparkles, Copy, Trash2, Save, Compass,
  ChevronLeft, ChevronRight, LayoutGrid, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DayCard from '@/components/weekly/DayCard';
import DayEditorModal from '@/components/weekly/DayEditorModal';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';
import TemplateManager from '@/components/weekly/TemplateManager';
import { DAY_NAMES, DAY_LABELS, SUGGESTED_WEEK, stringifyJSON, parseJSON } from '@/lib/weeklyConstants';
import { useToast } from '@/components/ui/use-toast';

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function WeeklyPlanner() {
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [dayPlans, setDayPlans] = useState({});
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDay, setEditorDay] = useState(null);
  const [directionOpen, setDirectionOpen] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const weekEnd = addDays(weekStart, 6);
  const today = new Date();
  const todayStr = formatDate(today);
  const isSaturday = today.getDay() === 6;

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    const startStr = formatDate(weekStart);
    const endStr = formatDate(addDays(weekStart, 6));
    try {
      const [plans, srcs] = await Promise.all([
        base44.entities.WeeklyPlan.filter({ week_start_date: startStr }, '-created_date', 1),
        base44.entities.Source.filter({ enabled: true }, '-created_date', 50),
      ]);
      let plan = plans[0];
      if (!plan) {
        plan = await base44.entities.WeeklyPlan.create({
          week_start_date: startStr,
          week_end_date: endStr,
          status: 'draft',
          notes: '',
        });
      }
      setWeeklyPlan(plan);
      setSources(srcs);
      const days = await base44.entities.DayPlan.filter({ weekly_plan_id: plan.id }, 'date', 50);
      const dayMap = {};
      days.forEach(d => { dayMap[d.day_name] = d; });
      setDayPlans(dayMap);
    } catch (err) {
      setError(err.message || 'Failed to load week data');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const generateWeeklyPlan = async () => {
    if (!weeklyPlan) return;
    const existing = Object.keys(dayPlans);
    const toCreate = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayName = DAY_NAMES[i];
      const suggested = SUGGESTED_WEEK[i];
      if (existing.includes(dayName)) continue;
      toCreate.push({
        weekly_plan_id: weeklyPlan.id,
        date: formatDate(date),
        day_name: dayName,
        enabled: dayName !== 'saturday',
        automation_time: '06:00',
        briefing_type: suggested.type,
        theme: suggested.theme,
        energy: suggested.energy,
        mission: '',
        producer_notes: '',
        selected_categories: stringifyJSON(suggested.categories),
        priority_topics: stringifyJSON([]),
        avoid_topics: stringifyJSON([]),
        source_priority_mode: 'all_approved',
        prioritized_sources: stringifyJSON([]),
        excluded_sources: stringifyJSON([]),
        editorial_rules: stringifyJSON(['block_recycled_leads', 'block_7_days', 'require_local_state']),
        brief_length: 'standard',
        approval_required: false,
        status: dayName === 'saturday' ? 'skipped' : 'planned',
      });
    }
    if (toCreate.length > 0) {
      const created = await base44.entities.DayPlan.bulkCreate(toCreate);
      const newMap = { ...dayPlans };
      created.forEach(d => { newMap[d.day_name] = d; });
      setDayPlans(newMap);
    }
    await base44.entities.WeeklyPlan.update(weeklyPlan.id, { status: 'planned' });
    setWeeklyPlan({ ...weeklyPlan, status: 'planned' });
    toast({ title: 'Weekly plan generated', description: 'Suggested plan created for all 7 days.' });
  };

  const copyLastWeek = async () => {
    const lastWeekStart = addDays(weekStart, -7);
    const lastWeekPlans = await base44.entities.WeeklyPlan.filter({ week_start_date: formatDate(lastWeekStart) }, '-created_date', 1);
    if (lastWeekPlans.length === 0) {
      toast({ title: 'No previous week found', description: 'There is no plan to copy from last week.' });
      return;
    }
    const lastDays = await base44.entities.DayPlan.filter({ weekly_plan_id: lastWeekPlans[0].id }, 'date', 50);
    const toCreate = lastDays.map(d => {
      const dayIndex = DAY_NAMES.indexOf(d.day_name);
      const newDate = addDays(weekStart, dayIndex);
      return {
        ...d,
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
        weekly_plan_id: weeklyPlan.id,
        date: formatDate(newDate),
        status: 'planned',
      };
    });
    // Delete existing day plans first
    const existingIds = Object.values(dayPlans).map(d => d.id).filter(Boolean);
    if (existingIds.length > 0) {
      await base44.entities.DayPlan.deleteMany({ id: { $in: existingIds } });
    }
    const created = await base44.entities.DayPlan.bulkCreate(toCreate);
    const newMap = {};
    created.forEach(d => { newMap[d.day_name] = d; });
    setDayPlans(newMap);
    toast({ title: 'Copied last week', description: `${created.length} day plans copied from last week.` });
  };

  const clearWeek = async () => {
    const existingIds = Object.values(dayPlans).map(d => d.id).filter(Boolean);
    if (existingIds.length > 0) {
      await base44.entities.DayPlan.deleteMany({ id: { $in: existingIds } });
    }
    setDayPlans({});
    toast({ title: 'Week cleared', description: 'All day plans removed.' });
  };

  const saveWeeklyPlan = async () => {
    if (weeklyPlan) {
      await base44.entities.WeeklyPlan.update(weeklyPlan.id, { status: 'active' });
      setWeeklyPlan({ ...weeklyPlan, status: 'active' });
    }
    toast({ title: 'Weekly plan saved', description: 'The automation will use this plan for the upcoming week.' });
  };

  const openDayEditor = (dayPlan, dayName, date) => {
    setEditorDay({ dayPlan, dayName, date: date || (dayPlan?.date) });
    setEditorOpen(true);
  };

  const saveDayPlan = async (form) => {
    const data = { ...form, status: form.status === 'not_planned' ? 'planned' : form.status };
    if (data.id) {
      const updated = await base44.entities.DayPlan.update(data.id, data);
      setDayPlans(prev => ({ ...prev, [updated.day_name]: updated }));
    } else {
      const created = await base44.entities.DayPlan.create({ ...data, weekly_plan_id: weeklyPlan.id });
      setDayPlans(prev => ({ ...prev, [created.day_name]: created }));
    }
    toast({ title: 'Day plan saved', description: `${DAY_LABELS[form.day_name]} plan updated.` });
  };

  const applyToWeek = async (form) => {
    const toUpdate = [];
    for (let i = 0; i < 7; i++) {
      const dayName = DAY_NAMES[i];
      const date = addDays(weekStart, i);
      const existing = dayPlans[dayName];
      const data = {
        ...form,
        id: existing?.id,
        weekly_plan_id: weeklyPlan.id,
        day_name: dayName,
        date: formatDate(date),
        status: existing?.status || 'planned',
      };
      if (existing) {
        const updated = await base44.entities.DayPlan.update(existing.id, data);
        toUpdate.push(updated);
      } else {
        const created = await base44.entities.DayPlan.create({ ...data, id: undefined });
        toUpdate.push(created);
      }
    }
    const newMap = {};
    toUpdate.forEach(d => { newMap[d.day_name] = d; });
    setDayPlans(newMap);
    toast({ title: 'Applied to entire week', description: 'All 7 days updated with this configuration.' });
  };

  const copyToDay = (form) => {
    toast({ title: 'Select a target day', description: 'Click any day card to copy this plan to it.' });
    // Store the form to copy - we'll use a simple approach
    window._copyDayPlan = form;
  };

  const resetDay = () => {
    setEditorDay({ dayPlan: null, dayName: editorDay.dayName, date: editorDay.date });
    toast({ title: 'Reset to default', description: 'Day plan cleared to defaults.' });
  };

  const previewDay = (form) => {
    toast({ title: 'Preview generated', description: `Preview for ${DAY_LABELS[form.day_name]} would show the brief output.` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Compass className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Couldn't load the planner</h2>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
        <Button size="sm" onClick={() => loadWeek()} className="bg-berna-purple hover:bg-berna-purple/90 text-white">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="glass-panel glow-purple p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-berna-purple/10 to-transparent rounded-full -mr-20 -mt-20" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-5 h-5 text-berna-purple" />
            <p className="text-[10px] text-berna-purple uppercase tracking-[0.2em] font-semibold">Weekly Planner</p>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">Plan the Week</h1>
          <p className="text-sm text-muted-foreground">{weekRange}</p>

          {isSaturday && (
            <div className="mt-4 p-3 rounded-lg bg-berna-orange/10 border border-berna-orange/20 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-berna-orange flex-shrink-0" />
              <p className="text-xs text-berna-orange">It's Saturday — your planning day. Set up next week's briefings now.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-5">
            <Button size="sm" onClick={generateWeeklyPlan} className="bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:from-berna-purple/90 text-white text-xs glow-purple">
              <Sparkles className="w-3 h-3 mr-1" />Generate Weekly Plan
            </Button>
            <Button size="sm" variant="outline" onClick={copyLastWeek} className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
              <Copy className="w-3 h-3 mr-1" />Copy Last Week
            </Button>
            <Button size="sm" variant="outline" onClick={clearWeek} className="border-white/10 text-white/60 text-xs hover:bg-white/[0.04]">
              <Trash2 className="w-3 h-3 mr-1" />Clear Week
            </Button>
            <Button size="sm" variant="outline" onClick={saveWeeklyPlan} className="border-berna-emerald/20 text-berna-emerald text-xs hover:bg-berna-emerald/10">
              <Save className="w-3 h-3 mr-1" />Save Weekly Plan
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDirectionOpen(true)} className="border-berna-orange/20 text-berna-orange text-xs hover:bg-berna-orange/10 ml-auto">
              <Compass className="w-3 h-3 mr-1" />Change Direction
            </Button>
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))} className="text-muted-foreground hover:text-white text-xs">
          <ChevronLeft className="w-4 h-4 mr-1" />Previous Week
        </Button>
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03]">
          <button onClick={() => setTab('board')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === 'board' ? 'bg-white/[0.08] text-white' : 'text-muted-foreground'}`}>
            <LayoutGrid className="w-3 h-3 inline mr-1" />Weekly Board
          </button>
          <button onClick={() => setTab('templates')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === 'templates' ? 'bg-white/[0.08] text-white' : 'text-muted-foreground'}`}>
            <FileText className="w-3 h-3 inline mr-1" />Templates
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))} className="text-muted-foreground hover:text-white text-xs">
          Next Week<ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {tab === 'board' ? (
        <>
          {/* Weekly Board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {DAY_NAMES.map((dayName, i) => {
              const date = addDays(weekStart, i);
              const dateStr = formatDate(date);
              const dp = dayPlans[dayName];
              const isPlanningDay = dayName === 'saturday';
              const isToday = dateStr === todayStr;
              return (
                <DayCard
                  key={dayName}
                  dayPlan={dp}
                  date={dateStr}
                  dayName={dayName}
                  isPlanningDay={isPlanningDay}
                  isToday={isToday}
                  onClick={(plan, name, d) => openDayEditor(plan, name, d)}
                  onPreview={(plan) => previewDay(plan || dp)}
                />
              );
            })}
          </div>

          {/* Status legend */}
          <div className="glass-panel p-3 flex flex-wrap items-center gap-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status:</span>
            {[
              { label: 'Planned/Ready', dot: 'bg-berna-emerald' },
              { label: 'Scheduled', dot: 'bg-berna-purple' },
              { label: 'Needs Review', dot: 'bg-berna-orange' },
              { label: 'Skipped', dot: 'bg-gray-500' },
              { label: 'Failed', dot: 'bg-red-500' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className="text-[10px] text-white/60">{s.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <TemplateManager />
      )}

      {/* Day Editor Modal */}
      <DayEditorModal
        open={editorOpen}
        dayPlan={editorDay?.dayPlan}
        dayName={editorDay?.dayName}
        date={editorDay?.date}
        sources={sources}
        onClose={() => setEditorOpen(false)}
        onSave={saveDayPlan}
        onApplyWeek={applyToWeek}
        onCopyDay={copyToDay}
        onReset={resetDay}
        onPreview={previewDay}
      />

      {/* Change Direction Modal */}
      <ChangeDirectionModal
        open={directionOpen}
        currentFocus={dayPlans[DAY_NAMES[today.getDay()]]?.theme}
        onClose={() => setDirectionOpen(false)}
      />
    </div>
  );
}