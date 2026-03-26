// src/components/LoadingScreen.jsx
// Pantalla de carga animada para transiciones de auth y navegación

export function LoadingScreen({ message = "Cargando..." }) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-primary"
        style={{ animation: "fadeIn 0.15s ease-out" }}
      >
        {/* Logo */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: "linear-gradient(135deg, var(--accent-green-dim), var(--accent-green))",
            boxShadow: "0 0 32px rgba(34,201,122,0.3)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
  
        {/* Spinner */}
        <div className="relative w-8 h-8 mb-4">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "var(--accent-green)",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div
            className="absolute inset-1 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "var(--accent-green)",
              opacity: 0.4,
              animation: "spin 1.2s linear infinite reverse",
            }}
          />
        </div>
  
        {/* Mensaje */}
        <p className="text-sm text-text-muted tracking-wide">{message}</p>
  
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }