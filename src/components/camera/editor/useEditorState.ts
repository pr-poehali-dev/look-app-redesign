import { PublishCompliance, DEFAULT_COMPLIANCE } from "@/components/camera/ComplianceFields";
import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import type { Filter, Layer, Clip, ExportFormat, ExportQuality, SubtitleCue, WatermarkPosition, SfxCue } from "./editorTypes";

export type Tab = "templates" | "clips" | "trim" | "crop" | "filter" | "adjust" | "text" | "stickers" | "music" | "pip" | "watermark" | "subtitles" | "sfx";

export const useEditorState = () => {
  const { user } = useAuth();
  const { refreshMedia } = useUserMedia();
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [filter, setFilter] = useState<Filter>("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<number | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicName, setMusicName] = useState("");
  const [musicVolume, setMusicVolume] = useState(100);
  const [clipVolume, setClipVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("9:16");
  const [exportQuality, setExportQuality] = useState<ExportQuality>("1080");
  const [, setWatermarkFile] = useState<File | null>(null);
  const [watermarkUrl, setWatermarkUrl] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>("bottom-right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(80);
  const [watermarkSize, setWatermarkSize] = useState(20);
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [activeSubtitleId, setActiveSubtitleId] = useState<number | null>(null);
  const [sfxCues, setSfxCues] = useState<SfxCue[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [pendingProducts, setPendingProducts] = useState<{ title: string; price: number; oldPrice?: number; promoCode?: string; productUrl?: string; image?: string }[]>([]);
  const [tab, setTab] = useState<Tab>("templates");
  const [destination, setDestination] = useState<"home" | "feed" | "both">("both");
  const [category, setCategory] = useState("humor");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isAd, setIsAd] = useState(false);
  const [compliance, setCompliance] = useState<PublishCompliance>(DEFAULT_COMPLIANCE);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{ stage: "compress" | "upload" | "save"; percent: number } | null>(null);
  const [step, setStep] = useState<"edit" | "publish">("edit");
  const [showFileSheet, setShowFileSheet] = useState(false);
  const pendingTemplateRef = useRef<string | null>(null);
  const capturedThumbRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const pipInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const active = clips[activeIdx];

  return {
    user, refreshMedia,
    clips, setClips, activeIdx, setActiveIdx,
    filter, setFilter, brightness, setBrightness, contrast, setContrast,
    saturation, setSaturation, rotation, setRotation, flipH, setFlipH,
    layers, setLayers, activeLayerId, setActiveLayerId,
    musicFile, setMusicFile, musicName, setMusicName, musicVolume, setMusicVolume,
    clipVolume, setClipVolume, speed, setSpeed,
    exportFormat, setExportFormat, exportQuality, setExportQuality,
    setWatermarkFile, watermarkUrl, setWatermarkUrl, watermarkPosition, setWatermarkPosition,
    watermarkOpacity, setWatermarkOpacity, watermarkSize, setWatermarkSize,
    subtitles, setSubtitles, activeSubtitleId, setActiveSubtitleId,
    sfxCues, setSfxCues, selectedTemplateId, setSelectedTemplateId,
    pendingProducts, setPendingProducts, tab, setTab,
    destination, setDestination, category, setCategory, categoryTouched, setCategoryTouched,
    description, setDescription, hashtags, setHashtags, isAd, setIsAd,
    compliance, setCompliance, publishing, setPublishing, publishProgress, setPublishProgress,
    step, setStep, showFileSheet, setShowFileSheet,
    pendingTemplateRef, capturedThumbRef, fileInputRef, galleryInputRef, cameraInputRef,
    musicInputRef, pipInputRef, watermarkInputRef, audioRef, canvasRef, videoRefs,
    active,
  };
};

export type EditorState = ReturnType<typeof useEditorState>;
