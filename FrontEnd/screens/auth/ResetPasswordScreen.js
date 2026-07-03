// FrontEnd/screens/auth/ResetPasswordScreen.js
// Reached via the deep-link:  myapp://reset-password?token=XXX&email=YYY&role=ZZZ
// or via navigation.navigate("ResetPassword", { token, email, role })
import React, { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function ResetPasswordScreen({ route, navigation }) {
  const { token = "", email = "", role = "" } = route.params || {};

  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [message,         setMessage]         = useState("");
  const [error,           setError]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const [done,            setDone]            = useState(false);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_URL}/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, email, role, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setMessage(data.message ?? "Your password has been reset.");
      } else {
        setError(data.error ?? "Reset failed — the link may have expired.");
      }
    } catch {
      setError("Network error — is the server running?");
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
            <Ionicons name="key-outline" size={48} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Choose a strong new password for your account.</Text>

          {done ? (
            <>
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                <Text style={styles.successText}>{message}</Text>
              </View>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => navigation.navigate("Login", { role })}
              >
                <Text style={styles.submitText}>Go to Login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* New password */}
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
                  <Ionicons
                    name={showNew ? "eye-off-outline" : "eye-outline"}
                    size={20} color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm password */}
              <Text style={styles.label}>Confirm Password</Text>
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
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20} color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.submitText}>Reset Password</Text>}
              </TouchableOpacity>
            </>
          )}
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
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
    alignSelf:       "center",
    marginBottom:    SPACING.lg,
    marginTop:       SPACING.md,
  },

  title:    { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: SPACING.xl },

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
  eyeBtn: {
    position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center",
  },

  errorBox: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             6,
    backgroundColor: COLORS.dangerLight,
    borderRadius:    RADIUS.sm,
    padding:         SPACING.sm,
    marginBottom:    SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },

  successBox: {
    flexDirection:   "row",
    alignItems:      "flex-start",
    gap:             10,
    backgroundColor: COLORS.successLight,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.lg,
  },
  successText: { color: COLORS.success, fontSize: 14, flex: 1, lineHeight: 20 },

  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", marginBottom: SPACING.md, ...SHADOWS.sm },
  submitBtnDisabled: { opacity: 0.7 },
  submitText:        { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
