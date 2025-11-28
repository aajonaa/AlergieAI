'use client'

import { FaLeaf, FaUser } from 'react-icons/fa'
import { cn } from '@/lib/utils'
import { Message } from '@/store/chat-store'
import { MarkdownResponse } from './markdown-response'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary' : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <FaUser className="w-4 h-4 text-white" />
        ) : (
          <FaLeaf className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'rounded-2xl px-4 py-3 max-w-[80%]',
          isUser
            ? 'bg-primary text-white rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownResponse 
            content={message.content} 
            isStreaming={isStreaming}
            className="text-sm"
          />
        )}
      </div>
    </div>
  )
}

