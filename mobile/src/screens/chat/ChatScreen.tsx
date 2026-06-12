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
  Alert,
  Modal,
  PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

  // Drawing state
  const [showCanvas, setShowCanvas] = useState(false);
  const [myStrokes, setMyStrokes] = useState<string[][]>([]);
  const [partnerStrokes, setPartnerStrokes] = useState<string[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<string[]>([]);
  const currentStrokeRef = useRef<string[]>([]);

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

    const unsubDraw = wsService.on('draw:stroke', (payload: any) => {
      setPartnerStrokes((prev) => [...prev, payload.stroke]);
    });

    const unsubClear = wsService.on('draw:clear', () => {
      setPartnerStrokes([]);
      setMyStrokes([]);
    });

    return () => {
      unsubscribe();
      unsubDraw();
      unsubClear();
    };
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

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear your chat history? This only deletes messages for you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (!threadId) return;
            try {
              await api.delete(`/chat/threads/${threadId}/clear`);
              setMessages([]);
            } catch (err) {
              console.error('Failed to clear chat', err);
            }
          },
        },
      ]
    );
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const initialPoint = `${locationX},${locationY}`;
        currentStrokeRef.current = [initialPoint];
        setCurrentStroke([initialPoint]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPoint = `${locationX},${locationY}`;
        currentStrokeRef.current.push(newPoint);
        setCurrentStroke((prev) => [...prev, newPoint]);
      },
      onPanResponderRelease: () => {
        const finalStroke = [...currentStrokeRef.current];
        setMyStrokes((prev) => {
          const newStrokes = [...prev, finalStroke];
          if (activeCircleId) {
            wsService.sendDrawStroke(activeCircleId, finalStroke);
          }
          return newStrokes;
        });
        currentStrokeRef.current = [];
        setCurrentStroke([]);
      },
    })
  ).current;

  const handleClearCanvas = () => {
    setMyStrokes([]);
    setPartnerStrokes([]);
    if (activeCircleId) {
      wsService.sendDrawClear(activeCircleId);
    }
  };

  const renderPath = (stroke: string[], color: string, index: number) => {
    if (stroke.length === 0) return null;
    const d = `M ${stroke[0]} ` + stroke.slice(1).map((p) => `L ${p}`).join(' ');
    // Use a stable key so React Native SVG doesn't unmount and clear paths
    return <Path key={`${stroke[0]}-${index}`} d={d} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Circle Chat</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowCanvas(true)} style={styles.drawBtn}>
            <Text style={styles.drawEmoji}>🎨</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearChat} style={styles.optionsBtn}>
            <Text style={styles.optionsText}>Clear</Text>
          </TouchableOpacity>
        </View>
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

      <Modal visible={showCanvas} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.canvasContainer}>
          <View style={styles.canvasHeader}>
            <TouchableOpacity onPress={() => setShowCanvas(false)} style={styles.backBtn}>
              <Text style={styles.backText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shared Canvas</Text>
            <TouchableOpacity onPress={handleClearCanvas} style={styles.optionsBtn}>
              <Text style={styles.optionsText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.canvasBody} {...panResponder.panHandlers}>
            <Svg style={StyleSheet.absoluteFill}>
              {partnerStrokes.map((s, i) => renderPath(s, Colors.accentFire, i))}
              {myStrokes.map((s, i) => renderPath(s, Colors.accentPrimary, i))}
              {currentStroke.length > 0 && renderPath(currentStroke, Colors.accentPrimary, 0)}
            </Svg>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    width: 60,
  },
  backText: {
    color: Colors.accentPrimary,
    fontFamily: Typography.fontFamily.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  drawEmoji: {
    fontSize: 20,
  },
  optionsBtn: {
    padding: Spacing.xs,
    width: 60,
    alignItems: 'flex-end',
  },
  optionsText: {
    color: Colors.accentFire,
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
    backgroundColor: 'transparent',
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
  canvasContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  canvasBody: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
});
