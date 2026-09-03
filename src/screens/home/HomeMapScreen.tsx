/**
 * Home / Mapa Principal do DoaPet
 *
 * Visão geográfica interativa com Leaflet.js + OpenStreetMap:
 * - Exibe animais reais para doação/adoção (🐶 Cachorros / 🐱 Gatos)
 * - Alertas SOS comunitários (🆘)
 * - Clínicas e hospitais veterinários reais (🏥)
 * - Auto-ajuste de limites (fitBounds) para que todos os pets e alertas apareçam na tela
 * - Atualização automática ao focar na tela (useFocusEffect)
 * - Card interativo ao tocar em qualquer marcador para ver detalhes do pet
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { listAvailablePets } from '@/services/pets';
import { listOpenAlerts, deleteSosAlert } from '@/services/sos';
import { listNearbyClinics } from '@/services/vets';
import { triggerNearbyPetAlert } from '@/services/nearbyAlert';
import { submitReport, REPORT_REASON_LABELS, type ReportReason } from '@/services/reports';
import { formatDateTime } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
import type { Pet, SosAlert, VetClinic } from '@/types';
import type { MainTabScreenProps } from '@/navigation/types';

type Props = MainTabScreenProps<'HomeMap'>;
type FilterType = 'all' | 'pets' | 'sos' | 'vets';

type SelectedMarker =
  | { type: 'pet'; data: Pet }
  | { type: 'sos'; data: SosAlert }
  | { type: 'vet'; data: VetClinic & { distanceKm?: number } }
  | null;

const DEFAULT_LAT = -22.755;
const DEFAULT_LNG = -43.452;

function escapeHtml(str: string): string {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

/** Gera o HTML do mapa Leaflet com todos os marcadores e ajuste de zoom automático */
function buildLeafletHTML(
  userLat: number,
  userLng: number,
  pets: Pet[],
  alerts: SosAlert[],
  clinics: Array<VetClinic & { distanceKm?: number }>,
  filter: FilterType,
): string {
  const showPets = filter === 'all' || filter === 'pets';
  const showSos = filter === 'all' || filter === 'sos';
  const showVets = filter === 'all' || filter === 'vets';

  const petPins = showPets
    ? pets
        .filter((p) => p.location?.latitude && p.location?.longitude)
        .map((p) => {
          const emoji = p.species.toLowerCase().includes('gato') ? '🐱' : '🐶';
          const name = escapeHtml(p.name);
          const breed = escapeHtml(p.breed ?? p.species);
          const location = escapeHtml(p.locationHint ?? '');
          return `
          (function() {
            var icon = L.divIcon({
              className: '',
              html: '<div style="background:#14B8A6;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.45);cursor:pointer;">${emoji}</div>',
              iconSize: [44, 44],
              iconAnchor: [22, 22]
            });
            var m = L.marker([${p.location.latitude}, ${p.location.longitude}], { icon: icon }).addTo(map);
            m.bindPopup('<div style="text-align:center;min-width:140px;"><b>${name}</b><br/>${breed}<br/><small style="color:#0D9488;">📍 ${location}</small><br/><span style="display:inline-block;margin-top:6px;font-size:11px;background:#CCFBF1;color:#0F766E;padding:3px 8px;border-radius:10px;font-weight:bold;">Para Doar / Adotar</span></div>');
            m.on('click', function() {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'selectPet', id: '${p.id}' }));
            });
            boundsPoints.push([${p.location.latitude}, ${p.location.longitude}]);
          })();`;
        })
        .join('\n')
    : '';

  const sosPins = showSos
    ? alerts
        .filter((a) => a.location?.latitude && a.location?.longitude)
        .map((a) => {
          const desc = escapeHtml(a.description.slice(0, 70));
          return `
          (function() {
            var icon = L.divIcon({
              className: '',
              html: '<div style="background:#EF4444;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.45);cursor:pointer;">🆘</div>',
              iconSize: [44, 44],
              iconAnchor: [22, 22]
            });
            var m = L.marker([${a.location.latitude}, ${a.location.longitude}], { icon: icon }).addTo(map);
            m.bindPopup('<div style="text-align:center;min-width:140px;"><b>Alerta SOS Rua</b><br/>${desc}...</div>');
            m.on('click', function() {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'selectSos', id: '${a.id}' }));
            });
            boundsPoints.push([${a.location.latitude}, ${a.location.longitude}]);
          })();`;
        })
        .join('\n')
    : '';

  const vetPins = showVets
    ? clinics
        .filter((c) => c.location?.latitude && c.location?.longitude)
        .map((c) => {
          const name = escapeHtml(c.name);
          const addr = escapeHtml(c.address);
          return `
          (function() {
            var icon = L.divIcon({
              className: '',
              html: '<div style="background:#8B5CF6;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;">🏥</div>',
              iconSize: [38, 38],
              iconAnchor: [19, 19]
            });
            var m = L.marker([${c.location.latitude}, ${c.location.longitude}], { icon: icon }).addTo(map);
            m.bindPopup('<div style="text-align:center;"><b>${name}</b><br/>${addr}</div>');
            m.on('click', function() {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'selectVet', id: '${c.id}' }));
            });
          })();`;
        })
        .join('\n')
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body,#map{width:100%;height:100%;background:#dde9ef;}
.leaflet-control-attribution{font-size:9px;}
</style>
</head>
<body>
<div id="map"></div>
<script>
var boundsPoints = [[${userLat}, ${userLng}]];
var map = L.map('map', { zoomControl: true }).setView([${userLat}, ${userLng}], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19,
  subdomains: ['a','b','c']
}).addTo(map);

