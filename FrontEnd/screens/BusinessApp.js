// FrontEnd/screens/BusinessApp.js — bottom-tab shell for the business experience.
// Tabs: Jobs · Applicants · Matches · Messages · Profile — all business-specific
// screens. Applicants stays because liking applicants is how matches are created.
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import JobListingsScreen       from "./business/JobListingsScreen";
import ApplicantsScreen        from "./business/ApplicantsScreen";
import BusinessMatchesScreen   from "./business/BusinessMatchesScreen";
import BusinessMessagesScreen  from "./business/BusinessMessagesScreen";
import BusinessProfileScreen   from "./business/BusinessProfileScreen";
import { COLORS } from "../theme";
import RequirementsScreen from "../components/RequirementsScreen";
import { missingRequirements } from "../utils/profileRequirements";
import { api } from "../services/api";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  "Jobs":       { focused: "briefcase",   blur: "briefcase-outline" },
  "Applicants": { focused: "people",      blur: "people-outline" },
  "Matches":    { focused: "heart",       blur: "heart-outline" },
  "Messages":   { focused: "chatbubbles", blur: "chatbubbles-outline" },
  "Profile":    { focused: "business",    blur: "business-outline" },
};

export default function BusinessApp() {
  const [ready, setReady] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    api.get("/auth/me")
      .then(res => (res.ok ? res.json() : null))
      .then(me => {
        if (!alive) return;
        setReady(me ? missingRequirements(me, "business").length === 0 : true);
      })
      .catch(() => alive && setReady(true));
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
          backgroundColor: COLORS.card,
          borderTopColor:  COLORS.border,
          borderTopWidth:  1,
          height:          60,
          paddingBottom:   6,
          paddingTop:      6,
          elevation:       8,
          shadowColor:     "#6B5B45",
          shadowOpacity:   0.08,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarBadgeStyle: { backgroundColor: COLORS.accent, fontSize: 10, fontWeight: "800" },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return (
            <Ionicons
              name={focused ? icons.focused : icons.blur}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Jobs"       component={JobListingsScreen} />
      <Tab.Screen name="Applicants" component={ApplicantsScreen} />
      <Tab.Screen name="Matches"    component={BusinessMatchesScreen} />
      <Tab.Screen name="Messages"   component={BusinessMessagesScreen} />
      <Tab.Screen name="Profile"    component={BusinessProfileScreen} />
    </Tab.Navigator>
  );
}
