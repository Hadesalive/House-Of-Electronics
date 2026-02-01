/**
 * Main App Component
 * House of Electronics Mobile App
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, useColorScheme, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Context
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

// Theme
import { getThemeColors } from './src/lib/theme';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import NewProductScreen from './src/screens/NewProductScreen';
import CustomerListScreen from './src/screens/CustomerListScreen';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';
import NewCustomerScreen from './src/screens/NewCustomerScreen';
import InvoiceEditorScreen from './src/screens/InvoiceEditorScreen';
import SalesListScreen from './src/screens/SalesListScreen';
import SaleDetailScreen from './src/screens/SaleDetailScreen';
import NewSaleScreen from './src/screens/NewSaleScreen';
import MoreScreen from './src/screens/MoreScreen';
import DebtListScreen from './src/screens/DebtListScreen';
import DebtDetailScreen from './src/screens/DebtDetailScreen';
import NewDebtScreen from './src/screens/NewDebtScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// CustomersScreen is now CustomerListScreen - imported above

// SalesScreen is now SalesListScreen - imported above

const InvoicesScreen = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.placeholderContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.placeholderText, { color: colors.foreground }]}>
        Invoices (Coming Soon)
      </Text>
    </View>
  );
};


// Bottom Tab Navigator
function MainTabs() {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          // Render icon based on route
          let IconComponent: any = MaterialCommunityIcons;
          let iconName: string = 'home-outline';

          if (route.name === 'Dashboard') {
            iconName = 'analytics-outline';
            IconComponent = Ionicons;
          } else if (route.name === 'Sales') {
            iconName = 'receipt-outline';
            IconComponent = Ionicons;
          } else if (route.name === 'Products') {
            iconName = 'package-variant';
            IconComponent = MaterialCommunityIcons;
          } else if (route.name === 'Customers') {
            iconName = 'account-outline';
            IconComponent = MaterialCommunityIcons;
          } else if (route.name === 'More') {
            iconName = 'dots-horizontal';
            IconComponent = MaterialCommunityIcons;
          }

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent name={iconName} size={24} color={color} />
              {focused && (
                <View style={{
                  position: 'absolute',
                  top: -8,
                  width: 32,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: colors.accent,
                }} />
              )}
            </View>
          );
        },
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 6,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Sales" 
        component={SalesListScreen}
        options={{ tabBarLabel: 'Sales' }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductListScreen}
        options={{ tabBarLabel: 'Products' }}
      />
      <Tab.Screen 
        name="Customers" 
        component={CustomerListScreen}
        options={{ tabBarLabel: 'Clients' }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}

// Loading screen
function LoadingScreen() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

// Navigation with auth check
function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContent isAuthenticated={isAuthenticated} />
  );
}

// Separate component to access ThemeContext (must be inside ThemeProvider)
function NavigationContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="InvoiceEditor" component={InvoiceEditorScreen} />
            <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
            <Stack.Screen name="NewSale" component={NewSaleScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="NewProduct" component={NewProductScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="NewCustomer" component={NewCustomerScreen} />
            <Stack.Screen name="DebtList" component={DebtListScreen} />
            <Stack.Screen name="DebtDetail" component={DebtDetailScreen} />
            <Stack.Screen name="NewDebt" component={NewDebtScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <ThemeProvider>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </ThemeProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 20,
  },
});
