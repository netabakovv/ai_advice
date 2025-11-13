import { 
  AudioStream,
  AudioConfig,
  DEFAULT_AUDIO_CONFIG 
} from '../types/audio';
import { websocketService } from './websocketService';

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

class AudioListenerService {
  private isListening: boolean = false;
  private audioContext: AudioContext | null = null;
  private micStream: AudioStream | null = null;
  private systemStream: AudioStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private config: AudioConfig;
  private currentConversationId: string | null = null;
  private modelsReady: boolean = false;
  private modelsLoading: boolean = false;

  constructor(config: AudioConfig = DEFAULT_AUDIO_CONFIG) {
    this.config = config;
  }

  private async getSystemAudioStream(): Promise<MediaStream> {
    try {
      // Запрашиваем доступ к экрану/вкладке с системным аудио
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: true , // Нам не нужно видео
        audio: true,  // Нам нужно аудио
        // В Chrome можно указать preferCurrentTab: true для удобства
        // controller: new AbortController(), // Для отмены запроса
      } as MediaStreamConstraints);

      // Поток завершится, когда пользователь остановит демонстрацию экрана
      systemStream.getAudioTracks()[0].addEventListener('ended', () => {
        console.warn('System audio stream (screen share) ended by user.');
        // Здесь можно добавить логику для уведомления пользователя
        // или попытки перезапросить доступ
      });

      return systemStream;
    } catch (error) {
      console.error('Error getting system audio stream:', error);
      throw new Error('Не удалось получить доступ к системному аудио. Убедитесь, что вы разрешили доступ.');
    }
  }

  async joinMeeting(conversationId: string, configOverride?: Partial<AudioConfig>): Promise<void> {
    if (this.isListening) {
      console.warn('Audio service is already listening.');
      return;
    }

    //const finalConfig = { ...this.config, ...configOverride };

    try {
      this.isListening = true;
      this.currentConversationId = conversationId;
      
      // Настраиваем callback для статуса моделей
      websocketService.setModelsStatusCallback((ready, loading) => {
        this.setModelsStatus(ready, loading);
      });

      // Подключаемся к WebSocket
      await websocketService.connect(conversationId);

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      if (this.config.captureSystemAudio) {
        try {
          this.systemStream = await this.getSystemAudioStream();
        } catch (error) {
          console.error('Failed to get system audio, continuing with mic only:', error);
          // Можно уведомить пользователя, что системный звук не будет записан
        }
      }
      
      // Создаем AudioContext для обработки аудио
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });
      
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      const micSource = this.audioContext.createMediaStreamSource(this.micStream);
      let systemSource: MediaStreamAudioSourceNode | null = null;
      if (this.systemStream) {
        systemSource = this.audioContext.createMediaStreamSource(this.systemStream);
      }

      if (systemSource) {
        // Если у нас есть два потока, используем ChannelMerger
        const merger = this.audioContext.createChannelMerger(2); // Объединяем в 2 канала (стерео)

        // Подключаем микрофон к левому каналу (0)
        micSource.connect(merger, 0, 0);
        // Подключаем системный звук к правому каналу (1)
        systemSource.connect(merger, 0, 1);

        // Подключаем объединенный поток к нашему процессору
        merger.connect(this.workletNode);
      } else {
        // Если только микрофон, подключаем его напрямую
        micSource.connect(this.workletNode);
      }

      this.workletNode.connect(this.audioContext.destination)

      this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (websocketService.getConnectionStatus()) {
          // Конвертируем Float32 в Int16 PCM
          const pcmData = floatTo16BitPCM(event.data);
          
          // Отправляем бинарные данные
          websocketService.sendRawAudio(pcmData.buffer);
        }
      };
      
      console.log('🎯 AI Assistant started. Mic:', !!this.micStream, 'System Audio:', !!this.systemStream);
      
    } catch (error) {
      console.error('Error starting audio listener:', error);
      throw error;
    }
  }

  async leaveMeeting(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;

    this.workletNode?.disconnect();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }

    this.micStream?.getTracks().forEach((track) => track.stop());
    this.systemStream?.getTracks().forEach((track) => track.stop());

    if (websocketService.getConnectionStatus()) {
      await websocketService.endConversation();
    }

    websocketService.disconnect();


    this.audioContext = null;
    this.workletNode = null;
    this.micStream = null;
    this.systemStream = null;
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
export const joinMeeting = (conversationId: string, configOverride?: Partial<AudioConfig>): Promise<void> => 
  audioService.joinMeeting(conversationId);

export const leaveMeeting = (): Promise<void> => audioService.leaveMeeting();

export const getListeningStatus = (): boolean => audioService.getListeningStatus();
export const getCurrentConversationId = (): string | null => audioService.getCurrentConversationId();
export const getModelsStatus = () => audioService.getModelsStatus();