// FrontEnd/components/BackdropPicker.js
// Browsable backdrop chooser for the job posting form. Grouped by category
// for orientation, but every backdrop is selectable from anywhere — a beach
// bar can take a "trades" backdrop if that's the feel they want.
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BACKDROPS, BACKDROP_CATEGORIES, getBackdrop } from "../constants/backdrops";
import { COLORS, SPACING, RADIUS } from "../theme";

function Swatch({ bd, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.swatch, { backgroundColor: bd.bg }, selected && styles.swatchOn]}
      onPress={() => onPress(bd.id)}
      activeOpacity={0.85}
      accessibilityLabel={bd.name}
      accessibilityState={{ selected }}
    >
      <Ionicons name={bd.icon} size={20} color={bd.ink} style={{ opacity: 0.9 }} />
      <View style={[styles.swatchStrip, { backgroundColor: bd.accent }]} />
      {selected && (
        <View style={styles.tick}>
          <Ionicons name="checkmark" size={12} color={bd.bg} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function BackdropPicker({ value, onChange }) {
  const current = getBackdrop(value);

  return (
    <View>
      {/* Live preview of the current choice */}
      <View style={[styles.preview, { backgroundColor: current.bg }]}>
        <Text style={[styles.previewEyebrow, { color: current.muted }]}>Hiring · your town</Text>
        <Text style={[styles.previewTitle, { color: current.ink }]} numberOfLines={1}>
          Your job title
        </Text>
        <View style={[styles.previewStrip, { backgroundColor: current.accent }]} />
      </View>
      <Text style={styles.currentName}>{current.name}</Text>

      {BACKDROP_CATEGORIES.map(cat => (
        <View key={cat} style={styles.group}>
          <Text style={styles.groupLabel}>{cat}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              {BACKDROPS.filter(b => b.category === cat).map(bd => (
                <Swatch
                  key={bd.id}
                  bd={bd}
                  selected={bd.id === current.id}
                  onPress={onChange}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    height:       84,
    borderRadius: RADIUS.md,
    padding:      SPACING.md,
    overflow:     "hidden",
    justifyContent: "center",
  },
  previewEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  previewTitle:   { fontSize: 20, fontWeight: "900", letterSpacing: -0.4, marginTop: 4 },
  previewStrip:   { position: "absolute", left: 0, right: 0, bottom: 0, height: 8 },
  currentName:    { fontSize: 12.5, fontWeight: "700", color: COLORS.textSecondary, marginTop: 6, marginBottom: SPACING.sm },

  group:      { marginBottom: SPACING.md },
  groupLabel: { fontSize: 11.5, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: COLORS.textMuted, marginBottom: 6 },
  row:        { flexDirection: "row", gap: 8, paddingRight: SPACING.md },

  swatch: {
    width:          52,
    height:         52,
    borderRadius:   RADIUS.sm,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
    borderWidth:    2,
    borderColor:    "transparent",
  },
  swatchOn:     { borderColor: COLORS.primary },
  swatchStrip:  { position: "absolute", left: 0, right: 0, bottom: 0, height: 5 },
  tick: {
    position: "absolute", top: 3, right: 3,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
});
