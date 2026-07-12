import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { processAIQuery } from '../../../utils/aiService';
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
  Sun
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
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end ${isDarkMode ? 'dark' : ''}`}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#ffd700] to-[#ffa500] text-[#001a16] shadow-lg shadow-black/40 hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse cursor-pointer group"
          title="Chat with CMO Angel"
          aria-label="Open CMO Angel chat"
        >
          <Sparkles className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#001a16] text-[8px] font-bold text-[#ffd700] border border-[#ffd700]">
            AI
          </span>
        </button>
      )}

      {/* Main Chat Interface Drawer */}
      {isOpen && (
        <Card className={`fixed right-6 top-[96px] h-[calc(100vh-136px)] max-h-[720px] w-[380px] sm:w-[420px] flex flex-col border-2 border-[#ffd700] shadow-2xl transition-all duration-300 z-40 ${isDarkMode ? 'bg-[#001a16] text-white' : 'bg-white text-[#001a16]'}`}>
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-[#ffd700]/30 bg-[#002520] p-4 rounded-t">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd700]/10 border border-[#ffd700]/50">
                <Sparkles className="h-5 w-5 text-[#ffd700] animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <h3 className="font-bold text-[#ffd700] flex items-center gap-1.5">
                  CMO Angel
                  <span className="text-[10px] bg-[#ffd700]/20 text-[#ffd700] px-1.5 py-0.5 rounded border border-[#ffd700]/30">
                    Active Assistant
                  </span>
                </h3>
                <p className="text-[10px] text-gray-300 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-green-500" /> Security: {currentUser.role.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 rounded hover:bg-[#ffd700]/10 text-gray-300 hover:text-white"
                title="Toggle visual mode"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded hover:bg-[#ffd700]/10 text-gray-300 hover:text-white"
                title="Close chat panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-[#001a16]' : 'bg-gray-50'}`}>
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
            <div className={`p-3 border-t border-[#ffd700]/15 ${isDarkMode ? 'bg-[#002520]/40' : 'bg-gray-100'}`}>
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
          <div className="p-3 border-t border-[#ffd700]/30 bg-[#002520]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask CMO Angel anything..."
                className="bg-[#001a16] border-[#ffd700] text-white placeholder-gray-400 focus-visible:ring-1 focus-visible:ring-[#ffd700]"
              />
              <Button type="submit" className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
};
