import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { processAIQuery } from '../../../utils/aiService';
import useLiveTranscriber from '../../../hooks/useLiveTranscriber';
import { Card } from './card';
import { Button } from './button';
import { Input } from './input';
import {
  Sparkles,
  Send,
  X,
  Volume2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileText,
  DollarSign,
  UserCheck,
  BarChart,
  Moon,
  Sun,
  Mic,
  MicOff
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  tools?: string[];
  citations?: string[];
}

export const CmoAngelChat = () => {
  const { currentUser, members, transactions, welfareTickets, expenses, announcements } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: `Hello! I am **CMO Angel**, your virtual organizational secretary and assistant. I can answer church policy questions, fetch your financial dues, draft announcements, or summarize reports according to your role permissions. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString(),
      tools: ['SystemInitTool']
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, startListening, stopListening } = useLiveTranscriber((liveText) => {
    if (liveText) setInput(liveText);
  });

  // Dynamic message bolding formatter
  const renderFormattedText = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className="font-bold text-[#ffd700]">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  // Active suggestions dependent on user role
  const suggestions = currentUser?.role === 'member'
    ? [
        { label: 'Check my dues', text: 'How much do I owe?' },
        { label: 'Which family am I in?', text: 'Which family am I assigned to?' },
        { label: 'Welfare Rules', text: 'Explain constitution welfare guidelines' }
      ]
    : [
        { label: 'Finance report', text: 'Generate financial report summary' },
        { label: 'Welfare requests', text: 'Show welfare requests pending approval' },
        { label: 'Draft invite letter', text: 'Draft invitation letter for monthly meeting' },
        { label: 'Executive Insights', text: 'Give executive insights and stats' }
      ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || !currentUser) return;

    if (!textToSend) setInput('');
    setIsLoading(true);

    const userMsg: ChatMessage = {
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await processAIQuery(
        queryText,
        {
          username: currentUser.id,
          name: currentUser.name,
          role: currentUser.role
        },
        members,
        transactions,
        welfareTickets,
        expenses,
        announcements
      );

      const assistantMsg: ChatMessage = {
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString(),
        tools: res.toolsUsed,
        citations: res.citations
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Sorry, I encountered an issue while processing that request. Please try again.',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-[#ffd700] to-[#ffa500] text-[#001a16] rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-[#ffd700]/80 cursor-pointer group"
          title="Chat with CMO Angel"
          aria-label="Open CMO Angel chat"
        >
          <Sparkles className="h-6 w-6 text-[#001a16]" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-black text-white items-center justify-center">AI</span>
          </span>
        </button>
      )}

      {/* Main Chat Interface Drawer */}
      {isOpen && (
        <>
          {/* Dark Mobile Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Window Container */}
          <Card className={`fixed inset-x-3 bottom-3 top-16 sm:top-auto sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:max-h-[calc(100vh-100px)] sm:h-[580px] flex flex-col border-2 border-[#ffd700] rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 z-50 ${isDarkMode ? 'bg-[#001a16] text-white' : 'bg-white text-[#001a16]'}`}>
            {/* Chat Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ffd700]/30 bg-[#002520] p-3 sm:p-4 rounded-t shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#ffd700]/10 border border-[#ffd700]/50 shrink-0">
                  <Sparkles className="h-5 w-5 text-[#ffd700] animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#ffd700] text-sm sm:text-base flex items-center gap-1.5 truncate">
                    CMO Angel
                    <span className="text-[10px] bg-[#ffd700]/20 text-[#ffd700] px-1.5 py-0.5 rounded border border-[#ffd700]/30 shrink-0">
                      Active Assistant
                    </span>
                  </h3>
                  <p className="text-[10px] text-gray-300 flex items-center gap-1 truncate">
                    <ShieldCheck className="h-3 w-3 text-green-500 shrink-0" /> Security: {currentUser.role.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-1.5 rounded hover:bg-[#ffd700]/10 text-gray-300 hover:text-white transition-colors"
                  title="Toggle visual mode"
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded hover:bg-[#ffd700]/10 text-gray-300 hover:text-white transition-colors shrink-0"
                  title="Close Assistant"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0 ${isDarkMode ? 'bg-[#001a16]' : 'bg-gray-50'}`}>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#ffd700] text-[#001a16] rounded-br-none font-medium'
                        : isDarkMode
                        ? 'bg-[#002520] text-gray-100 rounded-bl-none border border-[#ffd700]/15'
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-line leading-relaxed">
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* Citation references tag */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#ffd700]/10 text-[10px] text-gray-400">
                        <p className="font-semibold text-[#ffd700]/80 flex items-center gap-1 mb-1">
                          <BookOpen className="h-3 w-3" /> Cited Sources:
                        </p>
                        {msg.citations.map((cite, i) => (
                          <div key={i} className="bg-[#ffd700]/5 px-2 py-0.5 rounded border border-[#ffd700]/10 mt-1">
                            {cite}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Active Tool Tag */}
                    {msg.tools && msg.tools.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.tools.map((tool, i) => (
                          <span key={i} className="text-[8px] bg-black/35 text-white/80 px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wide">
                            {tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-[#ffd700] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 bg-[#ffd700] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 bg-[#ffd700] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>CMO Angel is processing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested prompts list */}
            {messages.length === 1 && (
              <div className={`p-3 border-t border-[#ffd700]/15 shrink-0 ${isDarkMode ? 'bg-[#002520]/40' : 'bg-gray-100'}`}>
                <p className="text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wider">Suggested queries:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sug.text)}
                      className="text-[11px] bg-[#ffd700]/10 text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] border border-[#ffd700]/30 rounded px-2.5 py-1 transition-all text-left"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="sticky bottom-0 z-10 p-3 border-t border-[#ffd700]/30 bg-[#002520] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isListening) stopListening();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening to your voice..." : "Ask CMO Angel anything..."}
                    className={`bg-[#001a16] border-[#ffd700] text-white placeholder-gray-400 focus-visible:ring-1 focus-visible:ring-[#ffd700] pr-9 ${isListening ? 'border-emerald-400 ring-1 ring-emerald-400' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all cursor-pointer ${
                      isListening
                        ? 'text-emerald-400 animate-pulse bg-emerald-950/80'
                        : 'text-gray-400 hover:text-[#ffd700]'
                    }`}
                    title={isListening ? "Stop voice listening" : "Speak to CMO Angel"}
                  >
                    {isListening ? <MicOff className="h-4 w-4 text-emerald-400" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="submit" className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </>
      )}
    </>
  );
};
