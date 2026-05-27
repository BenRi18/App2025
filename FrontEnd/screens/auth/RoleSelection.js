// FrontEnd/screens/auth/RoleSelection.js
import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const ROLES = [
  {
    role:     "user",
    icon:     "person",
    title:    "Job Seeker",
    subtitle: "Browse local businesses and send your CV",
  },
  {
    role:     "business",
    icon:     "business",
    title:    "Business",
    subtitle: "Post your business and find candidates",
  },
];

export default function RoleSelection({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* App header */}
      <View style={styles.header}>
        <Text style={styles.appName}>JobSwipe</Text>
        <Text style={styles.tagline}>Find your perfect match</Text>
      </View>

      {/* Role cards */}
      <View style={styles.cards}>
        {ROLES.map(({ role, icon, title, subtitle }) => (
          <View key={role} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => navigation.navigate("Register", { role })}
              >
                <Text style={styles.btnPrimaryText}>Create Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => navigation.navigate("Login", { role })}
              >
                <Text style={styles.btnOutlineText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    alignItems:    "center",
    paddingTop:    56,
    paddingBottom: SPACING.xl,
  },
  appName: {
    fontSize:      38,
    fontWeight:    "900",
    color:         COLORS.primary,
    letterSpacing: -1,
  },
  tagline: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },

  cards: { flex: 1, padding: SPACING.lg, gap: SPACING.md },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.lg,
    padding:         SPACING.lg,
    ...SHADOWS.md,
  },
  iconWrap: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    SPACING.sm,
  },
  cardTitle:    { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },

  buttonRow: { flexDirection: "row", gap: SPACING.sm },
  btnPrimary: {
    flex:            1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius:    RADIUS.md,
    alignItems:      "center",
  },
  btnPrimaryText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  btnOutline: {
    flex:            1,
    borderWidth:     1.5,
    borderColor:     COLORS.primary,
    paddingVertical: 12,
    borderRadius:    RADIUS.md,
    alignItems:      "center",
  },
  btnOutlineText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
});
