/**
 * Navegação raiz do app DoaPet
 *
 * Fluxo:
 *  - Splash enquanto restaura a sessão (cache local / AsyncStorage).
 *  - Usuário não autenticado -> Login com Google.
 *  - Usuário autenticado    -> MainTabs (Mapa, Conversas, Botão Central Adoção/Doação, Eventos, Perfil).
 */
import React, { useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { colors, radii, spacing } from '@/theme';
import type { MainTabParamList, RootStackParamList } from './types';

// Telas de autenticação
import { SplashScreen } from '@/screens/auth/SplashScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';

// Telas principais
import { HomeMapScreen } from '@/screens/home/HomeMapScreen';
import { SwipeScreen } from '@/screens/swipe/SwipeScreen';
import { EventsScreen } from '@/screens/events/EventsScreen';
import { ChatsScreen } from '@/screens/chat/ChatsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';

// Telas de detalhe/criação
import { PetDetailScreen } from '@/screens/pets/PetDetailScreen';
import { CreatePetScreen } from '@/screens/pets/CreatePetScreen';
import { EditPetScreen } from '@/screens/pets/EditPetScreen';
import { CreateSosAlertScreen } from '@/screens/sos/CreateSosAlertScreen';
import { ChatRoomScreen } from '@/screens/chat/ChatRoomScreen';
import { ProjectSupportModal } from '@/components/ProjectSupportModal';
import { shouldShowSupportModal, recordSupportModalShown } from '@/services/projectSupport';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 20,
        opacity: focused ? 1 : 0.5,
        transform: [{ scale: focused ? 1.15 : 1 }],
      }}
    >
      {emoji}
    </Text>
  );
}

/**
 * Botão central elevado com ícone de patinha 🐾
 * Destacado como o ponto focal da barra de navegação inferior.
 */
function CentralPawButton({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        top: -16,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: focused ? colors.primaryDark : colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: colors.primary,
        shadowOpacity: 0.45,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 3,
        borderColor: colors.white,
      }}
    >
      <Text style={{ fontSize: 26 }}>🐾</Text>
    </View>
  );
}

/** Abas principais do aplicativo alinhadas com o mockup conceitual */
function MainTabs() {
  const [adoptionModalVisible, setAdoptionModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  React.useEffect(() => {
    shouldShowSupportModal().then((shouldShow) => {
      if (shouldShow) {
        setSupportModalVisible(true);
        recordSupportModalShown();
      }
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Swipe"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
            backgroundColor: colors.white,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: -2 },
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="HomeMap"
          component={HomeMapScreen}
          options={{
            title: 'Explorar',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Chats"
          component={ChatsScreen}
          options={{
            title: 'Conversas',
            tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Swipe"
          component={SwipeScreen}
          options={{
            title: 'Adoção',
            tabBarIcon: ({ focused }) => <CentralPawButton focused={focused} />,
          }}
          listeners={({ navigation: tabNav }) => ({
            tabPress: (e) => {
              e.preventDefault();
              setAdoptionModalVisible(true);
            },
          })}
        />
        <Tab.Screen
          name="Events"
          component={EventsScreen}
          options={{
            title: 'Eventos',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Perfil',
            tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
          }}
        />
      </Tab.Navigator>

      {/* Modal Interativo de Escolha: Adotar ou Doar */}
      <Modal
        visible={adoptionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAdoptionModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.overlay}
          activeOpacity={1}
          onPress={() => setAdoptionModalVisible(false)}
        >
          <View style={modalStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={modalStyles.dragHandle} />
            <Text style={modalStyles.headerTitle}>🐾 Adoção & Doação DoaPet</Text>
            <Text style={modalStyles.headerSubtitle}>
              Escolha como você deseja transformar uma vida hoje:
            </Text>

            {/* Opção 1: Quero Adotar */}
            <TouchableOpacity
              style={[modalStyles.card, { borderColor: colors.primary }]}
              onPress={() => {
                setAdoptionModalVisible(false);
                (navigation as any).navigate('MainTabs', { screen: 'Swipe' });
              }}
              activeOpacity={0.85}
            >
              <View style={[modalStyles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Text style={modalStyles.iconEmoji}>💚</Text>
              </View>
              <View style={modalStyles.textBox}>
                <Text style={[modalStyles.cardTitle, { color: colors.primaryDark }]}>
                  Quero Adotar um Pet
                </Text>
                <Text style={modalStyles.cardDescription}>
                  Navegue pelos animais no Tinder dos pets, arraste para a direita, dê Match e converse com o doador!
                </Text>
              </View>
              <Text style={modalStyles.arrow}>➔</Text>
            </TouchableOpacity>

            {/* Opção 2: Quero Doar */}
            <TouchableOpacity
              style={[modalStyles.card, { borderColor: colors.accent }]}
              onPress={() => {
                setAdoptionModalVisible(false);
                navigation.navigate('CreatePet');
              }}
              activeOpacity={0.85}
            >
              <View style={[modalStyles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <Text style={modalStyles.iconEmoji}>🎁</Text>
              </View>
              <View style={modalStyles.textBox}>
                <Text style={[modalStyles.cardTitle, { color: '#B45309' }]}>
                  Quero Doar um Pet
                </Text>
                <Text style={modalStyles.cardDescription}>
                  Cadastre o animalzinho com fotos, história, bairro e seus contatos de WhatsApp e Instagram para adoção responsável!
                </Text>
              </View>
              <Text style={modalStyles.arrow}>➔</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.cancelBtn}
              onPress={() => setAdoptionModalVisible(false)}
            >
              <Text style={modalStyles.cancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Quinzenal de Apoio e Contribuição ao Projeto */}
      <ProjectSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
      />
    </View>
  );
}

export function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Grupo público: autenticação
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          // Grupo privado: app principal
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="PetDetail"
              component={PetDetailScreen}
              options={{ headerShown: true, title: 'Detalhes do Pet' }}
            />
            <Stack.Screen
              name="ChatRoom"
              component={ChatRoomScreen}
              options={{ headerShown: true, title: 'Chat com Doador' }}
            />
            <Stack.Screen
              name="CreatePet"
              component={CreatePetScreen}
              options={{ headerShown: true, title: 'Doar um Pet 🐾' }}
            />
            <Stack.Screen
              name="EditPet"
              component={EditPetScreen}
              options={{ headerShown: true, title: 'Editar Doação 🐾' }}
            />
            <Stack.Screen
              name="CreateSosAlert"
              component={CreateSosAlertScreen}
              options={{ headerShown: true, title: 'Alerta SOS Rua' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    marginBottom: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 26,
  },
  textBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  arrow: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});