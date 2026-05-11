import { useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { API_BASE } from '../../src/config';

const GREEN = '#2e7d32';

export default function AIChatScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Flora 🌿 Your AI plant expert. Ask me anything about plant care!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: next.slice(-10) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, try again.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Is the server running?' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={s.messages}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.role === 'user' ? s.bubbleUser : s.bubbleBot]}>
            {item.role === 'assistant' && <Text style={s.avatar}>🌿</Text>}
            <Text style={[s.bubbleText, item.role === 'user' && s.bubbleTextUser]}>
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={s.typingRow}>
            <Text style={s.avatar}>🌿</Text>
            <View style={s.typing}><ActivityIndicator color={GREEN} size="small" /></View>
          </View>
        ) : null}
      />
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about plants..."
          placeholderTextColor="#aaa"
          multiline
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || loading}>
          <Text style={s.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  messages: { padding: 12, paddingBottom: 4 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    maxWidth: '80%',
  },
  bubbleBot: { alignSelf: 'flex-start', gap: 6 },
  bubbleUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: { fontSize: 20 },
  bubbleText: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    fontSize: 14,
    color: '#333',
    flexShrink: 1,
    lineHeight: 20,
    elevation: 1,
  },
  bubbleTextUser: {
    backgroundColor: GREEN,
    color: '#fff',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 4,
  },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  typing: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: GREEN,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
