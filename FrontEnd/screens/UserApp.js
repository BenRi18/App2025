// FrontEnd/screens/UserApp.js — job-seeker shell.
// Tabs: Dashboard · Applications · Messages · Profile.
// Gated behind the profile-requirements checklist; unread badge on Messages.
import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import SwipeScreen         from "./user/SwipeScreen";
import ApplicationsScreen  from "./user/ApplicationsScreen";
import UserMessagesScreen  from "./user/UserMessagesScreen";
import UserProfileScreen   from "./user/UserProfileScreen";
import QuestionnaireScreen from "./user/QuestionnaireScreen";
import MatchModal          from "../components/MatchModal";
import RequirementsScreen  from "../components/RequirementsScreen";
import { missingRequirements } from "../utils/profileRequirements";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { getSocket } from "../services/socket";
import { api } from "../services/api";
import { COLORS } from "../theme";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Dashboard:    { focused: "compass",         blur: "compass-outline" },
  Applications: { focused: "file-tray-full",  blur: "file-tray-outline" },
  Messages:     { focused: "chatbubbles",     blur: "chatbubbles-outline" },
  Profile:      { focused: "person",          blur: "person-outline" },
};

function UserTabs() {
  const unread = useUnreadCount();
  const insets = useSafeAreaInsets();

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
                paddingHorizontal: 16,
                paddingVertical:   3,
              }}
            >
              <Ionicons name={focused ? icons.focused : icons.blur} size={22} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard"    component={SwipeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Applications" component={ApplicationsScreen} />
      <Tab.Screen
        name="Messages"
        component={UserMessagesScreen}
        options={unread > 0 ? { tabBarBadge: unread > 9 ? "9+" : unread } : {}}
      />
      <Tab.Screen name="Profile" component={UserProfileScreen} />
    </Tab.Navigator>
  );
}

function UserStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserTabs" component={UserTabs} />
      <Stack.Screen
        name="Questionnaire"
        component={QuestionnaireScreen}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}

export default function UserApp({ navigation }) {
  // ── Requirements gate ──────────────────────────────────────────────────────
  const [ready, setReady] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    api.get("/auth/me")
      .then(res => (res.ok ? res.json() : null))
      .then(me => {
        if (!alive) return;
        setReady(me ? missingRequirements(me, "user").length === 0 : true);
      })
      .catch(() => alive && setReady(true));   // network issues never lock the app
    return () => { alive = false; };
  }, []);

  // ── "It's a match!" moment ────────────────────────────────────────────────
  const [matchEvent, setMatchEvent] = React.useState(null);

  React.useEffect(() => {
    let detach = null;
    const tryAttach = () => {
      const socket = getSocket();
      if (!socket) return false;
      const handler = (payload) => setMatchEvent(payload);
      socket.on("new_match", handler);
      detach = () => socket.off("new_match", handler);
      return true;
    };
    if (!tryAttach()) {
      const iv = setInterval(() => { if (tryAttach()) clearInterval(iv); }, 1500);
      return () => { clearInterval(iv); detach?.(); };
    }
    return () => detach?.();
  }, []);

  if (ready === null) return null;
  if (ready === false) {
    return <RequirementsScreen role="user" onComplete={() => setReady(true)} />;
  }

  return (
    <>
      <UserStack />
      <MatchModal
        match={matchEvent}
        onDismiss={() => setMatchEvent(null)}
        onMessage={() => {
          const ev = matchEvent;
          setMatchEvent(null);
          if (ev?.matchId) {
            navigation.navigate("Chat", {
              matchId:     ev.matchId,
              partnerName: ev.business?.name ?? "Chat",
            });
          }
        }}
      />
    </>
  );
}
