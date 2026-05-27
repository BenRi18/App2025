// FrontEnd/screens/auth/RegisterScreen.js
//
// 3-step registration wizard — secure edition.
//
// Security additions vs. previous version:
//  ✓ Input sanitization  — HTML tags, script injection, control chars stripped on every keystroke
//  ✓ maxLength on every field — hard cap enforced at the TextInput level
//  ✓ Stricter field rules — name/city pattern, age 16–100, phone format, job_title min length
//  ✓ Password upgraded to min 8 chars + must contain ≥1 letter and ≥1 number
//  ✓ Password strength indicator (Weak / Fair / Good / Strong) shown in real time
//  ✓ Email auto-normalised (trimmed + lowercased) when field is blurred
//  ✓ Phone auto-filtered — non-phone characters stripped on every keystroke
//
// Features carried over:
//  ✓ Real-time per-field validation (red border + inline error on blur)
//  ✓ Confirm password field
//  ✓ Avatar / logo photo picker (expo-image-picker) — uploaded after registration
//  ✓ Fade animation between steps
//  ✓ Social sign-in buttons (Google / Apple) — UI ready, needs OAuth credentials
//  ✓ Terms & Privacy checkbox on the final step
//  ✓ "Use my location" auto-fill on business step 2 (expo-location reverse geocode)
//  ✓ Industry multi-select chips on user step 3
//
//  Job Seeker (role="user")           Business (role="business")
//  ────────────────────────           ───────────────────────────
//  Step 1 — Account                   Step 1 — Account
//    avatar · name · email              avatar · business_name · owner_name
//    password (+strength) · confirm     email · password (+strength) · confirm
//
//  Step 2 — About you                 Step 2 — Location
//    age · phone · location             street · city · postcode
//                                       description · ⌖ use my location
//
//  Step 3 — Work style                Step 3 — Job opening
//    work_type · experience             job_title · job_type
//    availability · travel              salary_range · job_description
//    industry (multi-select)            + Terms checkbox

import React, {
  useState, useContext, useRef, useCallback,
} from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Animated, Image,
} from "react-native";
import { Ionicons }     from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location    from "expo-location";
import { AuthContext }  from "../../context/AuthContext";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL     = "http://localhost:3000";
const TOTAL_STEPS = 3;

