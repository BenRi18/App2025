// FrontEnd/screens/user/UserMessagesScreen.js
// Job-seeker inbox: one row per conversation with a matched business,
// sorted by most recent activity, with unread badges.
import React, { useState, useCallback } from "react";
import {
  View, FlatList, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../services/api";
import { timeAgo, getInitials, avatarUrl } from "../../utils/format";
import { COLORS, SPACING } from "../../theme";

export default function UserMessagesScreen({ navigation }) {
  const [convos,     setConvos]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConvos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res  = await api.get("/matches");
      const data = await res.json();
      setConvos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("UserMessagesScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch on focus so unread counts update after leaving a chat
  useFocusEffect(useCallback(() => { fetchConvos(); }, [fetchConvos]));

  const openChat = (item) => {
    navigation.navigate("Chat", {
      matchId:     item.id,
      partnerName: item.other_party?.name ?? "Chat",
    });
  };

  const renderItem = ({ item }) => {
    const name   = item.other_party?.name ?? "—";
    const avatar = avatarUrl(item.other_party?.avatar);
    const unread = item.unread_count ?? 0;

    return (
      <TouchableOpacity style={styles.row} onPress={() => openChat(item)} activeOpacity={0.75}>
        <View style={styles.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
          )}
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          )}
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowHeader}>
            <Text style={[styles.name, unread > 0 && styles.nameBold]} numberOfLines={1}>
              {name}
            </Text>
            {item.last_message_at ? (
              <Text style={styles.time}>{timeAgo(item.last_message_at)}</Text>
            ) : null}
          </View>
          {item.last_message ? (
            <Text style={[styles.preview, unread > 0 && styles.previewBold]} numberOfLines={1}>
              {item.last_message}
            </Text>
          ) : (
            <Text style={styles.previewEmpty}>No messages yet — say hi!</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  return (
    <FlatList
      data={convos}
      keyExtractor={item => item.id?.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchConvos(true)}
          tintColor={COLORS.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Conversations</Text>
          <Text style={styles.emptySub}>
            Match with a business first — then your chats will appear here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  list:   { flexGrow: 1, backgroundColor: COLORS.background },

  row: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingVertical:   14,
    paddingHorizontal: SPACING.md,
    backgroundColor:   COLORS.card,
  },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 76 },

  avatarWrap:  { marginRight: SPACING.md, position: "relative" },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: "700" },
  badge: {
    position:          "absolute",
    top:               -2,
    right:             -4,
    minWidth:          18,
    height:            18,
    borderRadius:      9,
    backgroundColor:   COLORS.danger,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 4,
    borderWidth:       2,
    borderColor:       COLORS.card,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },

  rowBody:      { flex: 1 },
  rowHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  name:         { fontSize: 15, color: COLORS.textPrimary, fontWeight: "500", flex: 1, marginRight: 6 },
  nameBold:     { fontWeight: "700" },
  time:         { fontSize: 12, color: COLORS.textMuted },
  preview:      { fontSize: 13, color: COLORS.textSecondary },
  previewBold:  { color: COLORS.textPrimary, fontWeight: "600" },
  previewEmpty: { fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACING.md, textAlign: "center" },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: "center", lineHeight: 21 },
});
