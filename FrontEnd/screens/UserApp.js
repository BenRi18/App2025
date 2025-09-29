// frontend/screens/UserApp.js
import React, { useEffect, useState, useContext, useRef } from "react";
import { View, StyleSheet, Text, ActivityIndicator, Alert, Button, Platform } from "react-native";
import Swiper from "react-native-deck-swiper";
import * as Location from "expo-location";
import * as DocumentPicker from "expo-document-picker";
import BusinessCard from "../components/BusinessCard";
import { AuthContext } from "../context/AuthContext";

export default function UserApp() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [cvUri, setCvUri] = useState(null);
  const { token } = useContext(AuthContext);
  const swiperRef = useRef(null);
  const swipedBusinessIds = useRef(new Set());

  // Request permission & get initial location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Cannot access location.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // Fetch nearby businesses whenever location changes
  useEffect(() => {
    const fetchNearby = async () => {
      if (!location.latitude || !location.longitude) return;

      try {
        const response = await fetch(
          `http://localhost:3000/businesses/nearby?lat=${location.latitude}&lng=${location.longitude}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        const newBusinesses = data.filter(b => !swipedBusinessIds.current.has(b.id));
        setBusinesses(newBusinesses);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    fetchNearby();
  }, [location, token]);

  // Update location every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Pick CV file
  const pickCV = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (result.type === "success") {
      setCvUri(result.uri);
      Alert.alert("CV Selected", "Your CV has been loaded successfully.");
    }
  };

  // Handle swipe actions
  const handleSwipe = async (cardIndex, direction) => {
    const business = businesses[cardIndex];
    if (!business) return;

    swipedBusinessIds.current.add(business.id);

    // If swipe right, send CV
    if (direction === "right") {
      if (!cvUri) {
        Alert.alert("Upload CV first", "Please select a CV before swiping right.");
        return;
      }

      const formData = new FormData();
      formData.append("businessId", business.id);
      formData.append("cv", {
        uri: Platform.OS === "ios" ? cvUri.replace("file://", "") : cvUri,
        type: "application/pdf",
        name: "cv.pdf",
      });

      try {
        const response = await fetch("http://localhost:3000/swipes/right", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        });
        const data = await response.json();
        console.log("CV sent result:", data);
        Alert.alert("CV Sent", `Your CV was sent to ${business.business_name}`);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to send CV.");
      }
    } else {
      // Swipe left → record swipe without CV
      try {
        await fetch("http://localhost:3000/swipes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            business_id: business.id,
            direction: "left",
          }),
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Button title={cvUri ? "CV Loaded ✅" : "Upload CV"} onPress={pickCV} />
      {businesses.length === 0 ? (
        <Text>No nearby businesses available</Text>
      ) : (
        <Swiper
          ref={swiperRef}
          cards={businesses}
          renderCard={card => <BusinessCard business={card} />}
          onSwipedLeft={i => handleSwipe(i, "left")}
          onSwipedRight={i => handleSwipe(i, "right")}
          cardIndex={0}
          backgroundColor="transparent"
          stackSize={3}
          verticalSwipe={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f2f2f2", padding: 10 },
});
