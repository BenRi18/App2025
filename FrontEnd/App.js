// frontend/App.js
import React from "react";
import RootNavigator from "./navigation/RootNavigator";
import AuthProvider from "./context/AuthContext";
import { SafeAreaView, Text } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>App is working!</Text>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
