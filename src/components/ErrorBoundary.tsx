import { Component } from 'react'
import type { ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" style={{ maxWidth: 560, margin: '80px auto', padding: 24 }} className="glass card">
        <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
        <p style={{ color: 'var(--muted)' }}>{this.state.error.message}</p>
        <button className="btn btn-primary" onClick={() => window.location.assign('/')}>Back to start</button>
      </div>
    )
  }
}
