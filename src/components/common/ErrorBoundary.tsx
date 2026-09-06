import { Component, type ErrorInfo, type ReactNode } from "react"
import { Link } from "react-router"

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Admin] Uncaught render error:", error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ error: null })
    window.location.href = "/"
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    const message = this.state.error.message || "Something went wrong loading the admin panel."

    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-gray-900">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-theme-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl dark:bg-rose-900/40">
            !
          </div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Admin panel error
          </h1>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{message}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Reload dashboard
            </button>
            <Link
              to="/signin"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
