import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useState(() => new Animated.Value(0.3))[0];

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function VehicleCardSkeleton({
  width = 300,
  height = 230,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <View style={[styles.cardSkeleton, { width, height }]}>
      <Skeleton width="100%" height={height} borderRadius={20} />
    </View>
  );
}

export function ProCardSkeleton() {
  return (
    <View style={styles.proCardSkeleton}>
      <Skeleton width="100%" height={160} borderRadius={16} />
      <View style={{ marginTop: 12, gap: 8 }}>
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" height={14} />
        <Skeleton width="90%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#E2E8F0",
  },
  cardSkeleton: {
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 14,
  },
  proCardSkeleton: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
