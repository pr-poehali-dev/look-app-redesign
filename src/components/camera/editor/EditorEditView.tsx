import EditorCanvas from "./EditorCanvas";
import EditorToolbar from "./EditorToolbar";
import EditorHeader from "./EditorHeader";
import EditorHiddenInputs from "./EditorHiddenInputs";
import type { EditorState } from "./useEditorState";
import type { EditorActions } from "./useEditorActions";

interface History {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface Props {
  s: EditorState;
  a: EditorActions;
  h: History;
  onClose: () => void;
}

const EditorEditView = ({ s, a, h, onClose }: Props) => {
  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
      <EditorHiddenInputs
        audioRef={s.audioRef}
        fileInputRef={s.fileInputRef}
        galleryInputRef={s.galleryInputRef}
        cameraInputRef={s.cameraInputRef}
        musicInputRef={s.musicInputRef}
        pipInputRef={s.pipInputRef}
        watermarkInputRef={s.watermarkInputRef}
        addClips={a.addClips}
        handleMusicUpload={a.handleMusicUpload}
        addPip={a.addPip}
        handleWatermarkUpload={a.handleWatermarkUpload}
      />

      <EditorHeader
        undo={h.undo}
        redo={h.redo}
        canUndo={h.canUndo}
        canRedo={h.canRedo}
        onNext={() => s.setStep("publish")}
        onClose={onClose}
      />

      <EditorCanvas
        active={s.active}
        clips={s.clips}
        activeIdx={s.activeIdx}
        cssFilter={a.cssFilter}
        transform={a.transform}
        layers={s.layers}
        activeLayerId={s.activeLayerId}
        musicName={s.musicName}
        canvasRef={s.canvasRef}
        videoRefs={s.videoRefs}
        capturedThumbRef={s.capturedThumbRef}
        onLayerPointerDown={a.onLayerPointerDown}
        onLayerPointerMove={a.onLayerPointerMove}
        onLayerPointerUp={a.onLayerPointerUp}
        onClickCanvas={() => s.setActiveLayerId(null)}
        updateLayer={a.updateLayer}
        removeLayer={a.removeLayer}
      />

      <EditorToolbar
        tab={s.tab}
        setTab={s.setTab}
        active={s.active}
        clips={s.clips}
        activeIdx={s.activeIdx}
        setActiveIdx={s.setActiveIdx}
        filter={s.filter}
        setFilter={s.setFilter}
        brightness={s.brightness}
        setBrightness={s.setBrightness}
        contrast={s.contrast}
        setContrast={s.setContrast}
        saturation={s.saturation}
        setSaturation={s.setSaturation}
        rotation={s.rotation}
        setRotation={s.setRotation}
        flipH={s.flipH}
        setFlipH={s.setFlipH}
        layers={s.layers}
        activeLayerId={s.activeLayerId}
        musicName={s.musicName}
        musicFile={s.musicFile}
        showFileSheet={s.showFileSheet}
        setShowFileSheet={s.setShowFileSheet}
        galleryInputRef={s.galleryInputRef}
        cameraInputRef={s.cameraInputRef}
        musicInputRef={s.musicInputRef}
        addText={a.addText}
        addSticker={a.addSticker}
        updateLayer={a.updateLayer}
        removeClip={a.removeClip}
        moveClip={a.moveClip}
        applyTemplate={a.applyTemplate}
        setMusicFile={s.setMusicFile}
        setMusicName={s.setMusicName}
        audioRef={s.audioRef}
        updateClip={a.updateClip}
        musicVolume={s.musicVolume}
        setMusicVolume={s.setMusicVolume}
        clipVolume={s.clipVolume}
        setClipVolume={s.setClipVolume}
        speed={s.speed}
        setSpeed={s.setSpeed}
        exportFormat={s.exportFormat}
        setExportFormat={s.setExportFormat}
        exportQuality={s.exportQuality}
        setExportQuality={s.setExportQuality}
        pipInputRef={s.pipInputRef}
        watermarkInputRef={s.watermarkInputRef}
        watermarkUrl={s.watermarkUrl}
        watermarkPosition={s.watermarkPosition}
        setWatermarkPosition={s.setWatermarkPosition}
        watermarkOpacity={s.watermarkOpacity}
        setWatermarkOpacity={s.setWatermarkOpacity}
        watermarkSize={s.watermarkSize}
        setWatermarkSize={s.setWatermarkSize}
        removeWatermark={a.removeWatermark}
        subtitles={s.subtitles}
        activeSubtitleId={s.activeSubtitleId}
        setActiveSubtitleId={s.setActiveSubtitleId}
        addSubtitle={a.addSubtitle}
        updateSubtitle={a.updateSubtitle}
        removeSubtitle={a.removeSubtitle}
        sfxCues={s.sfxCues}
        addSfx={a.addSfx}
        updateSfx={a.updateSfx}
        removeSfx={a.removeSfx}
      />
    </div>
  );
};

export default EditorEditView;
