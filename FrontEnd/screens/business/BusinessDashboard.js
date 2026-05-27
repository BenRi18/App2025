// FrontEnd/screens/business/BusinessDashboard.js
// NOTE: This component is NOT currently wired into the navigation.
// ApplicantsScreen.js handles the same view for the active business tab.
// Kept here as a reusable fallback component for future use.
import React, { useEffect, useState, useContext } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { AuthContext } from "../../context/AuthContext";

const API_URL = "http://localhost:3000";

export default function BusinessDashboard() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const { token }                   = useContext(AuthContext);

  useEffect(() => {
    fetch(`${API_URL}/swipes/business`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch applicants");
        return res.json();
      })
      .then(data => { setApplicants(data); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, [token]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (error)   return <Text style={styles.error}>{error}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Received Applications:</Text>
      {applicants.length === 0 ? (
        <Text style={styles.empty}>No applicants yet.</Text>
      ) : (
        <FlatList
          data={applicants}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text>Age: {item.age}</Text>
              <Text>Email: {item.email}</Text>
              <Text>Phone: {item.phone_number}</Text>
              {item.cv_path ? <Text>CV: {item.cv_path}</Text> : null}
              <Text style={styles.date}>
                Applied: {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f2f2f2" },
  heading:   { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius:    12,
    padding:         16,
    marginVertical:  8,
    shadowColor:     "#000",
    shadowOpacity:   0.15,
    shadowOffset:    { width: 0, height: 3 },
    shadowRadius:    6,
    elevation:       4,
  },
  name:  { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  date:  { marginTop: 8, fontSize: 12, color: "#666" },
  empty: { textAlign: "center", marginTop: 40, fontSize: 16, color: "#777" },
  error: { textAlign: "center", marginTop: 40, fontSize: 16, color: "red" },
});
