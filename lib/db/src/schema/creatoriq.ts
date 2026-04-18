import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creatorProfilesTable = pgTable("creator_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  age: integer("age").notNull(),
  primaryCategory: text("primary_category").notNull(),
  accountType: text("account_type").notNull(),
  followerCount: integer("follower_count").notNull(),
  followerTier: text("follower_tier").notNull(),
  contentFormats: jsonb("content_formats").$type<string[]>().notNull(),
  postFrequencyPerWeek: integer("post_frequency_per_week").notNull(),
  targetAudience: text("target_audience").notNull(),
  aspiration: text("aspiration").notNull(),
  biggestChallenge: text("biggest_challenge").notNull(),
  baselineEngagementRate: numeric("baseline_engagement_rate").notNull(),
  baselineReach: integer("baseline_reach").notNull(),
  contentTone: text("content_tone").notNull(),
  inspiredBy: jsonb("inspired_by").$type<string[]>().notNull(),
  pastTacticsTried: jsonb("past_tactics_tried").$type<string[]>().notNull(),
  postingTimeHabit: text("posting_time_habit").notNull(),
  creatingSince: text("creating_since").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const analysesTable = pgTable("creator_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => creatorProfilesTable.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  metrics: jsonb("metrics").$type<{
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
  }>().notNull(),
  summary: text("summary").notNull(),
  brutallyHonestTake: text("brutally_honest_take").notNull(),
  whyItHappened: jsonb("why_it_happened").$type<string[]>().notNull(),
  clarifyingQuestions: jsonb("clarifying_questions").$type<string[]>().notNull(),
  nextContentPlan: jsonb("next_content_plan").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suggestionsTable = pgTable("creator_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id").notNull().references(() => analysesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  rationale: text("rationale").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull().default("pending"),
  feedbackReason: text("feedback_reason"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const creatorProfilesRelations = relations(creatorProfilesTable, ({ many }) => ({
  analyses: many(analysesTable),
}));

export const analysesRelations = relations(analysesTable, ({ one, many }) => ({
  profile: one(creatorProfilesTable, {
    fields: [analysesTable.profileId],
    references: [creatorProfilesTable.id],
  }),
  suggestions: many(suggestionsTable),
}));

export const suggestionsRelations = relations(suggestionsTable, ({ one }) => ({
  analysis: one(analysesTable, {
    fields: [suggestionsTable.analysisId],
    references: [analysesTable.id],
  }),
}));

export const insertCreatorProfileSchema = createInsertSchema(creatorProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({
  id: true,
  createdAt: true,
});

export const insertSuggestionSchema = createInsertSchema(suggestionsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertCreatorProfile = z.infer<typeof insertCreatorProfileSchema>;
export type CreatorProfile = typeof creatorProfilesTable.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Suggestion = typeof suggestionsTable.$inferSelect;
