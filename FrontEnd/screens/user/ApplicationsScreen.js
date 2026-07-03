// FrontEnd/screens/user/ApplicationsScreen.js
// Lists all right-swipes (applications) for the logged-in job seeker.
// Shows live status badge and a "Chat" button when there's a match.
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View, FlatList, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

// ── Status badge config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  applied:     { label: "Applied",     bg: COLORS.primaryLight,  text: COLORS.primary,  icon: "paper-plane-outline" },
  viewed:      { label: "Viewed",      bg: COLORS.warningLight,  text: COLORS.warning,  icon: "eye-outline" },
  shortlisted: { label: "Shortlisted", bg: COLORS.successLight,  text: COLORS.success,  icon: "star-outline" },
  rejected:    { label: "Rejected",    bg: COLORS.dangerLight,   text: COLORS.danger,   icon: "close-circle-outline" },
  hired:       { label: "Hired! 🎉",   bg: "#D1FAE5",            text: "#065F46",        icon: "checkmark-circle-outline" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.applied;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={12} color={cfg.text} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

export default function ApplicationsScreen({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const { token }                       = useContext(AuthContext);

  const fetchApplications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res  = await api.get("/swipes/user");
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ApplicationsScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const openChat = (item) => {
    // item.match_id is set by the backend when a match exists
    navigation.navigate("Chat", {
      matchId:     item.match_id,
      partnerName: item.business_name,
    });
  };

  const renderItem = ({ item }) => {
    const hasMatch = !!item.match_id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.business_name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.businessName}>{item.business_name}</Text>
            {item.owner_name ? (
              <Text style={styles.ownerName}>{item.owner_name}</Text>
            ) : null}
          </View>
          <StatusBadge status={item.status} />
        </View>

        {item.job_title ? (
          <View style={styles.jobRow}>
            <Ionicons name="briefcase-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.jobText}>{item.job_title}</Text>
            {item.job_type ? (
              <View style={styles.typeChip}>
                <Text style={styles.typeChipText}>{item.job_type}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{item.street || "—"}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString(undefined, {
              year: "numeric", month: "short", day: "numeric",
            })}
          </Text>
          {hasMatch && (
            <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(item)}>
              <Ionicons name="chatbubble-outline" size={14} color="#FFF" />
              <Text style={styles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  return (
    <FlatList
      data={applications}
      keyExtractor={item => item.id?.toString() ?? Math.random().toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchApplications(true)}
          tintColor={COLORS.primary}
        />
      }
      ListHeaderComponent={
        applications.length > 0 ? (
          <Text style={styles.listHeader}>
            {applications.length} application{applications.length !== 1 ? "s" : ""}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Applications Yet</Text>
          <Text style={styles.emptySub}>Swipe right on a business to apply!</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  list:   { padding: SPACING.md, flexGrow: 1, backgroundColor: COLORS.background },
  listHeader: {
    fontSize:     13,
    color:        COLORS.textSecondary,
    fontWeight:   "600",
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems:    "center",
    marginBottom:  SPACING.sm,
  },
  avatar: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     SPACING.sm,
  },
  avatarText:   { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  headerText:   { flex: 1 },
  businessName: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  ownerName:    { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },

  badge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  jobRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    marginBottom:  4,
  },
  jobText:      { fontSize: 13, color: COLORS.textPrimary, fontWeight: "600", flex: 1 },
  typeChip:     { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  typeChipText: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },

  detailRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    marginTop:     2,
  },
  detailText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  cardFooter: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      SPACING.sm,
  },
  date:        { fontSize: 12, color: COLORS.textMuted },
  chatBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  chatBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm },
});
