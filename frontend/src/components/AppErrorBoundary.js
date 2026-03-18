import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App runtime error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 shadow-xl text-center">
            <h1 className="text-xl font-extrabold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-600 mb-5">
              Please refresh the page. If the problem continues, contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-riderMaroon hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
