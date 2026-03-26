/**
 * Gemini AI Service — NVC360 Operational Intelligence
 *
 * Uses Google Gemini 1.5 Flash (fast, cost-effective) for:
 *  - Operational insights from live task/technician data
 *  - Smart dispatch recommendations
 *  - Delay risk detection
 *  - Daily briefing summaries
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const MODEL_ID = "gemini-1.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskSummary {
  id: number;
  status: string;
  priority: string;
  customerName?: string;
  jobAddress?: string;
  scheduledTime?: string;
  assignedTechnicianId?: number;
  estimatedDuration?: number;
  createdAt?: string;
}

export interface TechSummary {
  id: number;
  name: string;
  status: string;
  todayJobs?: number;
  skills?: string[];
  latitude?: number;
  longitude?: number;
}

export interface OperationalInsight {
  type: "risk" | "recommendation" | "alert" | "summary";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  actionable: boolean;
  action?: string;
}

export interface OperationalBriefing {
  headline: string;
  insights: OperationalInsight[];
  dispatchSuggestions: Array<{
    taskId: number;
    suggestedTechId: number;
    reason: string;
    confidence: "high" | "medium" | "low";
  }>;
  generatedAt: string;
}

// ─── Main Functions ───────────────────────────────────────────────────────────

/**
 * Generate a full operational briefing from live task and technician data.
 */
export async function generateOperationalBriefing(
  tasks: TaskSummary[],
  technicians: TechSummary[],
): Promise<OperationalBriefing> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_ID,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });

  const now = new Date().toISOString();
  const unassigned = tasks.filter((t) => t.status === "unassigned");
  const inProgress = tasks.filter((t) => ["assigned", "en_route", "on_site"].includes(t.status));
  const completed = tasks.filter((t) => t.status === "completed");
  const available = technicians.filter((t) => t.status === "available" || t.status === "online");
  const busy = technicians.filter((t) => ["on_job", "en_route", "busy"].includes(t.status));

  const prompt = `You are an AI operations assistant for NVC360, a field service management platform.
Analyze the following real-time operational data and return a JSON briefing.

Current time: ${now}

TASK SUMMARY:
- Total tasks: ${tasks.length}
- Unassigned: ${unassigned.length} (need dispatch)
- In progress: ${inProgress.length}
- Completed today: ${completed.length}

UNASSIGNED TASKS (need dispatch):
${JSON.stringify(unassigned.slice(0, 10), null, 2)}

TECHNICIAN SUMMARY:
- Total: ${technicians.length}
- Available: ${available.length}
- On job/en route: ${busy.length}
- Offline: ${technicians.filter((t) => t.status === "offline").length}

AVAILABLE TECHNICIANS:
${JSON.stringify(available.slice(0, 8), null, 2)}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "headline": "one-sentence operational status summary",
  "insights": [
    {
      "type": "risk|recommendation|alert|summary",
      "priority": "high|medium|low",
      "title": "short title",
      "description": "2-3 sentence description with specific details",
      "actionable": true|false,
      "action": "specific action to take (if actionable)"
    }
  ],
  "dispatchSuggestions": [
    {
      "taskId": <number>,
      "suggestedTechId": <number>,
      "reason": "why this tech is best for this task",
      "confidence": "high|medium|low"
    }
  ]
}

Generate 3-5 insights focused on: workload balance, delay risks, unassigned tasks, and efficiency opportunities.
Generate dispatch suggestions only for unassigned tasks where a suitable available technician exists.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Parse JSON response
  let parsed: Omit<OperationalBriefing, "generatedAt">;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fallback if JSON parsing fails
    parsed = {
      headline: "Operational data analyzed — see insights below.",
      insights: [
        {
          type: "summary",
          priority: "medium",
          title: "Operations Overview",
          description: `${tasks.length} total tasks, ${unassigned.length} unassigned, ${available.length} technicians available.`,
          actionable: false,
        },
      ],
      dispatchSuggestions: [],
    };
  }

  return {
    ...parsed,
    generatedAt: now,
  };
}

// ─── SMS Drafting ────────────────────────────────────────────────────────────

export interface SmsDraftInput {
  eventType: "job_created" | "job_assigned" | "technician_en_route" | "technician_arrived" | "job_completed" | "job_rescheduled" | "custom";
  customerName: string;
  jobAddress: string;
  technicianName?: string;
  scheduledTime?: string;
  estimatedArrival?: string;
  companyName?: string;
  trackingUrl?: string;
  customContext?: string;
}

export interface SmsDraft {
  message: string;
  characterCount: number;
  segmentCount: number;
  tone: "professional" | "friendly" | "urgent";
  variants: string[];
}

/**
 * Draft a customer notification SMS using Gemini AI.
 * Returns the primary draft plus 2 tone variants.
 */
export async function draftSmsMessage(input: SmsDraftInput): Promise<SmsDraft> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_ID,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  });

  const eventDescriptions: Record<SmsDraftInput["eventType"], string> = {
    job_created: "A new service job has been created and is awaiting dispatch",
    job_assigned: "A technician has been assigned to the job",
    technician_en_route: "The technician is on their way to the customer",
    technician_arrived: "The technician has arrived at the job site",
    job_completed: "The job has been completed successfully",
    job_rescheduled: "The job has been rescheduled to a new time",
    custom: input.customContext ?? "Service update",
  };

  const prompt = `You are an SMS notification writer for NVC360, a professional field service company.
