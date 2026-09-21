// FrontEnd/screens/auth/RoleSelection.js — the first thing anyone sees.
//
// This is a job seeker's app. Businesses are necessary, but they are not the
// audience: seekers outnumber them heavily and decide whether the product
// lives. So the seeker path is the whole screen, and the business path is one
// quiet line at the bottom for people who came looking for it.
//
// The hero is a tilted stack of job cards in real backdrop colours — it says
// "swipe through jobs" before a single word is read.
import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated, Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPE } from "../../theme";

// Three cards from the backdrop library, back to front
const STACK = [
  { bg: "#2D4A2B", ink: "#FAF9F6", accent: "#7D8471", icon: "leaf",      title: "Terrace waiter",   meta: "Costa Teguise · part-time" },
  { bg: "#4A403A", ink: "#FDF6EC", accent: "#C1666B", icon: "flame",     title: "Line cook",        meta: "Puerto del Carmen · full-time" },
  { bg: "#1A2332", ink: "#F1FAEE", accent: "#2D8B8B", icon: "boat",      title: "Dive instructor",  meta: "Playa Blanca · seasonal" },
];

function HeroCard({ card, index, anim }) {
  const depth = STACK.length - 1 - index;   // 0 = front
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <Animated.View
      style={[
        styles.heroCard,
        {
          backgroundColor: card.bg,
          top:       depth * 14,
          left:      depth * 8,
          right:     depth * 8,
          zIndex:    index,
          opacity:   anim,
          transform: [{ translateY }, { rotate: `${(index - 1) * 2.5}deg` }],
        },
      ]}
    >
      <Ionicons
        name={card.icon}
        size={64}
        color={card.ink}
        style={styles.heroMotif}
      />
      <Text style={[styles.heroCardTitle, { color: card.ink }]} numberOfLines={1}>
        {card.title}
      </Text>
      <Text style={[styles.heroCardMeta, { color: card.ink }]} numberOfLines={1}>
        {card.meta}
      </Text>
      <View style={[styles.heroCardStrip, { backgroundColor: card.accent }]} />
    </Animated.View>
  );
}

export default function RoleSelection({ navigation }) {
  const anims = useRef(STACK.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      110,
      anims.map(a =>
        Animated.timing(a, {
          toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        })
      )
    ).start();
  }, [anims]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Hero — the deck itself */}
        <View style={styles.hero}>
          {STACK.map((card, i) => (
            <HeroCard key={card.title} card={card} index={i} anim={anims[i]} />
          ))}
        </View>

        {/* Identity */}
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Work that fits you</Text>
          <Text style={styles.appName}>JobSwipe</Text>
          <View style={styles.horizon}>
            <View style={styles.horizonDash} />
            <View style={styles.horizonLine} />
          </View>
          <Text style={styles.tagline}>
            Swipe through jobs near you, matched to your personality — not just your CV.
          </Text>
        </View>

        {/* Seeker path — the whole point of the app */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Register", { role: "user" })}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Find work</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("Login", { role: "user" })}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        {/* Business path — present, deliberately quiet */}
        <View style={styles.businessRow}>
          <View style={styles.divider} />
          <Text style={styles.businessLead}>Hiring?</Text>
          <View style={styles.businessLinks}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register", { role: "business" })}
              hitSlop={8}
            >
              <Text style={styles.businessLink}>Post a job</Text>
            </TouchableOpacity>
            <Text style={styles.businessSep}>·</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login", { role: "business" })}
              hitSlop={8}
            >
              <Text style={styles.businessLink}>Business log in</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },

  // ── Hero deck ─────────────────────────────────────────────────────────────
  hero: { height: 210, marginBottom: SPACING.xl, marginTop: SPACING.sm },
  heroCard: {
    position:     "absolute",
    height:       168,
    borderRadius: RADIUS.lg,
    padding:      SPACING.md,
    overflow:     "hidden",
    justifyContent: "flex-end",
    ...SHADOWS.md,
  },
  heroMotif: {
    position: "absolute",
    right:    -10,
    top:      -6,
    opacity:  0.14,
    transform: [{ rotate: "-14deg" }],
  },
  heroCardTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.4 },
  heroCardMeta:  { fontSize: 12.5, opacity: 0.75, marginTop: 3, marginBottom: 10 },
  heroCardStrip: { position: "absolute", left: 0, right: 0, bottom: 0, height: 10 },

  // ── Identity ──────────────────────────────────────────────────────────────
  copy:    { marginBottom: SPACING.xl },
  eyebrow: { ...TYPE.eyebrow },
  appName: {
    fontSize:      42,
    fontWeight:    "900",
    letterSpacing: -1.4,
    color:         COLORS.textPrimary,
    marginTop:     4,
  },
  horizon:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SPACING.sm, marginBottom: SPACING.md },
  horizonDash: { width: 30, height: 3.5, borderRadius: 2, backgroundColor: COLORS.accent },
  horizonLine: { width: 90, height: 1.5, borderRadius: 1, backgroundColor: COLORS.primaryLight },
  tagline: { fontSize: 15.5, color: COLORS.textSecondary, lineHeight: 23 },

  // ── Seeker actions ────────────────────────────────────────────────────────
  actions: { marginTop: "auto" },
  primaryBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    backgroundColor: COLORS.accent,
    borderRadius:   RADIUS.full,
    paddingVertical: 16,
    ...SHADOWS.md,
  },
  primaryBtnText: { color: "#FFF", fontSize: 16.5, fontWeight: "800", letterSpacing: -0.2 },
  secondaryBtn:   { paddingVertical: 14, alignItems: "center" },
  secondaryBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: "700" },

  // ── Business path ─────────────────────────────────────────────────────────
  businessRow: { alignItems: "center", paddingBottom: SPACING.lg },
  divider:     { height: 1, backgroundColor: COLORS.border, alignSelf: "stretch", marginBottom: SPACING.md },
  businessLead:  { fontSize: 12.5, color: COLORS.textMuted, fontWeight: "600" },
  businessLinks: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  businessLink:  { fontSize: 13.5, color: COLORS.textSecondary, fontWeight: "700", textDecorationLine: "underline" },
  businessSep:   { color: COLORS.textMuted, fontSize: 13 },
});