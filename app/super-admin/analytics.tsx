import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ViewStyle, TextStyle,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { NVCHeader } from "@/components/nvc-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NVC_BLUE, NVC_ORANGE } from "@/constants/brand";

// ─── Mock Analytics Data ──────────────────────────────────────────────────────

const PERIODS = ["7D", "30D", "90D", "YTD"] as const;
type Period = typeof PERIODS[number];

const METRICS: Record<Period, {
  activeClients: number; newClients: number; churnedClients: number;
  totalJobs: number; completedJobs: number; avgJobDuration: string;
  totalRevenue: number; mrr: number; arpu: number;
  smsCount: number; emailCount: number; pushCount: number;
  apiCalls: number; storageGb: number; uptime: string;
}> = {
  "7D":  { activeClients: 6, newClients: 1, churnedClients: 0, totalJobs: 54, completedJobs: 49, avgJobDuration: "2.1h", totalRevenue: 4820, mrr: 16950, arpu: 2825, smsCount: 312, emailCount: 188, pushCount: 540, apiCalls: 14200, storageGb: 12.4, uptime: "99.97%" },
  "30D": { activeClients: 6, newClients: 2, churnedClients: 0, totalJobs: 218, completedJobs: 201, avgJobDuration: "2.3h", totalRevenue: 19400, mrr: 16950, arpu: 2825, smsCount: 1240, emailCount: 720, pushCount: 2100, apiCalls: 58000, storageGb: 12.4, uptime: "99.95%" },
  "90D": { activeClients: 6, newClients: 4, churnedClients: 1, totalJobs: 630, completedJobs: 578, avgJobDuration: "2.4h", totalRevenue: 54200, mrr: 16950, arpu: 2825, smsCount: 3600, emailCount: 2100, pushCount: 6200, apiCalls: 168000, storageGb: 12.4, uptime: "99.92%" },
  "YTD": { activeClients: 6, newClients: 6, churnedClients: 1, totalJobs: 1820, completedJobs: 1670, avgJobDuration: "2.5h", totalRevenue: 148000, mrr: 16950, arpu: 2825, smsCount: 9800, emailCount: 5600, pushCount: 17400, apiCalls: 480000, storageGb: 12.4, uptime: "99.91%" },
};

// Sparkline bar data (7 bars, relative heights 0-1)
const SPARKLINES: Record<Period, number[]> = {
  "7D":  [0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 1.0],
  "30D": [0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.9, 1.0, 0.7, 0.8, 0.9, 0.85, 0.95, 1.0],
  "90D": [0.2, 0.4, 0.5, 0.6, 0.5, 0.7, 0.8, 0.7, 0.9, 1.0, 0.85, 0.95, 1.0, 0.9],
  "YTD": [0.1, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.75, 0.85, 0.9, 0.95, 1.0],
};

// Top clients by MRR
const TOP_CLIENTS = [
  { name: "Comfort Home Care", plan: "Enterprise", mrr: 7200, jobs: 22, color: "#7C3AED" },
  { name: "Metro Plumbing Co.", plan: "Professional", mrr: 3600, jobs: 18, color: NVC_BLUE },
  { name: "ClearView IT Solutions", plan: "Professional", mrr: 1350, jobs: 3, color: "#3B82F6" },
  { name: "Sunrise HVAC", plan: "Starter", mrr: 980, jobs: 8, color: "#16A34A" },
  { name: "ProClean Services", plan: "Starter", mrr: 490, jobs: 5, color: NVC_ORANGE },
];

