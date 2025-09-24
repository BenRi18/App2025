import React, { useState, useEffect, useRef } from 'react';
import { View, Text, SafeAreaView, Button, Platform } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';

export default function RealTimeSwipe() {
  const [businesses, setBusinesses] = useState([]);
  const [cvUri, setCvUri] = useState(null);
  const [swipedBusinessIds, setSwipedBusinessIds] = useState(new Set());
  const swiperRef = useRef(null);

  // Upload CV
  const pickCV = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.type === 'success') setCvUri(result.uri);
  };

  // Fetch nearby businesses
  const fetchNearby = async (lat, lng) => {
    try {
      const response = await axios.get('http://localhost:3000/businesses/nearby', {
        params: { lat, lng }
      });
      // Filter out businesses already swiped
      const newBusinesses = response.data.filter(b => !swipedBusinessIds.has(b.id));
      setBusinesses(newBusinesses);
    } catch (error) {
      console.error(error);
    }
  };

  // Swipe right → send CV
  const onSwipeRight = async (cardIndex) => {
    const business = businesses[cardIndex];
    if (!cvUri) return alert('Please upload CV first!');

    const formData = new FormData();
    formData.append('cv', {
      uri: Platform.OS === 'ios' ? cvUri.replace('file://', '') : cvUri,
      type: 'application/pdf',
      name: 'cv.pdf'
    });
    formData.append('businessId', business.id);
    
    await axios.post('http://localhost:3000/user/swipe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    alert(`CV sent to ${business.name}`);

    // Track swiped business
    setSwipedBusinessIds(prev => new Set(prev).add(business.id));
  };

  // Track left swipe to avoid showing again
  const onSwipedLeft = (cardIndex) => {
    const business = businesses[cardIndex];
    setSwipedBusinessIds(prev => new Set(prev).add(business.id));
  };

  // Real-time location updates
  useEffect(() => {
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetchNearby(latitude, longitude);
        },
        (error) => console.error(error),
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Button title="Upload CV" onPress={pickCV} />
      {businesses.length > 0 ? (
        <Swiper
          ref={swiperRef}
          cards={businesses}
          renderCard={(card) => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1 }}>
              <Text style={{ fontSize: 24 }}>{card.name}</Text>
              <Text>{card.industry}</Text>
            </View>
          )}
          onSwipedRight={onSwipeRight}
          onSwipedLeft={onSwipedLeft}
          stackSize={3}
          verticalSwipe={false}
        />
      ) : (
        <Text>No new businesses nearby.</Text>
      )}
    </SafeAreaView>
  );
}
