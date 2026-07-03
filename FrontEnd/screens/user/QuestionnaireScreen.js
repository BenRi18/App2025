// FrontEnd/screens/user/QuestionnaireScreen.js
// "Job Personality" quiz — one question per card, tap to answer, auto-advance.
// Answers are posted to /questionnaire; the backend computes a trait vector
// used to rank the swipe deck (see BackEnd/utils/traitMatch.js).
import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const API_URL = "http://localhost:3000";

// Friendly labels for the trait keys the backend returns
const TRAIT_LABELS = {
  energy:         "High energy",
  social:         "People person",
  teamwork:       "Team player",
  routine:        "Loves structure",
  responsibility: "Reliable",
  creativity:     "Creative",
  outdoors:       "Outdoor type",
  pressure:       "Calm under pressure",
};

export default function QuestionnaireScreen({ navigation }) {
  const { token } = useContext(AuthContext);

  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const [index,     setIndex]     = useState(0);      // current question
  const [answers,   setAnswers]   = useState({});     // { question_id: option_id }
  const [selected,  setSelected]  = useState(null);   // option flashed on tap
  const [submitting, setSubmitting] = useState(false);
  const [result,    setResult]    = useState(null);   // POST response → success view

  const fade  = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  // ── Load questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/questionnaire`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load questions");
        return res.json();
      })
      .then(data => { setQuestions(data.questions ?? []); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, [token]);

  // ── Card transition animation ───────────────────────────────────────────────
  const animateToNext = (nextIndex) => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slide, { toValue: -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setIndex(nextIndex);
      setSelected(null);
      slide.setValue(30);
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  };

  // ── Answer tap → record, flash, advance (or submit on last) ────────────────
  const handleAnswer = (optionId) => {
    if (selected) return;                       // ignore double-taps mid-flash
    const q = questions[index];
    const nextAnswers = { ...answers, [q.id]: optionId };
    setAnswers(nextAnswers);
    setSelected(optionId);

    setTimeout(() => {
      if (index + 1 < questions.length) {
        animateToNext(index + 1);
      } else {
        submit(nextAnswers);
      }
    }, 350);
  };

  const goBack = () => {
    if (index === 0) return navigation.goBack();
    animateToNext(index - 1);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async (finalAnswers) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/questionnaire`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save answers");
      setResult(data);
    } catch (err) {
      Alert.alert("Something went wrong", err.message, [
        { text: "Try again", onPress: () => submit(finalAnswers) },
        { text: "Cancel",    style: "cancel", onPress: () => setSubmitting(false) },
      ]);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (result) {
    const topTraits = Object.entries(result.traits ?? {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => TRAIT_LABELS[key] ?? key);

    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark" size={48} color={COLORS.success} />
        </View>
        <Text style={styles.successTitle}>You're all set!</Text>
        <Text style={styles.successSubtitle}>
          Your job matches are now personalized to who you are.
        </Text>

        {topTraits.length > 0 && (
          <View style={styles.traitRow}>
            {topTraits.map((label) => (
              <View key={label} style={styles.traitChip}>
                <Text style={styles.traitChipText}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Start swiping</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  if (submitting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.submittingText}>Building your job personality…</Text>
      </View>
    );
  }

  // ── Question card ───────────────────────────────────────────────────────────
  const q = questions[index];
  if (!q) return null;
  const progress = (index + 1) / questions.length;

  return (
    <View style={styles.container}>
      {/* Header: back + progress */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{index + 1}/{questions.length}</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateX: slide }] }}>
        <Text style={styles.questionText}>{q.text}</Text>

        <View style={styles.options}>
          {q.options.map((opt) => {
            const isSelected = selected === opt.id;
            const wasAnswered = answers[q.id] === opt.id && !selected;
            const active = isSelected || wasAnswered;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => handleAnswer(opt.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {opt.text}
                </Text>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <Text style={styles.footerHint}>
        There are no wrong answers — this helps us find jobs that fit you.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: {
    marginTop: SPACING.sm,
    color: COLORS.danger,
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
    minWidth: 36,
    textAlign: "right",
  },

  // Question
  questionText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 32,
    marginBottom: SPACING.xl,
  },
  options: {
    gap: SPACING.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  optionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  optionTextActive: {
    color: COLORS.primaryDark,
    fontWeight: "600",
  },
  footerHint: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: SPACING.sm,
  },

  // Submitting
  submittingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 15,
  },

  // Success
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  traitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  traitChip: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  traitChipText: {
    color: COLORS.primaryDark,
    fontWeight: "600",
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.md,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
