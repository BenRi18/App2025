import React from "react";
import { View, Button, Text } from "react-native";

export default function RoleSelection({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Choose account type:</Text>
      <Button title="User" onPress={() => navigation.navigate("Register", { role: "user" })} />
      <Button title="Business" onPress={() => navigation.navigate("Register", { role: "business" })} />
    </View>
  );
}
