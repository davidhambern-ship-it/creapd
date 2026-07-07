import React, { useState, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import RPPDepartmentNav from './RPPDepartmentNav';
import RPPCreaprMessage from './RPPCreaprMessage';
import CommandCenterAmbience from './CommandCenterAmbience';

export default function RPPShell() {
  const researchData = useResearchProduction();
  const { config, topics, points, packages, dossiers } = researchData;

  const [messages, setMessages] = useState([]);
  const [dockOpen, setDockOpen] = useState(false);
  const messageIdRef = useRef(0);

  const addMessage = useCallback((text, role = 'assistant') => {
    setMessages(prev => [...prev, { id: ++messageIdRef.current, role, text }]);
  }, []);

  const handleSendMessage = useCallback((text) => {
    if (!text.trim()) return;
    addMessage(text, 'user');
    setTimeout(() => {
      const responses = [
        "I'm here to help you navigate the library. Try visiting a department from the top nav.",
        "Got it. Let me know what you'd like to research or produce.",
        "Understood. You can explore topics, run research, or assemble packets from the nav above.",
      ];
      addMessage(responses[Math.floor(Math.random() * responses.length)]);
    }, 800);
  }, [addMessage]);

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
    <div className="rpp-shell">
      <div className="rpp-ambient-bg" />
      <CommandCenterAmbience />

      {/* Top Navigation Bar */}
      <RPPDepartmentNav
        config={config}
        progressStages={progressStages}
        researchingCount={topics.filter(t => t.status === 'researching').length}
      />

      {/* Main Workspace */}
      <main className="rpp-workspace">
        <Outlet context={{ setCreaprMessage }} />
      </main>

      {/* CREAPr Floating Dock */}
      {dockOpen ? (
        <RPPCreaprMessage
          messages={messages}
          onSendMessage={handleSendMessage}
          onCollapse={() => setDockOpen(false)}
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