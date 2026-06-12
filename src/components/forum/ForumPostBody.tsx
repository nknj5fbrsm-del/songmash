const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/gi

interface ForumPostBodyProps {
  text: string
}

export function ForumPostBody({ text }: ForumPostBodyProps) {
  const parts = text.split(URL_PATTERN)

  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-300">
      {parts.map((part, index) => {
        if (!/^https?:\/\//i.test(part)) {
          return part
        }

        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lime-400 underline decoration-lime-400/40 underline-offset-2 hover:text-lime-300"
          >
            {part}
          </a>
        )
      })}
    </p>
  )
}
