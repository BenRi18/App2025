// FrontEnd/components/DeleteAccountModal.js
// Password-confirmed permanent account deletion. Required by the app stores
// for any app that lets users create an account. Used by both profile screens.
import React, { useState, useContext } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../theme";

export default function DeleteAccountModal({ visible, onClose, role }) {
  const { logout } = useContext(AuthContext);
  const [password, setPassword] = useState("");
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState(null);

  const close = () => {
    setPassword("");
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res  = await api.delete("/auth/me", { password });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Deletion failed. Please try again.");
        setBusy(false);
        return;
      }
      await logout();   // account is gone — clear the session
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  const losses = role === "business"
    ? "your job listings, applicants, matches and messages"
    : "your applications, matches, messages and CV";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning" size={26} color={COLORS.danger} />
          </View>

          <Text style={styles.title}>Delete Account</Text>
          <Text style={styles.body}>
            This permanently deletes your account and {losses}. It cannot be undone.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            editable={!busy}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.deleteBtn, busy && { opacity: 0.6 }]}
            onPress={handleDelete}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.deleteBtnText}>Delete my account permanently</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={close} disabled={busy}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(23, 40, 42, 0.6)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: "center",
    ...SHADOWS.lg,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.md,
  },
  title: { fontSize: 20, fontWeight: "900", letterSpacing: -0.3, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  body:  { fontSize: 13.5, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: SPACING.md },
  input: {
    width: "100%",
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 11,
    fontSize: 15, color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  error: { color: COLORS.danger, fontSize: 13, marginBottom: SPACING.sm, textAlign: "center" },
  deleteBtn: {
    width: "100%", backgroundColor: COLORS.danger, borderRadius: RADIUS.sm,
    paddingVertical: 13, alignItems: "center", marginTop: SPACING.xs,
  },
  deleteBtnText: { color: "#FFF", fontSize: 14.5, fontWeight: "700" },
  cancelBtn:     { paddingVertical: 12, marginTop: 2 },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 14.5, fontWeight: "600" },
});
