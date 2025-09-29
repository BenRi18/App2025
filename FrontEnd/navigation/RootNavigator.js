// frontend/navigation/RootNavigator.js
import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import RoleSelection from "../screens/RoleSelection";
import UserApp from "../screens/UserApp";
import BusinessApp from "../screens/BusinessApp";
import { AuthContext } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, role } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelection} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : role === "user" ? (
          <Stack.Screen name="UserApp" component={UserApp} />
        ) : (
          <Stack.Screen name="BusinessApp" component={BusinessApp} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
