import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View, Text, FlatList, Pressable, TextInput,
  StyleSheet, ViewStyle, TextStyle, Image,
  Platform, useWindowDimensions, ScrollView, Modal,
  Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE, NVC_LOGO_DARK } from "@/constants/brand";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RefreshControl } from "react-native";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/hooks/use-tenant";

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

// ─── Sort Config ─────────────────────────────────────────────────────────────

type CustomerSortKey = "name_asc" | "revenue_desc" | "jobs_desc" | "recent_job" | "status";

const SORT_OPTIONS: { key: CustomerSortKey; label: string; icon: string }[] = [
  { key: "name_asc",     label: "Name A → Z",         icon: "textformat.abc" },
  { key: "revenue_desc", label: "Revenue: High → Low", icon: "dollarsign.circle.fill" },
  { key: "jobs_desc",    label: "Most Jobs",           icon: "checkmark.circle.fill" },
  { key: "recent_job",   label: "Most Recent Job",     icon: "clock.fill" },
  { key: "status",       label: "Status",              icon: "circle.fill" },
];

function sortCustomers(list: Customer[], key: CustomerSortKey): Customer[] {
  const STATUS_ORDER: Record<Customer["status"], number> = { vip: 0, active: 1, prospect: 2, inactive: 3 };
  return [...list].sort((a, b) => {
    switch (key) {
      case "name_asc":     return a.company.localeCompare(b.company);
      case "revenue_desc": return b.totalRevenue - a.totalRevenue;
      case "jobs_desc":    return b.totalJobs - a.totalJobs;
      case "recent_job":   return (b.lastJobDate || "").localeCompare(a.lastJobDate || "");
      case "status":       return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      default:             return 0;
    }
  });
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Customer["status"], { label: string; color: string; bg: string; border: string }> = {
  vip:      { label: "VIP",      color: "#D97706", bg: "#FEF3C7", border: "#FCD34D" },
  active:   { label: "Active",   color: "#16A34A", bg: "#DCFCE7", border: "#86EFAC" },
  prospect: { label: "Prospect", color: "#2563EB", bg: "#DBEAFE", border: "#93C5FD" },
  inactive: { label: "Inactive", color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB" },
};

const FILTER_OPTIONS: { label: string; value: Customer["status"] | "all" }[] = [
  { label: "All", value: "all" },
  { label: "VIP", value: "vip" },
  { label: "Active", value: "active" },
  { label: "Prospect", value: "prospect" },
  { label: "Inactive", value: "inactive" },
];

// Industry icon mapping (using available SF Symbols)
const INDUSTRY_ICONS: Record<string, string> = {
  "Construction": "hammer.fill",
  "HVAC": "wind",
  "Property Management": "building.2.fill",
  "Logistics": "shippingbox.fill",
  "Retail": "cart.fill",
  "Glass & Glazing": "sparkles",
  "Roofing": "house.fill",
};

// ─── Customer Grid Card ───────────────────────────────────────────────────────

function CustomerGridCard({
  customer,
  onPress,
  cardWidth,
}: {
  customer: Customer;
  onPress: () => void;
  cardWidth: number;
}) {
  const sc = STATUS_CONFIG[customer.status];
  const initials = customer.company.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const industryIcon = (INDUSTRY_ICONS[customer.industry] ?? "briefcase.fill") as any;
  const fullAddress = [customer.physicalAddress, customer.city, customer.province].filter(Boolean).join(", ");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridCard,
        { width: cardWidth, opacity: pressed ? 0.88 : 1, transform: pressed ? [{ scale: 0.97 }] : [] },
      ] as ViewStyle[]}
      onPress={onPress}
    >
      {/* Status accent bar */}
      <View style={[styles.gridCardAccent, { backgroundColor: sc.color }] as ViewStyle[]} />

      {/* Avatar */}
      <View style={styles.gridAvatarWrap}>
        <View style={[styles.gridAvatar, { backgroundColor: NVC_BLUE + "18" }] as ViewStyle[]}>
          <Text style={[styles.gridAvatarText, { color: NVC_BLUE }] as TextStyle[]}>{initials}</Text>
        </View>
        {/* Status badge */}
        <View style={[styles.gridStatusBadge, { backgroundColor: sc.bg, borderColor: sc.border }] as ViewStyle[]}>
          <Text style={[styles.gridStatusText, { color: sc.color }] as TextStyle[]}>{sc.label}</Text>
        </View>
      </View>

      {/* Company name */}
      <Text style={styles.gridCompany} numberOfLines={2}>{customer.company}</Text>

      {/* Contact name */}
      <Text style={styles.gridContact} numberOfLines={1}>{customer.contactName}</Text>

      {/* Industry chip */}
      <View style={styles.gridIndustryRow}>
        <IconSymbol name={industryIcon} size={10} color="#6B7280" />
        <Text style={styles.gridIndustry} numberOfLines={1}>{customer.industry}</Text>
      </View>

      {/* Address */}
      {fullAddress ? (
        <View style={styles.gridAddressRow}>
          <IconSymbol name="location.fill" size={9} color="#9CA3AF" />
          <Text style={styles.gridAddress} numberOfLines={2}>{fullAddress}</Text>
        </View>
      ) : null}

      {/* Phone */}
      {customer.phone ? (
        <View style={styles.gridPhoneRow}>
          <IconSymbol name="phone.fill" size={9} color="#9CA3AF" />
          <Text style={styles.gridPhone} numberOfLines={1}>{customer.phone}</Text>
        </View>
      ) : null}

      {/* Divider */}
      <View style={styles.gridDivider} />

      {/* Stats row */}
      <View style={styles.gridStats}>
        <View style={styles.gridStat}>
          <Text style={styles.gridStatValue}>{customer.totalJobs}</Text>
          <Text style={styles.gridStatLabel}>jobs</Text>
        </View>
        <View style={styles.gridStatDivider} />
        <View style={styles.gridStat}>
          <Text style={[styles.gridStatValue, { color: NVC_BLUE }] as TextStyle[]}>
            ${customer.totalRevenue >= 1000 ? (customer.totalRevenue / 1000).toFixed(0) + "k" : customer.totalRevenue.toLocaleString()}
          </Text>
          <Text style={styles.gridStatLabel}>revenue</Text>
        </View>
      </View>

      {/* Tags */}
      {customer.tags.length > 0 && (
        <View style={styles.gridTagsRow}>
          {customer.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.gridTag}>
              <Text style={styles.gridTagText}>{tag}</Text>
            </View>
          ))}
          {customer.tags.length > 2 && (
            <View style={[styles.gridTag, styles.gridTagMore] as ViewStyle[]}>
              <Text style={styles.gridTagText}>+{customer.tags.length - 2}</Text>
            </View>
          )}
        </View>
      )}

      {/* View button */}
      <View style={styles.gridViewBtn}>
        <Text style={styles.gridViewBtnText}>View Profile</Text>
        <IconSymbol name="chevron.right" size={11} color={NVC_BLUE} />
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filter, setFilter] = useState<Customer["status"] | "all">("all");
  const [sortKey, setSortKey] = useState<CustomerSortKey>("name_asc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const { tenantId, isDemo } = useTenant();
  const [exportLoading, setExportLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("card");

  const exportCsvQuery = trpc.export.customersCsv.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: false },
  );

  const handleExportCsv = useCallback(async () => {
    if (isDemo) { Alert.alert("Demo Mode", "Export is available with a live account."); return; }
    setExportLoading(true);
    try {
      const result = await exportCsvQuery.refetch();
      const data = result.data;
      if (!data) throw new Error("No data returned");
      if (Platform.OS === "web") {
        const blob = new Blob([(data as any).csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = (data as any).filename; a.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert("Export Ready", `CSV export generated. File: ${(data as any).filename}`);
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e?.message ?? "Could not generate export.");
    } finally {
      setExportLoading(false);
    }
  }, [isDemo, exportCsvQuery]);

  // Responsive columns
  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const CARD_GAP = 10;
  const HORIZONTAL_PADDING = 12;
  const cardWidth = (width - HORIZONTAL_PADDING * 2 - CARD_GAP * (numColumns - 1)) / numColumns;

  // ── Real API query ───────────────────────────────────────────────────────────────
  const { data: apiCustomers, isLoading: apiLoading, refetch } = trpc.customers.list.useQuery(
    { tenantId: tenantId ?? 0 },
    { enabled: !isDemo && tenantId !== null, staleTime: 60_000 },
  );

  // ── Normalize API customers to local Customer shape ───────────────────────────
  const normalizedApiCustomers: Customer[] = useMemo(() => {
    if (!apiCustomers) return [];
    return (apiCustomers as any[]).map((c) => ({
      id: c.id,
      company: c.company ?? "",
      contactName: c.contactName ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      mailingAddress: c.mailingStreet ?? "",
      physicalAddress: c.physicalStreet ?? c.mailingStreet ?? "",
      city: c.mailingCity ?? "",
      province: c.mailingProvince ?? "",
      postalCode: c.mailingPostalCode ?? "",
      country: c.mailingCountry ?? "Canada",
      industry: c.industry ?? "",
      status: (c.status ?? "prospect") as Customer["status"],
      terms: c.paymentTerms ?? "net_30",
      notes: c.notes ?? "",
      totalJobs: c.totalJobs ?? 0,
      totalRevenue: c.totalRevenueCents ? c.totalRevenueCents / 100 : 0,
      lastJobDate: c.lastJobDate ? new Date(c.lastJobDate).toISOString().split("T")[0] : "",
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "",
      tags: c.tags ? c.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    }));
  }, [apiCustomers]);

  const customers = isDemo ? MOCK_CUSTOMERS : normalizedApiCustomers;

  // ── Advanced search + sort ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = customers.filter((c) => {
      // Status filter
      if (filter !== "all" && c.status !== filter) return false;
      // Search filter: company, contact name, phone, address, city
      if (!q) return true;
      const matchCompany = c.company.toLowerCase().includes(q);
      const matchContact = c.contactName.toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      const matchAddress = (c.physicalAddress + " " + c.mailingAddress + " " + c.city).toLowerCase().includes(q);
      const matchIndustry = c.industry.toLowerCase().includes(q);
      const matchTags = c.tags.some((t) => t.toLowerCase().includes(q));
      return matchCompany || matchContact || matchPhone || matchAddress || matchIndustry || matchTags;
    });
    return sortCustomers(base, sortKey);
  }, [customers, searchQuery, filter, sortKey]);

  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const activeCount = customers.filter((c) => c.status === "active" || c.status === "vip").length;

  const renderItem = useCallback(({ item }: { item: Customer }) => (
    <CustomerGridCard
      customer={item}
      cardWidth={cardWidth}
      onPress={() => router.push(`/customer/${item.id}` as any)}
    />
  ), [cardWidth, router]);

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }] as ViewStyle[]}>
        <View style={styles.headerLeft}>
          <Image source={NVC_LOGO_DARK as any} style={styles.logo as any} resizeMode="contain" />
          <View>
            <Text style={styles.headerLabel}>NVC360 2.0</Text>
            <Text style={styles.headerTitle}>Clients</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* List / Card toggle */}
          <View style={{ flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" }}>
            <Pressable
              style={({ pressed }) => [{ width: 32, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: viewMode === "list" ? "rgba(255,255,255,0.25)" : "transparent", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={() => setViewMode("list")}
            >
              <IconSymbol name="list.bullet" size={14} color="#fff" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [{ width: 32, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: viewMode === "card" ? "rgba(255,255,255,0.25)" : "transparent", opacity: pressed ? 0.7 : 1 }] as ViewStyle[]}
              onPress={() => setViewMode("card")}
            >
              <IconSymbol name="square.grid.3x3.fill" size={14} color="#fff" />
            </Pressable>
          </View>
          {exportLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Pressable
              style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.75 }] as ViewStyle[]}
              onPress={handleExportCsv}
            >
              <IconSymbol name="square.and.arrow.down" size={13} color="#fff" />
              <Text style={styles.exportBtnText}>CSV</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/customer/new" as any);
            }}
          >
            <IconSymbol name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add Client</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Stats Strip ── */}
      <View style={[styles.statsStrip, { backgroundColor: NVC_BLUE }] as ViewStyle[]}>
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

      {/* ── Search Bar ── */}
      <View style={[styles.searchSection, { backgroundColor: NVC_BLUE }] as ViewStyle[]}>
        <View style={[
          styles.searchBar,
          searchFocused && styles.searchBarFocused,
        ] as ViewStyle[]}>
          <IconSymbol name="magnifyingglass" size={15} color={searchQuery ? NVC_BLUE : "#9CA3AF"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, address..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.clearBtn}>
                <IconSymbol name="xmark" size={10} color="#fff" />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={[styles.filterBar, { backgroundColor: "#1A5FA8" }] as ViewStyle[]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.value;
            const sc = opt.value !== "all" ? STATUS_CONFIG[opt.value] : null;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                    borderColor: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)",
                  },
                ] as ViewStyle[]}
                onPress={() => setFilter(opt.value)}
              >
                {sc && (
                  <View style={[styles.filterDot, { backgroundColor: sc.color }] as ViewStyle[]} />
                )}
                <Text style={[styles.filterTabText, { color: isActive ? "#fff" : "rgba(255,255,255,0.65)" }] as TextStyle[]}>
                  {opt.label}
                </Text>
                <View style={[styles.filterCount, { backgroundColor: isActive ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)" }] as ViewStyle[]}>
                  <Text style={[styles.filterCountText, { color: isActive ? "#fff" : "rgba(255,255,255,0.7)" }] as TextStyle[]}>
                    {opt.value === "all" ? customers.length : customers.filter((c) => c.status === opt.value).length}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Results + Sort bar ── */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? "client" : "clients"}
          {searchQuery ? ` matching "${searchQuery}"` : ""}
        </Text>
        <View style={styles.resultsRight}>
          {(searchQuery || filter !== "all") && (
            <Pressable
              onPress={() => { setSearchQuery(""); setFilter("all"); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearFiltersText}>Clear</Text>
            </Pressable>
          )}
          {/* Sort button */}
          <Pressable
            style={({ pressed }) => [
              styles.sortBtn,
              sortKey !== "name_asc" && styles.sortBtnActive,
              pressed && { opacity: 0.75 },
            ] as ViewStyle[]}
            onPress={() => setSortMenuOpen(true)}
          >
            <IconSymbol
              name="arrow.up.arrow.down"
              size={11}
              color={sortKey !== "name_asc" ? NVC_BLUE : "#6B7280"}
            />
            <Text style={[
              styles.sortBtnText,
              sortKey !== "name_asc" && styles.sortBtnTextActive,
            ] as TextStyle[]}>
              {SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort"}
            </Text>
            <IconSymbol name="chevron.down" size={10} color={sortKey !== "name_asc" ? NVC_BLUE : "#9CA3AF"} />
          </Pressable>
        </View>
      </View>

      {/* ── Sort Menu Modal ── */}
      <Modal
        visible={sortMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortMenuOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSortMenuOpen(false)}>
          <View style={styles.sortMenu}>
            <View style={styles.sortMenuHeader}>
              <Text style={styles.sortMenuTitle}>Sort Clients By</Text>
              <Pressable
                onPress={() => setSortMenuOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={styles.sortMenuClose}>
                  <IconSymbol name="xmark" size={11} color="#6B7280" />
                </View>
              </Pressable>
            </View>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = sortKey === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.sortMenuItem,
                    isSelected && styles.sortMenuItemActive,
                    pressed && { opacity: 0.7 },
                  ] as ViewStyle[]}
                  onPress={() => {
                    setSortKey(opt.key);
                    setSortMenuOpen(false);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <IconSymbol
                    name={opt.icon as any}
                    size={16}
                    color={isSelected ? NVC_BLUE : "#6B7280"}
                  />
                  <Text style={[
                    styles.sortMenuItemText,
                    isSelected && styles.sortMenuItemTextActive,
                  ] as TextStyle[]}>
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.sortMenuCheck}>
                      <IconSymbol name="checkmark" size={12} color={NVC_BLUE} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── Customer List / Grid ── */}
      {viewMode === "list" ? (
        <FlatList
          key="list"
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            !isDemo ? <RefreshControl refreshing={apiLoading} onRefresh={refetch} tintColor={NVC_BLUE} /> : undefined
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <IconSymbol name="person.text.rectangle.fill" size={40} color="#C0C8D8" />
              <Text style={styles.emptyText}>{searchQuery ? `No clients match "${searchQuery}"` : "No clients found"}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusColors: Record<string, string> = { active: "#22C55E", vip: "#F59E0B", inactive: "#9CA3AF", prospect: "#3B82F6" };
            const color = statusColors[item.status] ?? "#9CA3AF";
            return (
              <Pressable
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 6, padding: 12, gap: 10, opacity: pressed ? 0.8 : 1 }] as ViewStyle[]}
                onPress={() => router.push(`/customer/${item.id}` as any)}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color + "20", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color }}>{item.company.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#111827" }} numberOfLines={1}>{item.company}</Text>
                  <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 1 }} numberOfLines={1}>{item.contactName} · {item.city}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  <View style={{ backgroundColor: color + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color }}>{item.status.toUpperCase()}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#374151", fontFamily: "Inter_600SemiBold" }}>${(item.totalRevenue / 1000).toFixed(0)}k</Text>
                </View>
                <IconSymbol name="chevron.right" size={14} color="#9CA3AF" />
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          key={numColumns}
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            !isDemo ? (
              <RefreshControl
                refreshing={apiLoading}
                onRefresh={refetch}
                tintColor={NVC_BLUE}
              />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <IconSymbol name="person.text.rectangle.fill" size={40} color="#C0C8D8" />
              <Text style={styles.emptyText}>
                {searchQuery ? `No clients match "${searchQuery}"` : "No clients found"}
              </Text>
              {(searchQuery || filter !== "all") && (
                <Pressable
                  style={styles.emptyAction}
                  onPress={() => { setSearchQuery(""); setFilter("all"); }}
                >
                  <Text style={styles.emptyActionText}>Clear filters</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SURFACE = "#FFFFFF";

const styles = StyleSheet.create<{
  // Header
  header: ViewStyle; headerLeft: ViewStyle; logo: ViewStyle;
  headerLabel: TextStyle; headerTitle: TextStyle;
  addBtn: ViewStyle; addBtnText: TextStyle;
  // Stats
  statsStrip: ViewStyle; statItem: ViewStyle; statValue: TextStyle; statLabel: TextStyle;
  // Search
  searchSection: ViewStyle; searchBar: ViewStyle; searchBarFocused: ViewStyle;
  searchInput: TextStyle; clearBtn: ViewStyle;
  // Filter
  filterBar: ViewStyle; filterList: ViewStyle; filterTab: ViewStyle;
  filterDot: ViewStyle; filterTabText: TextStyle; filterCount: ViewStyle; filterCountText: TextStyle;
  // Results + Sort
  resultsBar: ViewStyle; resultsRight: ViewStyle; resultsText: TextStyle; clearFiltersText: TextStyle;
  sortBtn: ViewStyle; sortBtnActive: ViewStyle; sortBtnText: TextStyle; sortBtnTextActive: TextStyle;
  // Sort modal
  modalOverlay: ViewStyle; sortMenu: ViewStyle; sortMenuHeader: ViewStyle;
  sortMenuTitle: TextStyle; sortMenuClose: ViewStyle;
  sortMenuItem: ViewStyle; sortMenuItemActive: ViewStyle;
  sortMenuItemText: TextStyle; sortMenuItemTextActive: TextStyle; sortMenuCheck: ViewStyle;
  // Grid
  gridContent: ViewStyle; gridRow: ViewStyle;
  // Grid Card
  gridCard: ViewStyle; gridCardAccent: ViewStyle;
  gridAvatarWrap: ViewStyle; gridAvatar: ViewStyle; gridAvatarText: TextStyle;
  gridStatusBadge: ViewStyle; gridStatusText: TextStyle;
  gridCompany: TextStyle; gridContact: TextStyle;
  gridIndustryRow: ViewStyle; gridIndustry: TextStyle;
  gridAddressRow: ViewStyle; gridAddress: TextStyle;
  gridPhoneRow: ViewStyle; gridPhone: TextStyle;
  gridDivider: ViewStyle;
  gridStats: ViewStyle; gridStat: ViewStyle; gridStatDivider: ViewStyle;
  gridStatValue: TextStyle; gridStatLabel: TextStyle;
  gridTagsRow: ViewStyle; gridTag: ViewStyle; gridTagMore: ViewStyle; gridTagText: TextStyle;
  gridViewBtn: ViewStyle; gridViewBtnText: TextStyle;
  // Empty
  empty: ViewStyle; emptyText: TextStyle; emptyAction: ViewStyle; emptyActionText: TextStyle;
  exportBtn: ViewStyle; exportBtnText: TextStyle;
}>({
  // Header
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: NVC_BLUE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 32, height: 32, borderRadius: 7 },
  headerLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NVC_ORANGE, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 12, minHeight: 38,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },

  // Stats — compact square tiles
  statsStrip: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  statItem: {
    width: 96, height: 68, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_600SemiBold", textAlign: "center" },

  // Search
  searchSection: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 12, borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)", paddingHorizontal: 14, paddingVertical: 11,
    minHeight: 46,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 10, elevation: 4,
  },
  searchBarFocused: { borderColor: NVC_ORANGE, shadowOpacity: 0.22 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1E2A" },
  clearBtn: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: "#C0C8D8",
    alignItems: "center", justifyContent: "center",
  },

  // Filter
  filterBar: { paddingBottom: 12 },
  filterList: { paddingHorizontal: 14, paddingTop: 6, gap: 6 },
  filterTab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, gap: 5,
    minHeight: 32,
  },
  filterDot: { width: 7, height: 7, borderRadius: 3.5 },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: "center" },
  filterCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  // Results + Sort
  resultsBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#F1F5F9",
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  resultsRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultsText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#64748B" },
  clearFiltersText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#DC2626" },
  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5,
    borderColor: "#E2E8F0", paddingHorizontal: 10, paddingVertical: 7, minHeight: 34,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sortBtnActive: { borderColor: NVC_BLUE + "60", backgroundColor: NVC_BLUE + "08" },
  sortBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#64748B" },
  sortBtnTextActive: { color: NVC_BLUE },
  // Sort modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sortMenu: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, paddingTop: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 24,
  },
  sortMenuHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  sortMenuTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F172A" },
  sortMenuClose: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  sortMenuItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F8FAFC",
  },
  sortMenuItemActive: { backgroundColor: NVC_BLUE + "08" },
  sortMenuItemText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#374151", flex: 1 },
  sortMenuItemTextActive: { fontFamily: "Inter_600SemiBold", color: NVC_BLUE },
  sortMenuCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: NVC_BLUE + "15", alignItems: "center", justifyContent: "center",
  },

  // Grid
  gridContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 40, gap: 10 },
  gridRow: { gap: 10 },

  // Grid Card
  gridCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden",
    paddingBottom: 12,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: "#F1F5F9",
  },
  gridCardAccent: { height: 3, width: "100%" },
  gridAvatarWrap: { alignItems: "center", marginTop: 16, marginBottom: 6, gap: 6 },
  gridAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
  gridAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  gridStatusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1.5,
  },
  gridStatusText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  gridCompany: {
    fontSize: 13, fontFamily: "Inter_700Bold", color: "#0F172A",
    textAlign: "center", paddingHorizontal: 8, letterSpacing: -0.2, lineHeight: 18,
  },
  gridContact: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center",
    paddingHorizontal: 8, marginTop: 2,
  },
  gridIndustryRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, marginTop: 6, paddingHorizontal: 8,
  },
  gridIndustry: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#64748B" },
  gridAddressRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 4, marginTop: 5, paddingHorizontal: 10,
  },
  gridAddress: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8", flex: 1, lineHeight: 15 },
  gridPhoneRow: {
    flexDirection: "row", alignItems: "center",
    gap: 4, marginTop: 3, paddingHorizontal: 10,
  },
  gridPhone: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8" },
  gridDivider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 10, marginTop: 10, marginBottom: 8 },
  gridStats: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    paddingHorizontal: 8,
  },
  gridStat: { alignItems: "center" },
  gridStatDivider: { width: 1, height: 20, backgroundColor: "#E2E8F0" },
  gridStatValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" },
  gridStatLabel: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#94A3B8", marginTop: 1 },
  gridTagsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 4,
    paddingHorizontal: 8, marginTop: 8, justifyContent: "center",
  },
  gridTag: {
    backgroundColor: "#F1F5F9", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  gridTagMore: { backgroundColor: "#E2E8F0" },
  gridTagText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#475569" },
  gridViewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, marginTop: 10, marginHorizontal: 10,
    backgroundColor: NVC_BLUE + "10", borderRadius: 8, borderWidth: 1.5,
    borderColor: NVC_BLUE + "30", paddingVertical: 8,
  },
  gridViewBtnText: { fontSize: 11, fontFamily: "Inter_700Bold", color: NVC_BLUE },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#64748B", textAlign: "center", paddingHorizontal: 24 },
  emptyAction: {
    backgroundColor: NVC_BLUE, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10,
    shadowColor: NVC_BLUE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  emptyActionText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  exportBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#10B981", borderRadius: 8,
    paddingHorizontal: 11, paddingVertical: 8, minHeight: 34,
  },
  exportBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