// Marcador da posição do usuário
L.circleMarker([${userLat}, ${userLng}], {
  radius: 12,
  fillColor: '#0284C7',
  color: 'white',
  weight: 3,
  opacity: 1,
  fillOpacity: 0.9
}).addTo(map).bindPopup('<b>📍 Você está aqui</b>');

${petPins}
${sosPins}
${vetPins}

// Se houver pets ou alertas, ajusta a visão do mapa para incluir todos eles na tela
if (boundsPoints.length > 1) {
  try {
    var b = L.latLngBounds(boundsPoints);
    map.fitBounds(b, { padding: [60, 60], maxZoom: 15 });
  } catch(e) {}
}
</script>
</body>
</html>`;
}

export function HomeMapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { location } = useLocation();
  const webViewRef = useRef<WebView>(null);

  const [pets, setPets] = useState<Pet[]>([]);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [clinics, setClinics] = useState<Array<VetClinic & { distanceKm: number }>>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker>(null);
  const [activeSosAlert, setActiveSosAlert] = useState<SosAlert | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const userLat = location?.latitude ?? DEFAULT_LAT;
  const userLng = location?.longitude ?? DEFAULT_LNG;

  const loadMarkers = useCallback(async () => {
    const userCoords = location ?? { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
    try {
      const [petsData, alertsData, clinicsData] = await Promise.all([
        listAvailablePets(),
        listOpenAlerts(),
        listNearbyClinics(userCoords),
      ]);
      setPets(petsData);
      setAlerts(alertsData);
      setClinics(clinicsData.slice(0, 15));

      if (petsData.length > 0) {
        triggerNearbyPetAlert(petsData[0].id, petsData[0].name);
      }
    } catch {
      // Silencioso
    }
  }, [location]);

  // Recarrega os marcadores sempre que a tela entrar em foco
  useFocusEffect(
    useCallback(() => {
      loadMarkers();
    }, [loadMarkers]),
  );

  function handleDeleteMyAlert(alertId: string) {
    if (!user) return;
    Alert.alert(
      'Excluir Alerta SOS?',
      'Deseja realmente remover este alerta do mapa e do banco de dados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSosAlert(alertId, user.uid);
              setAlerts((prev) => prev.filter((a) => a.id !== alertId));
              setSelectedMarker(null);
              Alert.alert('Alerta Removido', 'Seu alerta foi excluído com sucesso.');
            } catch {
              Alert.alert('Erro', 'Apenas quem criou o alerta tem permissão para excluí-lo.');
            }
          },
        },
      ],
    );
  }

  function handleReportSosAlert(alert: SosAlert) {
    if (!user) {
      Alert.alert('Login Necessário', 'Você precisa estar conectado para fazer uma denúncia.');
      return;
    }

    const reasons: Array<{ reason: ReportReason; label: string }> = [
      { reason: 'conteudo_ofensivo', label: REPORT_REASON_LABELS['conteudo_ofensivo'] },
      { reason: 'imagem_inapropriada', label: REPORT_REASON_LABELS['imagem_inapropriada'] },
      { reason: 'informacoes_falsas', label: REPORT_REASON_LABELS['informacoes_falsas'] },
      { reason: 'spam', label: REPORT_REASON_LABELS['spam'] },
      { reason: 'outro', label: REPORT_REASON_LABELS['outro'] },
    ];

    Alert.alert(
      '🚨 Denunciar Alerta SOS',
      'Selecione o motivo da denúncia para este alerta. A denúncia será enviada para a equipe de moderação:',
      [
        ...reasons.map((r) => ({
          text: r.label,
          onPress: async () => {
            try {
              await submitReport({
                targetId: alert.id,
                targetType: 'sos_alert',
                targetTitle: `Alerta SOS: ${alert.description.slice(0, 30)}...`,
                reporterId: user.uid,
                reporterName: user.displayName ?? 'Membro DoaPet',
                reason: r.reason,
              });
              Alert.alert('✅ Denúncia Enviada', 'Agradecemos sua colaboração para manter a comunidade segura!');
            } catch {
              Alert.alert('Erro', 'Não foi possível registrar a denúncia.');
            }
          },
        })),
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  const htmlContent = buildLeafletHTML(userLat, userLng, pets, alerts, clinics, activeFilter);

  // Chave única para forçar re-renderização quando a contagem ou os IDs mudarem
  const mapKey = `map-v2-${pets.length}-${alerts.length}-${activeFilter}-${pets.map((p) => p.id).join('_')}`;

  const handleCenterUser = () => {
    webViewRef.current?.injectJavaScript(
      `map.setView([${userLat}, ${userLng}], 14, { animate: true }); true;`,
    );
  };

  const handleCenterOnPets = () => {
    if (pets.length > 0 && pets[0].location) {
      webViewRef.current?.injectJavaScript(
        `map.setView([${pets[0].location.latitude}, ${pets[0].location.longitude}], 15, { animate: true }); true;`,
      );
    } else {
      Alert.alert('Pets para Doação', 'Nenhum animal cadastrado no momento.');
    }
  };

  const handleZoomIn = () => webViewRef.current?.injectJavaScript(`map.zoomIn(); true;`);
  const handleZoomOut = () => webViewRef.current?.injectJavaScript(`map.zoomOut(); true;`);

  return (
    <View style={styles.container}>
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando mapa e animais...</Text>
        </View>
      )}

      <WebView
        key={mapKey}
        ref={webViewRef}
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onLoad={() => setMapReady(true)}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'selectPet') {
              const found = pets.find((p) => p.id === data.id);
              if (found) setSelectedMarker({ type: 'pet', data: found });
            } else if (data.type === 'selectSos') {
              const found = alerts.find((a) => a.id === data.id);
              if (found) setSelectedMarker({ type: 'sos', data: found });
            } else if (data.type === 'selectVet') {
              const found = clinics.find((c) => c.id === data.id);
              if (found) setSelectedMarker({ type: 'vet', data: found });
            }
          } catch {
            // ignora
          }
        }}
      />

      {/* Filtros no topo com respeito à status bar / notch do celular */}
      <View style={[styles.filterBar, { top: Math.max(insets.top, 12) }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(
            [
              { key: 'all', label: `🐾 Todos (${pets.length + alerts.length + clinics.length})` },
              { key: 'pets', label: `🐶🐱 Para Doar/Adotar (${pets.length})` },
              { key: 'sos', label: `🆘 Alertas SOS (${alerts.length})` },
              { key: 'vets', label: `🏥 Clínicas 24h (${clinics.length})` },
            ] as { key: FilterType; label: string }[]
          ).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Controles de mapa */}
      <View style={[styles.mapControls, { top: Math.max(insets.top, 12) + 54 }]}>
        <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
          <Text style={styles.controlText}>＋</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
          <Text style={styles.controlText}>－</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.centerButton]} onPress={handleCenterUser}>
          <Text style={styles.controlText}>🎯</Text>
        </TouchableOpacity>
        {pets.length > 0 && (
          <TouchableOpacity
            style={[styles.controlButton, styles.petCenterButton]}
            onPress={handleCenterOnPets}
          >
            <Text style={styles.controlText}>🐾</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Card de preview ao tocar no marcador */}
      {selectedMarker !== null && (
        <View style={styles.previewCard}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setSelectedMarker(null)}>
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.previewRow}>
            {selectedMarker.type === 'pet' && selectedMarker.data.photos?.[0] ? (
              <Image source={{ uri: selectedMarker.data.photos[0] }} style={styles.previewImage} />
            ) : (
              <View
                style={[
                  styles.previewIconBox,
                  {
                    backgroundColor:
                      selectedMarker.type === 'pet'
                        ? colors.primaryLight
                        : selectedMarker.type === 'sos'
                        ? '#FEE2E2'
                        : '#EDE9FE',
                  },
                ]}
              >
                <Text style={styles.previewBigIcon}>
                  {selectedMarker.type === 'pet'
                    ? selectedMarker.data.species.toLowerCase().includes('gato')
                      ? '🐱'
                      : '🐶'
                    : selectedMarker.type === 'sos'
                    ? '🆘'
                    : '🏥'}
                </Text>
              </View>
            )}
            <View style={styles.previewDetails}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedMarker.type === 'pet'
                  ? selectedMarker.data.name
                  : selectedMarker.type === 'sos'
                  ? 'Alerta SOS Rua'
                  : selectedMarker.data.name}
              </Text>
              <Text style={styles.previewSubtitle} numberOfLines={2}>
                {selectedMarker.type === 'pet'
                  ? `${selectedMarker.data.breed ?? selectedMarker.data.species} • ${selectedMarker.data.gender === 'macho' ? 'Macho' : 'Fêmea'}`
                  : selectedMarker.type === 'sos'
                  ? selectedMarker.data.description.slice(0, 80) + '…'
                  : selectedMarker.data.address}
              </Text>
              {selectedMarker.type === 'pet' && selectedMarker.data.locationHint ? (
                <Text style={styles.previewLocationHint}>📍 {selectedMarker.data.locationHint}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={() => {
                  if (selectedMarker.type === 'pet') {
                    navigation.navigate('PetDetail', { pet: selectedMarker.data });
                    setSelectedMarker(null);
                  } else if (selectedMarker.type === 'sos') {
                    setActiveSosAlert(selectedMarker.data);
                    setSelectedMarker(null);
                  } else if (selectedMarker.type === 'vet' && selectedMarker.data.phone) {
                    Linking.openURL(`tel:${selectedMarker.data.phone.replace(/\D/g, '')}`);
                    setSelectedMarker(null);
                  }
                }}
              >
                <Text style={styles.previewActionText}>
                  {selectedMarker.type === 'pet'
                    ? 'Ver Pet →'
                    : selectedMarker.type === 'sos'
                    ? 'Ver Alerta Completo →'
                    : `Ligar: ${selectedMarker.data.phone}`}
                </Text>
              </TouchableOpacity>

              {selectedMarker.type === 'sos' && user?.uid === selectedMarker.data.authorId && (
                <TouchableOpacity
                  style={[styles.previewActionBtn, { backgroundColor: '#DC2626', marginTop: 6 }]}
                  onPress={() => handleDeleteMyAlert(selectedMarker.data.id)}
                >
                  <Text style={styles.previewActionText}>🗑️ Excluir Meu Alerta</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Modal Detalhado do Alerta SOS com Foto Base64 e Descrição */}
      <Modal
        visible={activeSosAlert !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSosAlert(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sosModalCard}>
            {/* Cabeçalho */}
            <View style={styles.sosModalHeader}>
              <View style={styles.sosBadge}>
                <Text style={styles.sosBadgeText}>🆘 RESGATE SOS RUA</Text>
              </View>
              <TouchableOpacity
                style={styles.sosCloseBtn}
                onPress={() => setActiveSosAlert(null)}
              >
                <Text style={styles.sosCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sosScrollContent}>
              {/* Foto do Alerta (Base64 ou URL) */}
              {activeSosAlert?.photos && activeSosAlert.photos.length > 0 ? (
                <Image
                  source={{ uri: activeSosAlert.photos[0] }}
                  style={styles.sosImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.sosNoImageBox}>
                  <Text style={styles.sosNoImageIcon}>📷</Text>
                  <Text style={styles.sosNoImageText}>Nenhuma foto anexada a este alerta</Text>
                </View>
              )}

              {/* Informações de Publicação */}
              <View style={styles.sosInfoCard}>
                <Text style={styles.sosAuthorText}>
                  👤 Publicado por: <Text style={{ fontWeight: '800', color: colors.text }}>{activeSosAlert?.authorName}</Text>
                </Text>
                {activeSosAlert?.createdAt ? (
                  <Text style={styles.sosDateText}>
                    🕒 {formatDateTime(activeSosAlert.createdAt)}
                  </Text>
                ) : null}
                <Text style={styles.sosAddressText}>
                  📍 {activeSosAlert?.addressHint || 'Localização marcada no mapa'}
                </Text>
              </View>

              {/* Descrição Completa do Alerta */}
              <Text style={styles.sosSectionHeader}>📝 Situação / Descrição do Animal:</Text>
              <View style={styles.sosDescriptionBox}>
                <Text style={styles.sosDescriptionContent}>{activeSosAlert?.description}</Text>
              </View>

              {/* Botão para Traçar Rota */}
              {activeSosAlert?.location ? (
                <TouchableOpacity
                  style={styles.sosNavigateBtn}
                  onPress={() => {
                    const lat = activeSosAlert.location.latitude;
                    const lng = activeSosAlert.location.longitude;
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sosNavigateBtnText}>🗺️ Traçar Rota no Google Maps / Waze</Text>
                </TouchableOpacity>
              ) : null}

              {/* Botão Compartilhar */}
              <TouchableOpacity
                style={styles.sosShareBtn}
                onPress={() => {
                  if (activeSosAlert) {
                    Share.share({
                      message: `🚨 ALERTA SOS DOAPET 🐾\nAnimal em risco precisando de ajuda!\n\nLocal: ${activeSosAlert.addressHint || 'Ver no mapa do app'}\nDescrição: ${activeSosAlert.description}\n\nAbra o aplicativo DoaPet para resgatar!`,
                    });
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.sosShareBtnText}>📣 Compartilhar com Protetores</Text>
              </TouchableOpacity>

              {/* Se não for o autor do alerta, botão para denunciar */}
              {activeSosAlert && user?.uid !== activeSosAlert.authorId && (
                <TouchableOpacity
                  style={[styles.sosShareBtn, { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', marginTop: 10 }]}
                  onPress={() => {
                    const alertToReport = activeSosAlert;
                    setActiveSosAlert(null);
                    handleReportSosAlert(alertToReport);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.sosShareBtnText, { color: '#E11D48' }]}>🚨 Denunciar Alerta (Conteúdo Impróprio)</Text>
                </TouchableOpacity>
              )}

              {/* Se for o autor do alerta, botão para excluir */}
              {activeSosAlert && user?.uid === activeSosAlert.authorId && (
                <TouchableOpacity
                  style={styles.sosDeleteAlertBtn}
                  onPress={() => {
                    const id = activeSosAlert.id;
                    setActiveSosAlert(null);
                    handleDeleteMyAlert(id);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sosDeleteAlertBtnText}>🗑️ Excluir Meu Alerta</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Botões inferiores */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.sosBtnStyle]}
          onPress={() => navigation.navigate('CreateSosAlert')}
        >
          <Text style={styles.actionBtnText}>🆘 Novo SOS Rua</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.donateBtn]}
          onPress={() => navigation.navigate('CreatePet')}
        >
          <Text style={styles.actionBtnText}>🎁 Doar um Pet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dde9ef',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#dde9ef',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  filterBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: spacing.sm,
    zIndex: 20,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.round,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  filterTextActive: {
    color: colors.white,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    top: 60,
    gap: spacing.sm,
    zIndex: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: radii.round,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  centerButton: {
    marginTop: 4,
  },
  petCenterButton: {
    backgroundColor: '#CCFBF1',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  controlText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  previewCard: {
    position: 'absolute',
    bottom: 90,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 20,
  },
  previewClose: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  previewCloseText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: radii.lg,
  },
  previewIconBox: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBigIcon: {
    fontSize: 34,
  },
  previewDetails: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    paddingRight: 24,
  },
  previewSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewLocationHint: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 2,
    fontWeight: '600',
  },
  previewActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  previewActionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    zIndex: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sosBtnStyle: {
    backgroundColor: '#EF4444',
  },
  donateBtn: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sosModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl * 1.5,
    borderTopRightRadius: radii.xl * 1.5,
    maxHeight: '88%',
    padding: spacing.md,
    paddingBottom: spacing.xl,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sosModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sosBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  sosBadgeText: {
    color: '#DC2626',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  sosCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.round,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosCloseBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sosScrollContent: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sosImage: {
    width: '100%',
    height: 220,
    borderRadius: radii.xl,
    backgroundColor: '#F3F4F6',
  },
  sosNoImageBox: {
    width: '100%',
    height: 140,
    borderRadius: radii.xl,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosNoImageIcon: {
    fontSize: 36,
  },
  sosNoImageText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  sosInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  sosAuthorText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sosDateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sosAddressText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 2,
  },
  sosSectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  sosDescriptionBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: spacing.md,
    borderRadius: radii.md,
  },
  sosDescriptionContent: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  sosNavigateBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
  },
  sosNavigateBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  sosShareBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sosShareBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sosDeleteAlertBtn: {
    backgroundColor: '#DC2626',
    borderRadius: radii.xl,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sosDeleteAlertBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});