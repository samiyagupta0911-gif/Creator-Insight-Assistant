import { AppLayout } from "@/components/layout";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateAnalysis, useExtractScreenshotMetrics } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, ImageIcon, Loader2, PenLine, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useRef } from "react";

const manualSchema = z.object({
  reach: z.coerce.number().min(1, "Reach is required"),
  impressions: z.coerce.number().min(1, "Impressions are required"),
  engagementRate: z.coerce.number().min(0.1, "Engagement rate is required"),
  followerChange: z.coerce.number(),
  saves: z.coerce.number().min(0, "Must be >= 0"),
  shares: z.coerce.number().min(0, "Must be >= 0"),
  profileVisits: z.coerce.number().min(0, "Must be >= 0"),
  linkClicks: z.coerce.number().min(0, "Must be >= 0"),
  contentFormat: z.string().min(1, "Format is required"),
  postTopic: z.string().min(2, "Topic is required"),
  context: z.string().optional(),
});

type ManualFormValues = z.infer<typeof manualSchema>;
type Metrics = Omit<ManualFormValues, "context">;
type ReviewState = {
  source: "manual" | "screenshot";
  metrics: Partial<Metrics>;
  context?: string;
  questions: string[];
};

const metricLabels: Record<keyof Metrics, string> = {
  reach: "Reach",
  impressions: "Impressions",
  engagementRate: "Engagement Rate (%)",
  followerChange: "Followers Gained/Lost",
  saves: "Saves",
  shares: "Shares",
  profileVisits: "Profile Visits",
  linkClicks: "Link Clicks",
  contentFormat: "Content Format",
  postTopic: "Post Topic / Hook",
};

const metricFields = Object.keys(metricLabels) as Array<keyof Metrics>;

function buildMetricKey(source: "manual" | "screenshot", metrics: Metrics) {
  return JSON.stringify({ source, metrics });
}

function reviewToCompleteMetrics(metrics: Partial<Metrics>) {
  const normalized = {
    reach: Number(metrics.reach),
    impressions: Number(metrics.impressions),
    engagementRate: Number(metrics.engagementRate),
    followerChange: Number(metrics.followerChange ?? 0),
    saves: Number(metrics.saves),
    shares: Number(metrics.shares),
    profileVisits: Number(metrics.profileVisits),
    linkClicks: Number(metrics.linkClicks),
    contentFormat: String(metrics.contentFormat ?? ""),
    postTopic: String(metrics.postTopic ?? ""),
  };

  const missing = metricFields.filter((field) => {
    const value = normalized[field];
    if (typeof value === "string") return !value.trim();
    if (field === "reach" || field === "impressions" || field === "engagementRate") return !Number.isFinite(value) || value <= 0;
    return !Number.isFinite(value);
  });

  return { metrics: normalized, missing };
}

function questionsFor(fields: Array<keyof Metrics>) {
  return fields.map((field) => `Please confirm ${metricLabels[field].toLowerCase()}.`);
}

