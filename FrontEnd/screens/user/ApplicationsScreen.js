// FrontEnd/screens/user/ApplicationsScreen.js
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View, FlatList, Text, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const API_URL = "http://localhost:3000";

export default function ApplicationsScreen() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const { token }                       = useContext(AuthContext);

  const fetchApplications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res  = await fetch(`${API_URL}/swipes/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ApplicationsScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.business_name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.businessName}>{item.business_name}</Text>
          <Text style={styles.ownerName}>{item.owner_name}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Applied</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.detailText}>{item.street || "—"}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="mail-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.detailText}>{item.email}</Text>
      </View>

      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString(undefined, {
          year: "numeric", month: "short", day: "numeric",
        })}
      </Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  return (
    <FlatList
      data={applications}
      keyExtractor={item => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchApplications(true)}
          tintColor={COLORS.primary}
        />
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

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:   SPACING.sm,
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
    backgroundColor: COLORS.successLight,
    borderRadius:    RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: COLORS.success, fontSize: 12, fontWeight: "600" },

  detailRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    marginTop:     4,
  },
  detailText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  date: { fontSize: 12, color: COLORS.textMuted, marginTop: SPACING.sm },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm },
});
