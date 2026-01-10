import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageCircle, Check, CheckCheck } from 'lucide-react';

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
}

// Notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Could not play notification sound');
  }
};

const OrderChat = ({ orderId, senderType }: OrderChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mark messages as read when viewing
  const markMessagesAsRead = async () => {
    // Mark messages from the OTHER party as read
    const unreadMessages = messages.filter(
      msg => msg.sender_type !== senderType && !msg.is_read
    );

    if (unreadMessages.length > 0) {
      const ids = unreadMessages.map(msg => msg.id);
      await supabase
        .from('order_messages')
        .update({ is_read: true })
        .in('id', ids);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages and updates
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
            playNotificationSound();
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

  // Mark messages as read when messages change or component mounts
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    setMessages((data || []) as Message[]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);

    const { error } = await supabase.from('order_messages').insert({
      order_id: orderId,
      sender_type: senderType,
      message: newMessage.trim()
    });

    if (!error) {
      setNewMessage('');
    }

    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
                  {/* Show read status only for messages sent by current user */}
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
            onClick={sendMessage}
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
