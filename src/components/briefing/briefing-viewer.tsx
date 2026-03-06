"use client"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface BriefingViewerProps {
  content: string
}

export function BriefingViewer({ content }: BriefingViewerProps) {
  return (
    <div className="briefing-content">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="font-playfair font-bold text-xl text-espresso mt-8 mb-3 pb-2 border-b border-steam first:mt-0">
              {children}
            </h2>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2 mb-4 pl-0 list-none">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-espresso text-sm leading-relaxed font-dm-sans pl-3 border-l-2 border-steam">
              {children}
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-beeswax hover:text-beeswax-deep underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          p: ({ children }) => (
            <p className="text-espresso text-sm leading-relaxed font-dm-sans">
              {children}
            </p>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}
