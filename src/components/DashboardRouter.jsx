import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Dashboard from '@/pages/Dashboard';

export default function DashboardRouter() {
  const [loading, setLoading] = useState(true);
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.default_production_type === 'music') {
        setRedirect('/music/dashboard');
      } else if (user?.default_production_type === 'spiritual') {
        setRedirect('/spiritual/dashboard');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (redirect) return <Navigate to={redirect} replace />;
  return <Dashboard />;
}