import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState } from 'react';

const GREEN = '#2e7d32';

// The AR experience is delivered via the web app's AR page
// On Android it uses Scene Viewer (ARCore), on iOS it uses AR Quick Look
// model-viewer's AR button handles all of this natively

const PLANTS = [
  { name: 'Monstera', modelUrl: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/tree/model.gltf' },
  { name: 'Cactus', modelUrl: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/cactus/model.gltf' },
  { name: 'Lime Tree', modelUrl: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/tree-lime/model.gltf' },
  { name: 'Spruce', modelUrl: 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/tree-spruce/model.gltf' },
];

function buildARHtml(plant) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
  <style>
    body { margin: 0; background: #1a1a2e; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
    model-viewer { width: 100vw; height: 100vh; }
    model-viewer::part(default-ar-button) { display: block; }
  </style>
</head>
<body>
  <model-viewer
    src="${plant.modelUrl}"
    alt="${plant.name} 3D model"
    ar
    ar-modes="webxr scene-viewer quick-look"
    camera-controls
    auto-rotate
    shadow-intensity="1"
    environment-image="neutral"
    style="width:100vw;height:100vh"
  >
    <button slot="ar-button" style="background:#2e7d32;color:#fff;border:none;padding:12px 20px;border-radius:8px;font-size:16px;font-weight:bold;margin:8px;cursor:pointer;">
      View in AR 📱
    </button>
  </model-viewer>
</body>
</html>`;
}

export default function ARScreen() {
  const [selected, setSelected] = useState(PLANTS[0]);
  const [showViewer, setShowViewer] = useState(false);

  if (showViewer) {
    return (
      <View style={s.viewerContainer}>
        <WebView
          source={{ html: buildARHtml(selected) }}
          style={s.webview}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          allowsAR
        />
        <TouchableOpacity style={s.backBtn} onPress={() => setShowViewer(false)}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.headerTitle}>AR Plant Visualizer</Text>
        <Text style={s.headerSub}>Place 3D plants in your real space</Text>
      </View>

      <Text style={s.sectionTitle}>Choose a Plant</Text>
      {PLANTS.map(plant => (
        <TouchableOpacity
          key={plant.name}
          style={[s.plantCard, selected.name === plant.name && s.plantCardActive]}
          onPress={() => setSelected(plant)}
        >
          <Text style={s.plantEmoji}>🌿</Text>
          <Text style={[s.plantName, selected.name === plant.name && { color: GREEN }]}>{plant.name}</Text>
          {selected.name === plant.name && <Text style={s.checkmark}>✓</Text>}
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={s.viewBtn} onPress={() => setShowViewer(true)}>
        <Text style={s.viewBtnText}>View {selected.name} in 3D / AR</Text>
      </TouchableOpacity>

      <View style={s.infoCard}>
        <Text style={s.infoTitle}>How to use AR</Text>
        <Text style={s.infoText}>1. Tap "View in 3D / AR" above</Text>
        <Text style={s.infoText}>2. In the viewer, tap "View in AR" button</Text>
        <Text style={s.infoText}>3. Point your camera at a flat surface</Text>
        <Text style={s.infoText}>4. Tap to place the plant in your room!</Text>
        <View style={s.compatRow}>
          <Text style={s.compatItem}>🤖 Android requires ARCore</Text>
          <Text style={s.compatItem}>🍎 iOS requires ARKit (iOS 12+)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  viewerContainer: { flex: 1 },
  webview: { flex: 1 },
  backBtn: {
    position: 'absolute', top: 50, left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  header: {
    backgroundColor: '#0d47a1', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  plantCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 2, borderColor: '#e0e0e0',
  },
  plantCardActive: { borderColor: GREEN, backgroundColor: '#e8f5e9' },
  plantEmoji: { fontSize: 24 },
  plantName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333' },
  checkmark: { color: GREEN, fontWeight: '700', fontSize: 18 },
  viewBtn: {
    backgroundColor: '#0d47a1', padding: 15, borderRadius: 12,
    alignItems: 'center', marginVertical: 16,
  },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', color: GREEN, marginBottom: 10 },
  infoText: { color: '#555', fontSize: 14, lineHeight: 24 },
  compatRow: { marginTop: 12, gap: 4 },
  compatItem: { color: '#888', fontSize: 13 },
});
