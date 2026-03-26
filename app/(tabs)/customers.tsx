import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, FlatList,
  StyleSheet, Alert, ViewStyle, TextStyle, Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK } from "@/constants/brand";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  mailingAddress: string;
  physicalAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  industry: string;
  status: "active" | "inactive" | "prospect" | "vip";
  terms: string;
  notes: string;
  totalJobs: number;
  totalRevenue: number;
  lastJobDate: string;
  createdAt: string;
  tags: string[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 1, company: "Apex Construction Ltd.", contactName: "Michael Chen",
    email: "m.chen@apexconstruction.ca", phone: "(204) 555-0101",
    mailingAddress: "PO Box 1234", physicalAddress: "123 Main St",
    city: "Winnipeg", province: "MB", postalCode: "R3C 1A1", country: "Canada",
    industry: "Construction", status: "vip", terms: "Net 30",
    notes: "Preferred client. Always request Marcus Johnson as lead tech.",
    totalJobs: 47, totalRevenue: 58420, lastJobDate: "2026-03-20", createdAt: "2023-01-15",
    tags: ["VIP", "Commercial", "Priority"],
  },
  {
    id: 2, company: "Prairie Mechanical Inc.", contactName: "Sandra Kowalski",
    email: "s.kowalski@prairiemech.ca", phone: "(204) 555-0202",
    mailingAddress: "789 Portage Ave", physicalAddress: "789 Portage Ave",
    city: "Winnipeg", province: "MB", postalCode: "R3G 0N1", country: "Canada",
    industry: "HVAC", status: "active", terms: "Net 15",
    notes: "Seasonal maintenance contract. Spring and fall tune-ups.",
    totalJobs: 23, totalRevenue: 18750, lastJobDate: "2026-03-18", createdAt: "2023-06-10",
    tags: ["HVAC", "Contract", "Seasonal"],
  },
  {
    id: 3, company: "Riverstone Properties", contactName: "James Whitfield",
    email: "j.whitfield@riverstone.ca", phone: "(204) 555-0303",
    mailingAddress: "456 River Rd", physicalAddress: "456 River Rd",
    city: "Winnipeg", province: "MB", postalCode: "R2H 0S2", country: "Canada",
    industry: "Property Management", status: "active", terms: "Net 30",
    notes: "Multi-unit residential. 12 buildings under management.",
    totalJobs: 89, totalRevenue: 112300, lastJobDate: "2026-03-22", createdAt: "2022-09-01",
    tags: ["Residential", "Multi-Unit", "Recurring"],
  },
  {
    id: 4, company: "Northern Logistics Corp", contactName: "Priya Sharma",
    email: "p.sharma@northernlogistics.ca", phone: "(204) 555-0404",
    mailingAddress: "321 Henderson Hwy", physicalAddress: "321 Henderson Hwy",
    city: "Winnipeg", province: "MB", postalCode: "R2K 2M3", country: "Canada",
    industry: "Logistics", status: "active", terms: "Net 45",
    notes: "Fleet maintenance. 24 vehicles. Emergency callouts authorized.",
    totalJobs: 34, totalRevenue: 41200, lastJobDate: "2026-03-15", createdAt: "2024-02-20",
    tags: ["Fleet", "Emergency", "Commercial"],
  },
  {
    id: 5, company: "Westgate Retail Group", contactName: "Tom Nguyen",
    email: "t.nguyen@westgateretail.ca", phone: "(204) 555-0505",
    mailingAddress: "654 Grant Ave", physicalAddress: "654 Grant Ave",
    city: "Winnipeg", province: "MB", postalCode: "R3M 1Y3", country: "Canada",
    industry: "Retail", status: "prospect", terms: "COD",
    notes: "Prospect from trade show. Interested in annual maintenance contract.",
    totalJobs: 2, totalRevenue: 1850, lastJobDate: "2026-02-10", createdAt: "2026-01-05",
    tags: ["Prospect", "Retail"],
  },
  {
    id: 6, company: "Clearview Glass & Glazing", contactName: "Rachel Kim",
    email: "r.kim@clearviewglass.ca", phone: "(204) 555-0606",
    mailingAddress: "987 St. Mary's Rd", physicalAddress: "987 St. Mary's Rd",
    city: "Winnipeg", province: "MB", postalCode: "R2M 3R5", country: "Canada",
    industry: "Glass & Glazing", status: "active", terms: "Net 30",
    notes: "Specialty glass work. Requires certified glazing technicians only.",
    totalJobs: 15, totalRevenue: 22100, lastJobDate: "2026-03-12", createdAt: "2024-07-15",
    tags: ["Specialty", "Certified Required"],
  },
  {
    id: 7, company: "Summit Roofing Ltd.", contactName: "David Okafor",
    email: "d.okafor@summitroofing.ca", phone: "(204) 555-0707",
    mailingAddress: "147 Oak Ave", physicalAddress: "147 Oak Ave",
    city: "Winnipeg", province: "MB", postalCode: "R3L 0B8", country: "Canada",
    industry: "Roofing", status: "inactive", terms: "Net 60",
    notes: "Account on hold pending payment of outstanding invoice #NVC-2025-0892.",
    totalJobs: 8, totalRevenue: 9400, lastJobDate: "2025-11-30", createdAt: "2024-03-01",
    tags: ["Roofing", "On Hold"],
  },
];

