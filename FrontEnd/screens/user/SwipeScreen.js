// FrontEnd/screens/user/SwipeScreen.js
import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View, StyleSheet, Text, ActivityIndicator,
  Alert, TouchableOpacity, Platform,
} from "react-native";
import Swiper from "react-native-deck-swiper";
import * as Location from "expo-location";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import JobCard from "../../components/JobCard";
import { AuthContext } from "../../context/AuthContext";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../theme";

const API_URL = "http://localhost:3000";

export default function SwipeScreen({ navigation }) {
  const [feed, setFeed]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [location, setLocation]       = useState({ latitude: null, longitude: null });
  const [cvUri, setCvUri]             = useState(null);
  const [showQuizBanner, setShowQuizBanner] = useState(false);
  const { token }                     = useContext(AuthContext);
  const swiperRef                     = useRef(null);
  const swipedIds                     = useRef(new Set());

  // ── 0. Show quiz banner if the user hasn't done the personality quiz ──────
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", checkQuiz) ?? (() => {});
    checkQuiz();
    return unsubscribe;

    function checkQuiz() {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(me => setShowQuizBanner(!me?.traits))
        .catch(() => {});
    }
  }, [token, navigation]);

  // ── 1. Request location permission and get initial position ──────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location access is needed to find nearby businesses.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  // ── 2. Fetch the job feed whenever location updates ───────────────────────
  useEffect(() => {
    if (!location.latitude || !location.longitude) return;
    fetch(
      `${API_URL}/jobs/feed?lat=${location.latitude}&lng=${location.longitude}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => res.json())
      .then(data => {
        const fresh = Array.isArray(data)
          ? data.filter(item => !swipedIds.current.has(item.job?.id))
          : [];
        setFeed(fresh);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [location, token]);

  // ── 3. Refresh location every 10 seconds ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── 4. Pick a CV PDF ─────────────────────────────────────────────────────
  const pickCV = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets?.length > 0) {
      setCvUri(result.assets[0].uri);
      Alert.alert("CV Selected", "Your CV is ready to send when you swipe right.");
    }
  };

  // ── 5. Handle card swipe (per job) ────────────────────────────────────────
  const handleSwipe = async (cardIndex, direction) => {
    const item = feed[cardIndex];
    if (!item?.job || !item?.business) return;
    swipedIds.current.add(item.job.id);

    if (direction === "right") {
      if (!cvUri) {
        Alert.alert("No CV uploaded", "Please select a CV before applying.");
        return;
      }
      const formData = new FormData();
      formData.append("businessId", item.business.id);
      formData.append("jobId", item.job.id);
      formData.append("cv", {
        uri: Platform.OS === "ios" ? cvUri.replace("file://", "") : cvUri,
        type: "application/pdf",
        name: "cv.pdf",
      });
      try {
        await fetch(`${API_URL}/swipes/right`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        });
        Alert.alert(
          "Applied! ✅",
          `Your CV was sent to ${item.business.business_name} for "${item.job.job_title}".`
        );
      } catch {
        Alert.alert("Error", "Failed to send CV. Please try again.");
      }
    } else {
      // Swipe left — record skip silently
      fetch(`${API_URL}/swipes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_id: item.business.id,
          job_id:      item.job.id,
          direction:   "left",
        }),
      }).catch(() => {});
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.center} />;
  }

  return (
    <View style={styles.container}>
      {/* Personality quiz banner */}
      {showQuizBanner && (
        <TouchableOpacity
          style={styles.quizBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("Questionnaire")}
        >
          <Ionicons name="sparkles" size={20} color={COLORS.primary} />
          <View style={styles.quizBannerTextWrap}>
            <Text style={styles.quizBannerTitle}>Get better matches</Text>
            <Text style={styles.quizBannerSub}>
              Take the 2-minute job personality quiz
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      {/* CV upload button */}
      <TouchableOpacity
        style={[styles.cvButton, cvUri && styles.cvButtonActive]}
        onPress={pickCV}
      >
        <Ionicons
          name={cvUri ? "checkmark-circle" : "cloud-upload-outline"}
          size={20}
          color={cvUri ? COLORS.success : COLORS.primary}
        />
        <Text style={[styles.cvButtonText, cvUri && styles.cvButtonTextActive]}>
          {cvUri ? "CV Loaded" : "Upload CV"}
        </Text>
      </TouchableOpacity>

      {/* Cards or empty state */}
      {feed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Jobs Nearby</Text>
          <Text style={styles.emptySub}>Check back later for new listings.</Text>
        </View>
      ) : (
        <Swiper
          ref={swiperRef}
          cards={feed}
          renderCard={card => <JobCard item={card} />}
          onSwipedLeft={i => handleSwipe(i, "left")}
          onSwipedRight={i => handleSwipe(i, "right")}
          cardIndex={0}
          backgroundColor="transparent"
          stackSize={3}
          verticalSwipe={false}
          overlayLabels={{
            left: {
              title: "SKIP",
              style: {
                label: { color: COLORS.danger, fontSize: 26, fontWeight: "800" },
                wrapper: {
                  flexDirection: "column",
                  alignItems: "flex-end",
                  justifyContent: "flex-start",
                  marginTop: 24,
                  marginLeft: -20,
                },
              },
            },
            right: {
              title: "APPLY",
              style: {
                label: { color: COLORS.success, fontSize: 26, fontWeight: "800" },
                wrapper: {
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  marginTop: 24,
                  marginLeft: 20,
                },
              },
            },
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  quizBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  quizBannerTextWrap: { flex: 1 },
  quizBannerTitle: {
    color: COLORS.primaryDark,
    fontWeight: "700",
    fontSize: 14,
  },
  quizBannerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  center:    { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: SPACING.md },

  cvButton: {
    flexDirection:   "row",
    alignItems:      "center",
    alignSelf:       "center",
    borderWidth:     1.5,
    borderColor:     COLORS.primary,
    borderRadius:    RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical:   SPACING.sm,
    gap:             6,
    marginBottom:    SPACING.md,
    backgroundColor: COLORS.card,
    ...SHADOWS.sm,
  },
  cvButtonActive:     { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  cvButtonText:       { color: COLORS.primary, fontWeight: "600", fontSize: 14 },
  cvButtonTextActive: { color: COLORS.success },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm },
});