// RFC 5322–inspired regex — covers virtually all valid email addresses
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Patterns for structured fields
const NAME_REGEX     = /^[a-zA-Z\s'\-.]+$/;   // letters, spaces, hyphens, apostrophes, dots
const CITY_REGEX     = /^[a-zA-Z\s\-.]+$/;    // same but numbers excluded (city names)
const POSTCODE_REGEX = /^[a-zA-Z0-9\s-]+$/;   // alphanumeric + space + hyphen

// Fields that accept free text — HTML stripping is applied on every keystroke
const TEXT_FIELDS = new Set([
  "name", "business_name", "owner_name",
  "location", "street", "city", "postcode",
  "description", "job_title", "salary_range", "job_description",
]);

const INDUSTRIES = [
  { label: "Hospitality",  value: "hospitality"  },
  { label: "Retail",       value: "retail"       },
  { label: "Logistics",    value: "logistics"    },
  { label: "Healthcare",   value: "healthcare"   },
  { label: "Admin",        value: "admin"        },
  { label: "Construction", value: "construction" },
  { label: "Tech",         value: "tech"         },
  { label: "Education",    value: "education"    },
  { label: "Finance",      value: "finance"      },
  { label: "Security",     value: "security"     },
];

// ─── Input sanitization ───────────────────────────────────────────────────────
// Applied to every text field on change. Does NOT affect email or password.
// Keeps newlines for multiline fields but removes everything else dangerous.
function sanitize(text) {
  return text
    .replace(/<[^>]*>/g, "")            // strip HTML / XML tags: <script>, <img>, etc.
    .replace(/[<>]/g, "")               // remove stray angle brackets
    .replace(/javascript:/gi, "")       // neutralise javascript: URIs
    .replace(/on\w+\s*=/gi, "")         // strip inline event handlers: onclick= onerror=
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // strip control chars (keep \n \r \t)
}

// ─── Password strength ────────────────────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw || pw.length < 8) return { level: 0, label: "Too short", color: COLORS.danger };
  let score = 0;
  if (pw.length >= 10)           score++;   // longer = better
  if (/[a-z]/.test(pw))         score++;   // lowercase
  if (/[A-Z]/.test(pw))         score++;   // uppercase
  if (/\d/.test(pw))            score++;   // digit
  if (/[^a-zA-Z0-9]/.test(pw)) score++;   // special character

  if (score <= 1) return { level: 1, label: "Weak",   color: "#EF4444" };
  if (score === 2) return { level: 2, label: "Fair",   color: "#F59E0B" };
  if (score === 3) return { level: 3, label: "Good",   color: "#22C55E" };
  return              { level: 4, label: "Strong", color: "#16A34A" };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner:     { padding: SPACING.lg, paddingBottom: 56 },

  back:     { flexDirection: "row", alignItems: "center", marginBottom: SPACING.lg },
  backText: { color: COLORS.primary, fontWeight: "600", marginLeft: 2, fontSize: 15 },

  progressRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg },
  dot:         { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  dotActive:   { backgroundColor: COLORS.primary },

  stepLabel:     {
    fontSize: 11, fontWeight: "700", color: COLORS.textMuted,
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8,
  },
  title:         { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 4 },
  subtitle:      { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  roleHighlight: { color: COLORS.primary, fontWeight: "700" },

  label:          { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor:   COLORS.card,
    borderWidth:       1.5,
    borderColor:       COLORS.border,
    borderRadius:      RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical:   13,
    fontSize:          15,
    color:             COLORS.textPrimary,
    marginBottom:      4,
    ...SHADOWS.sm,
  },
  inputError:     { borderColor: COLORS.danger },
  inputMultiline: { minHeight: 90, paddingTop: 13, textAlignVertical: "top" },
  fieldError:     { color: COLORS.danger, fontSize: 12, marginBottom: SPACING.sm, marginLeft: 2 },
  fieldSpacer:    { marginBottom: SPACING.sm },

  passwordWrap:  { position: "relative", marginBottom: 4 },
  passwordInput: { marginBottom: 0, paddingRight: 48 },
  eyeBtn:        { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },

  // Password strength bar
  strengthWrap:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.sm, marginTop: 2 },
  strengthBars:  { flex: 1, flexDirection: "row", gap: 3 },
  strengthBar:   { flex: 1, height: 3, borderRadius: 2, backgroundColor: COLORS.border },
  strengthLabel: { fontSize: 11, fontWeight: "700", minWidth: 54, textAlign: "right" },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },

  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14,
    alignItems: "center", justifyContent: "center", flexDirection: "row",
    marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText:        { color: "#FFF", fontWeight: "700", fontSize: 16 },

  switchText: { textAlign: "center", color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  switchLink: { color: COLORS.primary, fontWeight: "700" },

  avatarWrap: {
    alignSelf: "center", width: 90, height: 90,
    marginBottom: SPACING.lg, position: "relative",
  },
  avatarImage:       { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  avatarHint: { textAlign: "center", fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.lg, marginTop: -SPACING.sm },
  avatarBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: COLORS.background,
  },

  socialRow:      { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  socialBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card, ...SHADOWS.sm,
  },
  socialBtnApple: { backgroundColor: "#000", borderColor: "#000" },
  socialBtnText:  { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },

  dividerRow:  { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },

  locationBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight, marginBottom: SPACING.md, alignSelf: "flex-start",
  },
  locationBtnText:    { color: COLORS.primary, fontWeight: "600", fontSize: 13 },
  locationBtnLoading: { opacity: 0.6 },

  termsRow: {
    flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm,
    marginBottom: SPACING.md, padding: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  termsText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  termsLink: { color: COLORS.primary, fontWeight: "600" },

  placeholderCard: {
    flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1.5,
    borderColor: COLORS.border, borderStyle: "dashed",
    marginBottom: SPACING.md,
  },
  placeholderText: { color: COLORS.textMuted, fontSize: 13, fontStyle: "italic", flex: 1, lineHeight: 20 },
});

