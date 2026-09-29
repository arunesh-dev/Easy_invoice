import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="safe-top flex min-h-screen flex-col items-center 
                    justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <pre className="max-w-md overflow-auto rounded bg-muted p-3 
                        text-left text-xs">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => location.reload()}
            className="rounded-lg bg-primary px-4 py-2 text-sm 
                      text-primary-foreground"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