// ─── Sparkline Component ──────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const barWidth = 6;
  const gap = 3;
  const maxH = 32;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: maxH, gap }}>
      {data.map((v, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: Math.max(4, Math.round(v * maxH)),
            borderRadius: 3,
            backgroundColor: color,
            opacity: 0.7 + v * 0.3,
          }}
        />
      ))}
    </View>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon, color, sparkData }: {
  label: string; value: string; sub?: string;
  icon: any; color: string; sparkData?: number[];
}) {
  const colors = useColors();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }] as ViewStyle[]}>
      <View style={styles.metricTop}>
        <View style={[styles.metricIcon, { backgroundColor: color + "18" }] as ViewStyle[]}>
          <IconSymbol name={icon} size={16} color={color} />
        </View>
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </View>
      <Text style={[styles.metricValue, { color: colors.foreground }] as TextStyle[]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.muted }] as TextStyle[]}>{label}</Text>
      {sub && <Text style={[styles.metricSub, { color: color }] as TextStyle[]}>{sub}</Text>}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const colors = useColors();
  const [period, setPeriod] = useState<Period>("30D");
  const m = METRICS[period];
  const spark = SPARKLINES[period];

  const completionRate = m.totalJobs > 0 ? Math.round((m.completedJobs / m.totalJobs) * 100) : 0;

  return (
    <ScreenContainer edges={["left", "right", "bottom"]} containerClassName="bg-[#EFF2F7]">
      <NVCHeader title="Usage Analytics" subtitle="Platform-wide performance metrics" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Period Selector ── */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              style={({ pressed }) => [
                styles.periodBtn,
                { backgroundColor: period === p ? NVC_BLUE : colors.surface, borderColor: period === p ? NVC_BLUE : colors.border, opacity: pressed ? 0.8 : 1 },
              ] as ViewStyle[]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, { color: period === p ? "#fff" : colors.muted }] as TextStyle[]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Revenue ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Revenue</Text>
          <View style={styles.metricsGrid}>
            <MetricCard label="Total Revenue" value={`$${m.totalRevenue.toLocaleString()}`} icon="dollarsign.circle.fill" color="#16A34A" sparkData={spark} />
            <MetricCard label="MRR" value={`$${m.mrr.toLocaleString()}`} sub="Monthly recurring" icon="chart.line.uptrend.xyaxis" color={NVC_BLUE} />
            <MetricCard label="ARPU" value={`$${m.arpu.toLocaleString()}`} sub="Per client / mo" icon="person.fill" color="#7C3AED" />
          </View>
        </View>

        {/* ── Clients ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Clients</Text>
          <View style={styles.metricsGrid}>
            <MetricCard label="Active Clients" value={m.activeClients.toString()} icon="building.2.fill" color={NVC_BLUE} sparkData={spark} />
            <MetricCard label="New Clients" value={`+${m.newClients}`} sub="This period" icon="person.badge.plus" color="#16A34A" />
            <MetricCard label="Churned" value={m.churnedClients.toString()} sub="This period" icon="person.badge.minus" color={m.churnedClients > 0 ? "#EF4444" : "#6B7280"} />
          </View>
        </View>

        {/* ── Jobs ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Jobs</Text>
          <View style={styles.metricsGrid}>
            <MetricCard label="Total Jobs" value={m.totalJobs.toLocaleString()} icon="wrench.and.screwdriver.fill" color={NVC_ORANGE} sparkData={spark} />
            <MetricCard label="Completed" value={m.completedJobs.toLocaleString()} sub={`${completionRate}% rate`} icon="checkmark.circle.fill" color="#16A34A" />
            <MetricCard label="Avg Duration" value={m.avgJobDuration} sub="Per job" icon="clock.fill" color="#7C3AED" />
          </View>
        </View>

        {/* ── Notifications ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Notifications Sent</Text>
          <View style={styles.metricsGrid}>
            <MetricCard label="SMS" value={m.smsCount.toLocaleString()} icon="message.fill" color="#16A34A" sparkData={spark} />
            <MetricCard label="Email" value={m.emailCount.toLocaleString()} icon="envelope.fill" color={NVC_BLUE} />
            <MetricCard label="Push" value={m.pushCount.toLocaleString()} icon="bell.fill" color={NVC_ORANGE} />
          </View>
        </View>

        {/* ── Infrastructure ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Infrastructure</Text>
          <View style={styles.metricsGrid}>
            <MetricCard label="API Calls" value={m.apiCalls >= 1000 ? `${(m.apiCalls / 1000).toFixed(0)}K` : m.apiCalls.toString()} icon="bolt.fill" color="#F59E0B" sparkData={spark} />
            <MetricCard label="Storage" value={`${m.storageGb} GB`} sub="Used" icon="internaldrive.fill" color="#6B7280" />
            <MetricCard label="Uptime" value={m.uptime} sub="Platform SLA" icon="checkmark.shield.fill" color="#16A34A" />
          </View>
        </View>

        {/* ── Top Clients by MRR ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }] as TextStyle[]}>Top Clients by MRR</Text>
          <View style={[styles.topClientsCard, { backgroundColor: colors.surface, borderColor: colors.border }] as ViewStyle[]}>
            {TOP_CLIENTS.map((client, i) => {
              const maxMrr = TOP_CLIENTS[0].mrr;
              const pct = Math.round((client.mrr / maxMrr) * 100);
              return (
                <View
                  key={client.name}
                  style={[
                    styles.topClientRow,
                    i < TOP_CLIENTS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                  ] as ViewStyle[]}
                >
                  <View style={[styles.topClientRank, { backgroundColor: client.color + "18" }] as ViewStyle[]}>
                    <Text style={[styles.topClientRankText, { color: client.color }] as TextStyle[]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.topClientNameRow}>
                      <Text style={[styles.topClientName, { color: colors.foreground }] as TextStyle[]} numberOfLines={1}>{client.name}</Text>
                      <Text style={[styles.topClientMrr, { color: client.color }] as TextStyle[]}>${client.mrr.toLocaleString()}/mo</Text>
                    </View>
                    <View style={styles.topClientBarBg}>
                      <View style={[styles.topClientBar, { width: `${pct}%` as any, backgroundColor: client.color }] as ViewStyle[]} />
                    </View>
                    <Text style={[styles.topClientSub, { color: colors.muted }] as TextStyle[]}>{client.plan} · {client.jobs} active jobs</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  periodRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  periodText: { fontSize: 12, fontWeight: "700" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: {
    width: "30%",
    flex: 1,
    minWidth: 90,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  metricTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  metricValue: { fontSize: 18, fontWeight: "900" },
  metricLabel: { fontSize: 10, fontWeight: "600" },
  metricSub: { fontSize: 10, fontWeight: "600" },
  topClientsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  topClientRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  topClientRank: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  topClientRankText: { fontSize: 12, fontWeight: "800" },
  topClientNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  topClientName: { fontSize: 13, fontWeight: "600", flex: 1 },
  topClientMrr: { fontSize: 13, fontWeight: "800" },
  topClientBarBg: { height: 4, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  topClientBar: { height: 4, borderRadius: 2 },
  topClientSub: { fontSize: 10 },
});
