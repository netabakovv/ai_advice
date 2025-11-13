import React from 'react';
import {useAudioRecorder} from '../hooks/useAudioRecorder';
import {Button} from '../components/ui/button';

interface StartListeningButtonExtendedProps {
    meetingId?: string;
    onJoin?: (meetingId: string) => void;
    onLeave?: () => void;
    className?: string;
}

export const StartListeningButtonExtended: React.FC<StartListeningButtonExtendedProps> = ({
                                                                                              meetingId = 'default-meeting',
                                                                                              onJoin,
                                                                                              onLeave,
                                                                                              className = ''
                                                                                          }) => {
    const {
        isListening,
        isLoading,
        error,
        joinMeeting,
        leaveMeeting,
        activeChunks
    } = useAudioRecorder();

    const handleClick = async (): Promise<void> => {
        try {
            if (isListening) {
                await leaveMeeting();
                onLeave?.();
            } else {
                await joinMeeting(meetingId);
                onJoin?.(meetingId);
            }
        } catch (error) {
            console.error('Failed to toggle listening:', error);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Основная кнопка */}
            <Button
                onClick={handleClick}
                disabled={isLoading}
                className={`
          w-full h-14 md:h-16 text-base md:text-lg px-6 md:px-8
          bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] 
          hover:from-[#3B5AF0] hover:to-[#B45CE9] 
          text-white border-0 rounded-2xl transition-all duration-300
          ${isListening ? 'from-[#DC2626] to-[#EF4444] hover:from-[#B91C1C] hover:to-[#DC2626] shadow-lg' : ''}
          ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}
          flex items-center justify-center gap-3
          relative overflow-hidden
        `}
            >
                {/* Анимация фона для активного состояния */}
                {isListening && (
                    <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                )}

                <span className={`text-lg ${isListening ? 'animate-pulse' : ''}`}>
          {isLoading ? '⏳' : isListening ? '🔴' : '🎯'}
        </span>

                <span className="font-semibold">
          {isLoading ? 'Подключение...' :
              isListening ? 'Остановить ИИ-помощника' :
                  'Запустить ИИ-помощника'}
        </span>
            </Button>

            {/* Панель статуса */}
            {(isListening || error) && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    {isListening && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Статус:</span>
                                <span className="text-green-600 font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Анализ в реальном времени
                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Обработано:</span>
                                <span className="text-blue-600 font-medium">{activeChunks} сегментов</span>
                            </div>

                            <div className="text-xs text-gray-500 mt-2">
                                🤖 AI следит за повесткой, определяет уход от темы и готовит отчет
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-500 text-sm flex items-center gap-2">
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StartListeningButtonExtended;