// saas/src/components/ErrorBoundary.jsx  — NEW FILE
//
// FIX: Instead of a blank/crashed page, show a user-friendly error UI
//      with a Reload button and error details in development mode.
//
// Usage:
//   <ErrorBoundary>
//     <YourComponent />
//   </ErrorBoundary>
//
//   Or wrap the entire app in main.jsx:
//   <ErrorBoundary>
//     <App />
//   </ErrorBoundary>

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console (replace with your error tracking service)
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env?.DEV || import.meta.env?.MODE === 'development';

    return (
      <div style={styles.overlay}>
        <div style={styles.card}>
          <div style={styles.icon}>⚠️</div>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.message}>
            The application encountered an unexpected error. Please reload the page.
          </p>

          {isDev && this.state.error && (
            <details style={styles.details}>
              <summary style={styles.summary}>Error details (dev mode)</summary>
              <pre style={styles.pre}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div style={styles.actions}>
            <button style={styles.primaryBtn} onClick={this.handleReload}>
              🔄 Reload Page
            </button>
            <button
              style={styles.secondaryBtn}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '560px',
    width: '100%',
    textAlign: 'center',
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
  },
  icon: { fontSize: '48px', marginBottom: '16px' },
  title: { fontSize: '22px', fontWeight: 700, marginBottom: '12px', color: '#ffffff' },
  message: { color: '#ffffff', lineHeight: 1.6, marginBottom: '24px' },
  details: {
    textAlign: 'left',
    marginBottom: '24px',
    background: '#0f172a',
    borderRadius: '8px',
    padding: '12px',
  },
  summary: { cursor: 'pointer', color: '#ffffff', fontSize: '14px', marginBottom: '8px' },
  pre: {
    fontSize: '11px',
    color: '#f87171',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  },
  actions: { display: 'flex', gap: '12px', justifyContent: 'center' },
  primaryBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: '1px solid #ffffff',
    background: 'transparent',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default ErrorBoundary;
