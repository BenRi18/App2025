// FrontEnd/navigation/RootNavigator.js
// Root navigator — handles auth gate + all push screens (Chat, EditProfile, etc.)
import React, { useContext }          from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer }        from "@react-navigation/native";
import { ActivityIndicator, View }    from "react-native";
import { LinkingConfiguration }       from "./LinkingConfiguration";

import { AuthContext } from "../context/AuthContext";
import { COLORS }      from "../theme";

// ── Auth screens ────────────────────────────────────────────────────────────
import RoleSelection       from "../screens/auth/RoleSelection";
import LoginScreen         from "../screens/auth/LoginScreen";
import RegisterScreen      from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import VerifyEmailScreen   from "../screens/auth/VerifyEmailScreen";

// ── Tab navigators ──────────────────────────────────────────────────────────
import UserApp    from "../screens/UserApp";
import BusinessApp from "../screens/BusinessApp";

// ── Push screens (shared, accessible from any tab) ──────────────────────────
import ChatScreen          from "../screens/shared/ChatScreen";
import EditProfileScreen   from "../screens/shared/EditProfileScreen";
import ChangePasswordScreen from "../screens/shared/ChangePasswordScreen";

const Stack = createNativeStackNavigator();

const HEADER_OPTS = {
  headerStyle:      { backgroundColor: COLORS.card },
  headerTitleStyle: { color: COLORS.textPrimary, fontWeight: "700" },
  headerTintColor:  COLORS.primary,
};

export default function RootNavigator() {
  const { token, role, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={LinkingConfiguration}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          // ── Auth group ────────────────────────────────────────────────────
          <>
            <Stack.Screen name="RoleSelection"    component={RoleSelection} />
            <Stack.Screen name="Login"            component={LoginScreen} />
            <Stack.Screen name="Register"         component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword"   component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword"    component={ResetPasswordScreen} />
            <Stack.Screen name="VerifyEmail"      component={VerifyEmailScreen} />
          </>
        ) : role === "user" ? (
          // ── Job seeker app ────────────────────────────────────────────────
          <>
            <Stack.Screen name="UserApp"   component={UserApp} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // ── Business app ──────────────────────────────────────────────────
          <>
            <Stack.Screen name="BusinessApp" component={BusinessApp} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
