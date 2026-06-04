// ============================================
// TAB STACK NAVIGATORS
// ============================================

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import BuyScreen from "../screens/BuyScreen";
import RentScreen from "../screens/RentScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PropertyDetailsScreen from "../screens/PropertyDetailsScreen";
import EditListingScreen from "../screens/EditListingScreen";
import PremiumUpgradeScreen from "../screens/PremiumUpgradeScreen";
import SellScreen from "../screens/SellScreen";
import EstimateLauncherScreen from "../screens/EstimateLauncherScreen";
import EstimateHouseScreen from "../screens/EstimateHouseScreen";
import EstimateLandScreen from "../screens/EstimateLandScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import VerifyIdentityScreen from "../screens/VerifyIdentityScreen";
import MyListingsScreen from "../screens/MyListingsScreen";
import AdminPendingScreen from "../screens/AdminPendingScreen";
import AdminPendingUsersScreen from "../screens/AdminPendingUsersScreen";
import BecomeAgentScreen from "../screens/BecomeAgentScreen";
import AgentProfileScreen from "../screens/AgentProfileScreen";
import AdminPendingAgentsScreen from "../screens/AdminPendingAgentsScreen";
import ConversationsListScreen from "../screens/ConversationsListScreen";
import ChatScreen from "../screens/ChatScreen";
import AIChatScreen from "../screens/AIChatScreen";
import AIConversationsScreen from "../screens/AIConversationsScreen";
import LandlordDashboardScreen from "../screens/LandlordDashboardScreen";
import MyInquiriesScreen from "../screens/MyInquiriesScreen";

const screenOptions = { headerShown: false };

const HomeStackNav = createNativeStackNavigator();
export function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={screenOptions}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen name="Rent" component={RentScreen} options={{ headerShown: true, title: "For Rent" }} />
      <HomeStackNav.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <HomeStackNav.Screen name="EditListing" component={EditListingScreen} options={{ headerShown: true, title: "Edit Listing" }} />
      <HomeStackNav.Screen name="PremiumUpgrade" component={PremiumUpgradeScreen} options={{ headerShown: true, title: "Landlord Premium" }} />
      <HomeStackNav.Screen name="AgentProfile" component={AgentProfileScreen} />
    </HomeStackNav.Navigator>
  );
}

const BuyStackNav = createNativeStackNavigator();
export function BuyStack() {
  return (
    <BuyStackNav.Navigator screenOptions={screenOptions}>
      <BuyStackNav.Screen name="BuyMain" component={BuyScreen} />
      <BuyStackNav.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <BuyStackNav.Screen name="EditListing" component={EditListingScreen} options={{ headerShown: true, title: "Edit Listing" }} />
      <BuyStackNav.Screen name="PremiumUpgrade" component={PremiumUpgradeScreen} options={{ headerShown: true, title: "Landlord Premium" }} />
      <BuyStackNav.Screen name="AgentProfile" component={AgentProfileScreen} />
    </BuyStackNav.Navigator>
  );
}

const RentStackNav = createNativeStackNavigator();
export function RentStack() {
  return (
    <RentStackNav.Navigator screenOptions={screenOptions}>
      <RentStackNav.Screen name="RentMain" component={RentScreen} />
      <RentStackNav.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <RentStackNav.Screen name="EditListing" component={EditListingScreen} options={{ headerShown: true, title: "Edit Listing" }} />
      <RentStackNav.Screen name="PremiumUpgrade" component={PremiumUpgradeScreen} options={{ headerShown: true, title: "Landlord Premium" }} />
      <RentStackNav.Screen name="AgentProfile" component={AgentProfileScreen} />
    </RentStackNav.Navigator>
  );
}

const SellStackNav = createNativeStackNavigator();
export function SellStack() {
  return (
    <SellStackNav.Navigator screenOptions={screenOptions}>
      <SellStackNav.Screen name="SellMain" component={SellScreen} />
    </SellStackNav.Navigator>
  );
}

const EstimateStackNav = createNativeStackNavigator();
export function EstimateStack() {
  return (
    <EstimateStackNav.Navigator screenOptions={screenOptions}>
      <EstimateStackNav.Screen name="EstimateLauncher" component={EstimateLauncherScreen} />
      <EstimateStackNav.Screen name="EstimateHouse" component={EstimateHouseScreen} />
      <EstimateStackNav.Screen name="EstimateLand" component={EstimateLandScreen} />
    </EstimateStackNav.Navigator>
  );
}

const MessagesStackNav = createNativeStackNavigator();
export function MessagesStack() {
  return (
    <MessagesStackNav.Navigator screenOptions={screenOptions}>
      <MessagesStackNav.Screen name="ConversationsList" component={ConversationsListScreen} />
      <MessagesStackNav.Screen name="Chat" component={ChatScreen} />
      <MessagesStackNav.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <MessagesStackNav.Screen name="EditListing" component={EditListingScreen} options={{ headerShown: true, title: "Edit Listing" }} />
      <MessagesStackNav.Screen name="PremiumUpgrade" component={PremiumUpgradeScreen} options={{ headerShown: true, title: "Landlord Premium" }} />
      <MessagesStackNav.Screen name="AgentProfile" component={AgentProfileScreen} />
    </MessagesStackNav.Navigator>
  );
}

const ProfileStackNav = createNativeStackNavigator();
export function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={screenOptions}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStackNav.Screen name="AIChat" component={AIChatScreen} options={{ headerShown: true, title: "EstateAI Assistant" }} />
      <ProfileStackNav.Screen name="AIConversations" component={AIConversationsScreen} options={{ headerShown: true, title: "Chats with AI" }} />
      <ProfileStackNav.Screen name="LandlordDashboard" component={LandlordDashboardScreen} options={{ headerShown: true, title: "Landlord Dashboard" }} />
      <ProfileStackNav.Screen name="MyInquiries" component={MyInquiriesScreen} options={{ headerShown: true, title: "My Inquiries" }} />
      <ProfileStackNav.Screen name="Favorites" component={FavoritesScreen} />
      <ProfileStackNav.Screen name="VerifyIdentity" component={VerifyIdentityScreen} />
      <ProfileStackNav.Screen name="MyListings" component={MyListingsScreen} />
      <ProfileStackNav.Screen name="AdminPending" component={AdminPendingScreen} />
      <ProfileStackNav.Screen name="AdminPendingUsers" component={AdminPendingUsersScreen} />
      <ProfileStackNav.Screen name="BecomeAgent" component={BecomeAgentScreen} />
      <ProfileStackNav.Screen name="AgentProfile" component={AgentProfileScreen} />
      <ProfileStackNav.Screen name="AdminPendingAgents" component={AdminPendingAgentsScreen} />
      <ProfileStackNav.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <ProfileStackNav.Screen name="EditListing" component={EditListingScreen} options={{ headerShown: true, title: "Edit Listing" }} />
      <ProfileStackNav.Screen name="PremiumUpgrade" component={PremiumUpgradeScreen} options={{ headerShown: true, title: "Landlord Premium" }} />
    </ProfileStackNav.Navigator>
  );
}
