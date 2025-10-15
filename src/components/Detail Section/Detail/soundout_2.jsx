import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, VolumeX, Mic, MicOff, RotateCcw, MessageCircle } from 'lucide-react';

const VoiceChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  // Configuration for APIs (these would normally come from environment variables)
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'your-gemini-api-key';
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || 'your-openai-api-key';

  // Initialize chat session
  useEffect(() => {
    const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Initialize chat history with system message
    const systemMessage = {
      role: "user",
      parts: [{
        text: "คุณคือผู้ช่วย AI ที่เป็นมิตร ชาญฉลาด และพูดเป็นภาษาไทยได้เก่ง กรุณาตอบคำถามอย่างชัดเจนและเป็นประโยชน์"
      }]
    };
    setChatHistory([systemMessage]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate text response using Gemini API with chat history
  const generateGeminiResponse = async (userMessage) => {
    try {
      // Add user message to chat history
      const userContent = {
        role: "user",
        parts: [{
          text: userMessage
        }]
      };

      // Create request body with full chat history
      const requestBody = {
        contents: [...chatHistory, userContent],
        generationConfig: {
          temperature: 0.8,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]) {
        throw new Error('No response from AI');
      }

      const aiResponse = data.candidates[0].content.parts[0].text;

      // Update chat history with both user and AI messages
      const aiContent = {
        role: "model",
        parts: [{
          text: aiResponse
        }]
      };

      setChatHistory(prev => [...prev, userContent, aiContent]);
      
      return aiResponse;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return 'ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง';
    }
  };

  // Convert text to speech using OpenAI TTS
  const textToSpeech = async (text) => {
    try {
      setIsSpeaking(true);
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'nova', // alloy, echo, fable, onyx, nova, shimmer
          input: text,
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error in text-to-speech:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Get AI response
      const aiResponse = await generateGeminiResponse(userMessage);
      
      // Add AI message to chat
      const newAiMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, newAiMessage]);

      // Convert to speech if audio is enabled
      if (audioEnabled) {
        await textToSpeech(aiResponse);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChatSession = () => {
    setMessages([]);
    setChatHistory([{
      role: "user",
      parts: [{
        text: "คุณคือผู้ช่วย AI ที่เป็นมิตร ชาญฉลาด และพูดเป็นภาษาไทยได้เก่ง กรุณาตอบคำถามอย่างชัดเจนและเป็นประโยชน์"
      }]
    }]);
    const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Stop any ongoing speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Voice AI Assistant</h1>
              <p className="text-sm text-gray-500">พิมพ์ข้อความและรับฟังคำตอบเป็นเสียง</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2 rounded-full transition-colors ${
                audioEnabled 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
              title={audioEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            <button
              onClick={clearChatSession}
              className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
              title="เริ่มแชทใหม่"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                title="หยุดการพูด"
              >
                <MicOff className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Session Info */}
      {sessionId && (
        <div className="px-6 py-2 bg-gray-50 border-b text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <MessageCircle className="w-4 h-4" />
            <span>Session: {sessionId.slice(-8)}</span>
            <span>•</span>
            <span>{messages.length} ข้อความ</span>
            <span>•</span>
            <span>{Math.max(0, chatHistory.length - 1)} รอบการสนทนา</span>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">เริ่มการสนทนา</h2>
            <p className="text-gray-500 mb-4">พิมพ์ข้อความของคุณเพื่อเริ่มแชทกับ AI Assistant</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                <strong>คุณสมบัติ:</strong> AI จะจำบริบทการสนทนาของคุณและสามารถตอบคำถามที่เกี่ยวข้องกับสิ่งที่พูดคุยไปแล้ว
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow-sm border'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {message.timestamp}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-gray-500 text-sm">กำลังคิด...</span>
              </div>
            </div>
          </div>
        )}

        {isSpeaking && (
          <div className="flex justify-start">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-green-600 animate-pulse" />
                <span className="text-green-700 text-sm">กำลังพูด...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex items-center space-x-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="พิมพ์ข้อความของคุณที่นี่..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="1"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsSpeaking(false)}
        className="hidden"
      />
    </div>
  );
};

export default VoiceChatbot;