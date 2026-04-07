import React, { ErrorInfo, ReactNode } from 'react';

export class ErrorBoundary extends React.Component<any, any> {
  state = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050810] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#0a1020] border border-[#1a2d4a] rounded-2xl p-8 shadow-2xl">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-[#e0eeff] mb-4">Something went wrong</h1>
            <p className="text-[#7a9cc0] text-sm mb-6 leading-relaxed">
              The application encountered an unexpected error. This might be due to a browser restriction or a temporary data issue.
            </p>
            <div className="bg-[#050810] p-4 rounded-lg border border-[#1a2d4a] mb-6 text-left overflow-auto max-h-40">
              <code className="text-xs text-[#ff3366] whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#00d4ff] text-[#050810] font-bold py-3 rounded-lg hover:bg-[#00d4ff]/80 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
