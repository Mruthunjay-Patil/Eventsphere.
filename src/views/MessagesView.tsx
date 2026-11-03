import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Conversation, ChatMessage } from '../types';
import { api } from '../services/api';
import {
  MessageSquare,
  Send,
  Sparkles,
  Calendar,
  Search,
  CheckCheck,
  Store,
  User,
} from 'lucide-react';

export const MessagesView: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConvId) {
        setActiveConvId(convs[0].id);
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    if (!convId) return;
    try {
      const msgs = await api.getMessages(convId);
      setMessages(msgs);
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentUser]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
      const interval = setInterval(() => {
        loadMessages(activeConvId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeConvId]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !activeConvId) return;

    try {
      const newMsg = await api.sendMessage({
        conversationId: activeConvId,
        text: textToSend,
      });

      setMessages((prev) => [...prev, newMsg]);
      setInputText('');

      // Refresh conversations list to update last message
      loadConversations();
    } catch (err: any) {
      showToast('Message error', err.message, 'error');
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const quickReplies = [
    'Can we schedule a 15-minute phone consultation tomorrow?',
    'Could you please share your detailed itemized quote with GST?',
    'What is your standard cancellation policy?',
    'Can you share sample photos of past setups at this venue?',
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0D0D0D] rounded-3xl border border-[#222222] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
          {/* Left Conversations Sidebar */}
          <div className="lg:col-span-4 border-r border-[#222222] flex flex-col bg-[#0A0A0A]">
            <div className="p-4 border-b border-[#222222] bg-[#0D0D0D]">
              <div className="w-8 h-[2px] bg-[#F27D26] mb-1.5" />
              <h2 className="font-display text-lg font-black text-white uppercase tracking-tight">Conversations & Quotes</h2>
              <p className="text-xs text-stone-400 mt-0.5 font-sans">Direct communications with event organizers & vendors</p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#1A1A1A]">
              {loading ? (
                <div className="p-8 text-center text-xs font-mono-accent text-stone-500 uppercase tracking-wider">Loading messages...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 font-sans">
                  No conversations started yet. Send an enquiry from any vendor storefront!
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  const otherPartyName = currentUser?.role === 'vendor' ? conv.customerName : conv.vendorName;
                  const otherPartyAvatar = currentUser?.role === 'vendor' ? conv.customerAvatar : conv.vendorAvatar;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`p-4 cursor-pointer transition-colors flex items-start space-x-3 ${
                        isSelected ? 'bg-[#161616] border-l-4 border-[#F27D26]' : 'hover:bg-[#121212]'
                      }`}
                    >
                      <img
                        src={otherPartyAvatar || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=100'}
                        alt={otherPartyName}
                        className="w-11 h-11 rounded-xl object-cover bg-stone-900 shrink-0 border border-[#2A2A2A]"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate uppercase">{otherPartyName}</h4>
                          <span className="text-[10px] font-mono-accent text-stone-500">
                            {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {conv.eventTitle && (
                          <span className="text-[10px] font-mono-accent font-black text-[#F27D26] block truncate mt-0.5 uppercase tracking-wider">
                            {conv.eventTitle}
                          </span>
                        )}

                        <p className="text-xs text-stone-400 truncate mt-1">{conv.lastMessage}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Message Chat Stream */}
          <div className="lg:col-span-8 flex flex-col bg-[#0D0D0D]">
            {activeConv ? (
              <>
                {/* Chat Top Header */}
                <div className="p-4 border-b border-[#222222] bg-[#0D0D0D] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={
                        currentUser?.role === 'vendor'
                          ? activeConv.customerAvatar
                          : activeConv.vendorAvatar
                      }
                      alt="Avatar"
                      className="w-10 h-10 rounded-xl object-cover border border-[#2A2A2A]"
                    />
                    <div>
                      <h3 className="font-display text-sm font-black text-white uppercase">
                        {currentUser?.role === 'vendor' ? activeConv.customerName : activeConv.vendorName}
                      </h3>
                      {activeConv.eventTitle && (
                        <p className="text-[11px] font-mono-accent text-stone-400">
                          Planning: <strong className="text-[#F27D26]">{activeConv.eventTitle}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] font-mono-accent font-black uppercase tracking-wider border border-[#10B981]/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      <span>Live Channel</span>
                    </span>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#080808]">
                  {messages.map((m) => {
                    const isMe = m.senderId === currentUser?.id || m.senderRole === currentUser?.role;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] font-mono-accent text-stone-500 mb-1 px-1">
                          {m.senderName} •{' '}
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div
                          className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed ${
                            isMe
                              ? 'bg-[#F27D26] text-white font-medium rounded-br-none shadow-lg shadow-[#F27D26]/20'
                              : 'bg-[#141414] text-stone-200 border border-[#262626] rounded-bl-none shadow-sm'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Reply Suggestions */}
                <div className="p-2 border-t border-[#1F1F1F] bg-[#0A0A0A] flex items-center space-x-2 overflow-x-auto scrollbar-none font-mono-accent">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => handleSendMessage(undefined, qr)}
                      className="px-3 py-1 bg-[#141414] hover:bg-[#1F1F1F] hover:text-[#F27D26] border border-[#262626] rounded-lg text-[10px] uppercase font-bold text-stone-400 whitespace-nowrap transition-colors"
                    >
                      {qr}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-[#222222] bg-[#0D0D0D] flex items-center space-x-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message, quote enquiry, or custom requirements..."
                    className="flex-1 p-3 text-xs rounded-xl bg-[#141414] border border-[#2A2A2A] text-white outline-none focus:border-[#F27D26]"
                  />

                  <button
                    type="submit"
                    className="p-3 rounded-xl bg-[#F27D26] text-white hover:bg-[#d96716] transition-colors shrink-0 shadow-lg shadow-[#F27D26]/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-stone-500 font-mono-accent text-xs uppercase tracking-wider">
                Select a conversation on the left to start messaging.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
