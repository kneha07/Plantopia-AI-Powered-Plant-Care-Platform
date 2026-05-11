import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { API_BASE } from '../../src/config';

const GREEN = '#2e7d32';

export default function PlantsScreen() {
  const [plants, setPlants] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/plants`)
      .then(r => r.json())
      .then(data => { setPlants(data); setFiltered(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(plants.filter(p => p.name.toLowerCase().includes(q) || p.scientificName?.toLowerCase().includes(q)));
  }, [search, plants]);

  if (loading) return <View style={s.center}><ActivityIndicator color={GREEN} size="large" /></View>;

  return (
    <View style={s.container}>
      <TextInput
        style={s.search}
        placeholder="Search plants..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#aaa"
      />
      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Image source={{ uri: `${API_BASE}${item.image}` }} style={s.cardImg} />
            <View style={s.cardBody}>
              <Text style={s.cardName}>{item.name}</Text>
              <Text style={s.cardSci}>{item.scientificName}</Text>
              <View style={s.badges}>
                <Text style={[s.badge, { backgroundColor: diffColor(item.difficulty) }]}>{item.difficulty}</Text>
                {item.petSafe && <Text style={[s.badge, { backgroundColor: '#1976d2' }]}>Pet safe</Text>}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function diffColor(d) {
  return d === 'easy' ? '#388e3c' : d === 'moderate' ? '#f57c00' : '#c62828';
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: {
    margin: 12,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  list: { paddingHorizontal: 8, paddingBottom: 20 },
  row: { justifyContent: 'space-between', marginHorizontal: 4 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardImg: { width: '100%', height: 130, resizeMode: 'cover' },
  cardBody: { padding: 10 },
  cardName: { fontSize: 14, fontWeight: '700', color: GREEN, marginBottom: 2 },
  cardSci: { fontSize: 11, color: '#888', fontStyle: 'italic', marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  badge: {
    fontSize: 10,
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
