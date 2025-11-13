import { 
  AudioStream, 
  AudioChunk, 
  AudioConfig,
  DEFAULT_AUDIO_CONFIG 
} from '../types/audio';
import { websocketService } from './websocketService';

class AudioListenerService {
  private isListening: boolean = false;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: AudioStream | null = null;
  private audioChunks: AudioChunk[] = [];
  private sequence: number = 0;
  private config: AudioConfig;
  private currentConversationId: string | null = null;
  private modelsReady: boolean = false;
  private modelsLoading: boolean = false;

  constructor(config: AudioConfig = DEFAULT_AUDIO_CONFIG) {
    this.config = config;
  }

  async joinMeeting(conversationId: string, stream: AudioStream): Promise<void> {
    try {
      this.stream = stream;
      this.isListening = true;
      this.currentConversationId = conversationId;
      
      // Настраиваем callback для статуса моделей
      websocketService.setModelsStatusCallback((ready, loading) => {
        this.setModelsStatus(ready, loading);
      });

      // Подключаемся к WebSocket
      await websocketService.connect(conversationId);
      
      // Создаем AudioContext для обработки аудио
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });
      
      // Запускаем запись
      this.startRecording(stream);
      
      console.log('🎯 AI Assistant started');
      
    } catch (error) {
      console.error('Error starting audio listener:', error);
      throw error;
    }
  }

  private startRecording(stream: AudioStream): void {
    const options: MediaRecorderOptions = {
      mimeType: this.config.mimeType,
      audioBitsPerSecond: this.config.audioBitsPerSecond
    };

    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      throw new Error(`Mime type ${options.mimeType} is not supported`);
    }

    this.mediaRecorder = new MediaRecorder(stream, options);
    this.audioChunks = [];
    this.sequence = 0;

    this.mediaRecorder.ondataavailable = async (event: BlobEvent) => {
      if (event.data.size > 0 && websocketService.getConnectionStatus()) {
        const chunk: AudioChunk = {
          id: `chunk_${Date.now()}_${this.sequence}`,
          blob: event.data,
          timestamp: new Date(),
          sequence: this.sequence++
        };
        
        try {
          // Отправляем чанк через WebSocket
          await websocketService.sendAudioChunk(chunk);
          
          if (!this.modelsReady) {
            console.log('📦 Audio saved - waiting for models...');
          }
        } catch (error) {
          console.error('Failed to send audio chunk via WebSocket:', error);
        }
      }
    };

    // Запускаем запись с интервалом
    this.mediaRecorder.start(this.config.chunkInterval);
  }

  async leaveMeeting(): Promise<void> {
    this.isListening = false;
    
    // Останавливаем запись
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Отправляем команду завершения беседы
    if (websocketService.getConnectionStatus()) {
      await websocketService.endConversation();
    }
    
    // Отключаем WebSocket
    websocketService.disconnect();
    
    // Освобождаем ресурсы
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioChunks = [];
    this.sequence = 0;
    this.currentConversationId = null;
    this.modelsReady = false;
    this.modelsLoading = false;
    console.log('Audio listener stopped');
  }

  setModelsStatus(ready: boolean, loading: boolean): void {
    this.modelsReady = ready;
    this.modelsLoading = loading;
    console.log(`Models status - Ready: ${ready}, Loading: ${loading}`);
  }

  getListeningStatus(): boolean {
    return this.isListening;
  }

  getActiveChunksCount(): number {
    return this.audioChunks.length;
  }

  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  getModelsStatus(): { ready: boolean; loading: boolean } {
    return {
      ready: this.modelsReady,
      loading: this.modelsLoading
    };
  }
}

// Создаем singleton экземпляр
export const audioService = new AudioListenerService();

// Экспортируем методы для удобства использования
export const joinMeeting = (conversationId: string, stream: AudioStream): Promise<void> => 
  audioService.joinMeeting(conversationId, stream);

export const leaveMeeting = (): Promise<void> => audioService.leaveMeeting();

export const getListeningStatus = (): boolean => audioService.getListeningStatus();

export const getActiveChunksCount = (): number => audioService.getActiveChunksCount();
export const getCurrentConversationId = (): string | null => audioService.getCurrentConversationId();
export const getModelsStatus = () => audioService.getModelsStatus();