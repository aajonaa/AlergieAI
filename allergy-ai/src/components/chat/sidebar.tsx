'use client'

import { FaBars, FaEdit, FaTrash, FaLeaf, FaEllipsisV, FaShare, FaPen, FaSearch } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useChatStore, ChatSession } from '@/store/chat-store'
import { cn } from '@/lib/utils'

interface ChatItemProps {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: () => void
  onShare: () => void
}

function ChatItem({ session, isActive, onSelect, onDelete, onRename, onShare }: ChatItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between h-11 pl-4 pr-2 cursor-pointer transition-all duration-150 rounded-full mx-2',
        isActive 
          ? 'bg-primary/10' 
          : 'hover:bg-muted/50'
      )}
      onClick={onSelect}
    >
      <span className={cn(
        'text-sm truncate',
        isActive ? 'text-primary font-medium' : 'text-foreground/80'
      )}>
        {session.title}
      </span>
      
      {/* Three-dot menu */}
      <div 
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-black/10 rounded-full"
            >
              <FaEllipsisV className="w-3 h-3 text-muted-foreground" />
            </Button>
          }
        >
          <DropdownMenuItem 
            icon={<FaPen className="w-3 h-3" />}
            onClick={onRename}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem 
            icon={<FaShare className="w-3 h-3" />}
            onClick={onShare}
          >
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            icon={<FaTrash className="w-3 h-3" />}
            onClick={onDelete}
            variant="destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
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
    updateSessionTitle,
  } = useChatStore()

  const handleRename = (sessionId: string, currentTitle: string) => {
    const newTitle = window.prompt('Enter new chat name:', currentTitle)
    if (newTitle && newTitle.trim()) {
      updateSessionTitle(sessionId, newTitle.trim())
    }
  }

  const handleShare = (session: ChatSession) => {
    const summary = `AllergyAI Chat: ${session.title}\n\nMessages: ${session.messages.length}`
    navigator.clipboard.writeText(summary)
    alert('Chat info copied to clipboard!')
  }

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full z-40 flex flex-col bg-background border-r transition-all duration-300 ease-in-out',
          isSidebarOpen ? 'w-72' : 'w-16'
        )}
      >
        {/* Top Controls */}
        <div className="p-3 flex items-center justify-between">
          {/* Hamburger Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-10 w-10 rounded-full hover:bg-muted"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <FaBars className="w-5 h-5 text-muted-foreground" />
          </Button>

          {/* Search button - only when expanded */}
          {isSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-muted"
              title="Search"
            >
              <FaSearch className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* New Chat Button */}
        <div className="px-3 mb-2">
          <Button
            variant="ghost"
            onClick={() => createNewSession()}
            className={cn(
              'hover:bg-muted rounded-full transition-all',
              isSidebarOpen 
                ? 'h-12 px-4 justify-start gap-3 w-full' 
                : 'h-10 w-10 p-0 mx-auto'
            )}
            title="New chat"
          >
            <FaEdit className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            {isSidebarOpen && (
              <span className="text-sm text-muted-foreground">New Chat</span>
            )}
          </Button>
        </div>

        {/* Chat History - Only visible when expanded */}
        {isSidebarOpen && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Section Header */}
            <div className="px-4 py-3">
              <h2 className="text-xs font-medium text-muted-foreground">
                Recent
              </h2>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
              <div className="space-y-1 pb-4">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <FaLeaf className="w-6 h-6 text-primary/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Click New Chat to start
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
                      onRename={() => handleRename(session.id, session.title)}
                      onShare={() => handleShare(session)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
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
