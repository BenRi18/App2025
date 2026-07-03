// FrontEnd/screens/business/BusinessDashboard.js
// Overview dashboard — stats + quick links.
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons }   from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { api }        from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function BusinessDashboard({ navigation }) {
  const { user, setUser } = useContext(AuthContext);

  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [profileRes, matchesRes, jobsRes, applicantsRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/matches"),
        api.get("/jobs"),
        api.get("/matches/applicants/pending"),
      ]);

      const [profile, matches, jobs, applicants] = await Promise.all([
        profileRes.json(),
        matchesRes.json(),
        jobsRes.json(),
        applicantsRes.json(),
      ]);

      if (profileRes.ok) setUser(profile);

      setStats({
        activeJobs:       Array.isArray(jobs)       ? jobs.filter(j => j.is_active).length : 0,
        totalJobs:        Array.isArray(jobs)        ? jobs.length : 0,
        totalMatches:     Array.isArray(matches)     ? matches.length : 0,
        pendingApplicants:Array.isArray(applicants)  ? applicants.length : 0,
        unreadMessages:   Array.isArray(matches)
          ? matches.reduce((sum, m) => sum + (m.unread_business ?? 0), 0)
          : 0,
      });
    } catch (err) {
      console.warn("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  const businessName = user?.business_name ?? "Your Business";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <View>
          <Text style={styles.greetingLabel}>Welcome back 👋</Text>
          <Text style={styles.greetingName} numberOfLines={1}>{businessName}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate("Business Profile")}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {businessName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats grid */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard
            icon="briefcase"
            iconBg={COLORS.primaryLight}
            iconColor={COLORS.primary}
            label="Active Jobs"
            value={`${stats.activeJobs}/${stats.totalJobs}`}
            onPress={() => navigation.navigate("Jobs")}
          />
          <StatCard
            icon="people"
            iconBg={COLORS.warningLight}
            iconColor={COLORS.warning}
            label="Pending"
            value={stats.pendingApplicants}
            badge={stats.pendingApplicants}
            onPress={() => navigation.navigate("Applicants")}
          />
          <StatCard
            icon="heart"
            iconBg={COLORS.successLight}
            iconColor={COLORS.success}
            label="Matches"
            value={stats.totalMatches}
            onPress={() => navigation.navigate("Matches")}
          />
          <StatCard
            icon="chatbubbles"
            iconBg={COLORS.infoLight}
            iconColor={COLORS.info}
            label="Unread"
            value={stats.unreadMessages}
            badge={stats.unreadMessages}
            onPress={() => navigation.navigate("Matches")}
          />
        </View>
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        <ActionRow
          icon="add-circle-outline"
          title="Post a Job Opening"
          subtitle="Add a new listing to attract candidates"
          onPress={() => navigation.navigate("Jobs")}
        />
        <ActionRow
          icon="people-outline"
          title="Review Applicants"
          subtitle={stats?.pendingApplicants
            ? `${stats.pendingApplicants} awaiting your review`
            : "No pending applicants"}
          badge={stats?.pendingApplicants}
          onPress={() => navigation.navigate("Applicants")}
        />
        <ActionRow
          icon="chatbubbles-outline"
          title="Messages"
          subtitle={stats?.unreadMessages
            ? `${stats.unreadMessages} unread message${stats.unreadMessages > 1 ? "s" : ""}`
            : "All caught up!"}
          badge={stats?.unreadMessages}
          onPress={() => navigation.navigate("Matches")}
          last
        />
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, iconBg, iconColor, label, value, badge, onPress }) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
        {badge > 0 && (
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionRow({ icon, title, subtitle, badge, onPress, last }) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, !last && styles.actionRowBorder]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={22} color={COLORS.primary} style={styles.actionIcon} />
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      {badge > 0 ? (
        <View style={styles.actionBadge}>
          <Text style={styles.actionBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SPACING.md, paddingBottom: 40 },

  greeting: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   SPACING.lg,
    paddingTop:     SPACING.sm,
  },
  greetingLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "500" },
  greetingName:  { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary, maxWidth: 220 },

  profileBtn:        {},
  profileAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", ...SHADOWS.sm },
  profileAvatarText: { color: "#FFF", fontSize: 18, fontWeight: "700" },

  statsGrid: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    gap:            SPACING.sm,
    marginBottom:   SPACING.lg,
  },
  statCard: {
    width:           "48%",
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    alignItems:      "flex-start",
    ...SHADOWS.sm,
  },
  statIcon:  { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm, position: "relative" },
  statBadge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  statBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  statValue: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500", marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SPACING.sm },
  actions: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    overflow:        "hidden",
    ...SHADOWS.sm,
  },
  actionRow: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingVertical:   14,
    paddingHorizontal: SPACING.md,
  },
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  actionIcon:      { marginRight: SPACING.md },
  actionText:      { flex: 1 },
  actionTitle:     { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary },
  actionSubtitle:  { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  actionBadge:     { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, marginRight: SPACING.sm },
  actionBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
});
