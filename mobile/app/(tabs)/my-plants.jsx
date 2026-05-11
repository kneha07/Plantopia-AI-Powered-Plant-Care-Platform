import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native';
import { API_BASE } from '../../src/config';

const GREEN = '#2e7d32';

export default function MyPlantsScreen() {
  const [collection, setCollection] = useState([]);
  const [due, setDue] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('collection');
  const [showModal, setShowModal] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [c, d, p] = await Promise.all([
        fetch(`${API_BASE}/api/plants/collection/all`).then(r => r.json()),
        fetch(`${API_BASE}/api/plants/schedule/due`).then(r => r.json()),
        fetch(`${API_BASE}/api/plants`).then(r => r.json()),
      ]);
      setCollection(Array.isArray(c) ? c : []);
      setDue(Array.isArray(d) ? d : []);
      setPlants(Array.isArray(p) ? p : []);
    } catch {}
    setLoading(false);
  }

  async function addPlant() {
    if (!selectedPlantId) return;
    await fetch(`${API_BASE}/api/plants/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plantId: Number(selectedPlantId), nickname, location }),
    });
    setShowModal(false);
    setSelectedPlantId(''); setNickname(''); setLocation('');
    fetchAll();
  }

  async function waterPlant(userPlantId) {
    await fetch(`${API_BASE}/api/plants/collection/${userPlantId}/water`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    fetchAll();
  }

  async function removePlant(userPlantId) {
    await fetch(`${API_BASE}/api/plants/collection/${userPlantId}`, { method: 'DELETE' });
    fetchAll();
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={GREEN} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.tabs}>
        {['collection', 'due'].map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'collection' ? `My Plants (${collection.length})` : `Due (${due.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'collection' && (
        <>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
            <Text style={s.addBtnText}>+ Add Plant</Text>
          </TouchableOpacity>
          <FlatList
            data={collection}
            keyExtractor={p => String(p.userPlantId)}
            contentContainerStyle={s.list}
            ListEmptyComponent={<Text style={s.empty}>No plants yet. Add your first one!</Text>}
            renderItem={({ item }) => (
              <View style={s.card}>
                <Image source={{ uri: `${API_BASE}${item.image}` }} style={s.cardImg} />
                <View style={s.cardBody}>
                  <Text style={s.cardName}>{item.nickname || item.name}</Text>
                  {item.nickname && <Text style={s.cardSub}>{item.name}</Text>}
                  {item.location && <Text style={s.cardSub}>📍 {item.location}</Text>}
                  {item.lastWatered && (
                    <Text style={s.cardSub}>💧 {new Date(item.lastWatered).toLocaleDateString()}</Text>
                  )}
                  <View style={s.cardActions}>
                    <TouchableOpacity style={s.waterBtn} onPress={() => waterPlant(item.userPlantId)}>
                      <Text style={s.waterBtnText}>💧 Water</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.removeBtn} onPress={() => removePlant(item.userPlantId)}>
                      <Text style={s.removeBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        </>
      )}

      {tab === 'due' && (
        <FlatList
          data={due}
          keyExtractor={p => String(p.userPlantId)}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>All caught up! No watering needed.</Text>}
          renderItem={({ item }) => (
            <View style={s.dueCard}>
              <Image source={{ uri: `${API_BASE}${item.image}` }} style={s.dueImg} />
              <View style={s.dueInfo}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.dueText}>{item.lastWatered ? `Last: ${new Date(item.lastWatered).toLocaleDateString()}` : 'Never watered'}</Text>
              </View>
              <TouchableOpacity style={s.waterBtn} onPress={() => waterPlant(item.userPlantId)}>
                <Text style={s.waterBtnText}>💧 Water</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add Plant</Text>
            <Text style={s.modalLabel}>Plant</Text>
            <ScrollView style={s.plantPicker} nestedScrollEnabled>
              {plants.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.plantOption, selectedPlantId === String(p.id) && s.plantOptionActive]}
                  onPress={() => setSelectedPlantId(String(p.id))}
                >
                  <Text style={[s.plantOptionText, selectedPlantId === String(p.id) && { color: GREEN }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={s.modalInput} placeholder="Nickname (optional)" value={nickname} onChangeText={setNickname} />
            <TextInput style={s.modalInput} placeholder="Location (e.g. Living room)" value={location} onChangeText={setLocation} />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: GREEN }]} onPress={addPlant}>
                <Text style={s.modalBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#888' }]} onPress={() => setShowModal(false)}>
                <Text style={s.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, padding: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: GREEN },
  tabText: { fontWeight: '700', color: '#888' },
  tabTextActive: { color: GREEN },
  addBtn: { margin: 12, backgroundColor: GREEN, padding: 12, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { padding: 12, paddingTop: 0, paddingBottom: 30 },
  empty: { textAlign: 'center', color: '#aaa', padding: 40, fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 10, elevation: 1 },
  cardImg: { width: 90, height: 90, resizeMode: 'cover' },
  cardBody: { flex: 1, padding: 10 },
  cardName: { fontWeight: '700', color: GREEN, fontSize: 15, marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#888', marginBottom: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  waterBtn: { backgroundColor: '#1565c0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  waterBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  removeBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 18, color: '#aaa', lineHeight: 22 },
  dueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#1565c0' },
  dueImg: { width: 56, height: 56, borderRadius: 8, resizeMode: 'cover' },
  dueInfo: { flex: 1 },
  dueText: { fontSize: 12, color: '#c62828', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: GREEN, marginBottom: 14 },
  modalLabel: { fontWeight: '700', color: '#555', marginBottom: 6, fontSize: 13 },
  plantPicker: { maxHeight: 160, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, marginBottom: 12 },
  plantOption: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  plantOptionActive: { backgroundColor: '#e8f5e9' },
  plantOptionText: { fontSize: 14, color: '#333' },
  modalInput: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 14, color: '#333' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
