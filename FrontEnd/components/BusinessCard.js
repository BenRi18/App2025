// FrontEnd/components/BusinessCard.js
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../theme";

export default function BusinessCard({ business }) {
  const initials = business.business_name
    ? business.business_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const jobs = business.jobs ?? [];

  return (
    <View style={styles.card}>
      {/* Logo placeholder */}
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>{initials}</Text>
      </View>

      {/* Business name */}
      <Text style={styles.title}>{business.business_name}</Text>

      {/* Detail rows */}
      <View style={styles.details}>
        <DetailRow icon="person-outline"   value={business.owner_name} />
        <DetailRow icon="location-outline" value={[business.street, business.city].filter(Boolean).join(", ") || business.street} />
        {business.description ? (
          <DetailRow icon="information-circle-outline" value={business.description} lines={2} />
        ) : null}
      </View>

      {/* Job listings */}
      {jobs.length > 0 && (
        <View style={styles.jobsSection}>
          <Text style={styles.jobsLabel}>Open Positions</Text>
          {jobs.map((job, i) => (
            <View key={job.id ?? i} style={styles.jobRow}>
              <View style={styles.jobDot} />
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>{job.job_title}</Text>
                <View style={styles.jobMeta}>
                  {job.job_type ? (
                    <View style={styles.jobChip}>
                      <Text style={styles.jobChipText}>{job.job_type}</Text>
                    </View>
                  ) : null}
                  {job.salary_range ? (
                    <Text style={styles.jobSalary}>{job.salary_range}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Swipe hint */}
      <View style={styles.hintRow}>
        <View style={styles.hintLeft}>
          <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
          <Text style={[styles.hintText, { color: COLORS.danger }]}>Skip</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.hintRight}>
          <Text style={[styles.hintText, { color: COLORS.success }]}>Apply</Text>
          <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
        </View>
      </View>
    </View>
  );
}

function DetailRow({ icon, value, lines = 1 }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={COLORS.textSecondary} style={{ marginTop: 1 }} />
      <Text style={styles.detailText} numberOfLines={lines}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.lg,
    marginHorizontal: SPACING.md,
    alignItems:      "center",
    minHeight:       340,
    ...SHADOWS.md,
  },

  logoCircle: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    SPACING.md,
    borderWidth:     2,
    borderColor:     COLORS.primary + "30",
  },
  logoText: { fontSize: 26, fontWeight: "800", color: COLORS.primary },

  title: {
    fontSize:     22,
    fontWeight:   "800",
    color:        COLORS.textPrimary,
    textAlign:    "center",
    marginBottom: SPACING.md,
  },

  details:    { alignSelf: "stretch", gap: SPACING.sm, marginBottom: SPACING.md },
  detailRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detailText: { fontSize: 14, color: COLORS.textSecondary, flex: 1, lineHeight: 20 },

  // ── Job listings section ──────────────────────────────────────────────────
  jobsSection: {
    alignSelf:       "stretch",
    backgroundColor: COLORS.background,
    borderRadius:    RADIUS.md,
    padding:         SPACING.sm,
    marginBottom:    SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  jobsLabel: {
    fontSize:     11,
    fontWeight:   "700",
    color:        COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  jobRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           8,
    marginBottom:  SPACING.xs,
  },
  jobDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop:    6,
  },
  jobInfo:   { flex: 1 },
  jobTitle:  { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  jobMeta:   { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: 2 },
  jobChip:   { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 },
  jobChipText: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
  jobSalary: { fontSize: 12, color: COLORS.textSecondary },

  // ── Swipe hints ───────────────────────────────────────────────────────────
  hintRow: {
    flexDirection:  "row",
    alignItems:     "center",
    alignSelf:      "stretch",
    marginTop:      "auto",
    paddingTop:     SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  hintLeft: {
    flex:          1,
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
    justifyContent: "flex-start",
  },
  hintRight: {
    flex:          1,
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
    justifyContent: "flex-end",
  },
  divider:  { width: 1, height: 16, backgroundColor: COLORS.border },
  hintText: { fontSize: 13, fontWeight: "600" },
});
