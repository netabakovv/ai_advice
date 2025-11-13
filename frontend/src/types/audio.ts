export interface AudioStream extends MediaStream {}

export interface AudioChunk {
    id: string;
    blob: Blob;
    timestamp: Date;
    sequence: number;
}

export interface AudioConfig {
    sampleRate: number;
    channelCount: number;
    sampleSize: number;
    mimeType: string;
    audioBitsPerSecond: number;
    chunkInterval: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
    sampleRate: 16000,
    channelCount: 1,
    sampleSize: 16,
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 16000,
    chunkInterval: 5000
};