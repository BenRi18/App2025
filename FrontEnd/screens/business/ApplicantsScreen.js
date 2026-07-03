// FrontEnd/screens/business/ApplicantsScreen.js
// Shows pending applicants (users who swiped right on this business).
// Business can like/pass each applicant. A mutual like creates a match and opens chat.
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View, FlatList, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { api, API_URL } from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const STATUS_CONFIG = {
  applied:     { label: "Applied",     bg: COLORS.primaryLight, text: COLORS.primary },
  viewed:      { label: "Viewed",      bg: COLORS.warningLight, text: COLORS.warning },
  shortlisted: { label: "Shortlisted", bg: COLORS.successLight, text: COLORS.success },
  rejected:    { label: "Rejected",    bg: COLORS.dangerLight,  text: COLORS.danger  },
  hired:       { label: "Hired! 🎉",   bg: "#D1FAE5",           text: "#065F46"       },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.applied;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

export default function ApplicantsScreen({ navigation }) {
  const [applicants, setApplicants] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting,     setActing]     = useState(null); // swipeId being acted on
  const { token }                   = useContext(AuthContext);

  const fetchApplicants = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res  = await api.get("/matches/applicants/pending");
      const data = await res.json();
      setApplicants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ApplicantsScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  const handleDecision = async (userId, decision, applicantName) => {
    setActing(String(userId));
    try {
      const res  = await api.post(`/matches/applicants/${userId}/decision`, { decision });
      const data = await res.json();
      if (res.ok) {
        if (data.matched) {
          Alert.alert(
            "It's a Match! 🎉",
            `You and ${applicantName} are now connected. Open the chat?`,
            [
              { text: "Later",  style: "cancel", onPress: () => fetchApplicants() },
              {
                text: "Open Chat",
                onPress: () => {
                  fetchApplicants();
                  navigation.navigate("Chat", {
                    matchId:     data.match.id,
                    partnerName: applicantName,
                  });
                },
              },
            ]
          );
        } else {
          fetchApplicants();
        }
      } else {
        Alert.alert("Error", data.error ?? "Failed to submit decision.");
      }
    } catch {
      Alert.alert("Error", "Network error — is the server running?");
    } finally {
      setActing(null);
    }
  };

  const updateStatus = async (swipeId, status) => {
    try {
      const res  = await api.patch(`/swipes/${swipeId}/status`, { status });
      if (res.ok) {
        setApplicants(prev =>
          prev.map(a => a.swipe_id === swipeId ? { ...a, status } : a)
        );
      }
    } catch {}
  };

  const openCV = (cvPath) => {
    if (!cvPath) return;
    const url = cvPath.startsWith("http") ? cvPath : `${API_URL}/${cvPath.replace(/^\/+/, "")}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open the CV."));
  };

  const renderItem = ({ item }) => {
    // Backend spreads user_id.toJSON() → item.id is the user's Mongo id
    const userId   = item.id;
    const isActing = acting === String(userId);
    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{item.name}</Text>
            {item.age ? <Text style={styles.meta}>Age {item.age}</Text> : null}
            {item.experience_level ? <Text style={styles.meta}>{item.experience_level}</Text> : null}
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Detail rows */}
        <View style={styles.details}>
          <DetailRow icon="mail-outline"     value={item.email} />
          <DetailRow icon="call-outline"     value={item.phone_number} />
          <DetailRow icon="location-outline" value={item.location} />
          <DetailRow icon="briefcase-outline" value={item.work_type} />
        </View>

        {/* CV button */}
        {item.cv_path && (
          <TouchableOpacity style={styles.cvBtn} onPress={() => openCV(item.cv_path)}>
            <Ionicons name="document-text-outline" size={15} color={COLORS.primary} />
            <Text style={styles.cvBtnText}>View CV</Text>
          </TouchableOpacity>
        )}

        {/* Status update chips */}
        <View style={styles.statusRow}>
          {["viewed","shortlisted","hired","rejected"].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.statusChip, item.status === s && styles.statusChipActive(s)]}
              onPress={() => updateStatus(item.swipe_id, s)}
            >
              <Text style={[styles.statusChipText, item.status === s && styles.statusChipTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Like / Pass */}
        <View style={styles.decisionRow}>
          <TouchableOpacity
            style={[styles.passBtn, isActing && styles.decisionBtnDisabled]}
            onPress={() => handleDecision(userId, "pass", item.name)}
            disabled={isActing}
          >
            {isActing
              ? <ActivityIndicator size="small" color={COLORS.danger} />
              : <>
                  <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                  <Text style={styles.passBtnText}>Pass</Text>
                </>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.likeBtn, isActing && styles.decisionBtnDisabled]}
            onPress={() => handleDecision(userId, "like", item.name)}
            disabled={isActing}
          >
            {isActing
              ? <ActivityIndicator size="small" color="#FFF" />
              : <>
                  <Ionicons name="heart-outline" size={18} color="#FFF" />
                  <Text style={styles.likeBtnText}>Like</Text>
                </>}
          </TouchableOpacity>
        </View>

        <Text style={styles.date}>
          Applied:{" "}
          {new Date(item.created_at).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  return (
    <FlatList
      data={applicants}
      keyExtractor={item => item.swipe_id?.toString() ?? item.user_id?.toString()}
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
            {applicants.length} pending applicant{applicants.length !== 1 ? "s" : ""}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Pending Applicants</Text>
          <Text style={styles.emptySub}>
            When job seekers apply to your business, they'll appear here for review.
          </Text>
        </View>
      }
    />
  );
}

function DetailRow({ icon, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={13} color={COLORS.textSecondary} />
      <Text style={styles.detailText} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center:     { flex: 1 },
  list:       { padding: SPACING.md, flexGrow: 1, backgroundColor: COLORS.background },
  listHeader: {
    fontSize: 13, color: COLORS.textSecondary, fontWeight: "600",
    marginBottom: SPACING.sm, textTransform: "uppercase", letterSpacing: 0.5,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    ...SHADOWS.md,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginRight: SPACING.sm,
  },
  avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: "700" },
  headerText: { flex: 1 },
  name:       { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  meta:       { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  details:    { gap: 3, marginBottom: SPACING.sm },
  detailRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  cvBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    marginBottom: SPACING.sm,
  },
  cvBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: SPACING.sm },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  statusChipActive:     (s) => {
    const cfg = STATUS_CONFIG[s];
    return { backgroundColor: cfg?.bg ?? COLORS.primaryLight, borderColor: cfg?.text ?? COLORS.primary };
  },
  statusChipText:       { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },
  statusChipTextActive: { color: COLORS.textPrimary, fontWeight: "700" },

  decisionRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm },
  passBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
  },
  likeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.success,
  },
  decisionBtnDisabled: { opacity: 0.5 },
  passBtnText: { color: COLORS.danger,  fontSize: 14, fontWeight: "700" },
  likeBtnText: { color: "#FFF",         fontSize: 14, fontWeight: "700" },

  date: { fontSize: 12, color: COLORS.textMuted },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: "center", paddingHorizontal: SPACING.lg },
});
