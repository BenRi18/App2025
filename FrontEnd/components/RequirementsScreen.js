// FrontEnd/components/RequirementsScreen.js
// Full-screen onboarding checklist shown instead of the main tabs until the
// account has all required information. Re-checks whenever the screen regains
// focus (i.e. when the user comes back from EditProfile or the quiz).
import React, { useState, useCallback, useContext } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import { missingRequirements, USER_REQUIREMENTS, BUSINESS_REQUIREMENTS } from "../utils/profileRequirements";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../theme";

export default function RequirementsScreen({ role, onComplete }) {
  const navigation = useNavigation();
  const { setUser } = useContext(AuthContext);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      if (!res.ok) return;
      const me = await res.json();
      setAccount(me);
      setUser?.(me);
      if (missingRequirements(me, role).length === 0) onComplete();
    } catch {
      // network hiccup — keep showing what we have
    } finally {
      setLoading(false);
    }
  }, [role, onComplete]);

  useFocusEffect(useCallback(() => { check(); }, [check]));

  if (loading && !account) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  const allReqs = role === "business" ? BUSINESS_REQUIREMENTS : USER_REQUIREMENTS;
  const missing = new Set(missingRequirements(account, role).map(r => r.key));
  const done    = allReqs.length - missing.size;
  const needsProfile = allReqs.some(r => missing.has(r.key) && r.action === "profile");
  const needsQuiz    = allReqs.some(r => missing.has(r.key) && r.action === "quiz");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconWrap}>
        <Ionicons name="clipboard-outline" size={30} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>Almost there!</Text>
      <Text style={styles.sub}>
        {role === "business"
          ? "Complete your business profile so candidates know who you are."
          : "Complete your profile so businesses can find and match with you."}
      </Text>

      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(done / allReqs.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{done} of {allReqs.length} complete</Text>
      </View>

      <View style={styles.card}>
        {allReqs.map((req, idx) => {
          const ok = !missing.has(req.key);
          return (
            <View key={req.key} style={[styles.row, idx < allReqs.length - 1 && styles.rowBorder]}>
              <Ionicons
                name={ok ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={ok ? COLORS.success : COLORS.textMuted}
              />
              <Text style={[styles.rowLabel, ok && styles.rowLabelDone]}>{req.label}</Text>
            </View>
          );
        })}
      </View>

      {needsProfile && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Ionicons name="create-outline" size={18} color="#FFF" />
          <Text style={styles.primaryBtnText}>Complete Profile</Text>
        </TouchableOpacity>
      )}
      {needsQuiz && (
        <TouchableOpacity
          style={[styles.primaryBtn, !needsProfile ? null : styles.secondaryBtn]}
          onPress={() => navigation.navigate("QuestionnaireModal")}
        >
          <Ionicons name="sparkles-outline" size={18} color={!needsProfile ? "#FFF" : COLORS.primary} />
          <Text style={[styles.primaryBtnText, needsProfile && { color: COLORS.primary }]}>
            Take the Personality Quiz
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SPACING.lg, alignItems: "center", paddingTop: 60, paddingBottom: 40 },

  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.md,
  },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sub:   {
    fontSize: 14.5, color: COLORS.textSecondary, textAlign: "center",
    lineHeight: 21, marginBottom: SPACING.lg, paddingHorizontal: SPACING.md,
  },

  progressWrap: { width: "100%", marginBottom: SPACING.lg },
  progressTrack: {
    height: 8, borderRadius: 4, backgroundColor: COLORS.border, overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  progressText: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 6, textAlign: "center" },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    width: "100%", marginBottom: SPACING.lg, overflow: "hidden", ...SHADOWS.sm,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: SPACING.md,
  },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel:     { fontSize: 15, color: COLORS.textPrimary, fontWeight: "500" },
  rowLabelDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    width: "100%", paddingVertical: 14, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  secondaryBtn: {
    backgroundColor: COLORS.primaryLight,
  },
  primaryBtnText: { color: "#FFF", fontSize: 15.5, fontWeight: "700" },
});
