// FrontEnd/screens/shared/EditProfileScreen.js
// Edit profile for both user and business roles. PUT /auth/me + optional avatar upload.
import React, { useState, useContext, useEffect, useRef } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Image,
} from "react-native";
import { Ionicons }     from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { AuthContext }  from "../../context/AuthContext";
import { api, API_URL } from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const USER_FIELDS = [
  { key: "name",          label: "Full Name",        keyboard: "default",       placeholder: "e.g. John Doe" },
  { key: "age",           label: "Age",              keyboard: "numeric",       placeholder: "e.g. 25", numeric: true },
  { key: "phone_number",  label: "Phone",            keyboard: "phone-pad",     placeholder: "+44 7700 900000" },
  { key: "location",      label: "Location",         keyboard: "default",       placeholder: "e.g. London" },
  { key: "work_type",     label: "Work Type",        keyboard: "default",       placeholder: "full-time / part-time / casual" },
  { key: "experience_level", label: "Experience",   keyboard: "default",       placeholder: "no-experience / some-experience / experienced" },
];

const BUSINESS_FIELDS = [
  { key: "business_name", label: "Business Name",   keyboard: "default",       placeholder: "e.g. Acme Co." },
  { key: "owner_name",    label: "Owner Name",      keyboard: "default",       placeholder: "e.g. Jane Smith" },
  { key: "street",        label: "Street Address",  keyboard: "default",       placeholder: "123 High Street" },
  { key: "city",          label: "City",            keyboard: "default",       placeholder: "London" },
  { key: "postcode",      label: "Postcode",        keyboard: "default",       placeholder: "EC1A 1BB" },
  { key: "description",   label: "About",           keyboard: "default",       placeholder: "What does your business do?", multiline: true },
];

export default function EditProfileScreen({ navigation }) {
  // Cancel the scheduled navigation if the screen unmounts first
  const navTimer = useRef(null);
  useEffect(() => () => clearTimeout(navTimer.current), []);

  const { role, user, setUser } = useContext(AuthContext);
  const fields = role === "user" ? USER_FIELDS : BUSINESS_FIELDS;

  const [form,    setForm]    = useState({});
  const [avatar,  setAvatar]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // Pre-fill from cached user
  useEffect(() => {
    if (!user) return;
    const initial = {};
    fields.forEach(({ key }) => {
      initial[key] = user[key] != null ? String(user[key]) : "";
    });
    setForm(initial);
  }, [user]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets?.length > 0) setAvatar(result.assets[0]);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    try {
      // 1. Update profile fields
      const payload = {};
      fields.forEach(({ key, numeric }) => {
        if (form[key] !== undefined && form[key] !== "") {
          payload[key] = numeric ? Number(form[key]) : form[key];
        }
      });

      const res  = await api.put("/auth/me", payload);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save profile");

      // 2. Upload avatar if changed
      if (avatar) {
        const fd = new FormData();
        fd.append("avatar", { uri: avatar.uri, type: "image/jpeg", name: "avatar.jpg" });
        await api.post("/auth/avatar", fd);
      }

      // 3. Refresh cached user via /auth/me
      const meRes  = await api.get("/auth/me");
      const meData = await meRes.json();
      if (meRes.ok) setUser(meData);

      setSuccess(true);
      navTimer.current = setTimeout(() => navigation.goBack(), 1000);
    } catch (err) {
      setMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = avatar?.uri
    ?? (user?.avatar_path ? `${API_URL}/${user.avatar_path.replace(/^\/+/, "")}` : null);

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

          <Text style={styles.title}>Edit Profile</Text>

          {/* Avatar picker */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name={role === "business" ? "business-outline" : "person-outline"} size={34} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={13} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>

          {/* Fields */}
          {fields.map(({ key, label, keyboard, placeholder, multiline }) => (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={[styles.input, multiline && styles.inputMultiline]}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                value={form[key] ?? ""}
                onChangeText={val => set(key, val)}
                keyboardType={keyboard}
                autoCapitalize={keyboard === "email-address" ? "none" : "sentences"}
                multiline={multiline}
                numberOfLines={multiline ? 3 : 1}
              />
            </View>
          ))}

          {/* Error / success */}
          {message ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
              <Text style={styles.successText}>Profile saved!</Text>
            </View>
          ) : null}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.submitText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner:     { padding: SPACING.lg, paddingBottom: 40 },

  back:     { flexDirection: "row", alignItems: "center", marginBottom: SPACING.md },
  backText: { color: COLORS.primary, fontWeight: "600", marginLeft: 2, fontSize: 15 },

  title: { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, marginBottom: SPACING.lg },

  avatarWrap: { alignSelf: "center", position: "relative", marginBottom: SPACING.sm },
  avatarImage:       { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: COLORS.primary + "30" },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORS.border, borderStyle: "dashed",
  },
  avatarBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORS.background,
  },
  avatarHint: { textAlign: "center", fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.lg },

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
  inputMultiline: { minHeight: 90, paddingTop: 13, textAlignVertical: "top" },

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

  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", ...SHADOWS.sm },
  submitBtnDisabled: { opacity: 0.7 },
  submitText:        { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