export default function Analyze() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshotNotes, setScreenshotNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);

  const createAnalysis = useCreateAnalysis();
  const extractScreenshotMetrics = useExtractScreenshotMetrics();

  const form = useForm<ManualFormValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      reach: 0,
      impressions: 0,
      engagementRate: 0,
      followerChange: 0,
      saves: 0,
      shares: 0,
      profileVisits: 0,
      linkClicks: 0,
      contentFormat: "",
      postTopic: "",
      context: "",
    }
  });

  const onManualSubmit = (data: ManualFormValues) => {
    const { context, ...metrics } = data;
    setReview({ source: "manual", metrics, context, questions: [] });
    toast({ title: "Metric review required", description: "Confirm or edit the numbers before AI analysis runs." });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setReview(null);
    };
    reader.readAsDataURL(file);
  };

  const onScreenshotSubmit = () => {
    if (!selectedImage) return;

    extractScreenshotMetrics.mutate({
      data: {
        imageDataUrl: selectedImage,
        notes: screenshotNotes || undefined
      }
    }, {
      onSuccess: (payload) => {
        setReview({
          source: "screenshot",
          metrics: payload.metrics,
          context: screenshotNotes,
          questions: payload.questions,
        });
        toast({
          title: payload.status === "ready_for_review" ? "Metrics extracted" : "More metric details needed",
          description: "Review, edit, and confirm the metrics before analysis runs."
        });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to extract screenshot metrics.", variant: "destructive" });
      }
    });
  };

  const updateReviewMetric = (field: keyof Metrics, value: string) => {
    setReview((current) => {
      if (!current) return current;
      const nextValue = field === "contentFormat" || field === "postTopic" ? value : Number(value);
      return { ...current, metrics: { ...current.metrics, [field]: nextValue } };
    });
  };

  const confirmMetrics = () => {
    if (!review) return;
    const completed = reviewToCompleteMetrics(review.metrics);
    if (completed.missing.length) {
      setReview({ ...review, questions: questionsFor(completed.missing) });
      toast({ title: "Metrics still missing", description: "Answer the targeted metric questions before analysis.", variant: "destructive" });
      return;
    }

    const cacheKey = buildMetricKey(review.source, completed.metrics);
    const cachedId = window.localStorage.getItem(`creatoriq:last-analysis:${cacheKey}`);
    if (cachedId) {
      toast({ title: "Cached analysis found", description: "Opening the existing action plan for these exact metrics." });
      setLocation(`/analysis/${cachedId}`);
      return;
    }

    createAnalysis.mutate({
      data: {
        metrics: completed.metrics,
        context: review.context,
        source: review.source,
        confirmed: true,
      }
    }, {
      onSuccess: (analysis) => {
        window.localStorage.setItem(`creatoriq:last-analysis:${cacheKey}`, analysis.id);
        toast({ title: "Action plan complete", description: "Your confirmed metrics were translated into a final plan." });
        setLocation(`/analysis/${analysis.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create action plan from confirmed metrics.", variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analyze Post</h1>
          <p className="text-muted-foreground mt-2">Input → extraction if needed → metric review → confirmed data → AI insight → action plan.</p>
        </div>

        {review && (
          <MetricReviewCard
            review={review}
            onChange={updateReviewMetric}
            onConfirm={confirmMetrics}
            isPending={createAnalysis.isPending}
            onCancel={() => setReview(null)}
          />
        )}

        <Tabs defaultValue="screenshot" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="screenshot" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Screenshot
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <PenLine className="w-4 h-4" /> Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="screenshot" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Screenshot Upload</CardTitle>
                <CardDescription>Upload a screenshot first. CreatorIQ extracts visible numbers only, then you confirm them before analysis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  className={`border-2 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center transition-colors ${selectedImage ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50 cursor-pointer'}`}
                  onClick={() => !selectedImage && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  
                  {selectedImage ? (
                    <div className="space-y-4 w-full">
                      <div className="relative max-h-[300px] overflow-hidden rounded-lg border border-border shadow-sm mx-auto max-w-[250px]">
                        <img src={selectedImage} alt="Uploaded screenshot" className="w-full h-auto object-contain" />
                      </div>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setReview(null); }} className="mt-4">
                        Choose different image
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-semibold">Click to upload screenshot</h3>
                      <p className="text-muted-foreground mt-2 text-sm max-w-sm">
                        Make sure reach, impressions, engagement rate, saves, shares, profile visits, and follower change are visible.
                      </p>
                    </>
                  )}
                </div>

                {selectedImage && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="space-y-2">
                      <FormLabel>Screenshot Notes</FormLabel>
                      <Textarea 
                        placeholder="Add only facts not visible in the image, like post topic or format." 
                        value={screenshotNotes}
                        onChange={(e) => setScreenshotNotes(e.target.value)}
                        className="resize-none h-24"
                      />
                    </div>
                    <Button 
                      className="w-full h-12 text-lg font-semibold" 
                      onClick={onScreenshotSubmit}
                      disabled={extractScreenshotMetrics.isPending}
                    >
                      {extractScreenshotMetrics.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <SparklesIcon className="w-5 h-5 mr-2" />
                      )}
                      {extractScreenshotMetrics.isPending ? "Extracting Metrics..." : "Extract Metrics for Review"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual Data Entry</CardTitle>
                <CardDescription>Enter exact numbers first. AI analysis stays blocked until you confirm the metric review.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border pb-2">Core Metrics</h3>
                        {(["reach", "impressions", "engagementRate", "followerChange"] as Array<keyof ManualFormValues>).map((name) => (
                          <FormField
                            key={name}
                            control={form.control}
                            name={name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{metricLabels[name as keyof Metrics]}</FormLabel>
                                <FormControl>
                                  <Input type="number" step={name === "engagementRate" ? "0.1" : "1"} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border pb-2">Interactions</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {(["saves", "shares", "profileVisits", "linkClicks"] as Array<keyof ManualFormValues>).map((name) => (
                            <FormField
                              key={name}
                              control={form.control}
                              name={name}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{metricLabels[name as keyof Metrics]}</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>

                        <div className="pt-4 space-y-4">
                          <FormField
                            control={form.control}
                            name="contentFormat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Content Format</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select format" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="reel">Reel</SelectItem>
                                    <SelectItem value="carousel">Carousel</SelectItem>
                                    <SelectItem value="single_image">Single Image</SelectItem>
                                    <SelectItem value="story">Story</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="postTopic"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Post Topic / Hook</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. 3 ways to fix your posture" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <FormField
                        control={form.control}
                        name="context"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Context</FormLabel>
                            <FormDescription>Only add factual context. The system will not assume missing metrics from this field.</FormDescription>
                            <FormControl>
                              <Textarea className="resize-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg font-semibold" 
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Review Metrics
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function MetricReviewCard({ review, onChange, onConfirm, isPending, onCancel }: {
  review: ReviewState;
  onChange: (field: keyof Metrics, value: string) => void;
  onConfirm: () => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>Metric Review Required</CardTitle>
        <CardDescription>AI analysis is blocked until you confirm or edit every required metric below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {review.questions.length > 0 && (
          <Alert>
            <AlertTitle>Clarification needed before analysis</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {review.questions.map((question) => <li key={question}>{question}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metricFields.map((field) => (
            <div key={field} className="space-y-2">
              <FormLabel>{metricLabels[field]}</FormLabel>
              {field === "contentFormat" ? (
                <Select value={String(review.metrics[field] ?? "")} onValueChange={(value) => onChange(field, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="single_image">Single Image</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field === "postTopic" ? "text" : "number"}
                  step={field === "engagementRate" ? "0.1" : "1"}
                  value={review.metrics[field] ?? ""}
                  onChange={(event) => onChange(field, event.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1 h-11 font-semibold" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
            {isPending ? "Creating Action Plan..." : "Confirm Metrics & Create Action Plan"}
          </Button>
          <Button variant="outline" className="sm:w-32" onClick={onCancel} disabled={isPending}>Edit Input</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}
