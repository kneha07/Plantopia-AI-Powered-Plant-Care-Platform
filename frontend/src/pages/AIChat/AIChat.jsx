import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AIChat.css';

function AIChat() {
  const { authFetch } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Flora, your AI plant care expert 🌿 Ask me anything about plant care, identifying problems, or choosing the right plant for your space!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data = await res.json();
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again!' }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'Why are my plant leaves turning yellow?',
    'How often should I water a Monstera?',
    'Best plants for low light rooms',
    'How do I repot a plant?',
  ];

  return (
    <div className="ai-chat">
      <div className="ai-chat__header">
        <div className="ai-chat__avatar" aria-hidden="true">🌿</div>
        <div>
          <h1 className="ai-chat__title">Flora - AI Plant Expert</h1>
          <p className="ai-chat__status">
            Always here to help your plants thrive
            {sessionId && <span className="ai-chat__memory-badge"> · Memory on</span>}
          </p>
        </div>
      </div>

      <div className="ai-chat__messages" role="log" aria-live="polite">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-chat__message ai-chat__message--${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="ai-chat__message-avatar" aria-hidden="true">🌿</div>
            )}
            <div className="ai-chat__message-bubble">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="ai-chat__message ai-chat__message--assistant">
            <div className="ai-chat__message-avatar" aria-hidden="true">🌿</div>
            <div className="ai-chat__message-bubble ai-chat__message-bubble--loading">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="ai-chat__suggestions">
          {suggestions.map((s, i) => (
            <button key={i} className="ai-chat__suggestion" onClick={() => setInput(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form className="ai-chat__input-row" onSubmit={handleSend}>
        <input
          className="ai-chat__input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Flora anything about plants..."
          disabled={loading}
          aria-label="Message to Flora"
        />
        <button
          className="btn btn-primary ai-chat__send"
          type="submit"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default AIChat;
