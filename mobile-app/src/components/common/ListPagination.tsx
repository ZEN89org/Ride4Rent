import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

interface ListPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemName?: string;
  containerStyle?: any;
}

export default function ListPagination({
  currentPage,
  totalItems,
  pageSize = 15,
  onPageChange,
  itemName = "items",
  containerStyle,
}: ListPaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.infoText}>
        Showing <Text style={styles.infoHighlight}>{startItem}–{endItem}</Text> of{" "}
        <Text style={styles.infoHighlight}>{totalItems}</Text> {itemName}
      </Text>

      <View style={styles.controlsRow}>
        {/* Previous Button */}
        <TouchableOpacity
          style={[styles.navBtn, currentPage === 1 && styles.navBtnDisabled]}
          disabled={currentPage === 1}
          onPress={() => onPageChange(currentPage - 1)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={currentPage === 1 ? Colors.secondary : Colors.dark}
          />
          <Text style={[styles.navBtnText, currentPage === 1 && styles.navBtnTextDisabled]}>
            Prev
          </Text>
        </TouchableOpacity>

        {/* Page Number Pills */}
        <View style={styles.pagesRow}>
          {getPageNumbers().map((p, index) => {
            if (p === "...") {
              return (
                <View key={`ellipsis-${index}`} style={styles.ellipsisWrap}>
                  <Text style={styles.ellipsisText}>…</Text>
                </View>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <TouchableOpacity
                key={`page-${p}`}
                style={[styles.pagePill, isCurrent && styles.pagePillActive]}
                onPress={() => onPageChange(p as number)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pagePillText, isCurrent && styles.pagePillTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.navBtn, currentPage === totalPages && styles.navBtnDisabled]}
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          activeOpacity={0.75}
        >
          <Text style={[styles.navBtnText, currentPage === totalPages && styles.navBtnTextDisabled]}>
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={currentPage === totalPages ? Colors.secondary : Colors.dark}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small || 12,
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  infoHighlight: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navBtnDisabled: {
    opacity: 0.45,
    backgroundColor: "#F9FAFB",
  },
  navBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  navBtnTextDisabled: {
    color: Colors.secondary,
  },
  pagesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pagePill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pagePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pagePillText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Colors.dark,
  },
  pagePillTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  ellipsisWrap: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ellipsisText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.secondary,
  },
});
