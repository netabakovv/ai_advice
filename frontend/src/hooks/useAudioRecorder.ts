import { useState, useCallback, useEffect } from 'react';
import { audioService, joinMeeting, leaveMeeting } from '../services/audioService';
import { AudioStream } from '../types/audio';

interface UseAudioRecorderReturn {
    isListening: boolean;
    isLoading: boolean;
    error: string | null;
    joinMeeting: (meetingId: string) => Promise<void>;
    leaveMeeting: () => Promise<void>;
    activeChunks: number;
    clearError: () => void;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeChunks, setActiveChunks] = useState<number>(0);

    const clearError = useCallback((): void => {
        setError(null);
    }, []);

    const handleJoinMeeting = useCallback(async (meetingId: string): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            // Проверяем поддержку MediaRecorder
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Ваш браузер не поддерживает запись аудио');
            }

            if (!MediaRecorder) {
                throw new Error('MediaRecorder не поддерживается в вашем браузере');
            }

            const stream: AudioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    sampleSize: 16,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            await joinMeeting(meetingId, stream);
            setIsListening(true);
            setIsLoading(false);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при подключении';
            setError(errorMessage);
            setIsLoading(false);
            throw error;
        }
    }, []);

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
        const checkStatus = (): void => {
            setIsListening(audioService.getListeningStatus());
            setActiveChunks(audioService.getActiveChunksCount());
        };

        const interval = setInterval(checkStatus, 1000);
        checkStatus(); // Первоначальная проверка

        return () => clearInterval(interval);
    }, []);

    return {
        isListening,
        isLoading,
        error,
        joinMeeting: handleJoinMeeting,
        leaveMeeting: handleLeaveMeeting,
        activeChunks,
        clearError
    };
};