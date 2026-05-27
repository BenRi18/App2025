// FrontEnd/screens/BusinessApp.js — bottom-tab shell for the business experience
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import ApplicantsScreen from "./business/ApplicantsScreen";
import ProfileScreen    from "./shared/ProfileScreen";
import { COLORS } from "../theme";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  "Applicants":        { focused: "people",   blur: "people-outline" },
  "Business Profile":  { focused: "business", blur: "business-outline" },
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
      <Tab.Screen name="Applicants"       component={ApplicantsScreen} />
      <Tab.Screen name="Business Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
