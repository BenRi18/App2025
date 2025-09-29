// frontend/screens/BusinessApp.js
import React, { useEffect, useState, useContext } from "react";
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from "react-native";
import { AuthContext } from "../context/AuthContext";

export default function BusinessApp() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetch("http://localhost:3000/swipes/business", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setApplicants(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const renderApplicant = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text>Age: {item.age}</Text>
      <Text>Email: {item.email}</Text>
      <Text>Phone: {item.phone_number}</Text>
      <Text style={styles.date}>Applied at: {new Date(item.created_at).toLocaleString()}</Text>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      {applicants.length === 0 ? (
        <Text style={styles.empty}>No applicants yet.</Text>
      ) : (
        <FlatList
          data={applicants}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderApplicant}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f2f2f2" },
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
  name: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  date: { marginTop: 10, fontSize: 12, color: "#555" },
  empty: { textAlign: "center", marginTop: 50, fontSize: 16, color: "#777" },
});
