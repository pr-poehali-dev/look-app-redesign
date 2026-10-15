import EditorEmptyState from "./EditorEmptyState";
import EditorPublishStep from "./EditorPublishStep";
import EditorEditView from "./EditorEditView";
import captureEditorFrame from "./captureEditorFrame";
import publishEditorProject from "./publishEditorProject";
import { useEditorState } from "./useEditorState";
import { useEditorHistory } from "./useEditorHistory";
import { useEditorActions } from "./useEditorActions";

interface Props {
  onClose: () => void;
  onPublished: () => void;
}

const MediaEditor = ({ onClose, onPublished }: Props) => {
  const s = useEditorState();
  const h = useEditorHistory(s);
  const a = useEditorActions(s);

  const {
    user, refreshMedia, clips, active, isAd, compliance, exportFormat, exportQuality, speed, sfxCues,
    filter, brightness, contrast, saturation, rotation, flipH, layers, clipVolume,
    musicFile, musicVolume, watermarkUrl, watermarkPosition, watermarkOpacity, watermarkSize,
    subtitles, destination, categoryTouched, category, description, hashtags,
    selectedTemplateId, pendingProducts, setPublishing, setPublishProgress, videoRefs,
  } = s;
  const { cssFilter } = a;

  const captureFrame = (): Promise<Blob | null> => captureEditorFrame({
    active, exportQuality, cssFilter, rotation, flipH, layers, videoRefs,
    watermarkUrl, watermarkSize, watermarkPosition, watermarkOpacity, subtitles,
  });

  const handlePublish = () => publishEditorProject({
    user, clips, active, isAd, compliance, exportFormat, exportQuality, speed, sfxCues,
    filter, brightness, contrast, saturation, rotation, flipH, layers, clipVolume,
    musicFile, musicVolume, watermarkUrl, watermarkPosition, watermarkOpacity, watermarkSize,
    subtitles, destination, categoryTouched, category, description, hashtags,
    selectedTemplateId, pendingProducts, captureFrame, refreshMedia, onPublished,
    setPublishing, setPublishProgress,
  });

  // EMPTY STATE
  if (clips.length === 0) {
    return (
      <EditorEmptyState
        onClose={onClose}
        showFileSheet={s.showFileSheet}
        setShowFileSheet={s.setShowFileSheet}
        galleryInputRef={s.galleryInputRef}
        cameraInputRef={s.cameraInputRef}
        onOpenSheet={() => s.setShowFileSheet(true)}
        onFilesAdd={a.addClips}
        onSelectTemplate={a.selectTemplateThenPick}
      />
    );
  }

  // PUBLISH STEP
  if (s.step === "publish") {
    return (
      <EditorPublishStep
        active={active}
        cssFilter={cssFilter}
        transform={a.transform}
        destination={destination}
        setDestination={s.setDestination}
        category={destination === "feed" && !categoryTouched ? "" : category}
        setCategory={(v) => { s.setCategory(v); s.setCategoryTouched(true); }}
        description={description}
        setDescription={s.setDescription}
        hashtags={hashtags}
        setHashtags={s.setHashtags}
        publishing={s.publishing}
        publishProgress={s.publishProgress}
        onBack={() => s.setStep("edit")}
        onPublish={handlePublish}
        products={pendingProducts}
        setProducts={s.setPendingProducts}
        userId={user?.id}
        isAd={isAd}
        setIsAd={s.setIsAd}
        clipsCount={clips.length}
        compliance={compliance}
        onComplianceChange={s.setCompliance}
      />
    );
  }

  // MAIN EDIT VIEW
  return <EditorEditView s={s} a={a} h={h} onClose={onClose} />;
};

export default MediaEditor;
