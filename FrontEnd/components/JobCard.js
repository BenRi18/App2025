// FrontEnd/components/JobCard.js
// One swipe card per job listing — the job is the headline, the business
// is context. Feed item shape: { job, business, match_score }.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../theme";

export default function JobCard({ item }) {
  const { job, business, match_score } = item;

  const initials = business?.business_name
    ? business.business_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const locationText = [business?.street, business?.city].filter(Boolean).join(", ");

  return (
    <View style={styles.card}>
      {/* Match score badge */}
      {typeof match_score === "number" && (
        <View style={styles.scoreBadge}>
          <Ionicons name="flash" size={12} color={COLORS.primary} />
          <Text style={styles.scoreText}>{Math.round(match_score)}% match</Text>
        </View>
      )}

      {/* Business logo */}
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>{initials}</Text>
      </View>

      {/* Job title — the headline */}
      <Text style={styles.jobTitle} numberOfLines={2}>{job?.job_title}</Text>
      <Text style={styles.businessName} numberOfLines={1}>{business?.business_name}</Text>

      {/* Chips */}
      <View style={styles.chips}>
        {job?.job_type ? (
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={12} color={COLORS.primary} />
            <Text style={styles.chipText}>{job.job_type}</Text>
          </View>
        ) : null}
        {job?.salary_range ? (
          <View style={[styles.chip, styles.chipSuccess]}>
            <Ionicons name="cash-outline" size={12} color={COLORS.success} />
            <Text style={[styles.chipText, { color: COLORS.success }]}>{job.salary_range}</Text>
          </View>
        ) : null}
      </View>

      {/* Details */}
      <View style={styles.details}>
        {locationText ? (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} style={{ marginTop: 1 }} />
            <Text style={styles.detailText} numberOfLines={1}>{locationText}</Text>
          </View>
        ) : null}
        {job?.job_description ? (
          <View style={styles.detailRow}>
            <Ionicons name="reader-outline" size={15} color={COLORS.textSecondary} style={{ marginTop: 1 }} />
            <Text style={styles.detailText} numberOfLines={4}>{job.job_description}</Text>
          </View>
        ) : null}
        {business?.description ? (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={15} color={COLORS.textSecondary} style={{ marginTop: 1 }} />
            <Text style={styles.detailText} numberOfLines={2}>{business.description}</Text>
          </View>
        ) : null}
      </View>

      {/* Swipe hint */}
      <View style={styles.hintRow}>
        <View style={styles.hintSide}>
          <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
          <Text style={[styles.hintText, { color: COLORS.danger }]}>Skip</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.hintSide}>
          <Text style={[styles.hintText, { color: COLORS.success }]}>Apply</Text>
          <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:  COLORS.card,
    borderRadius:     RADIUS.lg,
    padding:          SPACING.lg,
    marginHorizontal: SPACING.md,
    alignItems:       "center",
    minHeight:        380,
    ...SHADOWS.md,
  },

  scoreBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   COLORS.primaryLight,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical:   4,
    marginBottom:      SPACING.sm,
  },
  scoreText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },

  logoCircle: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    SPACING.md,
  },
  logoText: { color: COLORS.primary, fontSize: 22, fontWeight: "800" },

  jobTitle:     { fontSize: 21, fontWeight: "800", color: COLORS.textPrimary, textAlign: "center" },
  businessName: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.md },

  chips: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: "wrap", justifyContent: "center" },
  chip: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   COLORS.primaryLight,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },
  chipSuccess: { backgroundColor: COLORS.successLight },
  chipText:    { color: COLORS.primary, fontSize: 12, fontWeight: "600" },

  details:    { width: "100%", gap: 8, marginBottom: SPACING.md },
  detailRow:  { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  detailText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  hintRow:  { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginTop: "auto" },
  hintSide: { flexDirection: "row", alignItems: "center", gap: 4 },
  hintText: { fontSize: 13, fontWeight: "700" },
  divider:  { width: 1, height: 16, backgroundColor: COLORS.border },
});
