export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-violet/30 border border-border flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-accent-blue">AI</span>
      </div>
      <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-tl-sm bg-bg-card border border-border">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent-blue/60 animate-pulse-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  )
}
