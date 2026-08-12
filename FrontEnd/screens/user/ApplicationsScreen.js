// FrontEnd/screens/user/ApplicationsScreen.js — the application tracker.
// Every job the user applied to, with live status: in review / rejected /
// accepted (matched — with a shortcut straight into the chat).
import React, { useState, useCallback } from "react";
import {
  View, FlatList, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../services/api";
import { timeAgo, getInitials } from "../../utils/format";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const STATUS = {
  in_review: { label: "In review", icon: "hourglass-outline",     bg: COLORS.infoLight,    fg: COLORS.info },
  accepted:  { label: "Matched!",  icon: "heart",                 bg: COLORS.successLight, fg: COLORS.success },
  rejected:  { label: "Not this time", icon: "close-circle-outline", bg: COLORS.border,    fg: COLORS.textMuted },
};

export default function ApplicationsScreen({ navigation }) {
  const [apps, setApps]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApps = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res  = await api.get("/swipes/applications");
      const data = await res.json();
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("ApplicationsScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchApps(); }, [fetchApps]));

  const renderItem = ({ item }) => {
    const st = STATUS[item.status] ?? STATUS.in_review;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.monogram}>
            <Text style={styles.monogramText}>{getInitials(item.business?.business_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {item.job?.title ?? "General application"}
            </Text>
            <Text style={styles.bizLine} numberOfLines={1}>
              {item.business?.business_name}
              {item.business?.city ? ` · ${item.business.city}` : ""}
            </Text>
            <Text style={styles.dateLine}>Applied {timeAgo(item.applied_at)}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
            <Ionicons name={st.icon} size={12} color={st.fg} />
            <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
          </View>
        </View>

        {item.status === "accepted" && item.match_id ? (
          <TouchableOpacity
            style={styles.chatBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Chat", {
              matchId:     item.match_id,
              partnerName: item.business?.business_name ?? "Chat",
            })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color="#FFF" />
            <Text style={styles.chatBtnText}>Open chat</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  const reviewing = apps.filter(a => a.status === "in_review").length;

  return (
    <FlatList
      data={apps}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchApps(true)} tintColor={COLORS.primary} />
      }
      ListHeaderComponent={
        apps.length > 0 ? (
          <Text style={styles.listHeader}>
            {apps.length} application{apps.length !== 1 ? "s" : ""}
            {reviewing > 0 ? ` · ${reviewing} in review` : ""}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="paper-plane-outline" size={38} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No applications yet</Text>
          <Text style={styles.emptySub}>
            Jobs you apply to will show up here, along with what the business decided.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate("Dashboard")}>
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

  listHeader: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, marginBottom: SPACING.sm },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm + 4,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },

  monogram: {
    width: 46, height: 46, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  monogramText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  jobTitle: { fontSize: 15.5, fontWeight: "800", color: COLORS.textPrimary },
  bizLine:  { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  dateLine: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },

  statusChip: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical:   5,
  },
  statusText: { fontSize: 11.5, fontWeight: "800" },

  chatBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             7,
    backgroundColor: COLORS.accent,
    borderRadius:    RADIUS.sm,
    paddingVertical: 10,
    marginTop:       SPACING.md,
  },
  chatBtnText: { color: "#FFF", fontSize: 13.5, fontWeight: "700" },

  empty:     { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.xl, paddingTop: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: 19, fontWeight: "900", letterSpacing: -0.3, color: COLORS.textPrimary },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: "center", lineHeight: 21 },
  emptyBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 26, paddingVertical: 11, marginTop: SPACING.lg,
  },
  emptyBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
