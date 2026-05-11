import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE } from '../../src/config';

const GREEN = '#2e7d32';

export default function IdentifyScreen() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('identify'); // 'identify' | 'diagnose'

  async function pickImage(from) {
    let result;
    if (from === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Camera permission required'); return; }
      result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    }
    if (!result.canceled) {
      setImage(result.assets[0]);
      setResult(null);
    }
  }

  async function analyze() {
    if (!image) return;
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'plant.jpg',
      });
      const endpoint = mode === 'identify' ? '/api/ai/identify' : '/api/ai/diagnose';
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
      const data = await res.json();
      setResult(data);
    } catch {
      Alert.alert('Error', 'Could not analyze image. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  const diffColor = d => d === 'easy' ? '#388e3c' : d === 'moderate' ? '#f57c00' : '#c62828';
  const healthColor = h => h === 'healthy' ? '#388e3c' : h === 'needs attention' ? '#f57c00' : '#c62828';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.modeTabs}>
        {['identify', 'diagnose'].map(m => (
          <TouchableOpacity
            key={m}
            style={[s.modeTab, mode === m && s.modeTabActive]}
            onPress={() => { setMode(m); setResult(null); }}
          >
            <Text style={[s.modeTabText, mode === m && s.modeTabTextActive]}>
              {m === 'identify' ? '🔍 Identify' : '🩺 Diagnose'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.uploadArea}>
        {image ? (
          <Image source={{ uri: image.uri }} style={s.preview} />
        ) : (
          <View style={s.placeholder}>
            <Text style={s.placeholderIcon}>📷</Text>
            <Text style={s.placeholderText}>Take or select a photo of your plant</Text>
          </View>
        )}
      </View>

      <View style={s.photoButtons}>
        <TouchableOpacity style={[s.photoBtn, { backgroundColor: GREEN }]} onPress={() => pickImage('camera')}>
          <Text style={s.photoBtnText}>📸 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.photoBtn, { backgroundColor: '#1565c0' }]} onPress={() => pickImage('library')}>
          <Text style={s.photoBtnText}>🖼️ Gallery</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <TouchableOpacity style={s.analyzeBtn} onPress={analyze} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.analyzeBtnText}>
              {mode === 'identify' ? 'Identify Plant' : 'Diagnose Plant'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {result && !result.raw && mode === 'identify' && (
        <View style={s.result}>
          <Text style={s.resultName}>{result.commonName}</Text>
          <Text style={s.resultSci}>{result.scientificName}</Text>
          <Text style={s.resultDesc}>{result.description}</Text>
          <View style={s.badges}>
            <View style={[s.badge, { backgroundColor: diffColor(result.difficulty) }]}>
              <Text style={s.badgeText}>{result.difficulty}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: '#555' }]}>
              <Text style={s.badgeText}>{result.light} light</Text>
            </View>
            <View style={[s.badge, { backgroundColor: result.petSafe === 'yes' ? GREEN : '#c62828' }]}>
              <Text style={s.badgeText}>{result.petSafe === 'yes' ? 'Pet safe' : 'Not pet safe'}</Text>
            </View>
          </View>
          {result.careTips && (
            <View style={s.tips}>
              <Text style={s.tipsTitle}>Care Tips</Text>
              {result.careTips.map((tip, i) => (
                <Text key={i} style={s.tip}>• {tip}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {result && !result.raw && mode === 'diagnose' && (
        <View style={s.result}>
          <View style={[s.healthBadge, { borderColor: healthColor(result.healthStatus?.toLowerCase()) }]}>
            <Text style={[s.healthText, { color: healthColor(result.healthStatus?.toLowerCase()) }]}>
              {result.healthStatus}
            </Text>
          </View>
          {result.issues?.map((issue, i) => (
            <View key={i} style={s.issue}>
              <Text style={s.issueTitle}>{issue.problem}</Text>
              <Text style={s.issueText}><Text style={{ fontWeight: '700' }}>Cause: </Text>{issue.cause}</Text>
              <Text style={s.issueText}><Text style={{ fontWeight: '700' }}>Treatment: </Text>{issue.treatment}</Text>
            </View>
          ))}
        </View>
      )}

      {result?.raw && (
        <View style={s.result}>
          <Text style={s.resultDesc}>{result.raw}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  modeTabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeTab: {
    flex: 1, padding: 10, borderRadius: 10,
    borderWidth: 2, borderColor: '#ddd', alignItems: 'center',
  },
  modeTabActive: { borderColor: GREEN, backgroundColor: '#e8f5e9' },
  modeTabText: { fontWeight: '700', color: '#888' },
  modeTabTextActive: { color: GREEN },
  uploadArea: {
    backgroundColor: '#fff', borderRadius: 16,
    overflow: 'hidden', marginBottom: 12, minHeight: 220,
    borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed',
  },
  preview: { width: '100%', height: 280, resizeMode: 'cover' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: 220 },
  placeholderIcon: { fontSize: 48, marginBottom: 12 },
  placeholderText: { color: '#aaa', textAlign: 'center', fontSize: 15 },
  photoButtons: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  photoBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  photoBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  analyzeBtn: {
    backgroundColor: GREEN, padding: 14, borderRadius: 12,
    alignItems: 'center', marginBottom: 20,
  },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  result: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  resultName: { fontSize: 22, fontWeight: '800', color: GREEN, marginBottom: 4 },
  resultSci: { fontStyle: 'italic', color: '#888', marginBottom: 10, fontSize: 14 },
  resultDesc: { color: '#555', lineHeight: 22, marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tips: {},
  tipsTitle: { fontWeight: '700', color: GREEN, marginBottom: 6, fontSize: 15 },
  tip: { color: '#555', lineHeight: 22, fontSize: 14, marginBottom: 2 },
  healthBadge: {
    borderWidth: 2, borderRadius: 10, padding: 10, marginBottom: 14, alignItems: 'center',
  },
  healthText: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  issue: {
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, marginBottom: 10,
  },
  issueTitle: { fontWeight: '700', color: GREEN, marginBottom: 6, fontSize: 15 },
  issueText: { color: '#555', lineHeight: 20, fontSize: 13, marginBottom: 3 },
});
