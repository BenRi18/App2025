// FrontEnd/screens/business/ApplicantsScreen.js
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View, FlatList, Text, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const API_URL = "http://localhost:3000";

export default function ApplicantsScreen() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token }                   = useContext(AuthContext);

  const fetchApplicants = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res  = await fetch(`${API_URL}/swipes/business`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApplicants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ApplicantsScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Header row: avatar + name + CV badge */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.age}>Age {item.age}</Text>
        </View>
        {item.cv_path && (
          <View style={styles.cvBadge}>
            <Ionicons name="document-text-outline" size={13} color={COLORS.primary} />
            <Text style={styles.cvBadgeText}>CV</Text>
          </View>
        )}
      </View>

      {/* Detail rows */}
      <View style={styles.detailRow}>
        <Ionicons name="mail-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.detailText}>{item.email}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.detailText}>{item.phone_number || "—"}</Text>
      </View>

      <Text style={styles.date}>
        Applied:{" "}
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
      data={applicants}
      keyExtractor={item => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchApplicants(true)}
          tintColor={COLORS.primary}
        />
      }
      ListHeaderComponent={
        applicants.length > 0 ? (
          <Text style={styles.listHeader}>
            {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Applicants Yet</Text>
          <Text style={styles.emptySub}>
            Users will appear here when they apply to your business.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center:     { flex: 1 },
  list:       { padding: SPACING.md, flexGrow: 1, backgroundColor: COLORS.background },
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
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     SPACING.sm,
  },
  avatarText:  { color: COLORS.primary, fontSize: 18, fontWeight: "700" },
  headerText:  { flex: 1 },
  name:        { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  age:         { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  cvBadge: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              4,
    backgroundColor:  COLORS.primaryLight,
    borderRadius:     RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  cvBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },

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
  emptySub:   {
    fontSize:   14,
    color:      COLORS.textSecondary,
    marginTop:  SPACING.sm,
    textAlign:  "center",
    paddingHorizontal: SPACING.lg,
  },
});