Write a customer notification SMS for this event.

Event: ${eventDescriptions[input.eventType]}
Customer name: ${input.customerName}
Job address: ${input.jobAddress}
${input.technicianName ? `Technician: ${input.technicianName}` : ""}
${input.scheduledTime ? `Scheduled time: ${input.scheduledTime}` : ""}
${input.estimatedArrival ? `ETA: ${input.estimatedArrival}` : ""}
${input.companyName ? `Company: ${input.companyName}` : "NVC360"}
${input.trackingUrl ? `Tracking URL: ${input.trackingUrl}` : ""}

Requirements:
- Under 160 characters for the primary message (1 SMS segment)
- Professional but warm tone
- Include the customer's first name
- Include tracking URL if provided
- No emojis unless explicitly requested
- Do NOT include placeholder text like [Company Name] — use the actual values

Return JSON only:
{
  "message": "primary SMS draft (under 160 chars)",
  "tone": "professional",
  "variants": [
    "friendly variant (slightly warmer tone, still under 160 chars)",
    "brief variant (shortest possible, under 100 chars)"
  ]
}`;

  const result = await model.generateContent(prompt);
  let parsed: Omit<SmsDraft, "characterCount" | "segmentCount">;

  try {
    parsed = JSON.parse(result.response.text().trim());
  } catch {
    // Fallback draft
    const fallback = `Hi ${input.customerName.split(" ")[0]}, your service job at ${input.jobAddress} has been updated. Thank you for choosing NVC360.`;
    parsed = {
      message: fallback,
      tone: "professional",
      variants: [fallback, fallback],
    };
  }

  const charCount = parsed.message.length;
  return {
    ...parsed,
    characterCount: charCount,
    segmentCount: Math.ceil(charCount / 160),
  };
}

/**
 * Generate a quick delay risk assessment for a specific task.
 */
export async function assessDelayRisk(
  task: TaskSummary,
  assignedTech?: TechSummary,
): Promise<{ riskLevel: "low" | "medium" | "high"; reason: string; recommendation: string }> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_ID,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
    },
  });

  const prompt = `Assess delay risk for this field service task. Return JSON only.

Task: ${JSON.stringify(task)}
Assigned technician: ${assignedTech ? JSON.stringify(assignedTech) : "None (unassigned)"}
Current time: ${new Date().toISOString()}

Return: { "riskLevel": "low|medium|high", "reason": "brief reason", "recommendation": "action to take" }`;

  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text().trim());
  } catch {
    return {
      riskLevel: "medium",
      reason: "Unable to assess — insufficient data.",
      recommendation: "Review task manually.",
    };
  }
}
