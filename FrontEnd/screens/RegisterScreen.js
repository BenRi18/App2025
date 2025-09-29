// frontend/screens/RegisterScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";

export default function RegisterScreen({ route, navigation }) {
  const { role } = route.params; // "user" or "business"
  const [form, setForm] = useState({});
  const API_URL = "http://localhost:3000/auth/register"; // adjust for your backend

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleRegister = async () => {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });

      const data = await res.json();
      console.log("Registration response:", data);
      if (data.token) {
        // Save token, redirect to main app
        navigation.navigate(role === "user" ? "UserApp" : "BusinessApp");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {role === "user" ? (
        <>
          <TextInput placeholder="Name" onChangeText={(t) => handleChange("name", t)} />
          <TextInput placeholder="Age" onChangeText={(t) => handleChange("age", t)} keyboardType="numeric" />
          <TextInput placeholder="Email" onChangeText={(t) => handleChange("email", t)} />
          <TextInput placeholder="Phone Number" onChangeText={(t) => handleChange("phone_number", t)} />
          <TextInput placeholder="Password" secureTextEntry onChangeText={(t) => handleChange("password", t)} />
        </>
      ) : (
        <>
          <TextInput placeholder="Business Name" onChangeText={(t) => handleChange("business_name", t)} />
          <TextInput placeholder="Owner Name" onChangeText={(t) => handleChange("owner_name", t)} />
          <TextInput placeholder="Street" onChangeText={(t) => handleChange("street", t)} />
          <TextInput placeholder="Email" onChangeText={(t) => handleChange("email", t)} />
          <TextInput placeholder="Password" secureTextEntry onChangeText={(t) => handleChange("password", t)} />
        </>
      )}
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}
