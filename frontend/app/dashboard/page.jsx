/*
 * EVOLUTION API + SUPABASE INTEGRATION NOTES:
 * 
 * This dashboard connects to:
 * 1. Evolution API (hosted on Render) - Handles WhatsApp connection
 * 2. Your custom Node.js API - Processes webhooks, calls AI, stores data
 * 3. Supabase - PostgreSQL database with real-time subscriptions
 * 
 * DATA FLOW:
 * 1. Customer sends WhatsApp message
 * 2. Evolution API webhook → POST /webhook (your server)
 * 3. Your server: extracts data, calls AI, stores in Supabase
 * 4. Supabase real-time → Dashboard updates instantly
 * 5. Dashboard actions → Your API → Evolution API (send messages)
 * 
 * EVOLUTION API ENDPOINTS USED:
 * - POST /message/sendText - Send message to customer
 * - GET /chat/findMessages/:instance - Fetch message history
 * - POST /instance/create - Create WhatsApp instance (QR code)
 * - GET /instance/qrcode/:instance - Get QR code for connection
 * 
 * SUPABASE TABLES:
 * - conversations (id, account_id, customer_phone, status, priority, handled, manual_takeover)
 * - messages (id, conversation_id, sender, message_text, media_url, media_type, timestamp)
 * - ai_responses (id, conversation_id, confidence_score, sentiment, tokens_used)
 * - accounts (id, whatsapp_number, bot_enabled)
 */
'use client';

import React, { useState, useMemo } from 'react';
import { MessageSquare, TrendingUp, Users, Clock, Search, Filter, Phone, ChevronRight, Zap, AlertCircle, CheckCircle, XCircle, Download, RefreshCw, Bell, Moon, Sun } from 'lucide-react';

// Mock data - In production, this comes from Supabase via your API
// API ENDPOINT: GET /api/conversations?account_id={accountId}
// Returns: Array of conversation objects from Supabase
const mockConversations = [
  {
    id: '1',
    customerName: 'Chioma Adeleke',
    customerPhone: '+234 803 456 7890',
    lastMessage: 'Please, how much is the premium package?',
    lastMessageTime: '2 mins ago',
    status: 'active',
    sentiment: 'positive',
    aiConfidence: 0.92,
    unreadCount: 2,
    tags: ['Hot Lead', 'Premium Interest'],
    priority: false,
    handled: false
  },
  {
    id: '2',
    customerName: 'Ibrahim Musa',
    customerPhone: '+234 810 234 5678',
    lastMessage: 'I need this urgently. Can you deliver to Lekki today?',
    lastMessageTime: '5 mins ago',
    status: 'urgent',
    sentiment: 'urgent',
    aiConfidence: 0.78,
    unreadCount: 3,
    tags: ['Urgent', 'Lekki'],
    priority: false,
    handled: false
  },
  {
    id: '3',
    customerName: 'Blessing Okafor',
    customerPhone: '+234 706 789 0123',
    lastMessage: 'Thank you! I will make payment now.',
    lastMessageTime: '15 mins ago',
    status: 'active',
    sentiment: 'positive',
    aiConfidence: 0.95,
    unreadCount: 0,
    tags: ['Ready to Buy'],
    priority: false,
    handled: false
  },
  {
    id: '4',
    customerName: 'Emeka Nwankwo',
    customerPhone: '+234 805 123 4567',
    lastMessage: 'This is too expensive abeg',
    lastMessageTime: '1 hour ago',
    status: 'waiting',
    sentiment: 'negative',
    aiConfidence: 0.45,
    unreadCount: 1,
    tags: ['Price Objection'],
    priority: false,
    handled: false
  },
  {
    id: '5',
    customerName: 'Fatima Bello',
    customerPhone: '+234 701 987 6543',
    lastMessage: 'Do you have it in blue color?',
    lastMessageTime: '2 hours ago',
    status: 'waiting',
    sentiment: 'neutral',
    aiConfidence: 0.88,
    unreadCount: 0,
    tags: ['Product Inquiry'],
    priority: false,
    handled: false
  }
];

const mockAnalytics = {
  totalLeads: 127,
  activeConversations: 18,
  avgResponseTime: '1.2s',
  leadCaptureRate: 84,
  aiConfidence: 87,
  tokenUsage: 45230,
  lowConfidenceCount: 3,
  todayLeads: 12,
  weeklyGrowth: 23,
  conversionRate: 34
};

