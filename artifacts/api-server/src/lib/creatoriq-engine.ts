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

export type InsightDraft = {
  summary: string;
  brutallyHonestTake: string;
  whyItHappened: string[];
  clarifyingQuestions: string[];
  nextContentPlan: string[];
  suggestions: Array<{
    title: string;
    rationale: string;
    action: string;
  }>;
};

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

function normalizeDraft(input: Partial<InsightDraft> | null, profile: CreatorProfileInput, metrics: MetricsInput): InsightDraft {
  const reachDelta = metrics.reach - profile.baselineReach;
  const erDelta = metrics.engagementRate - profile.baselineEngagementRate;
  const reachDirection = reachDelta >= 0 ? "above" : "below";
  const erDirection = erDelta >= 0 ? "stronger" : "weaker";
  const saveShareSignal = metrics.saves + metrics.shares;
  const fallback: InsightDraft = {
    summary: `${profile.displayName}, this ${metrics.contentFormat.toLowerCase()} reached ${metrics.reach.toLocaleString()} people, which is ${Math.abs(Math.round((reachDelta / Math.max(profile.baselineReach, 1)) * 100))}% ${reachDirection} your usual baseline. Engagement is ${erDirection} than your norm, so the real story is not just reach; it is whether the post gave people a reason to save, share, or visit your profile.`,
    brutallyHonestTake: saveShareSignal > metrics.reach * 0.04
      ? "This has proof of value. The idea is worth repeating, but make the hook sharper so more people understand the payoff in the first second."
      : "The post got seen, but it did not create enough intent. Right now it is behaving more like scroll-by content than follow-worthy content.",
    whyItHappened: [
      `Your ${profile.primaryCategory.toLowerCase()} audience likely responded to the topic, but the ${metrics.contentFormat.toLowerCase()} packaging controlled how far it travelled.`,
      metrics.shares > metrics.saves ? "Shares are doing more work than saves, which means the idea may be socially relatable but not yet useful enough to bookmark." : "Saves are stronger than shares, which means the content has utility but needs a more shareable angle.",
      `Your posting rhythm of ${profile.postFrequencyPerWeek} posts per week gives enough signal to test one change next week without confusing the data.`,
    ],
    clarifyingQuestions: [
      "Was this post built around a trend, a personal story, or a tutorial format?",
      "Did the first line or first frame clearly tell viewers what they would get?",
      "Was the call-to-action asking for a comment, save, share, profile visit, or follow?",
    ],
    nextContentPlan: [
      `Make one follow-up on the same topic in ${profile.contentTone} tone, but open with the strongest audience pain point instead of context.`,
      `Turn the post into a ${profile.contentFormats[0] ?? metrics.contentFormat} with a clearer promise: what changes for the viewer after watching?`,
      "Track saves, shares, and profile visits separately for the next post so IQ can tell whether the issue is value, relatability, or conversion.",
    ],
    suggestions: [
      {
        title: "Rewrite the hook around the viewer's problem",
        rationale: "Reach without action usually means people understood the topic but not the personal payoff.",
        action: `Create a new opening line for ${metrics.postTopic} that starts with the audience problem, then reveals the outcome in under 8 words.`,
      },
      {
        title: "Double down on the strongest save/share signal",
        rationale: "Saves and shares tell you what people found useful enough to keep or send. That is more actionable than raw impressions.",
        action: metrics.saves >= metrics.shares ? "Build a carousel checklist from the same idea and explicitly ask viewers to save it." : "Make a Reel version that leans into the relatable moment and asks viewers who needs to hear it.",
      },
      {
        title: "Run one controlled timing test",
        rationale: `Your current habit is ${profile.postingTimeHabit}. Timing should be tested one variable at a time, not guessed from vibes.`,
        action: "Post the next comparable piece 90 minutes earlier or later, then compare reach in the first 2 hours only.",
      },
    ],
  };

  return {
    summary: input?.summary || fallback.summary,
    brutallyHonestTake: input?.brutallyHonestTake || fallback.brutallyHonestTake,
    whyItHappened: Array.isArray(input?.whyItHappened) && input.whyItHappened.length ? input.whyItHappened.slice(0, 4) : fallback.whyItHappened,
    clarifyingQuestions: Array.isArray(input?.clarifyingQuestions) && input.clarifyingQuestions.length ? input.clarifyingQuestions.slice(0, 4) : fallback.clarifyingQuestions,
    nextContentPlan: Array.isArray(input?.nextContentPlan) && input.nextContentPlan.length ? input.nextContentPlan.slice(0, 5) : fallback.nextContentPlan,
    suggestions: Array.isArray(input?.suggestions) && input.suggestions.length ? input.suggestions.slice(0, 4).map((suggestion) => ({
      title: suggestion.title || "Test a sharper content angle",
      rationale: suggestion.rationale || "The data points to a specific change worth testing next.",
      action: suggestion.action || "Make one focused version of the idea and compare it against this post.",
    })) : fallback.suggestions,
  };
}

