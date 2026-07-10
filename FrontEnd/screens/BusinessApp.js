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

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  "Jobs":       { focused: "briefcase",   blur: "briefcase-outline" },
  "Applicants": { focused: "people",      blur: "people-outline" },
  "Matches":    { focused: "heart",       blur: "heart-outline" },
  "Messages":   { focused: "chatbubbles", blur: "chatbubbles-outline" },
  "Profile":    { focused: "business",    blur: "business-outline" },
};

export default function BusinessApp() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle:       { backgroundColor: COLORS.card },
        headerTitleStyle:  { color: COLORS.textPrimary, fontWeight: "700" },
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor:  COLORS.border,
          elevation:       8,
          shadowOpacity:   0.06,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
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