const Dashboard = () => {
  // IMPLEMENTATION NOTE: Replace with Supabase real-time subscription
  // const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  // useEffect(() => {
  //   const channel = supabase
  //     .channel('conversations')
  //     .on('postgres_changes', { 
  //       event: '*', 
  //       schema: 'public', 
  //       table: 'conversations',
  //       filter: `account_id=eq.${accountId}` 
  //     }, (payload) => {
  //       setConversations(prev => [...prev, payload.new])
  //     })
  //     .subscribe()
  //   return () => supabase.removeChannel(channel)
  // }, [])
  
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('monitor');
  const [darkMode, setDarkMode] = useState(false);
  const [botEnabled, setBotEnabled] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageText, setSuccessMessageText] = useState('');

  const handleMarkAsPriority = () => {
    // API CALL: PUT /api/conversations/:id
    // Body: { priority: true }
    // Updates Supabase: UPDATE conversations SET priority = true WHERE id = ?
    
    setConversations(conversations.map(conv => 
      conv.id === selectedConversation.id 
        ? { ...conv, priority: true, tags: [...conv.tags, '⭐ Priority'] }
        : conv
    ));
    setSelectedConversation({ ...selectedConversation, priority: true });
    setSuccessMessageText(`${selectedConversation.customerName} marked as PRIORITY! 🔥`);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleMarkAsHandled = () => {
    // API CALL: PUT /api/conversations/:id
    // Body: { handled: true, status: 'closed' }
    // Updates Supabase: UPDATE conversations SET handled = true, status = 'closed' WHERE id = ?
    // Also updates Google Sheets via your webhook worker
    
    setConversations(conversations.map(conv => 
      conv.id === selectedConversation.id 
        ? { ...conv, handled: true, status: 'closed' }
        : conv
    ));
    setSelectedConversation({ ...selectedConversation, handled: true, status: 'closed' });
    setSuccessMessageText(`${selectedConversation.customerName} marked as HANDLED! ✅`);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchesSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           conv.customerPhone.includes(searchQuery);
      const matchesFilter = filterStatus === 'all' || conv.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filterStatus, conversations]);

  const priorityCount = conversations.filter(c => c.priority && !c.handled).length;
  const handledCount = conversations.filter(c => c.handled).length;

  const getSentimentColor = (sentiment) => {
    switch(sentiment) {
      case 'positive': return 'bg-green-500';
      case 'negative': return 'bg-red-500';
      case 'urgent': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>;
      case 'urgent':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Urgent</span>;
      case 'waiting':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Waiting</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Closed</span>;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 via-white to-emerald-50'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 shadow-sm transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>WhatsApp Sales AI</h1>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nepsix Business</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition ${darkMode ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Bot On/Off Toggle */}
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>AI Bot:</span>
                <button
                  onClick={() => {
                    // API CALL: PUT /api/accounts/:id
                    // Body: { bot_enabled: !botEnabled }
                    // Updates Supabase: UPDATE accounts SET bot_enabled = ? WHERE id = ?
                    // Your webhook checks this flag before calling AI
                    // If false: just store message, don't generate AI response
                    setBotEnabled(!botEnabled);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    botEnabled ? 'bg-green-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      botEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs font-bold ${botEnabled ? 'text-green-600' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {botEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              
              <button className={`relative p-2 rounded-lg transition ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className={`flex items-center space-x-3 pl-4 border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  FA
                </div>
                <div className="hidden sm:block">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Fabari Agbora</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className={`border-b transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveView('monitor')}
              className={`py-4 px-2 font-semibold text-sm border-b-2 transition ${
                activeView === 'monitor' 
                  ? 'border-green-600 text-green-600' 
                  : darkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Live Conversations</span>
              </div>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`py-4 px-2 font-semibold text-sm border-b-2 transition ${
                activeView === 'analytics' 
                  ? 'border-green-600 text-green-600' 
                  : darkMode ? 'border-transparent text-gray-400 hover:text-gray-300' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>AI Performance</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {activeView === 'monitor' ? (
        <div className="flex h-[calc(100vh-140px)]">
          {/* Success Message Toast */}
          {showSuccessMessage && (
            <div className="fixed top-20 right-6 z-50 animate-slide-in">
              <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{successMessageText}</span>
              </div>
            </div>
          )}
          
          <div className={`w-96 border-r flex flex-col transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b space-y-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-colors duration-200 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div className="flex space-x-2">
                {['all', 'active', 'urgent', 'waiting'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      filterStatus === status
                        ? 'bg-green-600 text-white'
                        : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* Priority & Handled Counts */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-xs font-semibold">{priorityCount} Priority</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-semibold">{handledCount} Handled</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 border-b hover:bg-opacity-50 transition text-left relative ${
                    selectedConversation.id === conv.id 
                      ? darkMode ? 'bg-gray-700 border-l-4 border-l-green-600' : 'bg-green-50 border-l-4 border-l-green-600'
                      : darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'
                  } ${conv.handled ? 'opacity-50' : ''}`}
                >
                  {/* Priority Badge */}
                  {conv.priority && !conv.handled && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                        ⭐ PRIORITY
                      </span>
                    </div>
                  )}
                  
                  {/* Handled Badge */}
                  {conv.handled && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                        ✓ HANDLED
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getSentimentColor(conv.sentiment)}`}></div>
                      <h3 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'} ${conv.handled ? 'line-through' : ''}`}>{conv.customerName}</h3>
                    </div>
                    {conv.unreadCount > 0 && !conv.handled && (
                      <span className="w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{conv.customerPhone}</p>
                  <p className={`text-sm truncate mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{conv.lastMessage}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{conv.lastMessageTime}</span>
                    <div className="flex items-center space-x-1">
                      <Zap className={`w-3 h-3 ${getConfidenceColor(conv.aiConfidence)}`} />
                      <span className={`text-xs font-semibold ${getConfidenceColor(conv.aiConfidence)}`}>
                        {Math.round(conv.aiConfidence * 100)}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`flex-1 flex flex-col transition-colors duration-200 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Bot Status Banner */}
            {!botEnabled && (
              <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">AI Bot is currently OFF - Messages are not being auto-replied</span>
                </div>
                <button 
                  onClick={() => setBotEnabled(true)}
                  className="px-4 py-1.5 bg-white text-orange-600 font-bold text-sm rounded-lg hover:bg-orange-50 transition"
                >
                  Turn On Bot
                </button>
              </div>
            )}
            
            <div className={`border-b p-4 transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedConversation.customerName}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <Phone className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{selectedConversation.customerPhone}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedConversation.status)}
                  <button 
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-md"
                    onClick={() => {
                      // API CALL: PUT /api/conversations/:id
                      // Body: { manual_takeover: true }
                      // Your webhook will check this flag and skip AI response
                      // Then you can send manual message via Evolution API:
                      // POST https://your-evolution-api.onrender.com/message/sendText
                      // Body: { 
                      //   number: selectedConversation.customerPhone,
                      //   text: "Your manual message here"
                      // }
                      alert('Manual takeover enabled. AI will pause for this conversation. You can now send messages manually.');
                    }}
                  >
                    Take Over Chat
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {selectedConversation.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Zap className={`w-4 h-4 ${getConfidenceColor(selectedConversation.aiConfidence)}`} />
                  <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>AI Confidence:</span>
                  <span className={`text-sm font-bold ${getConfidenceColor(selectedConversation.aiConfidence)}`}>
                    {Math.round(selectedConversation.aiConfidence * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 
                IMPLEMENTATION NOTE: Fetch messages from Supabase
                API ENDPOINT: GET /api/conversations/:id/messages
                Returns messages from Evolution webhook data stored in Supabase
                
                Evolution webhook provides:
                - message.body (text content)
                - message.messageType ('conversation', 'imageMessage', 'videoMessage', 'audioMessage')
                - message.mediaUrl (if media type)
                - message.timestamp
                
                TODO: Add media message display (images, videos, voice notes)
              */}
              
              {/* Customer Message */}
              <div className="flex justify-start">
                <div className={`rounded-2xl rounded-tl-none px-4 py-3 shadow-sm max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Good afternoon! I saw your ad on Instagram. Do you deliver to Ikeja?</p>
                  <span className={`text-xs mt-1 block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>10:23 AM</span>
                </div>
              </div>

              {/* AI Response - Sent via Evolution API */}
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl rounded-tr-none px-4 py-3 shadow-md max-w-md">
                  <div className="flex items-start space-x-2">
                    <div className="flex-1">
                      {/* 
                        This message was sent by your webhook using Evolution API:
                        POST /message/sendText
                        Body: { number: customer_phone, text: ai_generated_response }
                      */}
                      <p className="text-sm text-white">Good afternoon! Yes, we deliver to Ikeja. Our delivery fee is ₦1,500 and takes 1-2 hours. What would you like to order?</p>
                      <span className="text-xs text-green-100 mt-1 block">10:23 AM</span>
                    </div>
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Message */}
              <div className="flex justify-start">
                <div className={`rounded-2xl rounded-tl-none px-4 py-3 shadow-sm max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedConversation.lastMessage}</p>
                  <span className={`text-xs mt-1 block ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{selectedConversation.lastMessageTime}</span>
                </div>
              </div>

              {/* AI is typing - Only shown when bot_enabled = true */}
              {selectedConversation.status === 'active' && botEnabled && (
                <div className="flex justify-end">
                  <div className={`rounded-2xl rounded-tr-none px-4 py-3 shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-green-100'}`}>
                    <div className="flex items-center space-x-2">
                      {/* This appears briefly while your webhook is processing AI response */}
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-green-700'}`}>AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`border-t p-4 transition-colors duration-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex space-x-3">
                <button 
                  onClick={handleMarkAsPriority}
                  disabled={selectedConversation.priority || selectedConversation.handled}
                  className={`flex-1 px-4 py-3 font-semibold rounded-lg transition flex items-center justify-center space-x-2 border ${
                    selectedConversation.priority || selectedConversation.handled
                      ? darkMode ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : darkMode ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 border-yellow-700' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200'
                  }`}>
                  <AlertCircle className="w-4 h-4" />
                  <span>{selectedConversation.priority ? 'Already Priority' : 'Mark as Priority'}</span>
                </button>
                <button 
                  onClick={handleMarkAsHandled}
                  disabled={selectedConversation.handled}
                  className={`flex-1 px-4 py-3 font-semibold rounded-lg transition flex items-center justify-center space-x-2 border ${
                    selectedConversation.handled
                      ? darkMode ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : darkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border-green-700' : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                  }`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>{selectedConversation.handled ? 'Already Handled' : 'Mark as Handled'}</span>
                </button>
                <button className={`px-4 py-3 font-semibold rounded-lg transition border ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                }`}>
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`rounded-xl p-6 shadow-sm border hover:shadow-md transition ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${darkMode ? 'bg-green-900/30' : 'bg-gradient-to-br from-green-100 to-emerald-100'}`}>
                  <Users className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  +{mockAnalytics.weeklyGrowth}%
                </span>
              </div>
              <h3 className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{mockAnalytics.totalLeads}</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Leads</p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{mockAnalytics.todayLeads} new today</p>
            </div>

            <div className={`rounded-xl p-6 shadow-sm border hover:shadow-md transition ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${darkMode ? 'bg-blue-900/30' : 'bg-gradient-to-br from-blue-100 to-indigo-100'}`}>
                  <MessageSquare className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Live</span>
              </div>
              <h3 className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{mockAnalytics.activeConversations}</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Chats</p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>3 need attention</p>
            </div>

            <div className={`rounded-xl p-6 shadow-sm border hover:shadow-md transition ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${darkMode ? 'bg-purple-900/30' : 'bg-gradient-to-br from-purple-100 to-pink-100'}`}>
                  <Zap className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  mockAnalytics.aiConfidence >= 80 ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
                }`}>
                  {mockAnalytics.aiConfidence >= 80 ? 'Excellent' : 'Good'}
                </span>
              </div>
              <h3 className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{mockAnalytics.aiConfidence}%</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>AI Confidence</p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{mockAnalytics.lowConfidenceCount} low confidence alerts</p>
            </div>

            <div className={`rounded-xl p-6 shadow-sm border hover:shadow-md transition ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${darkMode ? 'bg-orange-900/30' : 'bg-gradient-to-br from-orange-100 to-red-100'}`}>
                  <Clock className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Fast</span>
              </div>
              <h3 className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{mockAnalytics.avgResponseTime}</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Response Time</p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Target: &lt;2s</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-xl p-6 shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Lead Capture Performance</h3>
                <button className="text-sm text-green-600 hover:text-green-700 font-semibold flex items-center space-x-1">
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Lead Extraction Rate</span>
                    <span className="text-sm font-bold text-green-600">{mockAnalytics.leadCaptureRate}%</span>
                  </div>
                  <div className={`w-full rounded-full h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 h-3 rounded-full" style={{width: `${mockAnalytics.leadCaptureRate}%`}}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Conversion Rate</span>
                    <span className="text-sm font-bold text-blue-600">{mockAnalytics.conversionRate}%</span>
                  </div>
                  <div className={`w-full rounded-full h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full" style={{width: `${mockAnalytics.conversionRate}%`}}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>AI Confidence Avg</span>
                    <span className="text-sm font-bold text-purple-600">{mockAnalytics.aiConfidence}%</span>
                  </div>
                  <div className={`w-full rounded-full h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full" style={{width: `${mockAnalytics.aiConfidence}%`}}></div>
                  </div>
                </div>
              </div>

              <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Field Extraction Success</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                    <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Customer Name</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>96%</span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                    <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>100%</span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                    <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Priority Level</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>72%</span>
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                    <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Location</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>88%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-6 shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>AI Cost & Usage</h3>
                <button className="text-sm text-green-600 hover:text-green-700 font-semibold flex items-center space-x-1">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Tokens Used</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{mockAnalytics.tokenUsage.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Est. Cost</p>
                    <p className="text-2xl font-bold text-green-600">₦450</p>
                  </div>
                </div>
                <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" style={{width: '45%'}}></div>
                </div>
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>45% of monthly budget (₦1,000)</p>
              </div>

              <div className="space-y-3">
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Avg. Tokens per Lead</span>
                    <span className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>356</span>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Below target of 400 tokens</p>
                </div>

                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Response Generation</span>
                    <span className={`text-lg font-bold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>89%</span>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Success rate for AI responses</p>
                </div>

                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Context Retrieval</span>
                    <span className={`text-lg font-bold ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>1.2ms</span>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Avg. memory lookup time</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-xl p-6 shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Low Confidence Alerts</h3>
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  {mockAnalytics.lowConfidenceCount} Active
                </span>
              </div>

              <div className="space-y-3">
                <div className={`p-4 border-l-4 border-red-500 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                      <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Emeka Nwankwo</span>
                    </div>
                    <span className={`text-xs font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>45%</span>
                  </div>
                  <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Price objection - AI struggling to extract intent</p>
                  <button className={`text-xs font-semibold flex items-center space-x-1 ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-700 hover:text-red-800'}`}>
                    <span>Review Conversation</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className={`p-4 border-l-4 border-yellow-500 rounded-lg ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Unknown Customer</span>
                    </div>
                    <span className={`text-xs font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>58%</span>
                  </div>
                  <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Complex query about bulk pricing - missing name extraction</p>
                  <button className={`text-xs font-semibold flex items-center space-x-1 ${darkMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-700 hover:text-yellow-800'}`}>
                    <span>Review Conversation</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className={`p-4 border-l-4 border-orange-500 rounded-lg ${darkMode ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                      <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Aisha Mohammed</span>
                    </div>
                    <span className={`text-xs font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>62%</span>
                  </div>
                  <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Technical product question - AI needs more context</p>
                  <button className={`text-xs font-semibold flex items-center space-x-1 ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-700 hover:text-orange-800'}`}>
                    <span>Review Conversation</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-6 shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Performance Insights</h3>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  This Week
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <TrendingUp className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Response Quality Improved</h4>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      AI confidence increased by 12% after adding "Pricing FAQ" document. Keep uploading FAQs for better accuracy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <Users className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Peak Hours Identified</h4>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Most messages arrive between 11 AM - 3 PM. Consider having sales team on standby during these hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <Zap className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Fast Response = More Sales</h4>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Leads responded to within 2 minutes have 67% higher conversion rate. Your current avg is 1.2s. Excellent!
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
                    <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Common Objection Detected</h4>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      "Price too high" mentioned in 23% of conversations. Consider adding pricing justification to your FAQ.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h3 className="text-xl font-bold mb-2">Improve Your AI Performance</h3>
                <p className="text-green-100 text-sm">Upload FAQs, product catalogs, or style guides to make your AI smarter and more accurate.</p>
              </div>
              <button className="px-6 py-3 bg-white text-green-700 font-bold rounded-lg hover:bg-green-50 transition shadow-md whitespace-nowrap flex items-center space-x-2">
                <span>Upload Documents</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
