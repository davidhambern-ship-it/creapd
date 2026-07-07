import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { runCreaprBrain } from '@/lib/creapr/creaprBrain';
import { executeUICommands } from '@/lib/creapr/uiCommandExecutor';
import { useCREAPMode } from '@/context/CREAPModeContext';
import RPPDepartmentNav from './RPPDepartmentNav';
import RPPCreaprMessage from './RPPCreaprMessage';
import CommandCenterAmbience from './CommandCenterAmbience';
import { getDepartmentThemeFromPath } from '@/lib/rppDepartmentThemes';

function _departmentFromRoute(pathname) {
  if (pathname.includes('/research/topics')) return 'Topics';
  if (pathname.includes('/research/manager')) return 'Research';
  if (pathname.includes('/research/dossier')) return 'Dossier';
  if (pathname.includes('/research/assets')) return 'Develop';
  if (pathname.includes('/research/export')) return 'Packet';
  return 'Lobby';
}

export default function RPPShell() {
  const researchData = useResearchProduction();
  const { config, topics, points, packages, dossiers } = researchData;
  const location = useLocation();
  const navigate = useNavigate();
  const { mode } = useCREAPMode();

  const [messages, setMessages] = useState([]);
  const [dockOpen, setDockOpen] = useState(false);
  const [brainLoading, setBrainLoading] = useState(false);
  const messageIdRef = useRef(0);
  const prevDeptRef = useRef(null);

  const activeTheme = getDepartmentThemeFromPath(location.pathname);

  const addMessage = useCallback((text, role = 'assistant') => {
    setMessages(prev => [...prev, { id: ++messageIdRef.current, role, text }]);
  }, []);

  // CREAPr greets when entering a new department "room"
  useEffect(() => {
    const deptId = activeTheme.id;
    if (prevDeptRef.current === null) {
      prevDeptRef.current = deptId;
      return;
    }
    if (prevDeptRef.current !== deptId) {
      prevDeptRef.current = deptId;
      addMessage(activeTheme.creaprGreeting, 'assistant');
      setDockOpen(true);
    }
  }, [activeTheme.id, activeTheme.creaprGreeting, addMessage]);

  const handleSendMessage = useCallback(async (text) => {
    if (!text.trim() || brainLoading) return;
    addMessage(text, 'user');
    setBrainLoading(true);

    try {
      const activeDepartment = _departmentFromRoute(location.pathname);
      const history = messages.map(m => ({ role: m.role, content: m.text }));

      const response = await runCreaprBrain({
        userMessage: text,
        activeProductionProfile: 'Research',
        activeDepartment,
        activeProjectId: config?.id,
        conversationHistory: history,
        pageContext: {
          route: location.pathname,
          entityCounts: {
            topics: topics.length,
            points: points.length,
            packages: packages.length,
            dossiers: dossiers?.length || 0,
          },
        },
        creapMode: mode,
      });

      if (response.message_to_user) {
        addMessage(response.message_to_user, 'assistant');
      }

      executeUICommands(response.ui_commands, { navigate });
    } catch (err) {
      addMessage("I ran into an issue processing that. Could you try again?", 'assistant');
    } finally {
      setBrainLoading(false);
    }
  }, [addMessage, brainLoading, config, location.pathname, messages, navigate, topics, points, packages, dossiers, mode]);

  const setCreaprMessage = useCallback((text) => {
    addMessage(text);
    setDockOpen(true);
  }, [addMessage]);

  const progressStages = {
    assignment: topics.length > 0,
    research: points.length > 0 || (dossiers?.length > 0),
    dossier: dossiers?.some(d => d.status === 'ready') || false,
    assets: packages.length > 0,
    packet: packages.some(p => p.status === 'approved' || p.status === 'finalized'),
  };

  return (
    <div
      className="rpp-shell"
      style={{
        '--dept-accent': activeTheme.accentHsl,
        '--dept-ambient': activeTheme.ambientHsl,
        '--dept-glow': activeTheme.glowHsl,
      }}
    >
      <div className="rpp-ambient-bg" />
      <CommandCenterAmbience />

      {/* Department Sidebar */}
      <RPPDepartmentNav
        config={config}
        progressStages={progressStages}
        researchingCount={topics.filter(t => t.status === 'researching').length}
      />

      {/* Main Workspace — reconfigures per department */}
      <main className="rpp-workspace" key={activeTheme.id}>
        <div className="rpp-workspace-content">
          <Outlet context={{ setCreaprMessage }} />
        </div>
      </main>

      {/* CREAPr Floating Dock */}
      {dockOpen ? (
        <RPPCreaprMessage
          messages={messages}
          onSendMessage={handleSendMessage}
          onCollapse={() => setDockOpen(false)}
          loading={brainLoading}
        />
      ) : (
        <button
          className="rpp-creapr-fab"
          onClick={() => setDockOpen(true)}
          title="Open CREAPr"
        >
          <span className="text-sm font-bold font-mono" style={{ color: 'hsl(190 80% 60%)' }}>Cr</span>
        </button>
      )}
    </div>
  );
}