import { AppLayout } from "@/components/layout";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpsertCreatorProfile, getGetCreatorProfileQueryKey, useGetCreatorProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Loader2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const profileSchema = z.object({
  displayName: z.string().min(2, "Name is required"),
  age: z.coerce.number().min(13, "Must be at least 13"),
  primaryCategory: z.string().min(2, "Category is required"),
  accountType: z.string().min(2, "Account type is required"),
  followerCount: z.coerce.number().min(0),
  postFrequencyPerWeek: z.coerce.number().min(0),
  targetAudience: z.string().min(2),
  aspiration: z.string().min(2),
  biggestChallenge: z.string().min(2),
  baselineEngagementRate: z.coerce.number().min(0),
  baselineReach: z.coerce.number().min(0),
  contentTone: z.string().min(2),
  postingTimeHabit: z.string().min(2),
  creatingSince: z.string().min(2),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const { data: profileResponse, isLoading: isLoadingProfile } = useGetCreatorProfile({
    query: {
      queryKey: getGetCreatorProfileQueryKey(),
      retry: false
    }
  });

  const upsertProfile = useUpsertCreatorProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      age: 18,
      primaryCategory: "",
      accountType: "creator",
      followerCount: 0,
      postFrequencyPerWeek: 3,
      targetAudience: "",
      aspiration: "",
      biggestChallenge: "",
      baselineEngagementRate: 2.5,
      baselineReach: 0,
      contentTone: "",
      postingTimeHabit: "",
      creatingSince: new Date().getFullYear().toString(),
    }
  });

  useEffect(() => {
    if (profileResponse?.profile) {
      form.reset({
        ...profileResponse.profile,
        age: profileResponse.profile.age,
        followerCount: profileResponse.profile.followerCount,
        postFrequencyPerWeek: profileResponse.profile.postFrequencyPerWeek,
        baselineEngagementRate: profileResponse.profile.baselineEngagementRate,
        baselineReach: profileResponse.profile.baselineReach,
      });
    }
  }, [profileResponse, form]);

  const onSubmit = (data: ProfileFormValues) => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    upsertProfile.mutate({
      data: {
        ...data,
        contentFormats: ["reels", "carousels"],
        inspiredBy: [],
        pastTacticsTried: []
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCreatorProfileQueryKey() });
        toast({
          title: "Profile saved",
          description: "Your strategist is calibrated and ready.",
        });
        setLocation("/app");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to save profile. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const progress = (step / totalSteps) * 100;

  if (isLoadingProfile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Calibrate Your Strategist</h1>
          <p className="text-muted-foreground">Let's set your baseline so we can give you accurate advice.</p>
          <Progress value={progress} className="h-2 mt-6" />
        </div>

        <Card className="border-border shadow-md">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle>
              {step === 1 && "The Basics"}
              {step === 2 && "The Numbers"}
              {step === 3 && "Your Audience & Tone"}
              {step === 4 && "Goals & Challenges"}
            </CardTitle>
            <CardDescription>Step {step} of {totalSteps}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {step === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">What name do you go by?</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Alex Tech" className="h-12 text-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primaryCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">What's your primary niche?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 text-lg">
                                <SelectValue placeholder="Select a niche" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="lifestyle">Lifestyle & Vlog</SelectItem>
                              <SelectItem value="tech">Tech & Coding</SelectItem>
                              <SelectItem value="education">Education & Tips</SelectItem>
                              <SelectItem value="comedy">Comedy & Skits</SelectItem>
                              <SelectItem value="fashion">Fashion & Beauty</SelectItem>
                              <SelectItem value="fitness">Fitness & Health</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Your Age</FormLabel>
                            <FormControl>
                              <Input type="number" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="creatingSince"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Creating Since (Year)</FormLabel>
                            <FormControl>
                              <Input type="text" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <FormField
                      control={form.control}
                      name="followerCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Current Follower Count</FormLabel>
                          <FormDescription>Be honest, we don't judge.</FormDescription>
                          <FormControl>
                            <Input type="number" className="h-12 text-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="baselineEngagementRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Avg Engagement Rate (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="baselineReach"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">Avg Reach per post</FormLabel>
                            <FormControl>
                              <Input type="number" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="postFrequencyPerWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Posts per week</FormLabel>
                          <FormControl>
                            <Input type="number" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Who is your ideal audience?</FormLabel>
                          <FormDescription>E.g. "College students learning to code" or "Young professionals interested in personal finance"</FormDescription>
                          <FormControl>
                            <Textarea className="resize-none h-24" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contentTone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">How would you describe your tone?</FormLabel>
                          <FormDescription>E.g. "Sarcastic but helpful", "High energy and positive", "Calm and aesthetic"</FormDescription>
                          <FormControl>
                            <Input className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postingTimeHabit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">When do you usually post?</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Evenings around 6pm EST" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                    <FormField
                      control={form.control}
                      name="aspiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">What's your ultimate goal?</FormLabel>
                          <FormDescription>Why are you doing this? Full-time creator? Sell a product? Just for fun?</FormDescription>
                          <FormControl>
                            <Textarea className="resize-none h-24" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="biggestChallenge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">What is your biggest struggle right now?</FormLabel>
                          <FormDescription>E.g. "Low story views", "Can't grow past 5k followers", "Running out of ideas"</FormDescription>
                          <FormControl>
                            <Textarea className="resize-none h-24" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="creator">Creator</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1 || upsertProfile.isPending}
                    className="font-semibold"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={upsertProfile.isPending}
                    className="font-semibold min-w-32"
                  >
                    {upsertProfile.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : step === totalSteps ? (
                      <><Save className="w-4 h-4 mr-2" /> Save Profile</>
                    ) : (
                      <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