const chipStyles = StyleSheet.create({
  row:            { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.md },
  chip:           { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText:       { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
});

// ─── Helper components ────────────────────────────────────────────────────────

/** Multi or single-select pill chip row. */
function ChipSelector({ label, options, value, onSelect, multi = false }) {
  const isActive = (v) =>
    multi ? (Array.isArray(value) && value.includes(v)) : value === v;

  const handlePress = (v) => {
    if (!multi) { onSelect(v); return; }
    const cur = Array.isArray(value) ? value : [];
    onSelect(cur.includes(v) ? cur.filter(i => i !== v) : [...cur, v]);
  };

  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={chipStyles.row}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[chipStyles.chip, isActive(opt.value) && chipStyles.chipActive]}
            onPress={() => handlePress(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[chipStyles.chipText, isActive(opt.value) && chipStyles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

/** Labelled text input with red-border + message error display. */
function Field({ label, multiline, error, onBlur, ...props }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, error && styles.inputError]}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        onBlur={onBlur}
        {...props}
      />
      {error
        ? <Text style={styles.fieldError}>{error}</Text>
        : <View style={styles.fieldSpacer} />}
    </>
  );
}

/** Password field with show/hide toggle, error display, and optional strength bar. */
function PasswordField({ label, showPassword, onToggle, error, strength, onBlur, ...props }) {
  const s = strength;
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordWrap}>
        <TextInput
          style={[styles.input, styles.passwordInput, error && styles.inputError]}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!showPassword}
          onBlur={onBlur}
          {...props}
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={onToggle}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Strength bar — only on the main password field, never on confirm */}
      {s && s.level > 0 && (
        <View style={styles.strengthWrap}>
          <View style={styles.strengthBars}>
            {[1, 2, 3, 4].map(n => (
              <View
                key={n}
                style={[styles.strengthBar, n <= s.level && { backgroundColor: s.color }]}
              />
            ))}
          </View>
          <Text style={[styles.strengthLabel, { color: s.color }]}>{s.label}</Text>
        </View>
      )}

      {error
        ? <Text style={styles.fieldError}>{error}</Text>
        : <View style={styles.fieldSpacer} />}
    </>
  );
}

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEP_META = {
  user: [
    { title: "Create account",  subtitle: "Start with your basic info" },
    { title: "About you",       subtitle: "A few personal details" },
    { title: "Your work style", subtitle: "What kind of role are you after?" },
  ],
  business: [
    { title: "Create account",  subtitle: "Account details" },
    { title: "Your location",   subtitle: "Where is your business?" },
    { title: "Job opening",     subtitle: "Tell candidates what you're hiring for" },
  ],
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegisterScreen({ route, navigation }) {
  const { role } = route.params || {};

  const [step, setStep]                       = useState(1);
  const [form, setForm]                       = useState({});
  const [touched, setTouched]                 = useState({});
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [avatar, setAvatar]                   = useState(null);
  const [agreedToTerms, setAgreedToTerms]     = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage]                 = useState("");

  const { login }  = useContext(AuthContext);
  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const scrollRef  = useRef(null);

  // ── Form helpers ────────────────────────────────────────────────────────────

  /** Write a value to form state. Sanitizes text fields automatically. */
  const set = (field, value) => {
    const v = (typeof value === "string" && TEXT_FIELDS.has(field))
      ? sanitize(value)
      : value;
    setForm(f => ({ ...f, [field]: v }));
  };

  /** Mark a field as touched (triggers error display). */
  const blur = (field) => setTouched(t => ({ ...t, [field]: true }));

  /** Normalise email: trim + lowercase. Called on blur. */
  const blurEmail = () => {
    blur("email");
    if (form.email) set("email", form.email.trim().toLowerCase());
  };

  /** Per-field validation — only returned after the field has been blurred. */
  const fieldError = useCallback((field) => {
    if (!touched[field]) return null;
    const v = form[field];
    switch (field) {
      case "name":
        if (!v?.trim())           return "Name is required";
        if (v.trim().length < 2)  return "Name must be at least 2 characters";
        if (v.length > 100)       return "Name must be under 100 characters";
        if (!NAME_REGEX.test(v))  return "Name can only contain letters, spaces, hyphens, apostrophes or dots";
        return null;

      case "business_name":
        if (!v?.trim())           return "Business name is required";
        if (v.trim().length < 2)  return "Business name must be at least 2 characters";
        if (v.length > 150)       return "Business name must be under 150 characters";
        return null;

      case "owner_name":
        if (!v?.trim())           return "Owner name is required";
        if (v.trim().length < 2)  return "Owner name must be at least 2 characters";
        if (v.length > 100)       return "Owner name must be under 100 characters";
        if (!NAME_REGEX.test(v))  return "Owner name can only contain letters, spaces, hyphens, apostrophes or dots";
        return null;

      case "email":
        if (!v?.trim())           return "Email is required";
        if (v.length > 255)       return "Email must be under 255 characters";
        if (!EMAIL_REGEX.test(v)) return "Enter a valid email address";
        return null;

      case "password":
        if (!v)                   return "Password is required";
        if (v.length < 8)         return "Password must be at least 8 characters";
        if (v.length > 128)       return "Password must be under 128 characters";
        if (!/[a-zA-Z]/.test(v)) return "Password must contain at least one letter";
        if (!/\d/.test(v))        return "Password must contain at least one number";
        return null;

      case "confirm_password":
        return v !== form.password ? "Passwords don't match" : null;

      case "age": {
        if (!v) return null;                            // optional
        const n = Number(v);
        if (!Number.isInteger(n) || v.includes("."))  return "Age must be a whole number";
        if (n < 16)                                    return "You must be at least 16 to register";
        if (n > 100)                                   return "Please enter a valid age";
        return null;
      }

      case "phone_number":
        if (!v) return null;                            // optional
        if (v.length < 7)  return "Phone number is too short";
        if (v.length > 20) return "Phone number is too long";
        return null;

      case "street":
        if (!v?.trim())  return "Street address is required";
        if (v.length > 255) return "Street must be under 255 characters";
        return null;

      case "city":
        if (!v?.trim())          return "City is required";
        if (v.trim().length < 2) return "City name is too short";
        if (v.length > 100)      return "City must be under 100 characters";
        if (!CITY_REGEX.test(v)) return "City can only contain letters, spaces, hyphens or dots";
        return null;

      case "postcode":
        if (!v) return null;                            // optional
        if (v.length > 20)          return "Postcode must be under 20 characters";
        if (!POSTCODE_REGEX.test(v)) return "Postcode can only contain letters, numbers, spaces or hyphens";
        return null;

      case "job_title":
        if (!v?.trim())           return "Job title is required";
        if (v.trim().length < 2)  return "Job title must be at least 2 characters";
        if (v.length > 150)       return "Job title must be under 150 characters";
        return null;

      default: return null;
    }
  }, [touched, form]);

  /** Step-level validation used by Continue and Create Account. */
  const validate = () => {
    if (role === "user") {
      if (step === 1) {
        if (!form.name?.trim())                             return "Name is required";
        if (form.name.trim().length < 2)                   return "Name must be at least 2 characters";
        if (!NAME_REGEX.test(form.name))                   return "Name contains invalid characters";
        if (!form.email?.trim())                           return "Email is required";
        if (!EMAIL_REGEX.test(form.email))                 return "Enter a valid email address";
        if (!form.password || form.password.length < 8)    return "Password must be at least 8 characters";
        if (!/[a-zA-Z]/.test(form.password))               return "Password must contain at least one letter";
        if (!/\d/.test(form.password))                     return "Password must contain at least one number";
        if (form.confirm_password !== form.password)       return "Passwords don't match";
      }
      if (step === 2 && form.age) {
        const n = Number(form.age);
        if (!Number.isInteger(n) || n < 16 || n > 100) return "Age must be a whole number between 16 and 100";
      }
    } else {
      if (step === 1) {
        if (!form.business_name?.trim())                   return "Business name is required";
        if (!form.owner_name?.trim())                      return "Owner name is required";
        if (!NAME_REGEX.test(form.owner_name))             return "Owner name contains invalid characters";
        if (!form.email?.trim())                           return "Email is required";
        if (!EMAIL_REGEX.test(form.email))                 return "Enter a valid email address";
        if (!form.password || form.password.length < 8)    return "Password must be at least 8 characters";
        if (!/[a-zA-Z]/.test(form.password))               return "Password must contain at least one letter";
        if (!/\d/.test(form.password))                     return "Password must contain at least one number";
        if (form.confirm_password !== form.password)       return "Passwords don't match";
      }
      if (step === 2) {
        if (!form.street?.trim()) return "Street address is required";
        if (!form.city?.trim())   return "City is required";
        if (form.city && !CITY_REGEX.test(form.city)) return "City contains invalid characters";
        if (form.postcode && !POSTCODE_REGEX.test(form.postcode)) return "Invalid postcode format";
      }
      if (step === 3 && !form.job_title?.trim()) return "Please enter a job title";
    }
    return null;
  };

  // ── Animations ───────────────────────────────────────────────────────────────

  const changeStep = useCallback((newStep) => {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 120, useNativeDriver: true,
    }).start(() => {
      setStep(newStep);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  // ── Action handlers ──────────────────────────────────────────────────────────

  const handleNext = () => {
    const err = validate();
    if (err) return setMessage(err);
    setMessage("");
    changeStep(step + 1);
  };

  const handleBack = () => {
    setMessage("");
    step > 1 ? changeStep(step - 1) : navigation.goBack();
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library in Settings.");
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

  const uploadAvatar = async (token) => {
    if (!avatar) return;
    try {
      const fd = new FormData();
      fd.append("avatar", { uri: avatar.uri, type: "image/jpeg", name: "avatar.jpg" });
      await fetch(`${API_URL}/auth/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
    } catch { /* Non-fatal — user can upload from profile later */ }
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Enable location access in Settings to use this feature.");
        return;
      }
      const pos   = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const codes = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      if (codes.length > 0) {
        const p = codes[0];
        const streetStr = [p.streetNumber, p.street].filter(Boolean).join(" ");
        if (streetStr)    set("street",   streetStr);
        if (p.city)       set("city",     p.city);
        if (p.postalCode) set("postcode", p.postalCode);
      }
    } catch {
      Alert.alert("Location error", "Could not retrieve your location. Please fill in the address manually.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleGoogleSignIn = () =>
    Alert.alert("Google Sign In", "To enable Google Sign In, add your Google OAuth client IDs in RegisterScreen.js and install expo-auth-session.");

  const handleAppleSignIn = () => {
    if (Platform.OS !== "ios")
      return Alert.alert("Apple Sign In", "Apple Sign In is only available on iOS devices.");
    Alert.alert("Apple Sign In", "Configure your Apple Developer credentials and install expo-apple-authentication to enable this.");
  };

  const handleRegister = async () => {
    const err = validate();
    if (err) return setMessage(err);
    if (!agreedToTerms) return setMessage("Please agree to the Terms of Service to continue");

    setLoading(true);
    setMessage("");
    try {
      const payload = { ...form, role };

      // Convert industries array → comma-separated string
      if (Array.isArray(payload.industries)) {
        payload.industry_preference = payload.industries.join(",");
        delete payload.industries;
      }

      // Never send confirm_password to the server
      delete payload.confirm_password;

      const res  = await fetch(`${API_URL}/auth/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        await uploadAvatar(data.token);
        login(data.token, data.role);
      } else {
        setMessage(data.error ?? data.errors?.[0]?.msg ?? "Registration failed");
      }
    } catch {
      setMessage("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared sub-renderers ─────────────────────────────────────────────────────

  const renderAvatarPicker = () => (
    <>
      <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
        {avatar
          ? <Image source={{ uri: avatar.uri }} style={styles.avatarImage} />
          : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons
                name={role === "business" ? "business-outline" : "person-outline"}
                size={34} color={COLORS.primary}
              />
            </View>
          )}
        <View style={styles.avatarBadge}>
          <Ionicons name="camera" size={13} color="#FFF" />
        </View>
      </TouchableOpacity>
      <Text style={styles.avatarHint}>
        {avatar ? "Tap to change photo" : `Add ${role === "business" ? "a logo" : "a profile photo"} (optional)`}
      </Text>
    </>
  );

  const renderSocialButtons = () => (
    <>
      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn} activeOpacity={0.8}>
          <Ionicons name="logo-google" size={19} color="#DB4437" />
          <Text style={styles.socialBtnText}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.socialBtn, styles.socialBtnApple]} onPress={handleAppleSignIn} activeOpacity={0.8}>
          <Ionicons name="logo-apple" size={19} color="#FFF" />
          <Text style={[styles.socialBtnText, { color: "#FFF" }]}>Apple</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with email</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  );

  // ── Step renderers ────────────────────────────────────────────────────────────

  const pwStrength = touched.password ? getPasswordStrength(form.password ?? "") : null;

  const renderUserStep1 = () => (
    <>
      {renderAvatarPicker()}
      {renderSocialButtons()}

      <Field
        label="Full Name *"
        placeholder="e.g. John Doe"
        maxLength={100}
        autoCorrect={false}
        value={form.name ?? ""}
        error={fieldError("name")}
        onBlur={() => blur("name")}
        onChangeText={t => set("name", t)}
      />
      <Field
        label="Email *"
        placeholder="you@example.com"
        maxLength={255}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.email ?? ""}
        error={fieldError("email")}
        onBlur={blurEmail}
        onChangeText={t => set("email", t)}
      />
      <PasswordField
        label="Password *"
        placeholder="Min. 8 characters"
        maxLength={128}
        showPassword={showPassword}
        onToggle={() => setShowPassword(v => !v)}
        strength={pwStrength}
        value={form.password ?? ""}
        error={fieldError("password")}
        onBlur={() => blur("password")}
        onChangeText={t => set("password", t)}
      />
      <PasswordField
        label="Confirm Password *"
        placeholder="Repeat your password"
        maxLength={128}
        showPassword={showConfirm}
        onToggle={() => setShowConfirm(v => !v)}
        value={form.confirm_password ?? ""}
        error={fieldError("confirm_password")}
        onBlur={() => blur("confirm_password")}
        onChangeText={t => set("confirm_password", t)}
      />
    </>
  );

  const renderUserStep2 = () => (
    <>
      <Field
        label="Age"
        placeholder="e.g. 25"
        maxLength={3}
        keyboardType="numeric"
        value={form.age ?? ""}
        error={fieldError("age")}
        onBlur={() => blur("age")}
        onChangeText={t => set("age", t.replace(/[^\d]/g, ""))}
      />
      <Field
        label="Phone Number"
        placeholder="+44 7700 900000"
        maxLength={20}
        keyboardType="phone-pad"
        value={form.phone_number ?? ""}
        error={fieldError("phone_number")}
        onBlur={() => blur("phone_number")}
        // Strip anything that isn't a valid phone character
        onChangeText={t => set("phone_number", t.replace(/[^\d\s\+\-\(\)\.]/g, ""))}
      />
      <Field
        label="Where are you based?"
        placeholder="e.g. London, Manchester"
        maxLength={150}
        value={form.location ?? ""}
        onChangeText={t => set("location", t)}
      />
    </>
  );

  const renderUserStep3 = () => (
    <>
      <ChipSelector
        label="What type of work are you looking for?"
        options={[
          { label: "Full-time", value: "full-time" },
          { label: "Part-time", value: "part-time" },
          { label: "Casual",    value: "casual" },
          { label: "Any",       value: "any" },
        ]}
        value={form.work_type}
        onSelect={v => set("work_type", v)}
      />
      <ChipSelector
        label="What's your experience level?"
        options={[
          { label: "No experience",   value: "no-experience" },
          { label: "Some experience", value: "some-experience" },
          { label: "Experienced",     value: "experienced" },
          { label: "Expert",          value: "expert" },
        ]}
        value={form.experience_level}
        onSelect={v => set("experience_level", v)}
      />
      <ChipSelector
        label="When can you start?"
        options={[
          { label: "Immediately",    value: "immediately" },
          { label: "Within a week",  value: "within-a-week" },
          { label: "Within a month", value: "within-a-month" },
          { label: "Not sure",       value: "not-sure" },
        ]}
        value={form.availability}
        onSelect={v => set("availability", v)}
      />
      <ChipSelector
        label="How far will you travel?"
        options={[
          { label: "5 km",         value: "5km" },
          { label: "10 km",        value: "10km" },
          { label: "25 km",        value: "25km" },
          { label: "Any distance", value: "any" },
        ]}
        value={form.travel_distance}
        onSelect={v => set("travel_distance", v)}
      />
      <ChipSelector
        label="Preferred industries (select all that apply)"
        options={INDUSTRIES}
        value={form.industries ?? []}
        onSelect={v => set("industries", v)}
        multi
      />
      <View style={styles.placeholderCard}>
        <Ionicons name="construct-outline" size={18} color={COLORS.textMuted} style={{ marginTop: 1 }} />
        <Text style={styles.placeholderText}>
          More personalisation questions coming soon — work environment, shift preferences, languages, and more.
        </Text>
      </View>
    </>
  );

  const renderBusinessStep1 = () => (
    <>
      {renderAvatarPicker()}
      {renderSocialButtons()}

      <Field
        label="Business Name *"
        placeholder="e.g. Acme Coffee Co."
        maxLength={150}
        autoCorrect={false}
        value={form.business_name ?? ""}
        error={fieldError("business_name")}
        onBlur={() => blur("business_name")}
        onChangeText={t => set("business_name", t)}
      />
      <Field
        label="Owner / Contact Name *"
        placeholder="e.g. Jane Smith"
        maxLength={100}
        autoCorrect={false}
        value={form.owner_name ?? ""}
        error={fieldError("owner_name")}
        onBlur={() => blur("owner_name")}
        onChangeText={t => set("owner_name", t)}
      />
      <Field
        label="Email *"
        placeholder="hello@acmecoffee.com"
        maxLength={255}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.email ?? ""}
        error={fieldError("email")}
        onBlur={blurEmail}
        onChangeText={t => set("email", t)}
      />
      <PasswordField
        label="Password *"
        placeholder="Min. 8 characters"
        maxLength={128}
        showPassword={showPassword}
        onToggle={() => setShowPassword(v => !v)}
        strength={pwStrength}
        value={form.password ?? ""}
        error={fieldError("password")}
        onBlur={() => blur("password")}
        onChangeText={t => set("password", t)}
      />
      <PasswordField
        label="Confirm Password *"
        placeholder="Repeat your password"
        maxLength={128}
        showPassword={showConfirm}
        onToggle={() => setShowConfirm(v => !v)}
        value={form.confirm_password ?? ""}
        error={fieldError("confirm_password")}
        onBlur={() => blur("confirm_password")}
        onChangeText={t => set("confirm_password", t)}
      />
    </>
  );

  const renderBusinessStep2 = () => (
    <>
      <Field
        label="Street Address *"
        placeholder="e.g. 123 High Street"
        maxLength={255}
        value={form.street ?? ""}
        error={fieldError("street")}
        onBlur={() => blur("street")}
        onChangeText={t => set("street", t)}
      />
      <Field
        label="City *"
        placeholder="e.g. London"
        maxLength={100}
        autoCorrect={false}
        value={form.city ?? ""}
        error={fieldError("city")}
        onBlur={() => blur("city")}
        onChangeText={t => set("city", t)}
      />
      <Field
        label="Postcode / ZIP"
        placeholder="e.g. EC1A 1BB"
        maxLength={20}
        autoCapitalize="characters"
        autoCorrect={false}
        value={form.postcode ?? ""}
        error={fieldError("postcode")}
        onBlur={() => blur("postcode")}
        onChangeText={t => set("postcode", t.replace(/[^a-zA-Z0-9\s\-]/g, ""))}
      />
      <TouchableOpacity
        style={[styles.locationBtn, locationLoading && styles.locationBtnLoading]}
        onPress={handleGetLocation}
        disabled={locationLoading}
        activeOpacity={0.8}
      >
        {locationLoading
          ? <ActivityIndicator size="small" color={COLORS.primary} />
          : <Ionicons name="locate-outline" size={16} color={COLORS.primary} />}
        <Text style={styles.locationBtnText}>
          {locationLoading ? "Getting location…" : "Use my current location"}
        </Text>
      </TouchableOpacity>
      <Field
        label="Business Description"
        placeholder="Tell candidates what your business does and what makes it a great place to work…"
        maxLength={500}
        multiline
        numberOfLines={3}
        value={form.description ?? ""}
        onChangeText={t => set("description", t)}
      />
    </>
  );

  const renderBusinessStep3 = () => (
    <>
      <Field
        label="Job Title *"
        placeholder="e.g. Barista, Sales Assistant, Delivery Driver"
        maxLength={150}
        value={form.job_title ?? ""}
        error={fieldError("job_title")}
        onBlur={() => blur("job_title")}
        onChangeText={t => set("job_title", t)}
      />
      <ChipSelector
        label="Job Type"
        options={[
          { label: "Full-time", value: "full-time" },
          { label: "Part-time", value: "part-time" },
          { label: "Casual",    value: "casual" },
        ]}
        value={form.job_type}
        onSelect={v => set("job_type", v)}
      />
      <Field
        label="Pay / Salary"
        placeholder="e.g. £12/hr  ·  £25,000–£30,000/yr"
        maxLength={100}
        value={form.salary_range ?? ""}
        onChangeText={t => set("salary_range", t)}
      />
      <Field
        label="Job Description"
        placeholder="Describe the role, key responsibilities, and what you're looking for in a candidate…"
        maxLength={1000}
        multiline
        numberOfLines={4}
        value={form.job_description ?? ""}
        onChangeText={t => set("job_description", t)}
      />
    </>
  );

  const renderStep = () => {
    if (role === "user") {
      if (step === 1) return renderUserStep1();
      if (step === 2) return renderUserStep2();
      if (step === 3) return renderUserStep3();
    } else {
      if (step === 1) return renderBusinessStep1();
      if (step === 2) return renderBusinessStep2();
      if (step === 3) return renderBusinessStep3();
    }
    return null;
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const meta           = STEP_META[role] ?? STEP_META.user;
  const isLastStep     = step === TOTAL_STEPS;
  const submitDisabled = loading || (isLastStep && !agreedToTerms);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.back} onPress={handleBack}>
            <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.progressRow}>
            {[1, 2, 3].map(n => (
              <View key={n} style={[styles.dot, step >= n && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
          <Text style={styles.title}>{meta[step - 1].title}</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? (
              <>
                {meta[0].subtitle}{" — "}
                <Text style={styles.roleHighlight}>
                  {role === "user" ? "Job Seeker" : "Business"}
                </Text>
              </>
            ) : meta[step - 1].subtitle}
          </Text>

          <Animated.View style={{ opacity: fadeAnim }}>
            {renderStep()}
          </Animated.View>

          {/* Terms & Privacy — last step only */}
          {isLastStep && (
            <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedToTerms(v => !v)} activeOpacity={0.8}>
              <Ionicons
                name={agreedToTerms ? "checkbox" : "square-outline"}
                size={22}
                color={agreedToTerms ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text style={styles.termsLink} onPress={() => Alert.alert("Terms of Service", "Full terms will be published at launch.")}>
                  Terms of Service
                </Text>
                {" "}and{" "}
                <Text style={styles.termsLink} onPress={() => Alert.alert("Privacy Policy", "Full privacy policy will be published at launch.")}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
          )}

          {message ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : null}

          {!isLastStep ? (
            <TouchableOpacity style={styles.submitBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.submitText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, submitDisabled && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={submitDisabled}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitText}>Create Account</Text>}
            </TouchableOpacity>
          )}

          {step === 1 && (
            <TouchableOpacity onPress={() => navigation.navigate("Login", { role })}>
              <Text style={styles.switchText}>
                Already have an account?{" "}
                <Text style={styles.switchLink}>Log In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
