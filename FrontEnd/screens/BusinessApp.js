// FrontEnd/screens/BusinessApp.js — business shell.
// Tabs: Jobs · Applicants · Matches · Messages · Profile.
// Gated behind the profile-requirements checklist; unread badge on Messages.
import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import JobListingsScreen      from "./business/JobListingsScreen";
import ApplicantsScreen       from "./business/ApplicantsScreen";
import BusinessMatchesScreen  from "./business/BusinessMatchesScreen";
import BusinessMessagesScreen from "./business/BusinessMessagesScreen";
import BusinessProfileScreen  from "./business/BusinessProfileScreen";
import RequirementsScreen     from "../components/RequirementsScreen";
import { missingRequirements } from "../utils/profileRequirements";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { api } from "../services/api";
import { COLORS } from "../theme";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Jobs:       { focused: "briefcase",   blur: "briefcase-outline" },
  Applicants: { focused: "people",      blur: "people-outline" },
  Matches:    { focused: "heart",       blur: "heart-outline" },
  Messages:   { focused: "chatbubbles", blur: "chatbubbles-outline" },
  Profile:    { focused: "business",    blur: "business-outline" },
};

export default function BusinessApp() {
  const unread = useUnreadCount();
  const insets = useSafeAreaInsets();

  // ── Requirements gate ──────────────────────────────────────────────────────
  const [ready, setReady] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    api.get("/auth/me")
      .then(res => (res.ok ? res.json() : null))
      .then(me => {
        if (!alive) return;
        setReady(me ? missingRequirements(me, "business").length === 0 : true);
      })
      .catch(() => alive && setReady(true));   // network issues never lock the app
    return () => { alive = false; };
  }, []);

  if (ready === null) return null;
  if (ready === false) {
    return <RequirementsScreen role="business" onComplete={() => setReady(true)} />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle:        { backgroundColor: COLORS.background },
        headerShadowVisible: false,
        headerTitleStyle:   { color: COLORS.textPrimary, fontWeight: "900", fontSize: 21, letterSpacing: -0.4 },
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor:      COLORS.card,
          borderTopWidth:       0,
          borderTopLeftRadius:  24,
          borderTopRightRadius: 24,
          height:               60 + insets.bottom,
          paddingTop:           6,
          paddingBottom:        Math.max(insets.bottom, 8),
          elevation:            12,
          shadowColor:          "#6B5B45",
          shadowOpacity:        0.12,
          shadowOffset:         { width: 0, height: -4 },
          shadowRadius:         14,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "700" },
        tabBarBadgeStyle: { backgroundColor: COLORS.accent, fontSize: 10, fontWeight: "800" },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return (
            <View
              style={{
                backgroundColor:   focused ? COLORS.primaryLight : "transparent",
                borderRadius:      999,
                paddingHorizontal: 14,
                paddingVertical:   3,
              }}
            >
              <Ionicons name={focused ? icons.focused : icons.blur} size={22} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Jobs"       component={JobListingsScreen} />
      <Tab.Screen name="Applicants" component={ApplicantsScreen} />
      <Tab.Screen name="Matches"    component={BusinessMatchesScreen} />
      <Tab.Screen
        name="Messages"
        component={BusinessMessagesScreen}
        options={unread > 0 ? { tabBarBadge: unread > 9 ? "9+" : unread } : {}}
      />
      <Tab.Screen name="Profile" component={BusinessProfileScreen} />
    </Tab.Navigator>
  );
}
