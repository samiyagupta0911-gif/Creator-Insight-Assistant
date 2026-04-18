import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  analysesTable,
  creatorProfilesTable,
  db,
  suggestionsTable,
  type Analysis as DbAnalysis,
  type CreatorProfile as DbCreatorProfile,
  type Suggestion as DbSuggestion,
} from "@workspace/db";
import {
  CreateAnalysisBody,
  CreateAnalysisResponse,
  ExtractScreenshotMetricsBody,
  ExtractScreenshotMetricsResponse,
  GetAnalysisParams,
  GetAnalysisResponse,
  GetCreatorDashboardResponse,
  GetCreatorProfileResponse,
  ListAnalysesResponse,
  ListCreatorMatchesResponse,
  SubmitSuggestionFeedbackBody,
  SubmitSuggestionFeedbackParams,
  SubmitSuggestionFeedbackResponse,
  UpsertCreatorProfileBody,
  UpsertCreatorProfileResponse,
} from "@workspace/api-zod";
import {
  buildCreatorMatches,
  defaultProfile,
  extractMetricsFromScreenshot,
  generateInsightDraft,
  inferFollowerTier,
  stableMetricsKey,
  validateMetrics,
  type CreatorProfileInput,
  type MetricsInput,
} from "../lib/creatoriq-engine";

const router: IRouter = Router();

function getUserId(req: { auth?: { userId?: string | null } }) {
  return req.auth?.userId ?? "demo-user";
}

function profileToInput(profile: DbCreatorProfile): CreatorProfileInput {
  return {
    displayName: profile.displayName,
    age: profile.age,
    primaryCategory: profile.primaryCategory,
    accountType: profile.accountType,
    followerCount: profile.followerCount,
    followerTier: profile.followerTier,
    contentFormats: profile.contentFormats,
    postFrequencyPerWeek: profile.postFrequencyPerWeek,
    targetAudience: profile.targetAudience,
    aspiration: profile.aspiration,
    biggestChallenge: profile.biggestChallenge,
    baselineEngagementRate: Number(profile.baselineEngagementRate),
    baselineReach: profile.baselineReach,
    contentTone: profile.contentTone,
    inspiredBy: profile.inspiredBy,
    pastTacticsTried: profile.pastTacticsTried,
    postingTimeHabit: profile.postingTimeHabit,
    creatingSince: profile.creatingSince,
  };
}

function profileToApi(profile: DbCreatorProfile) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    age: profile.age,
    primaryCategory: profile.primaryCategory,
    accountType: profile.accountType,
    followerCount: profile.followerCount,
    followerTier: profile.followerTier,
    contentFormats: profile.contentFormats,
    postFrequencyPerWeek: profile.postFrequencyPerWeek,
    targetAudience: profile.targetAudience,
    aspiration: profile.aspiration,
    biggestChallenge: profile.biggestChallenge,
    baselineEngagementRate: Number(profile.baselineEngagementRate),
    baselineReach: profile.baselineReach,
    contentTone: profile.contentTone,
    inspiredBy: profile.inspiredBy,
    pastTacticsTried: profile.pastTacticsTried,
    postingTimeHabit: profile.postingTimeHabit,
    creatingSince: profile.creatingSince,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function suggestionToApi(suggestion: DbSuggestion) {
  return {
    id: suggestion.id,
    analysisId: suggestion.analysisId,
    title: suggestion.title,
    rationale: suggestion.rationale,
    action: suggestion.action,
    actionWhen: suggestion.actionWhen ?? "Use this in the next scheduled post.",
    status: suggestion.status as "pending" | "accepted" | "rejected",
  };
}

async function analysisToApi(analysis: DbAnalysis) {
  const suggestions = await db
    .select()
    .from(suggestionsTable)
    .where(eq(suggestionsTable.analysisId, analysis.id));

  return {
    id: analysis.id,
    profileId: analysis.profileId,
    source: analysis.source,
    metrics: analysis.metrics,
    summary: analysis.summary,
    brutallyHonestTake: analysis.brutallyHonestTake,
    whyItHappened: analysis.whyItHappened,
    clarifyingQuestions: [],
    nextContentPlan: analysis.nextContentPlan,
    suggestions: suggestions.map(suggestionToApi).slice(0, 3),
    createdAt: analysis.createdAt.toISOString(),
  };
}

