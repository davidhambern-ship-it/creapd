import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import RPPDepartmentNav from './RPPDepartmentNav';
import RPPCreaprMessage from './RPPCreaprMessage';
import CommandCenterAmbience from './CommandCenterAmbience';

export default function RPPShell() {
  const location = useLocation();
  const researchData = useResearchProduction();
  const { config, topics, points, packages, dossiers } = researchData;

  const [user, setUser] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [messages, setMessages] = useState([]);
  const [dockOpen, setDockOpen] = useState(false);
  const messageIdRef = useRef(0);

  const addMessage = useCallback((text, role = 'assistant') => {
    setMessages(prev => [...prev, { id: ++messageIdRef.current, role, text }]);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (location.pathname === '/research' && messages.length === 0 && config !== undefined) {
      const firstName = user?.full_name?.split(' ')[0] || 'there';
      const greeting = config
        ? `Welcome back, ${firstName}. Your production "${config.production_name}" is ${topics.length > 0 ? 'in progress' : 'ready to begin'}. Where would you like to work?`
        : `Welcome to the Research Production Profile, ${firstName}. Visit the Configuration department to set up your production, or explore the library.`;
      addMessage(greeting);
    }
  }, [location.pathname, user, config, topics.length, messages.length, addMessage]);

  const handleSpeak = useCallback((text) => {
    if (!voiceEnabled) return;
    base44.functions.invoke('generateCreapSpeech', {
      text: text.substring(0, 5000),
      voice: 'daniel',
    }).then(res => {
      const url = res?.data?.url;
      if (url) {
        const audio = new Audio(url);
        audio.play().catch(() => {});
      }
    }).catch(() => {});
  }, [voiceEnabled]);

  const toggleVoice = useCallback(() => setVoiceEnabled(v => !v), []);

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
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
      />

      {/* Main Workspace */}
      <main className="rpp-workspace">
        <Outlet context={{ setCreaprMessage, voiceEnabled }} />
      </main>

      {/* CREAPr Floating Dock */}
      {dockOpen ? (
        <RPPCreaprMessage
          messages={messages}
          voiceEnabled={voiceEnabled}
          onToggleVoice={toggleVoice}
          onSendMessage={handleSendMessage}
          onSpeak={handleSpeak}
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