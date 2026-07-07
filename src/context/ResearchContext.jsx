import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const ResearchContext = createContext(null);

export function ResearchProvider({ children }) {
  const [activeProject, setActiveProjectState] = useState(null);
  const [creaprMessages, setCreaprMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const typingTimerRef = useRef(null);

  const clearTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    setCreaprMessages(prev => prev.map(m => ({ ...m, isTyping: false })));
  }, []);

  const loadProject = useCallback(async (id) => {
    if (!id) return;
    setLoadingProject(true);
    try {
      const project = await base44.entities.ResearchProject.get(id);
      setActiveProjectState(project);
      localStorage.setItem('rpp_active_project', id);
    } catch {
      localStorage.removeItem('rpp_active_project');
      setActiveProjectState(null);
    }
    setLoadingProject(false);
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem('rpp_active_project');
    if (storedId) loadProject(storedId);
    return () => clearTyping();
  }, [loadProject, clearTyping]);

  const selectProject = useCallback((project) => {
    setActiveProjectState(project);
    localStorage.setItem('rpp_active_project', project.id);
    setCreaprMessages([]);
  }, []);

  const refreshProject = useCallback(async () => {
    if (activeProject?.id) {
      await loadProject(activeProject.id);
    }
  }, [activeProject, loadProject]);

  const creaprSay = useCallback((text, opts = {}) => {
    clearTyping();
    const messageId = Date.now().toString();
    const speed = opts.speed || 18;

    setCreaprMessages(prev => [...prev, { id: messageId, role: 'creapr', content: '', isTyping: true }]);
    setIsTyping(true);

    let charIndex = 0;
    typingTimerRef.current = setInterval(() => {
      if (charIndex <= text.length) {
        const chunk = text.slice(0, charIndex + 2);
        setCreaprMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, content: chunk, isTyping: charIndex + 2 < text.length } : m
        ));
        charIndex += 2;
      } else {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        setIsTyping(false);
      }
    }, speed);
  }, [clearTyping]);

  const userSay = useCallback((text) => {
    clearTyping();
    setCreaprMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, isTyping: false }]);
  }, [clearTyping]);

  const clearMessages = useCallback(() => {
    clearTyping();
    setCreaprMessages([]);
  }, [clearTyping]);

  const value = {
    activeProject,
    setActiveProject: selectProject,
    loadProject,
    refreshProject,
    loadingProject,
    creaprMessages,
    creaprSay,
    userSay,
    clearMessages,
    isTyping,
  };

  return <ResearchContext.Provider value={value}>{children}</ResearchContext.Provider>;
}

export function useResearch() {
  const ctx = useContext(ResearchContext);
  if (!ctx) throw new Error('useResearch must be used within ResearchProvider');
  return ctx;
}