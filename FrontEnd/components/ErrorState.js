// FrontEnd/components/ErrorState.js
// Shown when a screen's data can't be loaded. An error screen has one job:
// say what happened and give the person a way forward.
//
// This is deliberately distinct from an empty state. "No applications yet" and
// "Couldn't load your applications" look identical if you only handle one of
// them — and the user is left thinking they have no data when really the
// request failed.
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../theme";

export default function ErrorState({ message, onRetry, compact = false }) {
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={styles.icon}>
        <Ionicons name="cloud-offline-outline" size={compact ? 24 : 34} color={COLORS.textMuted} />
      </View>
      <Text style={styles.title}>Couldn't load this</Text>
      <Text style={styles.body}>{message ?? "Something went wrong."}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retry} onPress={onRetry} activeOpacity={0.85}>
          <Ionicons name="refresh" size={15} color="#FFF" />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Inline one-line variant for forms and small surfaces. */
export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
      <Text style={styles.bannerText}>{message}</Text>
      {onDismiss ? (
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={15} color={COLORS.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: SPACING.xl, paddingTop: 60,
  },
  compact: { flex: 0, paddingTop: SPACING.lg, paddingBottom: SPACING.lg },
  icon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.md,
  },
  title: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },
  body:  {
    fontSize: 14, color: COLORS.textSecondary, textAlign: "center",
    lineHeight: 20, marginTop: SPACING.sm,
  },
  retry: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 22, paddingVertical: 10, marginTop: SPACING.lg,
  },
  retryText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  banner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    marginBottom: SPACING.sm,
  },
  bannerText: { flex: 1, fontSize: 13, color: COLORS.danger, fontWeight: "600", lineHeight: 18 },
});
