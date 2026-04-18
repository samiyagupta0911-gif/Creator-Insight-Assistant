import { AppLayout } from "@/components/layout";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateAnalysis, useCreateScreenshotInsights } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowRight, ImageIcon, Loader2, PenLine, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useRef } from "react";

const manualSchema = z.object({
  reach: z.coerce.number().min(0, "Must be >= 0"),
  impressions: z.coerce.number().min(0, "Must be >= 0"),
  engagementRate: z.coerce.number().min(0, "Must be >= 0"),
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

export default function Analyze() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshotNotes, setScreenshotNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const createAnalysis = useCreateAnalysis();
  const createScreenshotInsights = useCreateScreenshotInsights();

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
    createAnalysis.mutate({
      data: {
        metrics,
        context
      }
    }, {
      onSuccess: (analysis) => {
        toast({ title: "Analysis complete", description: "Your insights are ready." });
        setLocation(`/analysis/${analysis.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to analyze post.", variant: "destructive" });
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onScreenshotSubmit = () => {
    if (!selectedImage) return;

    createScreenshotInsights.mutate({
      data: {
        imageDataUrl: selectedImage,
        notes: screenshotNotes || undefined
      }
    }, {
      onSuccess: (analysis) => {
        toast({ title: "Analysis complete", description: "Your insights are ready." });
        setLocation(`/analysis/${analysis.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to analyze screenshot.", variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analyze Post</h1>
          <p className="text-muted-foreground mt-2">Upload a screenshot of your insights or enter them manually.</p>
        </div>

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
                <CardDescription>Upload a screenshot of your Instagram post insights. We'll extract the numbers automatically.</CardDescription>
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
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }} className="mt-4">
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
                        Make sure the numbers for reach, engagement, saves, and shares are clearly visible.
                      </p>
                    </>
                  )}
                </div>

                {selectedImage && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="space-y-2">
                      <FormLabel>Additional Context (Optional)</FormLabel>
                      <Textarea 
                        placeholder="What was this post about? Any specific goal?" 
                        value={screenshotNotes}
                        onChange={(e) => setScreenshotNotes(e.target.value)}
                        className="resize-none h-24"
                      />
                    </div>
                    <Button 
                      className="w-full h-12 text-lg font-semibold" 
                      onClick={onScreenshotSubmit}
                      disabled={createScreenshotInsights.isPending}
                    >
                      {createScreenshotInsights.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <SparklesIcon className="w-5 h-5 mr-2" />
                      )}
                      {createScreenshotInsights.isPending ? "Analyzing Data..." : "Extract & Analyze"}
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
                <CardDescription>Enter the numbers exactly as they appear in your Instagram insights.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border pb-2">Core Metrics</h3>
                        
                        <FormField
                          control={form.control}
                          name="reach"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reach</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="impressions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Impressions</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="engagementRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Engagement Rate (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="followerChange"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Followers (Gained/Lost)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border pb-2">Interactions</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="saves"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Saves</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="shares"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Shares</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="profileVisits"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Profile Visits</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="linkClicks"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Link Clicks</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
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
                            <FormLabel>Additional Context (Optional)</FormLabel>
                            <FormDescription>Any specific goals or context for this post?</FormDescription>
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
                      disabled={createAnalysis.isPending}
                    >
                      {createAnalysis.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <SparklesIcon className="w-5 h-5 mr-2" />
                      )}
                      {createAnalysis.isPending ? "Analyzing..." : "Analyze Post"}
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
