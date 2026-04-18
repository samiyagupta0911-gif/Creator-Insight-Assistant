import { anthropic } from "@workspace/integrations-anthropic-ai";

export type MetricsInput = {
  reach: number;
  impressions: number;
  engagementRate: number;
  followerChange: number;
  saves: number;
  shares: number;
  profileVisits: number;
  linkClicks: number;
  contentFormat: string;
  postTopic: string;
};

export type CreatorProfileInput = {
  displayName: string;
  age: number;
  primaryCategory: string;
  accountType: string;
  followerCount: number;
  followerTier: string;
  contentFormats: string[];
  postFrequencyPerWeek: number;
  targetAudience: string;
  aspiration: string;
  biggestChallenge: string;
  baselineEngagementRate: number;
  baselineReach: number;
  contentTone: string;
  inspiredBy: string[];
  pastTacticsTried: string[];
  postingTimeHabit: string;
  creatingSince: string;
};

export type ActionItemDraft = {
  what: string;
  why: string;
  how: string;
  when: string;
};

export type InsightDraft = {
  insight: string;
  benchmarkComparison: string;
  actionItems: ActionItemDraft[];
};

export type ExtractionReview = {
  status: "ready_for_review" | "clarification_required";
  metrics: Partial<MetricsInput>;
  missingFields: string[];
  questions: string[];
};

const metricFields = [
  "reach",
  "impressions",
  "engagementRate",
  "followerChange",
  "saves",
  "shares",
  "profileVisits",
  "linkClicks",
  "contentFormat",
  "postTopic",
] as const;

export function inferFollowerTier(followerCount: number) {
  if (followerCount < 10_000) return "nano";
  if (followerCount < 100_000) return "micro";
  if (followerCount < 1_000_000) return "mid";
  return "macro";
}

export function defaultProfile(userId: string): CreatorProfileInput & { userId: string } {
  return {
    userId,
    displayName: "Creator",
    age: 18,
    primaryCategory: "Lifestyle",
    accountType: "Creator",
    followerCount: 2500,
    followerTier: "nano",
    contentFormats: ["Reels", "Carousels"],
    postFrequencyPerWeek: 3,
    targetAudience: "young people who want useful, entertaining content",
    aspiration: "grow a loyal community",
    biggestChallenge: "turn analytics into clear content decisions",
    baselineEngagementRate: 3.2,
    baselineReach: 1800,
    contentTone: "honest, warm, and direct",
    inspiredBy: ["@creatorcoach", "@nichebuilder"],
    pastTacticsTried: ["posting more often", "using trending audio"],
    postingTimeHabit: "evenings after school or work",
    creatingSince: "less than a year",
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Partial<InsightDraft> & { metrics?: Partial<MetricsInput> };
  } catch {
    return null;
  }
}

function benchmarkText(profile: CreatorProfileInput, metrics: MetricsInput) {
  const reachDelta = metrics.reach - profile.baselineReach;
  const reachPct = Math.round((reachDelta / Math.max(profile.baselineReach, 1)) * 100);
  const erDelta = Number((metrics.engagementRate - profile.baselineEngagementRate).toFixed(1));
  const reachDirection = reachPct >= 0 ? "above" : "below";
  const erDirection = erDelta >= 0 ? "above" : "below";
  return `Reach is ${Math.abs(reachPct)}% ${reachDirection} your ${profile.baselineReach.toLocaleString()} baseline, and engagement is ${Math.abs(erDelta)} points ${erDirection} your ${profile.baselineEngagementRate}% baseline.`;
}

