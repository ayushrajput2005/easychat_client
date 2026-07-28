import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          fontFamily: 'monospace',
          background: '#fff1f0',
          minHeight: '100vh',
          color: '#333',
        }}>
          <h2 style={{ color: '#c0392b' }}>⚠ App crashed</h2>
          <pre style={{
            background: '#fff',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #fca5a5',
            overflowX: 'auto',
            fontSize: '13px',
          }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
