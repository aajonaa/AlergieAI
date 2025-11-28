'use client'

import { FaBars, FaEdit, FaTrash, FaLeaf, FaComments } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChatStore, ChatSession } from '@/store/chat-store'
import { cn } from '@/lib/utils'

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

interface ChatItemProps {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

function ChatItem({ session, isActive, onSelect, onDelete }: ChatItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200',
        isActive 
          ? 'bg-primary/15 text-primary' 
          : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
      )}
      onClick={onSelect}
    >
      <FaComments className="w-4 h-4 flex-shrink-0 opacity-70" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{session.title}</p>
        <p className="text-xs opacity-60">{formatDate(session.updatedAt)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <FaTrash className="w-3 h-3 text-destructive" />
      </Button>
    </div>
  )
}

export function Sidebar() {
  const {
    sessions,
    currentSessionId,
    isSidebarOpen,
    toggleSidebar,
    createNewSession,
    switchSession,
    deleteSession,
  } = useChatStore()

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full z-40 flex flex-col bg-muted/30 border-r transition-all duration-300 ease-in-out',
          isSidebarOpen ? 'w-72' : 'w-16'
        )}
      >
        {/* Top Controls - Hamburger & New Chat */}
        <div className="p-3 space-y-1">
          {/* Hamburger Menu - Expand/Collapse */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-10 w-10 rounded-full hover:bg-muted"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <FaBars className="w-5 h-5 text-muted-foreground" />
          </Button>

          {/* New Chat Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => createNewSession()}
            className="h-10 w-10 rounded-full hover:bg-muted"
            title="New chat"
          >
            <FaEdit className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Chat History - Only visible when expanded */}
        {isSidebarOpen && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Section Header */}
            <div className="px-4 py-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Chats
              </h2>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1 px-2">
              <div className="space-y-1 pb-4">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <FaLeaf className="w-6 h-6 text-primary/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Click the edit icon to start a new chat
                    </p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <ChatItem
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      onSelect={() => switchSession(session.id)}
                      onDelete={() => deleteSession(session.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Bottom Branding */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <FaLeaf className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">AllergyAI</p>
                  <p className="text-xs opacity-70">v1.0</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  )
}