async function getOrCreateProfile(userId: string) {
  const [existing] = await db
    .select()
    .from(creatorProfilesTable)
    .where(eq(creatorProfilesTable.userId, userId));

  if (existing) return existing;

  const seed = defaultProfile(userId);
  const [created] = await db
    .insert(creatorProfilesTable)
    .values({
      ...seed,
      baselineEngagementRate: String(seed.baselineEngagementRate),
    })
    .returning();

  return created;
}

async function getCalibrationNotes(profileId: string) {
  const rows = await db
    .select({ status: suggestionsTable.status, title: suggestionsTable.title, action: suggestionsTable.action, feedbackReason: suggestionsTable.feedbackReason })
    .from(suggestionsTable)
    .innerJoin(analysesTable, eq(suggestionsTable.analysisId, analysesTable.id))
    .where(eq(analysesTable.profileId, profileId));

  return rows
    .filter((row) => row.status !== "pending")
    .slice(-8)
    .map((row) => `${row.status}: ${row.title} — ${row.feedbackReason || row.action}`);
}

async function getPastAnalyses(profileId: string) {
  const rows = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.profileId, profileId))
    .orderBy(desc(analysesTable.createdAt));

  return rows.slice(0, 5).map((analysis) => ({
    metrics: analysis.metrics,
    insight: analysis.summary,
    createdAt: analysis.createdAt.toISOString(),
  }));
}

async function getCachedAnalysis(profileId: string, source: "manual" | "screenshot", metrics: MetricsInput) {
  const key = stableMetricsKey(source, metrics);
  const rows = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.profileId, profileId))
    .orderBy(desc(analysesTable.createdAt));

  return rows.find((analysis) => stableMetricsKey(analysis.source as "manual" | "screenshot", analysis.metrics) === key) ?? null;
}

async function createAnalysisForProfile(profile: DbCreatorProfile, source: "manual" | "screenshot", metrics: MetricsInput) {
  const cached = await getCachedAnalysis(profile.id, source, metrics);
  if (cached) return analysisToApi(cached);

  const profileInput = profileToInput(profile);
  const calibrationNotes = await getCalibrationNotes(profile.id);
  const pastAnalyses = await getPastAnalyses(profile.id);
  const draft = await generateInsightDraft({ profile: profileInput, metrics, calibrationNotes, pastAnalyses, source });

  const [analysis] = await db
    .insert(analysesTable)
    .values({
      profileId: profile.id,
      source,
      metrics,
      summary: draft.insight,
      brutallyHonestTake: draft.benchmarkComparison,
      whyItHappened: [],
      clarifyingQuestions: [],
      nextContentPlan: draft.actionItems.map((item) => `${item.what} ${item.when}`),
    })
    .returning();

  await db.insert(suggestionsTable).values(
    draft.actionItems.map((item) => ({
      analysisId: analysis.id,
      title: item.what,
      rationale: item.why,
      action: item.how,
      actionWhen: item.when,
      status: "pending",
    })),
  );

  return analysisToApi(analysis);
}

router.get("/creatoriq/profile", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const [profile] = await db
    .select()
    .from(creatorProfilesTable)
    .where(eq(creatorProfilesTable.userId, userId));

  res.json(GetCreatorProfileResponse.parse({ profile: profile ? profileToApi(profile) : null }));
});

router.post("/creatoriq/profile", async (req, res): Promise<void> => {
  const parsed = UpsertCreatorProfileBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid creator profile body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = getUserId(req);
  const followerTier = inferFollowerTier(parsed.data.followerCount);
  const values = {
    ...parsed.data,
    userId,
    followerTier,
    baselineEngagementRate: String(parsed.data.baselineEngagementRate),
  };

  const [existing] = await db
    .select()
    .from(creatorProfilesTable)
    .where(eq(creatorProfilesTable.userId, userId));

  const [profile] = existing
    ? await db.update(creatorProfilesTable).set(values).where(eq(creatorProfilesTable.userId, userId)).returning()
    : await db.insert(creatorProfilesTable).values(values).returning();

  res.json(UpsertCreatorProfileResponse.parse(profileToApi(profile)));
});

