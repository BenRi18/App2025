// FrontEnd/screens/UserApp.js — bottom-tab shell for the job-seeker experience
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import SwipeScreen        from "./user/SwipeScreen";
import ApplicationsScreen from "./user/ApplicationsScreen";
import ProfileScreen      from "./shared/ProfileScreen";
import { COLORS } from "../theme";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  "Find Jobs":        { focused: "swap-horizontal",    blur: "swap-horizontal-outline" },
  "My Applications":  { focused: "document-text",      blur: "document-text-outline" },
  "My Profile":       { focused: "person",             blur: "person-outline" },
};

export default function UserApp() {
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
      <Tab.Screen name="Find Jobs"       component={SwipeScreen} />
      <Tab.Screen name="My Applications" component={ApplicationsScreen} />
      <Tab.Screen name="My Profile"      component={ProfileScreen} />
    </Tab.Navigator>
  );
}
