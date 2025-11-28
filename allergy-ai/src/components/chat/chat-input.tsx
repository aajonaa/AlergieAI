'use client'

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { FaPaperPlane } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export interface ChatInputHandle {
  focus: () => void
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput({ onSend, disabled }, ref) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    }
  }))

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  // Refocus when disabled changes from true to false
  useEffect(() => {
    if (!disabled) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [disabled])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      const message = input.trim()
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      // Send message after clearing input
      onSend(message)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Prevent button from stealing focus
  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about allergies, pollen, or diet..."
          disabled={disabled}
          rows={1}
          autoFocus
          className={cn(
            'flex-1 resize-none rounded-xl border border-input bg-background px-4 py-[11px] text-sm leading-5',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'max-h-[200px] overflow-y-auto',
            // Hide scrollbar but keep scroll functionality
            '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !input.trim()}
          onMouseDown={handleButtonMouseDown}
          tabIndex={-1}
          className="h-[44px] w-[44px] rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0"
        >
          <FaPaperPlane className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  )
})
