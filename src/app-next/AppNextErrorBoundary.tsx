import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  addAppNextDiagnosticEvent,
} from "./appNextDiagnostics";

interface AppNextErrorBoundaryProps {
  children: ReactNode;
}

interface AppNextErrorBoundaryState {
  hasError: boolean;
  errorName: string;
}

export class AppNextErrorBoundary extends Component<
  AppNextErrorBoundaryProps,
  AppNextErrorBoundaryState
> {
  state: AppNextErrorBoundaryState = {
    hasError: false,
    errorName: "",
  };

  static getDerivedStateFromError(error: unknown): AppNextErrorBoundaryState {
    return {
      hasError: true,
      errorName: error instanceof Error ? error.name : "UnknownError",
    };
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo): void {
    addAppNextDiagnosticEvent({
      event: "app-next-render-error",
      resourceExhausted: false,
    });

    if (import.meta.env.DEV) {
      console.error("[app-next] render error", error instanceof Error ? error.name : "UnknownError");
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="app-next-shell">
        <section className="app-next-card app-next-error">
          <h1>시험 로그인 화면에서 오류가 발생했습니다.</h1>
          <p>로그인 기능을 끄고 다시 확인해 주세요.</p>
          {import.meta.env.DEV ? (
            <p>오류 유형: {this.state.errorName || "UnknownError"}</p>
          ) : null}
        </section>
      </main>
    );
  }
}
