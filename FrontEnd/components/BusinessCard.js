// frontend/components/BusinessCard.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BusinessCard({ business }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{business.business_name}</Text>
      <Text>Owner: {business.owner_name}</Text>
      <Text>Street: {business.street}</Text>
      <Text>Email: {business.email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
});
