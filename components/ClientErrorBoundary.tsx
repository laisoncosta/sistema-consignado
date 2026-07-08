"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ClientErrorBoundaryProps = {
  children: ReactNode;
  area?: string;
};

type ClientErrorBoundaryState = {
  hasError: boolean;
  message: string | null;
};

export class ClientErrorBoundary extends Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = {
    hasError: false,
    message: null,
  };

  static getDerivedStateFromError(error: Error): ClientErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ClientErrorBoundary${this.props.area ? `:${this.props.area}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
        >
          <p className="font-semibold">Algo deu errado nesta tela.</p>
          {this.state.message ? (
            <p className="mt-2 text-red-700">{this.state.message}</p>
          ) : null}
          <button
            type="button"
            className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
