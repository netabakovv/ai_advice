export type AudioStream = MediaStream

export interface AudioConfig {
    sampleRate: number;
    captureSystemAudio?: boolean;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
    sampleRate: 16000,
    captureSystemAudio: true,
};