router.get("/creatoriq/dashboard", async (req, res): Promise<void> => {
  const profile = await getOrCreateProfile(getUserId(req));
  const analyses = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.profileId, profile.id))
    .orderBy(desc(analysesTable.createdAt));

  const suggestionRows = analyses.length
    ? await db
        .select()
        .from(suggestionsTable)
        .innerJoin(analysesTable, eq(suggestionsTable.analysisId, analysesTable.id))
        .where(eq(analysesTable.profileId, profile.id))
    : [];

  const acceptedSuggestions = suggestionRows.filter((row) => row.creator_suggestions.status === "accepted").length;
  const rejectedSuggestions = suggestionRows.filter((row) => row.creator_suggestions.status === "rejected").length;
  const averageEngagementRate = analyses.length
    ? analyses.reduce((sum, analysis) => sum + Number(analysis.metrics.engagementRate), 0) / analyses.length
    : Number(profile.baselineEngagementRate);
  const latestAnalysis = analyses[0] ? await analysisToApi(analyses[0]) : null;
  const calibrationNotes = await getCalibrationNotes(profile.id);

  res.json(GetCreatorDashboardResponse.parse({
    profileComplete: profile.displayName !== "Creator",
    analysesCount: analyses.length,
    acceptedSuggestions,
    rejectedSuggestions,
    averageEngagementRate,
    latestAnalysis,
    calibrationNotes,
  }));
});

router.get("/creatoriq/analyses", async (req, res): Promise<void> => {
  const profile = await getOrCreateProfile(getUserId(req));
  const analyses = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.profileId, profile.id))
    .orderBy(desc(analysesTable.createdAt));
  const data = await Promise.all(analyses.map(analysisToApi));
  res.json(ListAnalysesResponse.parse(data));
});

router.post("/creatoriq/analyses", async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid analysis body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!parsed.data.confirmed) {
    res.status(409).json({
      error: "Metric review confirmation is required before AI analysis.",
      stage: "metric_review_required",
    });
    return;
  }

  const review = validateMetrics(parsed.data.metrics);
  if (!review.isComplete) {
    res.status(422).json({
      error: "Required metrics are missing.",
      stage: "clarification_required",
      missingFields: review.missingFields,
      questions: review.questions,
    });
    return;
  }

  const profile = await getOrCreateProfile(getUserId(req));
  const data = await createAnalysisForProfile(profile, parsed.data.source ?? "manual", parsed.data.metrics);
  res.json(CreateAnalysisResponse.parse(data));
});

router.get("/creatoriq/analyses/:id", async (req, res): Promise<void> => {
  const params = GetAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const profile = await getOrCreateProfile(getUserId(req));
  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(and(eq(analysesTable.id, params.data.id), eq(analysesTable.profileId, profile.id)));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.json(GetAnalysisResponse.parse(await analysisToApi(analysis)));
});

router.post("/creatoriq/analyses/:id/feedback", async (req, res): Promise<void> => {
  const params = SubmitSuggestionFeedbackParams.safeParse(req.params);
  const body = SubmitSuggestionFeedbackBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.success ? body.error.message : params.error.message });
    return;
  }

  const profile = await getOrCreateProfile(getUserId(req));
  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(and(eq(analysesTable.id, params.data.id), eq(analysesTable.profileId, profile.id)));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  const [suggestion] = await db
    .update(suggestionsTable)
    .set({ status: body.data.status, feedbackReason: body.data.reason })
    .where(and(eq(suggestionsTable.id, body.data.suggestionId), eq(suggestionsTable.analysisId, params.data.id)))
    .returning();

  if (!suggestion) {
    res.status(404).json({ error: "Suggestion not found" });
    return;
  }

  res.json(SubmitSuggestionFeedbackResponse.parse(suggestionToApi(suggestion)));
});

router.get("/creatoriq/matches", async (req, res): Promise<void> => {
  const profile = await getOrCreateProfile(getUserId(req));
  res.json(ListCreatorMatchesResponse.parse(buildCreatorMatches(profileToInput(profile))));
});

router.post("/creatoriq/screenshot-metrics", async (req, res): Promise<void> => {
  const parsed = ExtractScreenshotMetricsBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid screenshot body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const review = await extractMetricsFromScreenshot(parsed.data.imageDataUrl, parsed.data.notes);
  res.json(ExtractScreenshotMetricsResponse.parse(review));
});

export default router;
