import { useState, useCallback, useEffect } from 'react';
import { audioService, joinMeeting, leaveMeeting } from '../services/audioService';
import { AudioConfig, AudioStream, DEFAULT_AUDIO_CONFIG} from '../types/audio';

interface UseAudioRecorderReturn {
    isListening: boolean;
    isLoading: boolean;
    error: string | null;
    joinMeeting: (meetingId: string) => Promise<void>;
    leaveMeeting: () => Promise<void>;
    clearError: () => void;
}

export const useAudioRecorder = (config?: Partial<AudioConfig>): UseAudioRecorderReturn => {
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    const handleJoinMeeting = useCallback(async (meetingId: string): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            if (!window.AudioContext) {
                throw new Error('Ваш браузер не поддерживает Web Audio API, необходимый для записи.');
            }

            await joinMeeting(meetingId, config);
            setIsListening(true);
            setIsLoading(false);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при подключении';
            setError(errorMessage);
            setIsLoading(false);
            throw error;
        }
    }, [config]);

    const handleLeaveMeeting = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);
            await leaveMeeting();
            setIsListening(false);
            setIsLoading(false);
            setError(null);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при отключении';
            setError(errorMessage);
            setIsLoading(false);
            throw error;
        }
    }, []);

    // Подписка на изменения статуса
    useEffect(() => {
        const interval = setInterval(() => {
            setIsListening(audioService.getListeningStatus());
        }, 500); // Можно уменьшить интервал для более быстрой реакции
        return () => clearInterval(interval);
    }, []);

    return {
        isListening,
        isLoading,
        error,
        joinMeeting: handleJoinMeeting,
        leaveMeeting: handleLeaveMeeting,
        clearError
    };
};