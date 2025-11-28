'use client'

import { FaLeaf } from 'react-icons/fa'

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <FaLeaf className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground mr-2">Thinking</span>
          <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
        </div>
      </div>
    </div>
  )
}

