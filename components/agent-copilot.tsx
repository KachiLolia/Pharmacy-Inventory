'use client'

import { useState, useRef, useEffect } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Loader2, Sparkles, X, Trash2 } from 'lucide-react'
import { sendMessageToAgent, clearAgentHistory } from '@/app/actions/agent'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function parseMessageContent(content: any) {
  if (typeof content !== 'string') return { text: '', suggestions: [] }
  const parts = content.split('SUGGESTIONS:')
  if (parts.length > 1) {
    const text = parts[0].trim()
    const suggestionText = parts.slice(1).join('SUGGESTIONS:').trim()
    const suggestions = suggestionText.split('\n')
      .map(line => line.replace(/^- /, '').trim())
      .filter(line => line.length > 0)
    return { text, suggestions }
  }
  return { text: content, suggestions: [] }
}

export function AgentCopilot() {
  const [open, setOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '0',
    role: 'assistant',
    content: 'Hello! I am your AI Assistant. How can I help you today?'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  
  // Minimize to a smaller footprint after 3 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!isHovered && !open) {
      timeout = setTimeout(() => setIsIdle(true), 3000)
    } else {
      setIsIdle(false)
    }
    return () => clearTimeout(timeout)
  }, [isHovered, open])

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, open])

  async function sendSuggestion(text: string) {
    if (loading) return
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    
    try {
      const reply = await sendMessageToAgent(userMessage.content)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply || '(No text response)'
      }])
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error: ' + error.message
      }])
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const reply = await sendMessageToAgent(userMessage.content)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply || '(No text response)'
      }])
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error: ' + error.message
      }])
    } finally {
      setLoading(false)
    }
  }

  async function handleClearChat() {
    setLoading(true)
    await clearAgentHistory()
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Hello! I am your AI Assistant. How can I help you today?'
    }])
    setLoading(false)
  }

  return (
    <>
      {/* Floating Action Button */}
      <div 
        className={cn(
          "fixed z-50 bottom-6 transition-all duration-500 ease-in-out cursor-pointer group flex items-center justify-center shadow-lg",
          isIdle 
            ? "right-0 w-12 h-14 rounded-l-2xl rounded-r-none translate-x-0 bg-primary/80 hover:bg-primary opacity-60 hover:opacity-100" 
            : "right-6 w-14 h-14 rounded-full bg-primary hover:scale-105 hover:shadow-xl",
          open && "scale-0 opacity-0 pointer-events-none" // Hide when chat is open
        )}
        onClick={() => setOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Sparkles className={cn(
          "text-primary-foreground transition-all duration-300",
          isIdle ? "w-5 h-5 ml-1" : "w-6 h-6"
        )} />
      </div>

      {/* Chat Side Panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0 border-l shadow-2xl bg-background/95 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Pharmly Assistant</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => {
              const { text, suggestions } = parseMessageContent(msg.content)
              const isLastMessage = index === messages.length - 1
              
              return (
                <div key={msg.id} className="w-full flex flex-col gap-2">
                  <div className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "flex max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-muted/80 border text-foreground rounded-tl-sm"
                    )}>
                      {msg.role === 'assistant' && (
                        <div className="mr-3 mt-0.5 flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5 text-primary" />
                          </div>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed pt-0.5">
                        {text}
                      </div>
                    </div>
                  </div>
                  
                  {isLastMessage && suggestions.length > 0 && !loading && (
                    <div className="flex flex-col gap-2 mt-2 max-w-[85%] self-start">
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendSuggestion(suggestion)}
                            className="text-left text-xs bg-muted/50 hover:bg-primary/10 border border-border/50 text-foreground px-3 py-2 rounded-xl transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {messages.length === 1 && !loading && (
              <div className="flex flex-col gap-2 mt-4 max-w-[85%]">
                <p className="text-xs text-muted-foreground ml-1">Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "What's the revenue for today?",
                    "Are there any pending OTC orders?",
                    "Add a new drug"
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendSuggestion(suggestion)}
                      className="text-left text-xs bg-muted/50 hover:bg-primary/10 border border-border/50 text-foreground px-3 py-2 rounded-xl transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {loading && (
              <div className="flex w-full justify-start">
                <div className="flex max-w-[85%] rounded-2xl px-4 py-3 shadow-sm bg-muted/80 border text-foreground rounded-tl-sm items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex gap-1 items-center h-4">
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-2" />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t bg-background/50 backdrop-blur-md flex flex-col gap-2">
            <form onSubmit={handleSend} className="relative flex items-center">
              <Input 
                placeholder="Ask me anything..." 
                value={input}
                onChange={e => setInput(e.target.value)}
                className="flex-1 bg-muted/50 border-transparent focus-visible:ring-primary/30 focus-visible:border-primary/50 rounded-full pr-12 h-12 shadow-sm transition-all"
                disabled={loading}
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || loading} 
                size="icon" 
                className="absolute right-1.5 rounded-full h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </form>
            <div className="flex justify-center">
              <button onClick={handleClearChat} type="button" className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors">
                <Trash2 className="w-3 h-3" /> Clear chat
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
