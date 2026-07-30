import React, { Component, ErrorInfo, ReactNode } from "react";
import { sanitizeLocalStorage } from "../utils/safeJson";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleFixAndReload = () => {
    sanitizeLocalStorage();
    window.location.reload();
  };

  private handleClearAllAndReload = () => {
    if (confirm("确定要彻底清空所有本地数据并重新加载吗？")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-stone-900 text-stone-100 p-6 flex flex-col items-center justify-center font-sans z-[9999] overflow-y-auto">
          <div className="max-w-md w-full bg-stone-800 rounded-2xl p-6 border border-stone-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h1 className="text-xl font-bold">页面渲染遇到异常</h1>
            </div>
            
            <p className="text-stone-300 text-sm leading-relaxed">
              可能由于之前导入了不相容或损坏的数据导致白屏。您可以轻按下方按钮尝试清理损坏数据并重新加载：
            </p>

            {this.state.error && (
              <div className="bg-stone-950 p-3 rounded-lg text-xs font-mono text-red-300 overflow-x-auto max-h-36">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.handleFixAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors cursor-pointer"
              >
                清理损坏缓存并重试
              </button>

              <button
                type="button"
                onClick={this.handleClearAllAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-300 font-medium text-sm transition-colors cursor-pointer"
              >
                彻底重置所有数据
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
