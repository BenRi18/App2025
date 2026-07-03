// FrontEnd/screens/auth/LoginScreen.js
import React, { useState, useContext } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { API_URL }     from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

export default function LoginScreen({ route, navigation }) {
  const { role }                        = route.params || {};
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage]           = useState("");
  const [loading, setLoading]           = useState(false);
  const { login }                       = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setMessage("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res  = await fetch(`${API_URL}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
      });
      const data = await res.json();

      if (res.ok) {
        // data.token = access token (15 min), data.refreshToken = refresh token (30 days)
        await login(data.token, data.refreshToken, data.role);
      } else if (res.status === 403 && data.requiresVerification) {
        setMessage("Please verify your email before logging in. Check your inbox.");
      } else {
        setMessage(data.error ?? "Login failed");
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

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Logging in as a{" "}
            <Text style={styles.roleHighlight}>
              {role === "user" ? "Job Seeker" : "Business"}
            </Text>
          </Text>

          {/* Email */}
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

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20} color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => navigation.navigate("ForgotPassword", { role })}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Error message */}
          {message ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.submitText}>Log In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Register", { role })}>
            <Text style={styles.switchText}>
              Don't have an account?{" "}
              <Text style={styles.switchLink}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner:     { padding: SPACING.lg, paddingBottom: 40 },

  back:     { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xl },
  backText: { color: COLORS.primary, fontWeight: "600", marginLeft: 2, fontSize: 15 },

  title:         { fontSize: 28, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 6 },
  subtitle:      { fontSize: 15, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  roleHighlight: { color: COLORS.primary, fontWeight: "700" },

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

  forgotWrap: { alignSelf: "flex-end", marginBottom: SPACING.md },
  forgotText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

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

  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", marginBottom: SPACING.md, ...SHADOWS.sm },
  submitBtnDisabled: { opacity: 0.7 },
  submitText:        { color: "#FFF", fontWeight: "700", fontSize: 16 },

  switchText: { textAlign: "center", color: COLORS.textSecondary, fontSize: 14 },
  switchLink: { color: COLORS.primary, fontWeight: "700" },
});
