import { Component, ReactNode } from 'react'

/**
 * Catches render-time crashes in a subtree (e.g. the Three.js Canvas failing
 * when a machine has no WebGL) and shows a friendly fallback instead of letting
 * the whole app go blank.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('UI subtree crashed:', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
