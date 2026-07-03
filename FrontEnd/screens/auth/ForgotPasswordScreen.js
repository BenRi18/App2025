// FrontEnd/screens/auth/ForgotPasswordScreen.js
import React, { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function ForgotPasswordScreen({ route, navigation }) {
  const { role } = route.params || {};
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res  = await fetch(`${API_URL}/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setMessage(data.message ?? "Check your inbox for a reset link.");
      } else {
        setError(data.error ?? "Something went wrong.");
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

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="lock-open-outline" size={48} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter the email address linked to your account and we'll send you a reset link.
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.submitText}>Send Reset Link</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => navigation.navigate("Login", { role })}
          >
            <Ionicons name="arrow-back-outline" size={15} color={COLORS.primary} />
            <Text style={styles.backToLoginText}>Back to Login</Text>
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

  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", marginBottom: SPACING.lg, ...SHADOWS.sm },
  submitBtnDisabled: { opacity: 0.7 },
  submitText:        { color: "#FFF", fontWeight: "700", fontSize: 16 },

  backToLogin:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  backToLoginText: { color: COLORS.primary, fontWeight: "600", fontSize: 14 },
});
