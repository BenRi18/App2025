// frontend/App.js
import React from "react";
import RootNavigator from "./navigation/RootNavigator";
import AuthProvider from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
