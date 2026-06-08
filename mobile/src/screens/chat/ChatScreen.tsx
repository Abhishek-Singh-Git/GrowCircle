/**
 * GrowCircle — Chat Screen
 * A hybrid chat/feed interface showing both direct messages
 * and automated system logs (goal completions, nudges, etc.)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useCircleStore } from '../../stores/circleStore';
import { wsService } from '../../services/websocket';

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
  sender?: {
    name: string;
    avatarUrl?: string;
  };
}

export default function ChatScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const activeCircleId = useCircleStore((s) => s.activeCircleId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!activeCircleId) return;

    // Fetch or create the group thread for this circle
    const initChat = async () => {
      try {
        const threads: any = await api.get(`/chat/threads?circle_id=${activeCircleId}`);
        let currentThreadId = threads[0]?.id;

        if (!currentThreadId) {
          const newThread: any = await api.post('/chat/threads', {
            circleId: activeCircleId,
            threadType: 'group',
          });
          currentThreadId = newThread.id;
        }

        setThreadId(currentThreadId);

        // Fetch messages
        const msgsData: any = await api.get(`/chat/threads/${currentThreadId}/messages`);
        setMessages(msgsData.items.reverse());
      } catch (err) {
        console.error('Failed to init chat', err);
      }
    };

    initChat();

    // Listen to real-time chat messages
    const unsubscribe = wsService.on('chat_message', (payload: any) => {
      if (payload.threadId === threadId || !threadId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === payload.message.id || (m.content === payload.message.content && m.senderId === payload.message.senderId && Date.now() - new Date(m.sentAt).getTime() < 5000))) {
            return prev;
          }
          return [...prev, payload.message];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    });

    return () => unsubscribe();
  }, [activeCircleId, threadId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !threadId) return;

    const content = inputText;
    setInputText('');

    try {
      // Optimistic update
      const optimisticMsg: ChatMessage = {
        id: Math.random().toString(),
        senderId: user!.id,
        content,
        sentAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

      await api.post(`/chat/threads/${threadId}/messages`, { content });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;

    return (
      <View style={[styles.messageBubble, isMe ? styles.messageMe : styles.messageThem]}>
        {!isMe && <Text style={styles.senderName}>{item.sender?.name?.split(' ')[0] || 'Partner'}</Text>}
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Circle Chat</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    marginTop: Platform.OS === 'android' ? 30 : 0,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  backText: {
    color: Colors.accentPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  messageMe: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accentPrimary,
    borderBottomRightRadius: 0,
  },
  messageThem: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceHover,
    borderBottomLeftRadius: 0,
  },
  senderName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  messageText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: Spacing.sm,
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendText: {
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
});
