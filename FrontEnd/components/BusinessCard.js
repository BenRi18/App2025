// FrontEnd/components/BusinessCard.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../theme";

export default function BusinessCard({ business }) {
  const initials = business.business_name
    ? business.business_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

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
        <DetailRow icon="location-outline" value={business.street} />
        <DetailRow icon="mail-outline"     value={business.email} />
      </View>

      {/* Swipe hint */}
      <View style={styles.hintRow}>
        <View style={styles.hintLeft}>
          <Ionicons name="arrow-back-outline" size={14} color={COLORS.danger} />
          <Text style={[styles.hintText, { color: COLORS.danger }]}>Skip</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.hintRight}>
          <Text style={[styles.hintText, { color: COLORS.success }]}>Apply</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={COLORS.success} />
        </View>
      </View>
    </View>
  );
}

function DetailRow({ icon, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={COLORS.textSecondary} />
      <Text style={styles.detailText} numberOfLines={1}>{value}</Text>
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
    minHeight:       320,
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
  },
  logoText: { fontSize: 26, fontWeight: "800", color: COLORS.primary },

  title: {
    fontSize:     22,
    fontWeight:   "800",
    color:        COLORS.textPrimary,
    textAlign:    "center",
    marginBottom: SPACING.md,
  },

  details:    { alignSelf: "stretch", gap: SPACING.sm },
  detailRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },

  hintRow: {
    flexDirection:  "row",
    alignItems:     "center",
    alignSelf:      "stretch",
    marginTop:      SPACING.lg,
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
  divider: { width: 1, height: 16, backgroundColor: COLORS.border },
  hintText: { fontSize: 13, fontWeight: "600" },
});