function fallbackDraft(profile: CreatorProfileInput, metrics: MetricsInput): InsightDraft {
  const saveRate = metrics.reach > 0 ? metrics.saves / metrics.reach : 0;
  const shareRate = metrics.reach > 0 ? metrics.shares / metrics.reach : 0;
  const profileVisitRate = metrics.reach > 0 ? metrics.profileVisits / metrics.reach : 0;
  const strongestSignal = saveRate >= shareRate && saveRate >= profileVisitRate ? "saves" : shareRate >= profileVisitRate ? "shares" : "profile visits";

  return {
    insight: `${profile.displayName}, this ${metrics.contentFormat.toLowerCase()} is showing its clearest signal in ${strongestSignal}. The post topic was ${metrics.postTopic}, and the data says the next move should be a controlled follow-up, not a vague content reset.`,
    benchmarkComparison: benchmarkText(profile, metrics),
    actionItems: [
      {
        what: `Make one follow-up post about ${metrics.postTopic}`,
        why: `Repeating the topic isolates whether the audience cares about the idea itself instead of changing too many variables at once.`,
        how: `Keep the same topic, change only the hook, and lead with the viewer payoff in the first line or first frame.`,
        when: "Publish it as your next comparable post within 72 hours.",
      },
      {
        what: "Add one explicit save or share prompt",
        why: `${metrics.saves.toLocaleString()} saves and ${metrics.shares.toLocaleString()} shares are the clearest intent metrics behind this result.`,
        how: metrics.saves >= metrics.shares ? "End with: 'Save this for the next time you need it.'" : "End with: 'Send this to someone who needs the reminder.'",
        when: "Use it in the caption and final frame of the follow-up post.",
      },
      {
        what: "Compare profile conversion after the follow-up",
        why: `${metrics.profileVisits.toLocaleString()} profile visits only matter if they turn into followers, so the next check must connect content performance to account growth.`,
        how: "Record reach, profile visits, and follower change for the follow-up, then compare profile visits per 1,000 reach against this post.",
        when: "Review the numbers 24 hours after posting.",
      },
    ],
  };
}

function normalizeActionItem(item: Partial<ActionItemDraft> | undefined, fallback: ActionItemDraft): ActionItemDraft {
  return {
    what: typeof item?.what === "string" && item.what.trim() ? item.what : fallback.what,
    why: typeof item?.why === "string" && item.why.trim() ? item.why : fallback.why,
    how: typeof item?.how === "string" && item.how.trim() ? item.how : fallback.how,
    when: typeof item?.when === "string" && item.when.trim() ? item.when : fallback.when,
  };
}

function normalizeDraft(input: Partial<InsightDraft> | null, profile: CreatorProfileInput, metrics: MetricsInput): InsightDraft {
  const fallback = fallbackDraft(profile, metrics);
  const actionItems = Array.isArray(input?.actionItems) ? input.actionItems : [];
  return {
    insight: typeof input?.insight === "string" && input.insight.trim() ? input.insight : fallback.insight,
    benchmarkComparison: typeof input?.benchmarkComparison === "string" && input.benchmarkComparison.trim() ? input.benchmarkComparison : fallback.benchmarkComparison,
    actionItems: [0, 1, 2].map((index) => normalizeActionItem(actionItems[index], fallback.actionItems[index])),
  };
}

export function validateMetrics(metrics: Partial<MetricsInput>) {
  const missingFields = metricFields.filter((field) => {
    const value = metrics[field];
    if (typeof value === "string") return !value.trim();
    return value === undefined || value === null || Number.isNaN(Number(value));
  });

  return {
    isComplete: missingFields.length === 0,
    missingFields: [...missingFields],
    questions: buildMetricQuestions([...missingFields]),
  };
}

export function buildMetricQuestions(fields: string[]) {
  const labels: Record<string, string> = {
    reach: "What was the post reach?",
    impressions: "How many impressions did the post get?",
    engagementRate: "What was the engagement rate percentage?",
    followerChange: "How many followers were gained or lost from this post?",
    saves: "How many saves did the post receive?",
    shares: "How many shares did the post receive?",
    profileVisits: "How many profile visits came from the post?",
    linkClicks: "How many link clicks came from the post?",
    contentFormat: "What format was the post: Reel, carousel, single image, or story?",
    postTopic: "What was the post topic or hook?",
  };

  return fields.map((field) => labels[field] ?? `Please provide ${field}.`);
}

export function stableMetricsKey(source: "manual" | "screenshot", metrics: MetricsInput) {
  return JSON.stringify({ source, metrics: metricFields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field] = metrics[field];
    return acc;
  }, {}) });
}

