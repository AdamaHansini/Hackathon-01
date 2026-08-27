import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../../api/messagesApi';
import { useAuthStore } from '../../store/useAuthStore';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MessageSquare, Send, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const Messages: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Conversations List
  const { 
    data: conversationsData, 
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    error: conversationsError,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.getConversations(),
  });

  // Fetch Active Conversation Messages
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
  } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => messagesApi.getMessages(activeConversationId!),
    enabled: !!activeConversationId,
    refetchInterval: 5000, // Poor man's real-time until Socket.IO is fully integrated
  });

  const sendMessageMutation = useMutation({
    mutationFn: (text: string) => messagesApi.sendMessage(activeConversationId!, { content: text }),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.data?.items]);

  useEffect(() => {
    // Auto-select first conversation if none selected
    if (!activeConversationId && conversationsData?.data?.items && conversationsData.data.items.length > 0) {
      setActiveConversationId(conversationsData.data.items[0]._id);
    }
  }, [conversationsData, activeConversationId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && activeConversationId) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const getOtherParticipant = (conversation: any) => {
    if (!user) return null;
    return conversation.participants.find((p: any) => p._id !== user._id);
  };

  const activeConversation = conversationsData?.data?.items?.find((c: any) => c._id === activeConversationId);
  const otherUser = activeConversation ? getOtherParticipant(activeConversation) : null;

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col sm:flex-row bg-surface border border-taupe-border rounded-xl overflow-hidden shadow-sm">
      
      {/* Conversations List (Sidebar) */}
      <div className={cn(
        "w-full sm:w-80 flex-shrink-0 border-r border-taupe-border flex flex-col",
        activeConversationId ? "hidden sm:flex" : "flex"
      )}>
        <div className="p-4 border-b border-taupe-border flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary-button" />
          <h2 className="text-lg font-bold text-dark-text">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isConversationsError ? (
            <div className="p-4">
              <ErrorState message={(conversationsError as any)?.message} onRetry={refetchConversations} />
            </div>
          ) : isConversationsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : conversationsData?.data?.items && conversationsData.data.items.length > 0 ? (
            <div className="divide-y divide-taupe-border">
              {conversationsData.data.items.map((conv: any) => {
                const partner = getOtherParticipant(conv);
                const isUnread = conv.lastMessage && conv.lastMessage.senderId !== user?._id && !conv.lastMessage.readAt;
                
                return (
                  <button
                    key={conv._id}
                    onClick={() => setActiveConversationId(conv._id)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-light-beige transition-colors flex items-start gap-3",
                      activeConversationId === conv._id ? "bg-soft-nude" : ""
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-taupe-border flex items-center justify-center shrink-0 overflow-hidden">
                      {partner?.avatarUrl ? (
                        <img src={partner.avatarUrl} alt={partner.name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-text" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <p className={cn("text-sm truncate", isUnread ? "font-bold text-dark-text" : "font-medium text-dark-text")}>
                          {partner?.name || 'Unknown User'}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-xs text-muted-text whitespace-nowrap ml-2">
                            {format(new Date(conv.lastMessage.createdAt), 'MMM d')}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage ? (
                        <p className={cn("text-xs truncate", isUnread ? "font-semibold text-dark-text" : "text-muted-text")}>
                          {conv.lastMessage.senderId === user?._id ? 'You: ' : ''}
                          {conv.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-text italic">No messages yet</p>
                      )}
                    </div>
                    {isUnread && (
                      <div className="h-2 w-2 rounded-full bg-primary-button mt-1.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-text">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-text/50" />
              <p className="text-sm">No conversations yet.</p>
              <p className="text-xs mt-1">Messages unlock when claims are approved.</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !activeConversationId ? "hidden sm:flex" : "flex"
      )}>
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-taupe-border flex items-center gap-3">
              <button 
                className="sm:hidden p-1 mr-1 text-muted-text hover:text-dark-text"
                onClick={() => setActiveConversationId(null)}
              >
                ← Back
              </button>
              <div className="h-10 w-10 rounded-full bg-light-beige flex items-center justify-center shrink-0 overflow-hidden border border-taupe-border">
                {otherUser?.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt={otherUser.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-text" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-dark-text">{otherUser?.name || 'Unknown User'}</h3>
                <p className="text-xs text-muted-text">
                  Regarding: <Link to={`/claims/${activeConversation?.claimId}`} className="hover:underline">{activeConversation?.claimId ? 'View Claim' : 'Unknown'}</Link>
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-background">
              {isMessagesLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-2/3 rounded-xl rounded-tl-sm ml-auto" />
                  <Skeleton className="h-12 w-2/3 rounded-xl rounded-tr-sm" />
                </div>
              ) : messagesData?.data?.items && messagesData.data.items.length > 0 ? (
                <div className="space-y-4">
                  {messagesData.data.items.map((msg: any) => {
                    const isMine = msg.senderId === user?._id;
                    return (
                      <div key={msg._id} className={cn("flex flex-col max-w-[80%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                        <div className={cn(
                          "px-4 py-2 rounded-2xl",
                          isMine 
                            ? "bg-primary-button text-white rounded-br-sm" 
                            : "bg-surface border border-taupe-border text-dark-text rounded-bl-sm"
                        )}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-muted-text mt-1 px-1">
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-text space-y-2">
                  <p className="text-sm">This is the beginning of your conversation.</p>
                  <p className="text-xs text-center max-w-xs">
                    Please use this chat to coordinate the safe handover of the item. Do not share financial information.
                  </p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-surface border-t border-taupe-border">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sendMessageMutation.isPending}
                />
                <Button 
                  type="submit" 
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="px-4"
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-text p-8 text-center bg-background">
            <MessageSquare className="h-12 w-12 text-taupe-border mb-4" />
            <p className="text-lg font-medium text-dark-text mb-2">Your Messages</p>
            <p className="text-sm max-w-md">
              Select a conversation from the sidebar to view messages. Conversations are automatically created when a claim is approved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