export async function generateInsightDraft(params: {
  profile: CreatorProfileInput;
  metrics: MetricsInput;
  calibrationNotes: string[];
  source: "manual" | "screenshot";
}) {
  const prompt = `You are IQ, CreatorIQ's AI analytics translator for Instagram creators. Be conversational, Gen-Z friendly, honest, specific, and non-judgmental. Never invent causation. If the data is insufficient, ask clarifying questions instead of pretending certainty. Return only JSON with keys summary, brutallyHonestTake, whyItHappened, clarifyingQuestions, nextContentPlan, suggestions. Suggestions must have title, rationale, action.\n\nCreator profile:\n${JSON.stringify(params.profile)}\n\nCurrent metrics:\n${JSON.stringify(params.metrics)}\n\nAccepted/rejected calibration notes:\n${JSON.stringify(params.calibrationNotes)}\n\nSource: ${params.source}`;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: "You translate Instagram analytics into truthful, practical creator strategy. Return strict JSON only.",
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content.map((block) => block.type === "text" ? block.text : "").join("\n");
    return normalizeDraft(extractJson(text), params.profile, params.metrics);
  } catch {
    return normalizeDraft(null, params.profile, params.metrics);
  }
}

export async function extractMetricsFromScreenshot(imageDataUrl: string, notes: string | undefined, profile: CreatorProfileInput): Promise<MetricsInput> {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: "Extract visible Instagram Insights metrics. Return strict JSON only with metrics key.",
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
                text: `Extract reach, impressions, engagementRate, followerChange, saves, shares, profileVisits, linkClicks, contentFormat, postTopic from this screenshot. If a field is not visible, infer only from the creator's baseline and set a cautious value. Creator profile: ${JSON.stringify(profile)}. Notes: ${notes ?? "none"}`,
              },
            ],
          },
        ],
      });
      const text = message.content.map((block) => block.type === "text" ? block.text : "").join("\n");
      const parsed = extractJson(text);
      if (parsed?.metrics) {
        return {
          reach: Number(parsed.metrics.reach ?? profile.baselineReach),
          impressions: Number(parsed.metrics.impressions ?? Math.round(profile.baselineReach * 1.35)),
          engagementRate: Number(parsed.metrics.engagementRate ?? profile.baselineEngagementRate),
          followerChange: Number(parsed.metrics.followerChange ?? 0),
          saves: Number(parsed.metrics.saves ?? Math.round(profile.baselineReach * 0.015)),
          shares: Number(parsed.metrics.shares ?? Math.round(profile.baselineReach * 0.01)),
          profileVisits: Number(parsed.metrics.profileVisits ?? Math.round(profile.baselineReach * 0.025)),
          linkClicks: Number(parsed.metrics.linkClicks ?? 0),
          contentFormat: String(parsed.metrics.contentFormat ?? profile.contentFormats[0] ?? "Reel"),
          postTopic: String(parsed.metrics.postTopic ?? notes ?? profile.primaryCategory),
        };
      }
    } catch {
      return screenshotFallback(notes, profile);
    }
  }
  return screenshotFallback(notes, profile);
}

function screenshotFallback(notes: string | undefined, profile: CreatorProfileInput): MetricsInput {
  return {
    reach: profile.baselineReach,
    impressions: Math.round(profile.baselineReach * 1.35),
    engagementRate: profile.baselineEngagementRate,
    followerChange: 0,
    saves: Math.round(profile.baselineReach * 0.015),
    shares: Math.round(profile.baselineReach * 0.01),
    profileVisits: Math.round(profile.baselineReach * 0.025),
    linkClicks: 0,
    contentFormat: profile.contentFormats[0] ?? "Reel",
    postTopic: notes || `${profile.primaryCategory} post from screenshot`,
  };
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
