// FrontEnd/screens/user/UserProfileScreen.js
// Job-seeker profile: personal details, edit/change-password actions, logout.
import React, { useEffect, useContext } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView, Alert, Image,
} from "react-native";
import { Ionicons }    from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { api, API_URL } from "../../services/api";
import { getInitials, avatarUrl } from "../../utils/format";
import DeleteAccountModal from "../../components/DeleteAccountModal";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function UserProfileScreen({ navigation }) {
  const { user, setUser, logout, token, loading: authLoading } = useContext(AuthContext);
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

  const uploadCV = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    const formData = new FormData();
    formData.append("cv", {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      type: "application/pdf",
      name: "cv.pdf",
    });
    try {
      const res = await fetch(`${API_URL}/auth/me/cv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ ...user, cv_path: data.cv_path });
        Alert.alert("CV saved", "Your CV is stored and used for every application.");
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Upload failed", data.error ?? "Couldn't save your CV.");
      }
    } catch {
      Alert.alert("Network problem", "Couldn't reach the server.");
    }
  };

  const removeCV = async () => {
    try {
      const res = await api.delete("/auth/me/cv");
      if (res.ok) {
        setUser({ ...user, cv_path: null });
        Alert.alert("CV removed", "Add a new CV before your next application.");
      }
    } catch {
      Alert.alert("Network problem", "Couldn't reach the server.");
    }
  };

  const handleCV = () => {
    if (user?.cv_path) {
      Alert.alert("My CV", "You have a CV on file.", [
        { text: "Replace", onPress: uploadCV },
        { text: "Remove", style: "destructive", onPress: removeCV },
        { text: "Cancel", style: "cancel" },
      ]);
    } else {
      uploadCV();
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

  const displayName = user?.name;
  const avatar      = avatarUrl(user?.avatar_path);

  const fields = [
    { icon: "person-outline",      label: "Full Name",  value: user?.name },
    { icon: "mail-outline",        label: "Email",      value: user?.email },
    { icon: "calendar-outline",    label: "Age",        value: user?.age?.toString() },
    { icon: "call-outline",        label: "Phone",      value: user?.phone_number },
    { icon: "location-outline",    label: "Location",   value: user?.location },
    { icon: "briefcase-outline",   label: "Work Type",  value: user?.work_type },
    { icon: "trending-up-outline", label: "Experience", value: user?.experience_level },
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
        <Text style={styles.roleText}>Job Seeker</Text>
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

      {/* Personality profile */}
      <View style={styles.card}>
        <View style={styles.traitHeader}>
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
          <Text style={styles.traitTitle}>Your Personality Profile</Text>
        </View>
        {user?.traits && Object.keys(user.traits).length > 0 ? (
          Object.entries({
            energy:         "Energy",
            social:         "People person",
            teamwork:       "Team player",
            routine:        "Loves routine",
            responsibility: "Reliability",
            creativity:     "Creativity",
            outdoors:       "Outdoors",
            pressure:       "Cool under pressure",
          }).map(([key, label]) => (
            <View key={key} style={styles.traitRow}>
              <Text style={styles.traitLabel}>{label}</Text>
              <View style={styles.traitTrack}>
                <View style={[styles.traitFill, { width: `${Math.round((user.traits[key] ?? 0.5) * 100)}%` }]} />
              </View>
            </View>
          ))
        ) : (
          <TouchableOpacity
            style={styles.traitCta}
            onPress={() => navigation.navigate("Questionnaire")}
          >
            <Text style={styles.traitCtaText}>
              Take the 2-minute quiz to see your profile and get better matches
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionBtnText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity style={styles.actionBtn} onPress={handleCV}>
          <Ionicons
            name={user?.cv_path ? "document-text" : "document-attach-outline"}
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.actionBtnText}>
            {user?.cv_path ? "My CV — on file" : "Add My CV"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("Questionnaire")}
        >
          <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionBtnText}>Improve My Matches</Text>
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
        role="user"
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
  traitHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 13, paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  traitTitle: { fontSize: 14.5, fontWeight: "700", color: COLORS.textPrimary },
  traitRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: SPACING.md, gap: 10,
  },
  traitLabel: { fontSize: 13, color: COLORS.textSecondary, width: 130 },
  traitTrack: {
    flex: 1, height: 8, borderRadius: 4,
    backgroundColor: COLORS.border, overflow: "hidden",
  },
  traitFill:  { height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  traitCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: SPACING.md, gap: 8,
  },
  traitCtaText: { flex: 1, fontSize: 13.5, color: COLORS.primary, fontWeight: "600", lineHeight: 19 },

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
