import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

/**
 * Last-resort UI guard for render-time failures.
 *
 * A broken workspace should never leave the producer staring at a blank page.
 * Async action failures still belong in each workflow's own error handling; this
 * boundary is specifically for unexpected React render/lifecycle exceptions.
 */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('CREAPD workspace render error:', error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg glass-panel p-6 md:p-8 text-center border border-red-500/20">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-heading font-bold mb-2">This workspace hit a problem.</h1>
          <p className="text-sm text-muted-foreground mb-6">
            CREAPD caught the error before it could blank the entire app. Reload this workspace, or return home and continue from another Production Profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Workspace
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40"
            >
              <Home className="w-4 h-4" />
              CREAPD Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
