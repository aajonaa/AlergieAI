'use client'

import { useState, useRef, useEffect } from 'react'
import { FaPaperPlane } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 p-4 border-t bg-background">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about allergies, pollen, or diet..."
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm',
              'ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[48px] max-h-[200px]'
            )}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !input.trim()}
          className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0"
        >
          <FaPaperPlane className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  )
}

