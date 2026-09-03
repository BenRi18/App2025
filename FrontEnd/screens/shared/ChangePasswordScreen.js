// FrontEnd/screens/shared/ChangePasswordScreen.js
// Authenticated password change: PUT /auth/password
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function ChangePasswordScreen({ navigation }) {
  // Cancel the scheduled navigation if the screen unmounts first
  const navTimer = useRef(null);
  useEffect(() => () => clearTimeout(navTimer.current), []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [message,         setMessage]         = useState("");
  const [success,         setSuccess]         = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("New password must be at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      setMessage("New password must contain at least one letter.");
      return;
    }
    if (!/\d/.test(newPassword)) {
      setMessage("New password must contain at least one number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setMessage("New password must be different from your current password.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res  = await api.put("/auth/password", { currentPassword, newPassword });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        navTimer.current = setTimeout(() => navigation.goBack(), 1200);
      } else {
        setMessage(data.error ?? "Failed to change password.");
      }
    } catch {
      setMessage("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Enter your current password, then choose a new one.</Text>

          {/* Current password */}
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Your current password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
              <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* New password */}
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Min. 8 chars, 1 letter + 1 number"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
              <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Confirm new password */}
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Repeat new password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
              <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {message ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
              <Text style={styles.successText}>Password changed successfully!</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.submitText}>Save New Password</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner:     { padding: SPACING.lg, paddingBottom: 40 },

  back:     { flexDirection: "row", alignItems: "center", marginBottom: SPACING.lg },
  backText: { color: COLORS.primary, fontWeight: "600", marginLeft: 2, fontSize: 15 },

  iconWrap: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
    alignSelf:       "center",
    marginBottom:    SPACING.md,
  },
  title:    { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.xl, lineHeight: 20 },

  label: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor:   COLORS.card,
    borderWidth:       1.5,
    borderColor:       COLORS.border,
    borderRadius:      RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical:   13,
    fontSize:          15,
    color:             COLORS.textPrimary,
    marginBottom:      SPACING.md,
    ...SHADOWS.sm,
  },
  passwordWrap:  { position: "relative", marginBottom: 4 },
  passwordInput: { marginBottom: 0, paddingRight: 48 },
  eyeBtn:        { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },

  successBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.successLight, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  successText: { color: COLORS.success, fontSize: 13, flex: 1 },

  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", marginTop: SPACING.sm, ...SHADOWS.sm },
  submitBtnDisabled: { opacity: 0.7 },
  submitText:        { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
