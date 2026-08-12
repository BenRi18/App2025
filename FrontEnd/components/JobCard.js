// FrontEnd/components/JobCard.js
// One swipe card per job listing — Atlantic Light. The job title is the hero;
// the business is context; the horizon rule (coral dash meeting teal line) is
// the signature. Feed item shape: { job, business, match_score }.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPE } from "../theme";

export default function JobCard({ item }) {
  const { job, business, match_score } = item;

  const initials = business?.business_name
    ? business.business_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <View style={styles.card}>

      {/* Eyebrow: where — the recruiting context in micro-caps */}
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>
          Hiring{business?.city ? ` · ${business.city}` : ""}
        </Text>
        {typeof match_score === "number" && (
          <View style={styles.scoreBadge}>
            <Ionicons name="flash" size={11} color={COLORS.sun} />
            <Text style={styles.scoreText}>{Math.round(match_score)}%</Text>
          </View>
        )}
      </View>

      {/* Hero: the job itself */}
      <Text style={styles.jobTitle} numberOfLines={2}>{job?.job_title}</Text>

      {/* Horizon rule — coral sun meets teal sea */}
      <View style={styles.horizon}>
        <View style={styles.horizonDash} />
        <View style={styles.horizonLine} />
      </View>

      {/* Business identity */}
      <View style={styles.bizRow}>
        <View style={styles.monogram}>
          <Text style={styles.monogramText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bizName} numberOfLines={1}>{business?.business_name}</Text>
          {business?.industry ? (
            <Text style={styles.bizMeta} numberOfLines={1}>{business.industry}</Text>
          ) : null}
        </View>
      </View>

      {/* Terms */}
      <View style={styles.chips}>
        {job?.job_type ? (
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={12} color={COLORS.primary} />
            <Text style={styles.chipText}>{job.job_type}</Text>
          </View>
        ) : null}
        {job?.salary_range ? (
          <View style={[styles.chip, styles.chipCoral]}>
            <Ionicons name="cash-outline" size={12} color={COLORS.accent} />
            <Text style={[styles.chipText, { color: COLORS.accent }]}>{job.salary_range}</Text>
          </View>
        ) : null}
      </View>

      {/* The work */}
      {(job?.description || job?.job_description) ? (
        <Text style={styles.description} numberOfLines={5}>
          {job.description ?? job.job_description}
        </Text>
      ) : null}
      {business?.description ? (
        <Text style={styles.bizAbout} numberOfLines={2}>{business.description}</Text>
      ) : null}

      {/* Sand footer — the beach strip with the two choices */}
      <View style={styles.footer}>
        <View style={styles.hintSide}>
          <Ionicons name="arrow-back" size={14} color={COLORS.textMuted} />
          <Text style={styles.hintSkip}>Skip</Text>
        </View>
        <View style={styles.hintSide}>
          <Text style={styles.hintApply}>Apply</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:  COLORS.card,
    borderRadius:     RADIUS.xl,
    padding:          SPACING.lg,
    paddingBottom:    0,
    height:           "100%",
    overflow:         "hidden",
    ...SHADOWS.lg,
  },

  topRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   SPACING.sm,
  },
  eyebrow: { ...TYPE.eyebrow },
  scoreBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   COLORS.sunLight,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical:   4,
  },
  scoreText: { color: "#9A6E12", fontSize: 12, fontWeight: "800" },

  jobTitle: {
    fontSize:      27,
    fontWeight:    "900",
    letterSpacing: -0.5,
    lineHeight:    32,
    color:         COLORS.textPrimary,
  },

  horizon:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SPACING.sm, marginBottom: SPACING.md },
  horizonDash: { width: 22, height: 3, borderRadius: 2, backgroundColor: COLORS.accent },
  horizonLine: { flex: 1, height: 1.5, borderRadius: 1, backgroundColor: COLORS.primaryLight },

  bizRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: SPACING.md },
  monogram: {
    width:           46,
    height:          46,
    borderRadius:    RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems:      "center",
    justifyContent:  "center",
  },
  monogramText: { color: "#FFF", fontSize: 17, fontWeight: "800", letterSpacing: 0.5 },
  bizName:      { fontSize: 15.5, fontWeight: "700", color: COLORS.textPrimary },
  bizMeta:      { fontSize: 12.5, color: COLORS.textMuted, marginTop: 1 },

  chips: { flexDirection: "row", gap: SPACING.sm, flexWrap: "wrap", marginBottom: SPACING.md },
  chip: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   COLORS.primaryLight,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical:   6,
  },
  chipCoral: { backgroundColor: COLORS.accentLight },
  chipText:  { color: COLORS.primary, fontSize: 12.5, fontWeight: "700" },

  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, marginBottom: SPACING.sm },
  bizAbout:    { fontSize: 12.5, color: COLORS.textMuted, lineHeight: 18, fontStyle: "italic", marginBottom: SPACING.md },

  footer: {
    flexDirection:    "row",
    justifyContent:   "space-between",
    alignItems:       "center",
    backgroundColor:  COLORS.background,
    borderTopWidth:   1,
    borderTopColor:   COLORS.border,
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical:  13,
    marginTop:        "auto",
  },
  hintSide:  { flexDirection: "row", alignItems: "center", gap: 6 },
  hintSkip:  { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  hintApply: { fontSize: 13, fontWeight: "800", color: COLORS.accent },
});
