// FrontEnd/screens/business/BusinessProfileScreen.js
// Business profile: company details, edit/change-password actions, logout.
import React, { useEffect, useContext } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView, Alert, Image,
} from "react-native";
import { Ionicons }    from "@expo/vector-icons";
import * as Location from "expo-location";
import { AuthContext } from "../../context/AuthContext";
import { api }         from "../../services/api";
import { getInitials, avatarUrl } from "../../utils/format";
import DeleteAccountModal from "../../components/DeleteAccountModal";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function BusinessProfileScreen({ navigation }) {
  const { user, setUser, logout, loading: authLoading } = useContext(AuthContext);
  const [pageLoading, setPageLoading] = React.useState(!user);
  const [error,       setError]       = React.useState(null);

  useEffect(() => {
    if (user) return;   // already cached
    api.get("/auth/me")
      .then(res => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then(data => { setUser(data); setPageLoading(false); })
      .catch(err  => { setError(err.message); setPageLoading(false); });
  }, []);

  const pinLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Location access is required to pin your premises.");
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({});
      let label = "";
      try {
        const places = await Location.reverseGeocodeAsync(pos.coords);
        const pl = places?.[0];
        if (pl) label = [pl.street, pl.city].filter(Boolean).join(", ");
      } catch {}
      const res = await api.put("/auth/me/location", {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label,
      });
      if (res.ok) {
        setUser({ ...user, location: { lat: pos.coords.latitude, lng: pos.coords.longitude, label } });
        Alert.alert("Location pinned", label
          ? `Your premises are pinned at ${label}. New job listings will use this automatically.`
          : "Your premises are pinned. New job listings will use this automatically.");
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Couldn't pin location", data.error ?? "Please try again.");
      }
    } catch {
      Alert.alert("Location error", "Couldn't read your position. Try again or check GPS.");
    }
  };

  const [showDelete, setShowDelete] = React.useState(false);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel",  style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  if (authLoading || pageLoading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.errorLogout} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#FFF" />
          <Text style={styles.errorLogoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = user?.business_name;
  const avatar      = avatarUrl(user?.avatar_path);

  const fields = [
    { icon: "business-outline",      label: "Business", value: user?.business_name },
    { icon: "person-outline",        label: "Owner",    value: user?.owner_name },
    { icon: "mail-outline",          label: "Email",    value: user?.email },
    { icon: "location-outline",      label: "Address",  value: [user?.street, user?.city, user?.postcode].filter(Boolean).join(", ") },
    { icon: "document-text-outline", label: "About",    value: user?.description },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={() => navigation.navigate("EditProfile")}
        activeOpacity={0.85}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </View>
        )}
        <View style={styles.avatarEdit}>
          <Ionicons name="camera" size={14} color="#FFF" />
        </View>
      </TouchableOpacity>

      <Text style={styles.displayName}>{displayName ?? "—"}</Text>
      <View style={styles.rolePill}>
        <Text style={styles.roleText}>Business</Text>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        {fields.filter(f => f.value).map(({ icon, label, value }, idx, arr) => (
          <View
            key={label}
            style={[styles.row, idx < arr.length - 1 && styles.rowBorder]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
              <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={pinLocation}>
          <Ionicons
            name={user?.location?.lat != null ? "location" : "locate-outline"}
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.actionBtnText}>
            {user?.location?.lat != null ? "Business Location — pinned" : "Pin Business Location"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionBtnText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("ChangePassword")}
        >
          <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionBtnText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FFF" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Permanent account deletion (required by the app stores) */}
      <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setShowDelete(true)}>
        <Text style={styles.deleteAccountText}>Delete my account</Text>
      </TouchableOpacity>

      <DeleteAccountModal
        visible={showDelete}
        onClose={() => setShowDelete(false)}
        role="business"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.danger, marginTop: SPACING.sm, fontSize: 14 },
  errorLogout: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.danger, borderRadius: RADIUS.md,
    paddingHorizontal: 24, paddingVertical: 11, marginTop: SPACING.lg,
  },
  errorLogoutText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SPACING.lg, alignItems: "center", paddingBottom: 40 },

  avatarWrap: { marginBottom: SPACING.md, position: "relative" },
  avatarImage: {
    width:        88,
    height:       88,
    borderRadius: 44,
    borderWidth:  3,
    borderColor:  COLORS.primary + "30",
  },
  avatarCircle: {
    width:           88,
    height:          88,
    borderRadius:    44,
    backgroundColor: COLORS.primary,
    alignItems:      "center",
    justifyContent:  "center",
    ...SHADOWS.md,
  },
  avatarText: { color: "#FFF", fontSize: 32, fontWeight: "800" },
  avatarEdit: {
    position:        "absolute",
    bottom:          0,
    right:           0,
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: COLORS.primary,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     2,
    borderColor:     COLORS.background,
  },

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
    paddingVertical:   13,
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

  actions: {
    width:           "100%",
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    marginBottom:    SPACING.lg,
    overflow:        "hidden",
    ...SHADOWS.sm,
  },
  actionBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               12,
    paddingVertical:   15,
    paddingHorizontal: SPACING.md,
  },
  actionBtnText: { fontSize: 15, color: COLORS.textPrimary, fontWeight: "500", flex: 1 },
  actionDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md + 18 + 12 },

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
  deleteAccountBtn:  { marginTop: SPACING.md, paddingVertical: 10 },
  deleteAccountText: { color: COLORS.danger, fontSize: 13.5, fontWeight: "600", textDecorationLine: "underline" },
});
