// FrontEnd/screens/user/SwipeScreen.js — the job seeker's home.
// Atlantic Light: personal greeting, horizon rule, toolbar (job count + CV),
// the deck, and tap actions. Applications report honestly — a failed apply
// says so and puts the job back in future feeds.
import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import {
  View, StyleSheet, Text, ActivityIndicator,
  Alert, TouchableOpacity, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-deck-swiper";
import * as Location from "expo-location";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import JobCard from "../../components/JobCard";
import { AuthContext } from "../../context/AuthContext";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPE } from "../../theme";
import { API_URL } from "../../config";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 19) return "Good afternoon";
  return "Good evening";
}

export default function SwipeScreen({ navigation }) {
  const [feed, setFeed]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [location, setLocation]       = useState({ latitude: null, longitude: null });
  const [hasCV, setHasCV]             = useState(false);
  const [showQuizBanner, setShowQuizBanner] = useState(false);
  const [firstName, setFirstName]     = useState(null);
  const [deckH, setDeckH]             = useState(0);
  const [topIndex, setTopIndex]       = useState(0);
  const [savedIds, setSavedIds]       = useState(new Set());
  const { token, user }               = useContext(AuthContext);
  const swiperRef                     = useRef(null);
  const swipedIds                     = useRef(new Set());
  const aliveRef                      = useRef(true);

  // Guard every async setState — the deck fetches on an interval and on focus,
  // so a reply can land after the screen is gone.
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // ── 0. Quiz banner + greeting name ────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", checkMe) ?? (() => {});
    checkMe();
    return unsubscribe;

    function checkMe() {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(me => {
          setShowQuizBanner(!me?.traits);
          setHasCV(!!me?.cv_path);
          if (me?.name) setFirstName(me.name.split(" ")[0]);
        })
        .catch(() => {});
    }
  }, [token, navigation]);

  // ── 1. Location permission + initial position ─────────────────────────────
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

  // ── 2. Fetch the job feed ─────────────────────────────────────────────────
  const fetchFeed = useCallback(() => {
    if (!location.latitude || !location.longitude) return;
    if (!aliveRef.current) return;
    fetch(
      `${API_URL}/jobs/feed?lat=${location.latitude}&lng=${location.longitude}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => res.json())
      .then(data => {
        if (!aliveRef.current) return;
        const fresh = Array.isArray(data)
          ? data.filter(item => !swipedIds.current.has(item.job?.id))
          : [];
        setFeed(fresh);
        setTopIndex(0);          // a new deck starts at the top card again
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [location, token]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // ── 3. Refresh location every 60 seconds (10s was battery-hungry) ─────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        if (!aliveRef.current) return;
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {}
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── 4. Pick a CV PDF and store it on the profile (once, forever) ─────────
  const pickCV = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (result.canceled || !result.assets?.length) return;

    const uri = result.assets[0].uri;
    const formData = new FormData();
    formData.append("cv", {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      type: "application/pdf",
      name: "cv.pdf",
    });
    try {
      const res = await fetch(`${API_URL}/auth/me/cv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });
      if (res.ok) {
        setHasCV(true);
        Alert.alert("CV saved", "Your CV is stored on your profile and will be used for every application. You can replace or remove it anytime from your Profile.");
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Upload failed", data.error ?? "Couldn't save your CV. Please try again.");
      }
    } catch {
      Alert.alert("Network problem", "Couldn't reach the server to save your CV.");
    }
  };

  // ── Save the top card to the shortlist ────────────────────────────────────
  const saveTop = async () => {
    const item = feed[topIndex];
    if (!item?.job) return;
    try {
      const res = await fetch(`${API_URL}/jobs/${item.job.id}/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedIds(prev => new Set(prev).add(item.job.id));
      } else {
        Alert.alert("Couldn't save", "Try again in a moment.");
      }
    } catch {
      Alert.alert("Network problem", "Couldn't reach the server.");
    }
  };

  // ── Steer the feed: fewer of this kind, or hide the business ──────────────
  const steerFeed = () => {
    const item = feed[topIndex];
    if (!item?.job || !item?.business) return;

    Alert.alert("Show me less like this", "What would you like to change?", [
      {
        text: `Fewer ${item.job.job_type ?? "jobs"} like this`,
        onPress: async () => {
          if (!item.job.archetype) return;
          await fetch(`${API_URL}/jobs/feed/mute-archetype`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ archetype: item.job.archetype }),
          }).catch(() => {});
          swiperRef.current?.swipeLeft();
        },
      },
      {
        text: `Hide ${item.business.business_name}`,
        onPress: async () => {
          await fetch(`${API_URL}/jobs/feed/hide-business`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ businessId: item.business.id }),
          }).catch(() => {});
          setFeed(f => f.filter(x => x.business?.id !== item.business.id));
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ── 5. Handle card swipe — honest about failures ──────────────────────────
  const handleSwipe = async (cardIndex, direction) => {
    const item = feed[cardIndex];
    if (!item?.job || !item?.business) return;
    swipedIds.current.add(item.job.id);

    if (direction === "right") {
      if (!hasCV) {
        swipedIds.current.delete(item.job.id);
        Alert.alert("No CV on file", "Tap the CV chip at the top to add your CV — you only need to do it once.");
        return;
      }
      // The CV is stored on the profile — no file upload per application
      const formData = new FormData();
      formData.append("businessId", item.business.id);
      formData.append("jobId", item.job.id);
      try {
        const res = await fetch(`${API_URL}/swipes/right`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        });
        if (res.ok) {
          Alert.alert(
            "Applied! 🎉",
            `Your CV was sent to ${item.business.business_name} for "${item.job.job_title}".`
          );
        } else {
          const data = await res.json().catch(() => ({}));
          swipedIds.current.delete(item.job.id);
          Alert.alert(
            "Application not sent",
            data.error ?? "Something went wrong — this job will reappear next time your deck refreshes."
          );
        }
      } catch {
        swipedIds.current.delete(item.job.id);
        Alert.alert("Network problem", "Couldn't reach the server — this job will reappear next time your deck refreshes.");
      }
    } else {
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
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding jobs near you…</Text>
      </SafeAreaView>
    );
  }

  const name = firstName ?? user?.name?.split(" ")[0];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      {/* Dashboard header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          {greeting()}{name ? ` · ${name}` : ""}
        </Text>
        <Text style={styles.title}>Find your next job.</Text>
        <View style={styles.horizon}>
          <View style={styles.horizonDash} />
          <View style={styles.horizonLine} />
        </View>
      </View>

      {/* Toolbar: jobs count + CV chip */}
      <View style={styles.toolbar}>
        <View style={styles.countPill}>
          <Ionicons name="location" size={13} color={COLORS.primary} />
          <Text style={styles.countText}>
            {feed.length} job{feed.length !== 1 ? "s" : ""} near you
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cvChip, hasCV && styles.cvChipActive]}
          onPress={hasCV ? undefined : pickCV}
          activeOpacity={hasCV ? 1 : 0.8}
        >
          <Ionicons
            name={hasCV ? "checkmark-circle" : "document-attach-outline"}
            size={15}
            color={hasCV ? COLORS.success : COLORS.primary}
          />
          <Text style={[styles.cvChipText, hasCV && { color: COLORS.success }]}>
            {hasCV ? "CV on file" : "Add CV"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Personality quiz banner */}
      {showQuizBanner && (
        <TouchableOpacity
          style={styles.quizBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("Questionnaire")}
        >
          <Ionicons name="sparkles" size={18} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.quizBannerTitle}>Get better matches</Text>
            <Text style={styles.quizBannerSub}>Take the 2-minute personality quiz</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.accent} />
        </TouchableOpacity>
      )}

      {/* Deck or empty state */}
      {feed.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="sunny-outline" size={42} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptySub}>
            No new jobs right now — new listings appear here as businesses post them.
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => { setLoading(true); fetchFeed(); }}>
            <Ionicons name="refresh" size={16} color="#FFF" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View
            style={styles.deckWrap}
            onLayout={e => setDeckH(e.nativeEvent.layout.height)}
          >
            {deckH > 0 && (
            <Swiper
              ref={swiperRef}
              cards={feed}
              renderCard={card => <JobCard item={card} />}
              onSwipedLeft={i => handleSwipe(i, "left")}
              onSwipedRight={i => handleSwipe(i, "right")}
              onSwiped={i => setTopIndex(i + 1)}
              cardIndex={0}
              backgroundColor="transparent"
              stackSize={3}
              verticalSwipe={false}
              cardVerticalMargin={8}
              cardHorizontalMargin={SPACING.md}
              containerStyle={{
                position: "relative",
                width: "100%",
                height: deckH,
                backgroundColor: "transparent",
              }}
              cardStyle={{ top: 8, height: deckH - 30 }}
              overlayLabels={{
                left: {
                  title: "SKIP",
                  style: {
                    label: {
                      color: COLORS.textMuted, fontSize: 24, fontWeight: "900",
                      letterSpacing: 2, borderWidth: 2.5, borderColor: COLORS.textMuted,
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
                    },
                    wrapper: {
                      flexDirection: "column", alignItems: "flex-end",
                      justifyContent: "flex-start", marginTop: 28, marginLeft: -24,
                    },
                  },
                },
                right: {
                  title: "APPLY",
                  style: {
                    label: {
                      color: COLORS.accent, fontSize: 24, fontWeight: "900",
                      letterSpacing: 2, borderWidth: 2.5, borderColor: COLORS.accent,
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
                    },
                    wrapper: {
                      flexDirection: "column", alignItems: "flex-start",
                      justifyContent: "flex-start", marginTop: 28, marginLeft: 24,
                    },
                  },
                },
              }}
            />
            )}
          </View>

          {/* Tap actions for the drag-averse */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.smallBtn} onPress={steerFeed} activeOpacity={0.8}>
              <Ionicons name="options-outline" size={19} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => swiperRef.current?.swipeLeft()}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={28} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallBtn} onPress={saveTop} activeOpacity={0.8}>
              <Ionicons
                name={savedIds.has(feed[topIndex]?.job?.id) ? "bookmark" : "bookmark-outline"}
                size={19}
                color={savedIds.has(feed[topIndex]?.job?.id) ? COLORS.primary : COLORS.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => swiperRef.current?.swipeRight()}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background, gap: SPACING.md },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },

  container: { flex: 1, backgroundColor: COLORS.background },

  header:  { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  eyebrow: { ...TYPE.eyebrow, marginBottom: 4 },
  title:   { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, color: COLORS.textPrimary },
  horizon:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SPACING.sm },
  horizonDash: { width: 22, height: 3, borderRadius: 2, backgroundColor: COLORS.accent },
  horizonLine: { width: 80, height: 1.5, borderRadius: 1, backgroundColor: COLORS.primaryLight },

  toolbar: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: SPACING.md,
    marginTop:         SPACING.md,
  },
  countPill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   COLORS.primaryLight,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical:   6,
  },
  countText: { fontSize: 12.5, fontWeight: "700", color: COLORS.primary },
  cvChip: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   COLORS.card,
    borderWidth:       1.5,
    borderColor:       COLORS.border,
    borderRadius:      RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  cvChipActive: { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  cvChipText:   { fontSize: 12.5, fontWeight: "700", color: COLORS.primary },

  quizBanner: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               SPACING.sm,
    backgroundColor:   COLORS.primaryLight,
    borderRadius:      RADIUS.md,
    paddingVertical:   SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    marginHorizontal:  SPACING.md,
    marginTop:         SPACING.sm,
  },
  quizBannerTitle: { color: COLORS.primaryDark, fontWeight: "800", fontSize: 13.5 },
  quizBannerSub:   { color: COLORS.textSecondary, fontSize: 12, marginTop: 1 },

  deckWrap: { flex: 1 },

  actions: {
    flexDirection:  "row",
    justifyContent: "center",
    alignItems:     "center",
    gap:            SPACING.md,
    paddingBottom:  SPACING.md,
  },
  smallBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  skipBtn: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: COLORS.card,
    borderWidth:     1.5,
    borderColor:     COLORS.border,
    alignItems:      "center",
    justifyContent:  "center",
    ...SHADOWS.sm,
  },
  applyBtn: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: COLORS.accent,
    alignItems:      "center",
    justifyContent:  "center",
    ...SHADOWS.md,
  },

  empty:     { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: 21, fontWeight: "900", letterSpacing: -0.4, color: COLORS.textPrimary },
  emptySub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: "center", lineHeight: 21 },
  refreshBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 22, paddingVertical: 11, marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  refreshBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
