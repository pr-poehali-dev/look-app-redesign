import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    try {
       
      console.error("App crashed:", error);
    } catch (e) {
      void e;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "24px",
            background: "#0d2a18",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
              Лоок
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.5, opacity: 0.9, marginBottom: 16 }}>
              Произошла ошибка при загрузке приложения. Попробуйте обновить страницу.
            </p>
            {this.state.message && (
              <pre
                style={{
                  fontSize: 12,
                  textAlign: "left",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background: "rgba(0,0,0,0.3)",
                  padding: "12px",
                  borderRadius: 8,
                  marginBottom: 16,
                  opacity: 0.8,
                }}
              >
                {this.state.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 8,
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                color: "#0d2a18",
                background: "#fff",
                border: "none",
                borderRadius: 9999,
                cursor: "pointer",
              }}
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;