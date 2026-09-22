// client/src/pages/MessagesPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './MessagesPage.css';

function MessagesPage() {
  const { userId: urlUserId } = useParams();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (urlUserId) {
      loadChat(urlUserId);
    } else {
      setActiveUser(null);
      setMessages([]);
    }
  }, [urlUserId]);

  useEffect(() => {
    // Polling for new messages when looking at a chat
    let interval;
    if (activeUser) {
      interval = setInterval(() => {
        pollMessages(activeUser._id);
        fetchConversations(); // Update list silently
      }, 5000); // 5 second polling
    }
    return () => clearInterval(interval);
  }, [activeUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
      setLoading(false);
      
      // If we clicked "Message Seller" from an item but haven't chatted before
      // the urlUserId won't be in conversations yet. Provide fallback name fetching via users API if needed
      // For now we assume if it's not in conversation, the first message creation will populate it.
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  const loadChat = async (otherUserId) => {
    try {
      const token = localStorage.getItem('token');
      // Set active user context
      const existingConvo = conversations.find(c => c.user._id === otherUserId);
      if (existingConvo) {
        setActiveUser(existingConvo.user);
      } else {
        // Fallback placeholder (will update once first message sent)
        setActiveUser({ _id: otherUserId, fullName: 'New Conversation' });
      }

      // Fetch chat
      const res = await api.get(`/messages/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load chat', err);
    }
  };

  const pollMessages = async (otherUserId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/messages/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optionally only append new to prevent flickering, but for simplicity array replacement handles well in React
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;

    try {
      const token = localStorage.getItem('token');
      const payload = {
        receiverId: activeUser._id,
        content: newMessage
      };
      
      const res = await api.post('/messages', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages([...messages, res.data]);
      setNewMessage('');
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  return (
    <div className="messages-page">
      {/* Sidebar: Conversations List */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <button className="btn-back-nav" onClick={() => navigate('/dashboard')}>←</button>
          <h2>Messages</h2>
        </div>
        
        <div className="conversations-list">
          {loading && <p style={{padding: '20px', color: '#94a3b8'}}>Loading...</p>}
          {!loading && conversations.length === 0 && (
            <p style={{padding: '20px', color: '#94a3b8'}}>No messages yet.</p>
          )}
          {conversations.map((convo) => (
            <div 
              key={convo.user._id} 
              className={`conversation-item ${urlUserId === convo.user._id ? 'active' : ''}`}
              onClick={() => navigate(`/messages/${convo.user._id}`)}
            >
              <div className="convo-avatar">
                {convo.user.fullName?.charAt(0).toUpperCase()}
              </div>
              <div className="convo-info">
                <h4>{convo.user.fullName}</h4>
                <p>{convo.lastMessage}</p>
              </div>
              {convo.unreadCount > 0 && (
                <span className="unread-badge">{convo.unreadCount}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeUser ? (
        <div className="chat-area">
          <div className="chat-header">
            <div className="convo-avatar" style={{marginRight: '15px'}}>
              {activeUser.fullName?.charAt(0).toUpperCase()}
            </div>
            <h3>{activeUser.fullName}</h3>
          </div>
          
          <div className="chat-messages">
            {messages.length === 0 ? (
              <p style={{textAlign: 'center', color: '#94a3b8', marginTop: '20px'}}>
                Send a message to start the conversation!
              </p>
            ) : null}
            {messages.map((msg) => {
              const isMine = msg.sender === currentUser.id;
              return (
                <div key={msg._id} className={`message-bubble ${isMine ? 'sent' : 'received'}`}>
                  {msg.content}
                  <span className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Type your message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="submit" className="btn-send" disabled={!newMessage.trim()}>Send</button>
          </form>
        </div>
      ) : (
        <div className="no-chat-selected">
          <div className="no-chat-icon">💬</div>
          <h3>Your Messages</h3>
          <p>Select a conversation from the left to start chatting</p>
        </div>
      )}
    </div>
  );
}

export default MessagesPage;
