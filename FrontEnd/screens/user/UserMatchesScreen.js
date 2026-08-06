// FrontEnd/screens/user/UserMatchesScreen.js
// Job-seeker matches: every business the user has mutually matched with.
// Celebratory card layout — this screen is about the match itself;
// conversations live in the Messages tab.
import React, { useState, useCallback } from "react";
import {
  View, FlatList, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../services/api";
import { timeAgo, getInitials, avatarUrl } from "../../utils/format";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function UserMatchesScreen({ navigation }) {
  const [matches,    setMatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res  = await api.get("/matches");
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("UserMatchesScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch every time the tab gains focus so new matches appear instantly
  useFocusEffect(useCallback(() => { fetchMatches(); }, [fetchMatches]));

  const openChat = (item) => {
    navigation.navigate("Chat", {
      matchId:     item.id,
      partnerName: item.other_party?.name ?? "Chat",
    });
  };

  const renderItem = ({ item }) => {
    const name   = item.other_party?.name ?? "—";
    const avatar = avatarUrl(item.other_party?.avatar);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
          )}

          <View style={styles.cardBody}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="heart" size={13} color={COLORS.success} />
              <Text style={styles.metaText}>Matched {timeAgo(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.msgBtn} onPress={() => openChat(item)} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFF" />
          <Text style={styles.msgBtnText}>
            {item.last_message ? "Continue chat" : "Send a message"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={item => item.id?.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchMatches(true)}
          tintColor={COLORS.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptySub}>
            Keep swiping — when a business likes you back, they'll show up here.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate("Find Jobs")}
          >
            <Text style={styles.emptyBtnText}>Find Jobs</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  list:   { flexGrow: 1, padding: SPACING.md, backgroundColor: COLORS.background },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.md },

  avatarImage: {
    width: 56, height: 56, borderRadius: 28,
    marginRight: SPACING.md,
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginRight: SPACING.md,
  },
  avatarText: { color: COLORS.primary, fontSize: 19, fontWeight: "700" },

  cardBody: { flex: 1 },
  name:     { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  metaRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, color: COLORS.textSecondary },

  msgBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    backgroundColor: COLORS.accent,
    borderRadius:    RADIUS.sm,
    paddingVertical: 11,
  },
  msgBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: "center", lineHeight: 21 },
  emptyBtn: {
    marginTop:         SPACING.lg,
    backgroundColor:   COLORS.primary,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 28,
    paddingVertical:   11,
  },
  emptyBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
