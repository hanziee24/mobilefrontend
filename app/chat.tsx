import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Platform, ActivityIndicator, Keyboard, KeyboardEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { chatAPI, authAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_type: string;
  message: string;
  created_at: string;
}

export default function Chat() {
  const { deliveryId, trackingNumber } = useLocalSearchParams<{ deliveryId: string; trackingNumber: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [myId, setMyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    loadMyId().then(() => {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    });
    const kbShow = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKbHeight(e.endCoordinates.height);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const kbHide = Keyboard.addListener('keyboardDidHide', () => {
      setKbHeight(0);
    });
    return () => { clearInterval(interval); kbShow.remove(); kbHide.remove(); };
  }, []);

  const loadMyId = async () => {
    // Try AsyncStorage first
    const stored = await AsyncStorage.getItem('userId');
    if (stored) { setMyId(Number(stored)); return; }
    // Fallback to profile API
    try {
      const res = await authAPI.getProfile();
      const id = res.data.id;
      setMyId(id);
      await AsyncStorage.setItem('userId', id.toString());
    } catch {}
  };

  const fetchMessages = async () => {
    try {
      const res = await chatAPI.getMessages(Number(deliveryId));
      setMessages(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await chatAPI.sendMessage(Number(deliveryId), text.trim());
      setMessages(prev => [...prev, res.data]);
      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
    finally { setSending(false); }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === myId;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.sender_type === 'RIDER' ? '🏍️' : '👤'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {!isMe && <Text style={styles.senderName}>{item.sender_name}</Text>}
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.message}</Text>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: kbHeight }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>💬 Delivery Chat</Text>
          <Text style={styles.subtitle}>{trackingNumber}</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ED1C24" style={{ marginTop: 50 }} />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation below</Text>
              </View>
            }
          />
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendIcon}>➤</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15,
    backgroundColor: '#ED1C24',
  },
  backButton: { fontSize: 28, color: '#fff' },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 11, color: '#fff', opacity: 0.85, marginTop: 2 },
  messageList: { padding: 15, paddingBottom: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    marginRight: 8, borderWidth: 1, borderColor: '#e0e0e0',
  },
  avatarText: { fontSize: 16 },
  bubble: {
    maxWidth: '75%', borderRadius: 16, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#ED1C24', borderBottomRightRadius: 4 },
  senderName: { fontSize: 11, fontWeight: '700', color: '#ED1C24', marginBottom: 3 },
  msgText: { fontSize: 15, color: '#333', lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#999', marginTop: 4, textAlign: 'right' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#666' },
  emptySubtext: { fontSize: 13, color: '#999', marginTop: 4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', gap: 8,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 15, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#f9f9f9', maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ED1C24', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendIcon: { fontSize: 18, color: '#fff' },
});
