// FrontEnd/screens/shared/ChatScreen.js
// Real-time chat using Socket.io + REST history with cursor pagination.
// Params: { matchId, partnerName }
import React, {
  useEffect, useState, useContext, useRef, useCallback,
} from "react";
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView,
} from "react-native";
import { Ionicons }   from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { api }        from "../../services/api";
import { getSocket }  from "../../services/socket";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function ChatScreen({ route, navigation }) {
  const { matchId, partnerName } = route.params || {};
  const { role }                 = useContext(AuthContext);

  const [messages,  setMessages]  = useState([]);
  const [text,      setText]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [typingMsg, setTypingMsg] = useState("");
  const [hasMore,   setHasMore]   = useState(false);

  const flatRef      = useRef(null);
  const typingTimer  = useRef(null);
  const oldestMsgId  = useRef(null);

  // ── Load initial message history ─────────────────────────────────────────
  const loadMessages = useCallback(async (before = null) => {
    try {
      const qs  = before ? `?before=${before}&limit=50` : "?limit=50";
      const res = await api.get(`/messages/${matchId}${qs}`);
      const data = await res.json();
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      if (before) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        // Scroll to bottom on initial load
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 50);
      }
      setHasMore(data.hasMore ?? false);
      if (msgs.length > 0) oldestMsgId.current = msgs[0].id;
    } catch (err) {
      console.warn("ChatScreen load error:", err);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // ── Mark messages as read ────────────────────────────────────────────────
  const markRead = useCallback(async () => {
    try {
      await api.patch(`/messages/${matchId}/read`, {});
    } catch {}
  }, [matchId]);

  // ── Socket.io: join room + receive events ────────────────────────────────
  useEffect(() => {
    loadMessages();
    markRead();

    const socket = getSocket();
    if (!socket) return;

    // Join the match room
    socket.emit("join_match", matchId);

    // Receive new messages from server
    const onMessage = (msg) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Auto-scroll to bottom
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      markRead();
    };

    // Typing indicator
    const onTyping = ({ isTyping, senderRole }) => {
      if (senderRole === role) return;  // ignore own typing
      setTypingMsg(isTyping ? `${partnerName ?? "Them"} is typing…` : "");
    };

    socket.on("message", onMessage);
    socket.on("typing",  onTyping);

    return () => {
      socket.off("message", onMessage);
      socket.off("typing",  onTyping);
    };
  }, [matchId, role, partnerName]);

  // ── Send typing event ────────────────────────────────────────────────────
  const handleTyping = (val) => {
    setText(val);
    const socket = getSocket();
    if (!socket) return;
    socket.emit("typing", { matchId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("typing", { matchId, isTyping: false });
    }, 1500);
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");

    const socket = getSocket();
    if (socket) {
      socket.emit("typing",       { matchId, isTyping: false });
      socket.emit("send_message", { matchId, content });
    } else {
      // Fallback to REST if socket unavailable
      api.post(`/messages/${matchId}`, { content }).catch(() => {});
    }
    setSending(false);
  };

  // ── Load older messages ──────────────────────────────────────────────────
  const loadMore = () => {
    if (hasMore && oldestMsgId.current) {
      loadMessages(oldestMsgId.current);
    }
  };

  // ── Render a single bubble ───────────────────────────────────────────────
  const renderBubble = ({ item }) => {
    const mine = item.sender_role === role;
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {(partnerName ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.headerName} numberOfLines={1}>{partnerName ?? "Chat"}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={item => item.id?.toString()}
            renderItem={renderBubble}
            contentContainerStyle={styles.messageList}
            onStartReached={loadMore}
            onStartReachedThreshold={0.1}
            ListHeaderComponent={
              hasMore ? (
                <TouchableOpacity style={styles.loadMore} onPress={loadMore}>
                  <Text style={styles.loadMoreText}>Load earlier messages</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyChatText}>No messages yet — start the conversation!</Text>
              </View>
            }
          />

          {typingMsg ? (
            <View style={styles.typingRow}>
              <Text style={styles.typingText}>{typingMsg}</Text>
            </View>
          ) : null}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={handleTyping}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingHorizontal: SPACING.md,
    paddingVertical:   12,
    backgroundColor:   COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  headerBack:       { marginRight: SPACING.sm },
  headerAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm },
  headerAvatarText: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
  headerName:       { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, flex: 1 },

  // ── Message list ──────────────────────────────────────────────────────────
  messageList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },

  loadMore:     { alignSelf: "center", paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  loadMoreText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

  emptyChat:     { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: SPACING.md },
  emptyChatText: { color: COLORS.textSecondary, fontSize: 14, textAlign: "center" },

  // ── Bubbles ───────────────────────────────────────────────────────────────
  bubbleRow:      { marginBottom: SPACING.sm },
  bubbleRowMine:  { alignItems: "flex-end" },
  bubbleRowTheirs:{ alignItems: "flex-start" },

  bubble: {
    maxWidth:    "75%",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical:   10,
  },
  bubbleMine:   { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4, ...SHADOWS.sm },

  bubbleText:       { fontSize: 15, lineHeight: 21 },
  bubbleTextMine:   { color: "#FFF" },
  bubbleTextTheirs: { color: COLORS.textPrimary },

  bubbleTime:       { fontSize: 11, marginTop: 4 },
  bubbleTimeMine:   { color: "rgba(255,255,255,0.65)", textAlign: "right" },
  bubbleTimeTheirs: { color: COLORS.textMuted },

  // ── Typing indicator ──────────────────────────────────────────────────────
  typingRow: { paddingHorizontal: SPACING.md, paddingBottom: 4 },
  typingText: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },

  // ── Input bar ─────────────────────────────────────────────────────────────
  inputBar: {
    flexDirection:     "row",
    alignItems:        "flex-end",
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    backgroundColor:   COLORS.card,
    borderTopWidth:    1,
    borderTopColor:    COLORS.border,
    gap:               SPACING.sm,
  },
  input: {
    flex:              1,
    maxHeight:         100,
    backgroundColor:   COLORS.background,
    borderWidth:       1.5,
    borderColor:       COLORS.border,
    borderRadius:      RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical:   10,
    fontSize:          15,
    color:             COLORS.textPrimary,
  },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
});
