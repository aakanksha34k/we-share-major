import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('UI crash:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '3rem' }}>😕</div>
          <h2>Something went wrong on this page</h2>
          <p style={{ color: '#636e72', margin: '8px 0 18px' }}>{String(this.state.error?.message || '')}</p>
          <button className="btn-primary" onClick={() => { window.location.href = '/hub'; }}>Back to Hub</button>
        </div>
      </div>
    );
  }
}