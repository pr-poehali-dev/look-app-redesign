import type { RefObject } from "react";

interface Props {
  audioRef: RefObject<HTMLAudioElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  galleryInputRef: RefObject<HTMLInputElement>;
  cameraInputRef: RefObject<HTMLInputElement>;
  musicInputRef: RefObject<HTMLInputElement>;
  pipInputRef: RefObject<HTMLInputElement>;
  watermarkInputRef: RefObject<HTMLInputElement>;
  addClips: (files: FileList | null) => void;
  handleMusicUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addPip: (file: File) => void;
  handleWatermarkUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const EditorHiddenInputs = ({
  audioRef, fileInputRef, galleryInputRef, cameraInputRef, musicInputRef, pipInputRef, watermarkInputRef,
  addClips, handleMusicUpload, addPip, handleWatermarkUpload,
}: Props) => (
  <>
    <audio ref={audioRef} />
    <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => addClips(e.target.files)} />
    <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { addClips(e.target.files); e.target.value = ""; }} />
    <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => { addClips(e.target.files); e.target.value = ""; }} />
    <input ref={musicInputRef} type="file" accept="audio/*" className="hidden" onChange={handleMusicUpload} />
    <input ref={pipInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPip(f); e.target.value = ""; }} />
    <input ref={watermarkInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleWatermarkUpload(e); e.target.value = ""; }} />
  </>
);

export default EditorHiddenInputs;
