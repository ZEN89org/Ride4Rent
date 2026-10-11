import { Skeleton } from "@/components/common/Skeleton";
import ListPagination from "@/components/common/ListPagination";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { getMyVehicles } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function OperatorVehiclesScreen() {
  const { user, isOperatorPending } = useAuth();
  const { showModal } = useAppToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const vehiclesFlatListRef = React.useRef<FlatList>(null);

  const profile = (user as any)?.operatorProfile ?? (user as any)?.operator_profile;

  const handleAddCar = () => {
    if (isOperatorPending) {
      showModal(
        "Account Under Review",
        "You cannot list new vehicles while your account is pending administrator review. Once your business documents are verified, vehicle listing will be unlocked.",
        [{ text: "Understood", style: "default" }],
        "warning"
      );
      return;
    }

    const hasPaymentSetup = Boolean(
      profile?.account_number && String(profile.account_number).trim()
    );
    if (!hasPaymentSetup) {
      showModal(
        "Payment Setup Required",
        "Please set up your GCash rental payment details first before listing a vehicle, so renters know where to send reservation fees.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set Up Now",
            onPress: () => router.push("/operator-profile" as any),
          },
        ],
        "warning"
      );
      return;
    }

    router.push("/operator-vehicle-upload" as any);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyVehicles();
      setVehicles(data);
    } catch {
      console.error("Unable to load fleet vehicles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <OperatorShell activeRoute="vehicles">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Fleet Catalog</Text>
            <Text style={styles.subtitle}>
              {vehicles.length} {vehicles.length === 1 ? "car listed" : "cars listed in fleet"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddCar}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.addBtnText}>Add Car</Text>
          </TouchableOpacity>
        </View>

        {isOperatorPending && (
          <View style={styles.pendingNotice}>
            <Ionicons name="time" size={18} color="#D97706" />
            <Text style={styles.pendingNoticeText}>
              Your account is currently under review by the Admin. Vehicle listing will be enabled once your documents are approved.
            </Text>
          </View>
        )}

        {!Boolean(profile?.account_number && String(profile.account_number).trim()) && (
          <TouchableOpacity
            style={styles.paymentNoticeBanner}
            onPress={() => router.push("/operator-profile" as any)}
            activeOpacity={0.85}
          >
            <View style={styles.paymentNoticeIconCircle}>
              <Ionicons name="card" size={16} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentNoticeTitle}>Rental Payment Not Set Up</Text>
              <Text style={styles.paymentNoticeText}>
                Set up your GCash details so you can list vehicles and receive reservation fees. Tap to configure.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B45309" />
          </TouchableOpacity>
        )}

        {loading && !refreshing ? (
          <View style={{ gap: 14 }}>
            <Skeleton height={130} borderRadius={18} />
            <Skeleton height={130} borderRadius={18} />
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="car-off" size={38} color={Colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>Your Fleet is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Publish your first vehicle to start receiving rental requests and bookings from renters.
            </Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={handleAddCar}
              activeOpacity={0.85}
            >
              <Text style={styles.addFirstBtnText}>List Your First Car</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={vehiclesFlatListRef}
            data={vehicles.length > 15 ? vehicles.slice((currentPage - 1) * 15, currentPage * 15) : vehicles}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                colors={[Colors.primary]}
              />
            }
            ListFooterComponent={
              vehicles.length > 15 ? (
                <ListPagination
                  currentPage={currentPage}
                  totalItems={vehicles.length}
                  pageSize={15}
                  itemName="vehicles"
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    vehiclesFlatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  }}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/vehicles/${item.id}` as any)}
                activeOpacity={0.88}
              >
                <Image
                  source={{
                    uri:
                      item.image_url ||
                      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60",
                  }}
                  style={styles.image}
                />

                <View style={styles.details}>
                  <View style={styles.nameRow}>
                    <Text style={styles.vehicleName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Active</Text>
                    </View>
                  </View>

                  <Text style={styles.specsText}>
                    {item.transmission || "Auto"} • {item.seats || 5} Seats • {item.fuel_type || "Gas"}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>
                      ₱{Number(item.price_per_day).toLocaleString()}
                      <Text style={styles.pricePeriod}> / day</Text>
                    </Text>

                    <View style={styles.viewBadge}>
                      <Text style={styles.viewText}>Preview</Text>
                      <Ionicons name="chevron-forward" size={12} color={Colors.dark} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </OperatorShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
  },
  subtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    padding: 10,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    alignItems: "center",
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    height: 90,
    width: 105,
    borderRadius: 14,
    backgroundColor: Colors.inputBackground,
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleName: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 15,
    flex: 1,
    marginRight: 4,
  },
  statusBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: "#10B981",
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  specsText: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 3,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  pricePeriod: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 10,
  },
  viewBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  viewText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.dark,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    marginTop: Spacing.xs,
  },
  emptySubtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  addFirstBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addFirstBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.white,
  },
  pendingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pendingNoticeText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 18,
    color: "#92400E",
  },
  paymentNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  paymentNoticeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentNoticeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#92400E",
  },
  paymentNoticeText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: "#B45309",
    marginTop: 2,
  },
});