export async function generateInsightDraft(params: {
  profile: CreatorProfileInput;
  metrics: MetricsInput;
  calibrationNotes: string[];
  pastAnalyses: Array<{ metrics: MetricsInput; insight: string; createdAt: string }>;
  source: "manual" | "screenshot";
}) {
  const prompt = `You are IQ, CreatorIQ's Instagram growth strategist. Your ONE job: translate post metrics into specific, actionable tactics to GROW FOLLOWERS and increase account reach. Every recommendation must tie back to follower growth.\n\nFollow this pipeline: confirmed metrics -> insight diagnosis -> benchmark comparison -> exactly 3 follower-growth action items.\n\nRules:\n- Do NOT ask questions. Do NOT return options. Return strict JSON only.\n- Each action item MUST directly target follower growth (new followers, profile visits converting to follows, reach expansion, or shareability that brings in new audiences).\n- Be brutally honest about what the numbers say about growth potential.\n- Reference the creator's follower count and aspiration explicitly.\n- Keys: insight, benchmarkComparison, actionItems. actionItems must contain exactly 3 objects with: what, why, how, when.\n\nCreator profile:\n${JSON.stringify(params.profile)}\n\nConfirmed post metrics:\n${JSON.stringify(params.metrics)}\n\nPast analyses for context:\n${JSON.stringify(params.pastAnalyses)}\n\nCalibration memory (accepted/rejected past suggestions):\n${JSON.stringify(params.calibrationNotes)}\n\nSource: ${params.source}\n\nFocus 100% on: what specific actions from this post data will get this creator MORE FOLLOWERS.`;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: "You are an Instagram growth strategist. Return strict JSON only with keys: insight, benchmarkComparison, actionItems (exactly 3 items, each with what/why/how/when). Every action item must specifically target follower growth. Never ask follow-up questions.",
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content.map((block) => block.type === "text" ? block.text : "").join("\n");
    return normalizeDraft(extractJson(text), params.profile, params.metrics);
  } catch {
    return normalizeDraft(null, params.profile, params.metrics);
  }
}

export async function extractMetricsFromScreenshot(imageDataUrl: string, notes: string | undefined): Promise<ExtractionReview> {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return {
      status: "clarification_required",
      metrics: notes ? { postTopic: notes } : {},
      missingFields: [...metricFields],
      questions: buildMetricQuestions([...metricFields]),
    };
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: "Extract only visible Instagram Insights metrics. Return strict JSON only with a metrics object. Do not infer missing numeric values.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: match[1],
                data: match[2],
              },
            },
            {
              type: "text",
              text: `Extract these fields only when visible or explicitly provided in notes: reach, impressions, engagementRate, followerChange, saves, shares, profileVisits, linkClicks, contentFormat, postTopic. Notes: ${notes ?? "none"}`,
            },
          ],
        },
      ],
    });
    const text = message.content.map((block) => block.type === "text" ? block.text : "").join("\n");
    const parsed = extractJson(text);
    const metrics = coercePartialMetrics(parsed?.metrics ?? {});
    if (notes && !metrics.postTopic) metrics.postTopic = notes;
    const review = validateMetrics(metrics);

    return {
      status: review.isComplete ? "ready_for_review" : "clarification_required",
      metrics,
      missingFields: review.missingFields,
      questions: review.questions,
    };
  } catch {
    const metrics = notes ? { postTopic: notes } : {};
    const review = validateMetrics(metrics);
    return {
      status: "clarification_required",
      metrics,
      missingFields: review.missingFields,
      questions: review.questions,
    };
  }
}

function coercePartialMetrics(input: Partial<MetricsInput>): Partial<MetricsInput> {
  const result: Partial<MetricsInput> = {};
  for (const field of metricFields) {
    const value = input[field];
    if (value === undefined || value === null || value === "") continue;
    if (field === "contentFormat" || field === "postTopic") {
      result[field] = String(value);
    } else {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) result[field] = numeric;
    }
  }
  return result;
}

export function buildCreatorMatches(profile: CreatorProfileInput) {
  const category = profile.primaryCategory || "Lifestyle";
  const tier = profile.followerTier || inferFollowerTier(profile.followerCount);
  return [
    {
      id: "match-1",
      handle: `@${category.toLowerCase().replace(/[^a-z0-9]+/g, "")}lab`,
      category,
      followerTier: tier,
      whyMatch: `They are close enough to your ${tier} stage to make their tactics realistic, not celebrity-level fantasy.`,
      growthSignal: "Recent posts repeat one recognizable format while changing only the topic and hook.",
      tacticToStudy: "Study how their first frame names a specific audience problem before showing the payoff.",
    },
    {
      id: "match-2",
      handle: profile.inspiredBy[0] || `@daily${category.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
      category,
      followerTier: tier,
      whyMatch: "Your inspiration list suggests this account's positioning is close to the lane you want to own.",
      growthSignal: "Strong saves-to-reach behavior from educational or repeatable formats.",
      tacticToStudy: "Borrow the content structure, not the topic: setup, tension, payoff, then one clean action.",
    },
    {
      id: "match-3",
      handle: `@nextwave${category.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
      category,
      followerTier: inferFollowerTier(Math.max(profile.followerCount * 2, 1000)),
      whyMatch: "They are one tier ahead, which makes them a practical benchmark for what your account could become next.",
      growthSignal: "Their best posts convert profile visits by making the niche promise obvious within seconds.",
      tacticToStudy: "Compare their bio promise with their top three posts; your content should make the same promise feel believable.",
    },
  ];
}
