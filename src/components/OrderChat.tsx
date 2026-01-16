import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { playChatSound } from '@/hooks/useOrderNotification';
import { sendMessage as sendMessageApi, getMessages } from '@/lib/api';

interface Message {
  id: string;
  order_id: string;
  sender_type: 'customer' | 'admin';
  message: string;
  created_at: string;
  is_read: boolean;
}

interface OrderChatProps {
  orderId: string;
  senderType: 'customer' | 'admin';
  tokenValue?: string; // Required for customer to authenticate
}

const OrderChat = ({ orderId, senderType, tokenValue }: OrderChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages and updates (real-time still works for receiving)
    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);

          // Play sound only if message is from the other party
          if (newMsg.sender_type !== senderType) {
            playChatSound();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev =>
            prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, senderType]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (senderType === 'customer' && tokenValue) {
      // Use Edge Function for customers
      const result = await getMessages({ token_value: tokenValue, order_id: orderId });
      if (result) {
        setMessages(result.messages as Message[]);
      }
    } else if (senderType === 'admin') {
      // Admins can still use direct query (they have service role access through admin panel)
      const { data } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      setMessages((data || []) as Message[]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);

    if (senderType === 'customer' && tokenValue) {
      // Use Edge Function for customers
      const result = await sendMessageApi({
        token_value: tokenValue,
        order_id: orderId,
        message: newMessage.trim()
      });

      if (result.success) {
        setNewMessage('');
        // Message will be added via real-time subscription
      }
    } else if (senderType === 'admin') {
      // Admins can still use direct insert
      const { error } = await supabase.from('order_messages').insert({
        order_id: orderId,
        sender_type: senderType,
        message: newMessage.trim()
      });

      if (!error) {
        setNewMessage('');
      }
    }

    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">محادثة الطلب</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            لا توجد رسائل بعد
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === senderType ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                  msg.sender_type === senderType
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                <div className={`flex items-center gap-1 mt-1 ${
                  msg.sender_type === senderType ? 'justify-start' : 'justify-end'
                }`}>
                  <span className={`text-[10px] ${
                    msg.sender_type === senderType ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender_type === senderType && (
                    msg.is_read ? (
                      <CheckCheck className={`w-3 h-3 ${
                        msg.sender_type === senderType ? 'text-primary-foreground/70' : 'text-blue-500'
                      }`} />
                    ) : (
                      <Check className={`w-3 h-3 ${
                        msg.sender_type === senderType ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`} />
                    )
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب رسالتك..."
            className="input-field flex-1 text-sm py-2"
            disabled={isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderChat;
