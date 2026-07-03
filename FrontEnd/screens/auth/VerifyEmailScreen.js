// FrontEnd/screens/auth/VerifyEmailScreen.js
// Shown after registration when email verification is required.
// Also reachable via deep-link: myapp://verify-email?token=XXX&email=YYY&role=ZZZ
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function VerifyEmailScreen({ route, navigation }) {
  const { email = "", role = "", token = "" } = route.params || {};

  const [status,   setStatus]   = useState("idle");   // idle | verifying | success | error
  const [message,  setMessage]  = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  // Auto-verify if a token was passed (deep-link)
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    setStatus("verifying");
    try {
      const qs  = new URLSearchParams({ token, email, role }).toString();
      const res = await fetch(`${API_URL}/auth/verify-email?${qs}`);
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message ?? "Email verified! You can now log in.");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Verification failed — the link may have expired.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — is the server running?");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendMsg("");
    try {
      const res  = await fetch(`${API_URL}/auth/resend-verification`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMsg("A new verification email has been sent.");
      } else {
        setResendMsg(data.error ?? "Could not resend — try again later.");
      }
    } catch {
      setResendMsg("Network error — is the server running?");
    } finally {
      setResending(false);
    }
  };

  // ── Verifying state ────────────────────────────────────────────────────────
  if (status === "verifying") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Verifying your email…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner}>
          <View style={[styles.iconWrap, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
          </View>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.subtitle}>{message}</Text>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => navigation.navigate("Login", { role })}
          >
            <Text style={styles.submitText}>Go to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.inner}>
          <View style={[styles.iconWrap, { backgroundColor: COLORS.dangerLight }]}>
            <Ionicons name="close-circle" size={56} color={COLORS.danger} />
          </View>
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.subtitle}>{message}</Text>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleResend}
            disabled={resending}
          >
            {resending
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.submitText}>Resend Verification Email</Text>}
          </TouchableOpacity>

          {resendMsg ? (
            <Text style={styles.resendMsg}>{resendMsg}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("Login", { role })}
          >
            <Text style={styles.secondaryText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Idle state — "check your inbox" ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-outline" size={56} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Check Your Inbox</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{"\n"}
          <Text style={styles.emailHighlight}>{email || "your email address"}</Text>
          {"\n\n"}
          Click the link in the email to verify your account. If you don't see it, check your spam folder.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.resendPrompt}>Didn't receive the email?</Text>

        <TouchableOpacity
          style={[styles.submitBtn, resending && styles.submitBtnDisabled]}
          onPress={handleResend}
          disabled={resending}
        >
          {resending
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.submitText}>Resend Email</Text>}
        </TouchableOpacity>

        {resendMsg ? (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} />
            <Text style={styles.infoText}>{resendMsg}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("Login", { role })}
        >
          <Text style={styles.secondaryText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner:     { padding: SPACING.lg, paddingBottom: 40, alignItems: "center" },

  centred: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: COLORS.textSecondary, fontSize: 15 },

  iconWrap: {
    width:           96,
    height:          96,
    borderRadius:    48,
    backgroundColor: COLORS.primaryLight,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    SPACING.lg,
    marginTop:       SPACING.xl,
  },

  title:          { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, textAlign: "center", marginBottom: 12 },
  subtitle:       { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: SPACING.xl },
  emailHighlight: { color: COLORS.primary, fontWeight: "700" },

  divider: { width: "100%", height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.lg },

  resendPrompt: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },

  submitBtn:         { width: "100%", backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", marginBottom: SPACING.md, ...SHADOWS.sm },
  submitBtnDisabled: { opacity: 0.7 },
  submitText:        { color: "#FFF", fontWeight: "700", fontSize: 16 },

  secondaryBtn:  { width: "100%", borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: "center" },
  secondaryText: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 15 },

  infoBox: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             6,
    backgroundColor: COLORS.primaryLight,
    borderRadius:    RADIUS.sm,
    padding:         SPACING.sm,
    marginBottom:    SPACING.md,
    width:           "100%",
  },
  infoText:  { color: COLORS.primary, fontSize: 13, flex: 1 },
  resendMsg: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.md, textAlign: "center" },
});
