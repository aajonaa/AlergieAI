'use client'

import { FaLeaf, FaTrash, FaSignOutAlt } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'
import { useChatStore } from '@/store/chat-store'

interface ChatHeaderProps {
  onClearChat: () => void
}

export function ChatHeader({ onClearChat }: ChatHeaderProps) {
  const { getCurrentSession } = useChatStore()
  const currentSession = getCurrentSession()

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
          <FaLeaf className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {currentSession?.title || 'AllergyAI'}
          </h1>
          <p className="text-xs text-muted-foreground">Your Expert Allergist Assistant</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          className="text-muted-foreground hover:text-destructive"
        >
          <FaTrash className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Clear Chat</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-muted-foreground hover:text-foreground"
        >
          <FaSignOutAlt className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  )
}
