/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Container from "../components/core/Container";
import { 
  AppButton, 
  BackButton, 
  PlayButton,
  Text,
  Heading,
  Display,
  AppCard,
  CardContent,
  StatCard,
  Stack,
  Grid,
  Section,
  Flex,
  Icon,
  MusicIcon
} from "@/components/design-system";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthModal } from "@/hooks/useAuthModal";
import LoginModal from "../components/core/LoginModal";
import { Artist, Track } from "@spotify/web-api-ts-sdk";
import { millisToMinutesAndSeconds } from "@/utils";
import { flattenDeep, groupBy, map, sortBy, sumBy } from "lodash";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import sdk from "../../lib/spotify-sdk/ClientInstance";
import { 
  Receipt, 
  Download, 
  Palette, 
  Settings, 
  Image as ImageLucide,
  Music,
  User,
  Calendar,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Import background images
import Bg1 from "../../assets/basic.jpeg";
import Bg2 from "../../assets/laser-bg.jpg";
import Bg3 from "../../assets/business.jpg";
import Bg4 from "../../assets/vintage-bg-2.jpeg";

type ReceiptConfig = {
  title: string;
  type: "top-song" | "top-artist" | "top-genre";
  duration: "short_term" | "medium_term" | "long_term";
  length: 10 | 15 | 20;
  background: 1 | 2 | 3 | 4;
  textColor: string;
};

type ReceiptData =
  | { type: "top-song"; data: Track[] }
  | { type: "top-artist"; data: Artist[] }
  | { type: "top-genre"; data: string[][] };

const DURATION_LABELS = {
  short_term: "Last 4 Weeks",
  medium_term: "Last 6 Months",
  long_term: "All Time",
};

const BACKGROUND_OPTIONS = [
  { id: 1, src: Bg1, name: "Basic", description: "Clean minimal style" },
  { id: 2, src: Bg2, name: "Laser", description: "Futuristic vibes" },
  { id: 3, src: Bg3, name: "Dream", description: "Purple aesthetic" },
  { id: 4, src: Bg4, name: "Vintage", description: "Retro classic look" },
];

const RECEIPT_TYPES = [
  { 
    value: "top-song", 
    label: "Top Tracks", 
    description: "Your most played songs",
    icon: Music 
  },
  { 
    value: "top-artist", 
    label: "Top Artists", 
    description: "Your favorite musicians",
    icon: User 
  },
  { 
    value: "top-genre", 
    label: "Top Genres", 
    description: "Your music taste profile",
    icon: Calendar 
  },
];

function Receiptify() {
  const { data: session } = useSession();
  const { requireAuth, authModalProps } = useAuthModal({
    feature: "create receipt",
    message: "Sign in with Spotify to create your personalized music receipt"
  });

  const [currentStep, setCurrentStep] = useState<'configure' | 'customize' | 'preview'>('configure');
  const [isGenerating, setIsGenerating] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptConfig>({
    title: "My Music Receipt",
    type: "top-song",
    duration: "short_term",
    length: 10,
    background: 1,
    textColor: "#000000",
  });
  const [data, setData] = useState<ReceiptData>();

  const generateReceiptData = async () => {
    try {
      if (receipt.type === "top-song") {
        const res = await sdk.currentUser.topItems("tracks", receipt.duration, receipt.length);
        setData({ type: "top-song", data: res.items });
      } else if (receipt.type === "top-artist") {
        const res = await sdk.currentUser.topItems("artists", receipt.duration, receipt.length);
        setData({ type: "top-artist", data: res.items });
      } else if (receipt.type === "top-genre") {
        const res = await sdk.currentUser.followedArtists(undefined, 50);
        const topGenres = sortBy(
          groupBy(
            flattenDeep(map(res.artists.items, (item) => item.genres)),
            (item) => item
          ),
          (item) => item.length
        ).reverse();
        setData({ type: "top-genre", data: topGenres });
      }
    } catch (error) {
      console.error("Error generating receipt data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your music data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (session) {
      generateReceiptData();
    }
  }, [receipt, session]);

  // Check authentication
  if (!session) {
    return (
      <Container>
        <LoginModal {...authModalProps} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <Receipt className="w-16 h-16 text-spotify-green mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Receiptify</h1>
            <p className="text-gray-300 mb-6">
              Create beautiful receipts from your Spotify listening data
            </p>
            <AppButton 
              onClick={() => requireAuth()}
              variant="spotify"
              size="lg"
              shape="pill"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started
            </AppButton>
          </div>
        </div>
      </Container>
    );
  }

  const downloadReceipt = async () => {
    const node = document.getElementById("receipt-preview");
    if (!node) return;

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(node, {
        quality: 1.0,
        pixelRatio: 2,
      });
      
      const link = document.createElement("a");
      link.download = `receiptify-${receipt.type}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: "Receipt Downloaded!",
        description: "Your music receipt has been saved successfully",
      });
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Download Failed",
        description: "Could not generate receipt image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderReceiptTable = () => {
    if (data?.type === "top-song") {
      return data.data.map((item, index) => (
        <tr key={item.id} className="border-b border-black/10">
          <td className="py-1 text-sm font-bold">{index + 1}</td>
          <td className="py-1 text-sm font-bold uppercase">{item.name}</td>
          <td className="py-1 text-sm font-bold text-right">
            {millisToMinutesAndSeconds(item.duration_ms)}
          </td>
        </tr>
      ));
    } else if (data?.type === "top-artist") {
      return data.data.map((item, index) => (
        <tr key={item.id} className="border-b border-black/10">
          <td className="py-1 text-sm font-bold">{index + 1}</td>
          <td className="py-1 text-sm font-bold uppercase">{item.name}</td>
          <td className="py-1 text-sm font-bold text-right">{item.popularity}%</td>
        </tr>
      ));
    } else if (data?.type === "top-genre") {
      return data.data.slice(0, receipt.length).map((item, index) => (
        <tr key={index} className="border-b border-black/10">
          <td className="py-1 text-sm font-bold">{index + 1}</td>
          <td className="py-1 text-sm font-bold uppercase">{item[0]}</td>
          <td className="py-1 text-sm font-bold text-right">{item.length}</td>
        </tr>
      ));
    }
  };

  const renderReceiptPreview = () => {
    const background = BACKGROUND_OPTIONS.find(bg => bg.id === receipt.background);
    
    return (
      <div
        id="receipt-preview"
        className="w-full max-w-sm mx-auto bg-white text-black font-mono shadow-2xl"
        style={{
          backgroundImage: `url(${background?.src.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: receipt.textColor,
        }}
      >
        {/* Header */}
        <div className="text-center p-6 pb-4">
          <h1 className="text-2xl font-black tracking-wider mb-2">
            {receipt.title}
          </h1>
          <p className="text-sm font-bold opacity-80">
            {DURATION_LABELS[receipt.duration]}
          </p>
        </div>

        {/* Order Info */}
        <div className="px-6 pb-4">
          <div className="border-t border-current border-dashed pt-4">
            <p className="text-xs font-bold">
              ORDER #001 FOR {session?.user?.name?.toUpperCase()}
            </p>
            <p className="text-xs font-bold mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 pb-4">
          <div className="border-t border-current border-dashed pt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-current">
                  <th className="text-left py-1 font-bold">#</th>
                  <th className="text-left py-1 font-bold">ITEM</th>
                  <th className="text-right py-1 font-bold">QTY</th>
                </tr>
              </thead>
              <tbody>
                {renderReceiptTable()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total */}
        <div className="px-6 pb-4">
          <div className="border-t border-current border-dashed pt-4">
            <div className="flex justify-between">
              <span className="text-xs font-bold">TOTAL ITEMS</span>
              <span className="text-xs font-bold">{receipt.length}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs font-bold">SUBTOTAL</span>
              <span className="text-xs font-bold">
                $
                {data?.type === "top-song"
                  ? millisToMinutesAndSeconds(sumBy(data.data, "duration_ms"))
                  : data?.type === "top-artist"
                  ? sumBy(data.data, "popularity")
                  : "100"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="border-t border-current border-dashed pt-4">
            <p className="text-xs font-bold">CARD: #### #### #### 2024</p>
            <p className="text-xs font-bold">AUTH CODE: {Date.now().toString().slice(-8)}</p>
            <p className="text-xs font-bold">CARDHOLDER: {session?.user?.name?.toUpperCase()}</p>
            <p className="text-xs font-bold text-center mt-4 opacity-60">
              Generated by Receiptify
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Container>
      <LoginModal {...authModalProps} />
      
      <div className="min-h-screen py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Receipt className="w-8 h-8 text-spotify-green" />
            <Display size="large">Receiptify</Display>
          </div>
          <Text color="secondary" variant="body-large">
            Create beautiful receipts from your Spotify listening data
          </Text>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            {[
              { key: 'configure', label: 'Configure', icon: Settings },
              { key: 'customize', label: 'Customize', icon: Palette },
              { key: 'preview', label: 'Preview', icon: ImageLucide }
            ].map((step, index) => {
              const isActive = currentStep === step.key;
              const isCompleted = ['configure', 'customize', 'preview'].indexOf(currentStep) > index;
              
              return (
                <React.Fragment key={step.key}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    isActive 
                      ? 'bg-spotify-green text-black' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                  }`}>
                    <step.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                  {index < 2 && (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <Grid cols={2} responsive={{ sm: 1, lg: 2 }} gap="xl">
          {/* Configuration Panel */}
          <Stack spacing="lg">
            {currentStep === 'configure' && (
              <>
                <Heading level={2}>Receipt Configuration</Heading>
                
                <Stack spacing="md">
                  <div>
                    <Text color="primary" weight="medium" className="mb-2">Receipt Type</Text>
                    <Grid cols={1} gap="sm">
                      {RECEIPT_TYPES.map((type) => (
                        <AppCard
                          key={type.value}
                          variant={receipt.type === type.value ? 'spotify' : 'default'}
                          clickable
                          onClick={() => setReceipt({ ...receipt, type: type.value as any })}
                          className="transition-all duration-200"
                          padding="md"
                        >
                          <CardContent>
                            <Flex gap="md" align="center">
                              <type.icon className="w-5 h-5" />
                              <div>
                                <Text weight="semibold">{type.label}</Text>
                                <Text variant="caption-large" color="secondary">{type.description}</Text>
                              </div>
                            </Flex>
                          </CardContent>
                        </AppCard>
                      ))}
                    </Grid>
                  </div>

                  <div>
                    <Text color="primary" weight="medium" className="mb-2">Time Period</Text>
                    <Select
                      value={receipt.duration}
                      onValueChange={(value) => setReceipt({ ...receipt, duration: value as any })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="short_term">Last 4 Weeks</SelectItem>
                        <SelectItem value="medium_term">Last 6 Months</SelectItem>
                        <SelectItem value="long_term">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Text color="primary" weight="medium" className="mb-2">Number of Items</Text>
                    <Select
                      value={receipt.length.toString()}
                      onValueChange={(value) => setReceipt({ ...receipt, length: parseInt(value) as any })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="10">10 Items</SelectItem>
                        <SelectItem value="15">15 Items</SelectItem>
                        <SelectItem value="20">20 Items</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Stack>

                <AppButton 
                  onClick={() => setCurrentStep('customize')}
                  variant="spotify"
                  rightIcon={ChevronRight}
                >
                  Continue to Customize
                </AppButton>
              </>
            )}

            {currentStep === 'customize' && (
              <>
                <Heading level={2}>Customize Appearance</Heading>
                
                <Stack spacing="md">
                  <div>
                    <Text color="primary" weight="medium" className="mb-3">Receipt Title</Text>
                    <Input
                      value={receipt.title}
                      onChange={(e) => setReceipt({ ...receipt, title: e.target.value.slice(0, 25) })}
                      placeholder="Enter receipt title"
                      className="bg-gray-800 border-gray-600"
                    />
                  </div>

                  <div>
                    <Text color="primary" weight="medium" className="mb-3">Text Color</Text>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={receipt.textColor}
                        onChange={(e) => setReceipt({ ...receipt, textColor: e.target.value })}
                        className="w-16 h-10 bg-gray-800 border-gray-600"
                      />
                      <Input
                        value={receipt.textColor}
                        onChange={(e) => setReceipt({ ...receipt, textColor: e.target.value })}
                        placeholder="#000000"
                        className="flex-1 bg-gray-800 border-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <Text color="primary" weight="medium" className="mb-3">Background Style</Text>
                    <Grid cols={2} gap="sm">
                      {BACKGROUND_OPTIONS.map((bg) => (
                        <AppCard
                          key={bg.id}
                          variant={receipt.background === bg.id ? 'spotify' : 'default'}
                          clickable
                          onClick={() => setReceipt({ ...receipt, background: bg.id as any })}
                          className="transition-all duration-200"
                        >
                          <CardContent>
                            <div className="relative aspect-video overflow-hidden rounded-t-lg">
                              <img
                                src={bg.src.src}
                                alt={bg.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Text color="primary" weight="bold" className="text-white">{bg.name}</Text>
                              </div>
                            </div>
                            <div className="p-3">
                              <Text variant="caption-large" color="secondary">{bg.description}</Text>
                            </div>
                          </CardContent>
                        </AppCard>
                      ))}
                    </Grid>
                  </div>
                </Stack>

                <Flex gap="md">
                  <AppButton 
                    onClick={() => setCurrentStep('configure')}
                    variant="outline"
                    leftIcon={ChevronLeft}
                  >
                    Back
                  </AppButton>
                  <AppButton 
                    onClick={() => setCurrentStep('preview')}
                    variant="spotify"
                    rightIcon={ChevronRight}
                  >
                    Preview Receipt
                  </AppButton>
                </Flex>
              </>
            )}

            {currentStep === 'preview' && (
              <>
                <Heading level={2}>Final Preview</Heading>
                
                <Stack spacing="md">
                  <AppCard variant="muted" padding="lg">
                    <CardContent>
                      <Stack spacing="sm">
                        <Text weight="semibold">Receipt Details</Text>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Text color="secondary" variant="caption-large">Type</Text>
                            <Text>{RECEIPT_TYPES.find(t => t.value === receipt.type)?.label}</Text>
                          </div>
                          <div>
                            <Text color="secondary" variant="caption-large">Period</Text>
                            <Text>{DURATION_LABELS[receipt.duration]}</Text>
                          </div>
                          <div>
                            <Text color="secondary" variant="caption-large">Items</Text>
                            <Text>{receipt.length}</Text>
                          </div>
                          <div>
                            <Text color="secondary" variant="caption-large">Style</Text>
                            <Text>{BACKGROUND_OPTIONS.find(bg => bg.id === receipt.background)?.name}</Text>
                          </div>
                        </div>
                      </Stack>
                    </CardContent>
                  </AppCard>

                  <AppButton 
                    onClick={downloadReceipt}
                    variant="spotify"
                    size="lg"
                    loading={isGenerating}
                    leftIcon={Download}
                  >
                    {isGenerating ? 'Generating...' : 'Download Receipt'}
                  </AppButton>
                </Stack>

                <Flex gap="md">
                  <AppButton 
                    onClick={() => setCurrentStep('customize')}
                    variant="outline"
                    leftIcon={ChevronLeft}
                  >
                    Back to Customize
                  </AppButton>
                  <AppButton 
                    onClick={() => {
                      setCurrentStep('configure');
                      generateReceiptData();
                    }}
                    variant="ghost"
                  >
                    Start Over
                  </AppButton>
                </Flex>
              </>
            )}
          </Stack>

          {/* Preview Panel */}
          <Stack spacing="lg">
            <Heading level={3}>Live Preview</Heading>
            <AppCard variant="muted" className="sticky top-8" padding="lg">
              <CardContent>
                <div className="flex justify-center">
                  {renderReceiptPreview()}
                </div>
              </CardContent>
            </AppCard>
          </Stack>
        </Grid>
      </div>
    </Container>
  );
}

export default Receiptify;