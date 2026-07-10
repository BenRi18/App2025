// FrontEnd/components/MatchModal.js
// Full-screen celebratory overlay shown when a new match arrives via socket.
// Payload shape (from backend new_match event):
//   { matchId, job: {id,title,type}|null, business: {id,name,avatar}, user: {id,name,avatar} }
import React, { useEffect, useRef } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Image, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../theme";

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function toUrl(path) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_URL}/${path.replace(/^\/+/, "")}`;
}

function Avatar({ name, avatar, style }) {
  const url = toUrl(avatar);
  return url ? (
    <Image source={{ uri: url }} style={[styles.avatar, style]} />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback, style]}>
      <Text style={styles.avatarText}>{initials(name)}</Text>
    </View>
  );
}

export default function MatchModal({ match, onMessage, onDismiss }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!match) return;
    scale.setValue(0.6);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [match, scale, fade]);

  if (!match) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
          <Text style={styles.title}>It's a Match! 🎉</Text>

          {/* Two avatars overlapping, heart between */}
          <View style={styles.avatarRow}>
            <Avatar name={match.user?.name}     avatar={match.user?.avatar} />
            <View style={styles.heartCircle}>
              <Ionicons name="heart" size={22} color="#FFF" />
            </View>
            <Avatar name={match.business?.name} avatar={match.business?.avatar} />
          </View>

          <Text style={styles.subtitle}>
            You and{" "}
            <Text style={styles.bold}>{match.business?.name ?? "a business"}</Text>
            {" "}liked each other
          </Text>

          {match.job?.title ? (
            <View style={styles.jobChip}>
              <Ionicons name="briefcase" size={13} color={COLORS.primary} />
              <Text style={styles.jobChipText}>{match.job.title}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={onMessage} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses" size={17} color="#FFF" />
            <Text style={styles.primaryBtnText}>Send a Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Keep Swiping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         SPACING.lg,
  },
  card: {
    width:           "100%",
    maxWidth:        360,
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.xl,
    alignItems:      "center",
    ...SHADOWS.md,
  },

  title: { fontSize: 26, fontWeight: "800", color: COLORS.primary, marginBottom: SPACING.lg },

  avatarRow: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.md },
  avatar: {
    width:        84,
    height:       84,
    borderRadius: 42,
    borderWidth:  3,
    borderColor:  COLORS.card,
    ...SHADOWS.md,
  },
  avatarFallback: {
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
  },
  avatarText: { color: COLORS.primary, fontSize: 28, fontWeight: "800" },
  heartCircle: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: COLORS.danger,
    alignItems:      "center",
    justifyContent:  "center",
    marginHorizontal: -12,
    zIndex:          1,
    borderWidth:     3,
    borderColor:     COLORS.card,
  },

  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.sm },
  bold:     { fontWeight: "700", color: COLORS.textPrimary },

  jobChip: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    backgroundColor:   COLORS.primaryLight,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical:   6,
    marginBottom:      SPACING.lg,
  },
  jobChipText: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },

  primaryBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    backgroundColor: COLORS.primary,
    borderRadius:    RADIUS.md,
    paddingVertical: 13,
    width:           "100%",
    marginBottom:    SPACING.sm,
  },
  primaryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  secondaryBtn:     { paddingVertical: 10 },
  secondaryBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "600" },
});
