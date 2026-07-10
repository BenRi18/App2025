// FrontEnd/screens/UserApp.js — job-seeker shell: a stack wrapping the bottom
// tabs, so full-screen flows (like the personality quiz) can sit on top.
// Tabs: Find Jobs · Matches · Messages · Profile — all user-specific screens.
import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import SwipeScreen         from "./user/SwipeScreen";
import UserMatchesScreen   from "./user/UserMatchesScreen";
import UserMessagesScreen  from "./user/UserMessagesScreen";
import UserProfileScreen   from "./user/UserProfileScreen";
import QuestionnaireScreen from "./user/QuestionnaireScreen";
import { useUnreadCount } from "../hooks/useUnreadCount";
import MatchModal from "../components/MatchModal";
import { getSocket } from "../services/socket";
import { COLORS } from "../theme";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  "Find Jobs": { focused: "swap-horizontal", blur: "swap-horizontal-outline" },
  "Matches":   { focused: "heart",           blur: "heart-outline" },
  "Messages":  { focused: "chatbubbles",     blur: "chatbubbles-outline" },
  "Profile":   { focused: "person",          blur: "person-outline" },
};

function UserTabs() {
  const unread = useUnreadCount();
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
      <Tab.Screen name="Find Jobs" component={SwipeScreen} />
      <Tab.Screen name="Matches"   component={UserMatchesScreen} />
      <Tab.Screen
        name="Messages"
        component={UserMessagesScreen}
        options={unread > 0 ? { tabBarBadge: unread > 9 ? "9+" : unread } : {}}
      />
      <Tab.Screen name="Profile"   component={UserProfileScreen} />
    </Tab.Navigator>
  );
}

export default function UserApp({ navigation }) {
  const [newMatch, setNewMatch] = useState(null);

  // Listen for new_match events. The socket connects during login, but on a
  // cold start it may not exist yet when this mounts — retry briefly until it does.
  useEffect(() => {
    let attached = null;
    const handler = (payload) => setNewMatch(payload);

    const tryAttach = () => {
      const socket = getSocket();
      if (!socket) return false;
      socket.on("new_match", handler);
      attached = socket;
      return true;
    };

    if (!tryAttach()) {
      const interval = setInterval(() => {
        if (tryAttach()) clearInterval(interval);
      }, 1000);
      return () => {
        clearInterval(interval);
        attached?.off("new_match", handler);
      };
    }
    return () => attached?.off("new_match", handler);
  }, []);

  const openMatchChat = () => {
    const m = newMatch;
    setNewMatch(null);
    if (m?.matchId) {
      navigation.navigate("Chat", {
        matchId:     m.matchId,
        partnerName: m.business?.name ?? "Chat",
      });
    }
  };

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="UserTabs" component={UserTabs} />
        <Stack.Screen
          name="Questionnaire"
          component={QuestionnaireScreen}
          options={{ presentation: "modal" }}
        />
      </Stack.Navigator>

      <MatchModal
        match={newMatch}
        onMessage={openMatchChat}
        onDismiss={() => setNewMatch(null)}
      />
    </>
  );
}
