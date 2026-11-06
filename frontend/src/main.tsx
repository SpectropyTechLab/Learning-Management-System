import React from 'react';
import ReactDOM from 'react-dom/client';
import type { ErrorInfo, ReactNode } from 'react';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import '@/assets/index.css';

registerSW({ immediate: true });

class AppErrorBoundary extends React.Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-red-800">The page could not be displayed</h1>
          <p className="mt-2 text-sm text-slate-600">
            A frontend error interrupted this screen. Refresh after the issue is corrected.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-red-50 p-4 text-sm text-red-900">
            {this.state.error.message}
          </pre>
        </div>
      </main>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);

