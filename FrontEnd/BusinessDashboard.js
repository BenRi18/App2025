import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import axios from 'axios';

export default function BusinessDashboard({ businessId }) {
  const [swipes, setSwipes] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:3000/business/swipes?businessId=${businessId}`)
      .then(res => setSwipes(res.data));
  }, []);

  return (
    <View>
      <Text>Received CVs:</Text>
      <FlatList
        data={swipes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, margin: 5, padding: 5 }}>
            <Text>User ID: {item.user_id}</Text>
            <Text>CV: {item.cv_url}</Text>
          </View>
        )}
      />
    </View>
  );
}
