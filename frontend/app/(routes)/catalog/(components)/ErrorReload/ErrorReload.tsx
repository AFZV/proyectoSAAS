"use client";

export function ErrorReload() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    >
      Reintentar
    </button>
  );
}
