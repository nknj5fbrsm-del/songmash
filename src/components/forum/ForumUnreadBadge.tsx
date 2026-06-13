interface ForumUnreadBadgeProps {
  className?: string
  label?: string
}

export function ForumUnreadBadge({ className, label = 'Neu' }: ForumUnreadBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 ${className ?? ''}`}
      title={label}
      aria-label={label}
    >
      <span className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-500/20" aria-hidden />
    </span>
  )
}