const STATUS_CONFIG: Record<Customer["status"], { label: string; color: string; bg: string }> = {
  vip:      { label: "VIP",      color: "#F59E0B", bg: "#FEF3C7" },
  active:   { label: "Active",   color: "#16A34A", bg: "#DCFCE7" },
  prospect: { label: "Prospect", color: "#3B82F6", bg: "#DBEAFE" },
  inactive: { label: "Inactive", color: "#9CA3AF", bg: "#F3F4F6" },
};

const FILTER_OPTIONS: { label: string; value: Customer["status"] | "all" }[] = [
  { label: "All", value: "all" },
  { label: "VIP", value: "vip" },
  { label: "Active", value: "active" },
  { label: "Prospect", value: "prospect" },
  { label: "Inactive", value: "inactive" },
];

// ─── Customer Row ─────────────────────────────────────────────────────────────

function CustomerRow({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const colors = useColors();
  const sc = STATUS_CONFIG[customer.status];
  const initials = customer.company.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, opacity: pressed ? 0.82 : 1 },
      ] as ViewStyle[]}
      onPress={onPress}
    >
      <View style={[styles.rowAvatar, { backgroundColor: NVC_BLUE + "18" }] as ViewStyle[]}>
        <Text style={[styles.rowAvatarText, { color: NVC_BLUE }] as TextStyle[]}>{initials}</Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowCompany, { color: colors.foreground }] as TextStyle[]} numberOfLines={1}>
            {customer.company}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }] as ViewStyle[]}>
            <Text style={[styles.statusText, { color: sc.color }] as TextStyle[]}>{sc.label}</Text>
          </View>
        </View>
        <Text style={[styles.rowContact, { color: colors.muted }] as TextStyle[]} numberOfLines={1}>
          {customer.contactName} · {customer.industry}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.rowMetaText, { color: colors.muted }] as TextStyle[]}>
            {customer.totalJobs} jobs
          </Text>
          <Text style={[styles.rowMetaDot, { color: colors.border }] as TextStyle[]}>·</Text>
          <Text style={[styles.rowMetaText, { color: NVC_BLUE }] as TextStyle[]}>
            ${customer.totalRevenue.toLocaleString()}
          </Text>
          <Text style={[styles.rowMetaDot, { color: colors.border }] as TextStyle[]}>·</Text>
          <Text style={[styles.rowMetaText, { color: colors.muted }] as TextStyle[]}>
            {customer.terms}
          </Text>
        </View>
      </View>
      <IconSymbol name="chevron.right" size={14} color={colors.muted} />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Customer["status"] | "all">("all");
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchFilter = filter === "all" || c.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.company.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [customers, search, filter]);

  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const activeCount = customers.filter((c) => c.status === "active" || c.status === "vip").length;

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }] as ViewStyle[]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.headerLogo as any} resizeMode="contain" />
          <View>
            <Text style={styles.headerTitle}>Customers</Text>
            <Text style={styles.headerSub}>{customers.length} total · {activeCount} active</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/customer/new" as any);
          }}
        >
          <IconSymbol name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* ── Stats Row ── */}
      <View style={[styles.statsWrap, { backgroundColor: NVC_BLUE }] as ViewStyle[]}>
        <View style={styles.statsRow}>
          {[
            { label: "Total Clients", value: customers.length.toString(), color: "#fff" },
            { label: "Active / VIP", value: activeCount.toString(), color: "#FCD34D" },
            { label: "Total Revenue", value: "$" + (totalRevenue / 1000).toFixed(0) + "k", color: "#6EE7B7" },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.color }] as TextStyle[]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Search ── */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }] as ViewStyle[]}>
        <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }] as TextStyle[]}
          placeholder="Search company, contact, industry..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <IconSymbol name="xmark" size={14} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* ── Filter Tabs ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterTabs}
        style={[styles.filterTabsWrap, { borderBottomColor: colors.border }] as ViewStyle[]}
      >
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.filterTab,
                { borderBottomColor: isActive ? NVC_ORANGE : "transparent" },
              ] as ViewStyle[]}
              onPress={() => setFilter(opt.value)}
            >
              <Text style={[styles.filterTabText, { color: isActive ? NVC_ORANGE : colors.muted }] as TextStyle[]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Customer List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }] as ViewStyle[]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconSymbol name="person.text.rectangle.fill" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }] as TextStyle[]}>No customers found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CustomerRow
            customer={item}
            onPress={() => router.push(`/customer/${item.id}` as any)}
          />
        )}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create<{
  header: ViewStyle; headerLeft: ViewStyle; headerLogo: ViewStyle; headerTitle: TextStyle; headerSub: TextStyle;
  addBtn: ViewStyle; addBtnText: TextStyle;
  statsWrap: ViewStyle; statsRow: ViewStyle; statItem: ViewStyle; statValue: TextStyle; statLabel: TextStyle;
  searchWrap: ViewStyle; searchInput: TextStyle;
  filterTabsWrap: ViewStyle; filterTabs: ViewStyle; filterTab: ViewStyle; filterTabText: TextStyle;
  list: ViewStyle; separator: ViewStyle;
  row: ViewStyle; rowAvatar: ViewStyle; rowAvatarText: TextStyle; rowContent: ViewStyle;
  rowTop: ViewStyle; rowCompany: TextStyle; statusBadge: ViewStyle; statusText: TextStyle;
  rowContact: TextStyle; rowMeta: ViewStyle; rowMetaText: TextStyle; rowMetaDot: TextStyle;
  empty: ViewStyle; emptyText: TextStyle;
}>({
  // Header
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 26, height: 26 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: NVC_ORANGE, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Stats
  statsWrap: { paddingHorizontal: 16, paddingBottom: 14 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "500", marginTop: 2 },

  // Search
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 14, marginTop: 12, marginBottom: 4,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    shadowColor: "#0A1929", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Filter Tabs
  filterTabsWrap: { borderBottomWidth: 0.5, marginTop: 4 },
  filterTabs: { paddingHorizontal: 14, gap: 4 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2 },
  filterTabText: { fontSize: 13, fontWeight: "600" },

  // List
  list: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 40 },
  separator: { height: 0.5, marginLeft: 72 },

  // Row
  row: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12,
    borderRadius: 0,
  },
  rowAvatar: {
    width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  rowAvatarText: { fontSize: 14, fontWeight: "800" },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  rowCompany: { fontSize: 14, fontWeight: "700", flex: 1 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  rowContact: { fontSize: 12, marginBottom: 3 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  rowMetaText: { fontSize: 11, fontWeight: "500" },
  rowMetaDot: { fontSize: 11 },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: "500" },
});
