import { View } from "react-native";
import { Skeleton } from "./Skeleton";
export default function Loading() { return <View accessibilityLabel="Loading content" style={{ padding: 20, gap: 16, width: "100%" }}><Skeleton height={140} /><Skeleton height={20} width="70%" /><Skeleton height={100} /></View>; }
