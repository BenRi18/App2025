// FrontEnd/screens/shared/ProfileScreen.js
// Shared profile screen for both "user" and "business" roles.
// Fetches /auth/me, displays role-appropriate fields, and wires the logout button.
import React, { useEffect, useState, useContext } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const API_URL = "http://localhost:3000";

export default function ProfileScreen() {
  const { token, role, logout } = useContext(AuthContext);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then(data => { setProfile(data); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, [token]);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const isUser      = role === "user";
  const displayName = isUser ? profile?.name : profile?.business_name;
  const initials    = displayName
    ? displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const fields = isUser
    ? [
        { icon: "person-outline",   label: "Full Name", value: profile?.name },
        { icon: "mail-outline",     label: "Email",     value: profile?.email },
        { icon: "calendar-outline", label: "Age",       value: profile?.age?.toString() },
        { icon: "call-outline",     label: "Phone",     value: profile?.phone_number },
      ]
    : [
        { icon: "business-outline", label: "Business",  value: profile?.business_name },
        { icon: "person-outline",   label: "Owner",     value: profile?.owner_name },
        { icon: "mail-outline",     label: "Email",     value: profile?.email },
        { icon: "location-outline", label: "Address",   value: profile?.street },
      ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Text style={styles.displayName}>{displayName}</Text>
      <View style={styles.rolePill}>
        <Text style={styles.roleText}>{isUser ? "Job Seeker" : "Business"}</Text>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        {fields.map(({ icon, label, value }, idx) => (
          <View
            key={label}
            style={[styles.row, idx < fields.length - 1 && styles.rowBorder]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
              <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <Text style={styles.rowValue}>{value || "—"}</Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FFF" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.danger, marginTop: SPACING.sm, fontSize: 14 },

  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SPACING.lg, alignItems: "center", paddingBottom: 40 },

  avatarCircle: {
    width:           88,
    height:          88,
    borderRadius:    44,
    backgroundColor: COLORS.primary,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    SPACING.md,
    ...SHADOWS.md,
  },
  avatarText:  { color: "#FFF", fontSize: 32, fontWeight: "800" },
  displayName: { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 6 },

  rolePill: {
    backgroundColor:   COLORS.primaryLight,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical:   5,
    marginBottom:      SPACING.xl,
  },
  roleText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    width:           "100%",
    marginBottom:    SPACING.lg,
    overflow:        "hidden",
    ...SHADOWS.md,
  },
  row: {
    flexDirection:     "row",
    justifyContent:    "space-between",
    alignItems:        "center",
    paddingVertical:   14,
    paddingHorizontal: SPACING.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLeft:   { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel:  { fontSize: 14, color: COLORS.textSecondary, fontWeight: "500" },
  rowValue:  {
    fontSize:   14,
    color:      COLORS.textPrimary,
    fontWeight: "600",
    maxWidth:   "55%",
    textAlign:  "right",
  },

  logoutButton: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    backgroundColor: COLORS.danger,
    borderRadius:    RADIUS.md,
    width:           "100%",
    paddingVertical: 14,
    ...SHADOWS.sm,
  },
  logoutText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
