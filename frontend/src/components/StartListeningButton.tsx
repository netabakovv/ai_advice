import React, { useState, useEffect } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { conversationService } from '../services/conversationService';
import { websocketService } from '../services/websocketService';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';

interface StartListeningButtonProps {
  onJoin?: (conversationId: string) => void;
  onLeave?: () => void;
  className?: string;
}

export const StartListeningButton: React.FC<StartListeningButtonProps> = ({
  onJoin,
  onLeave,
  className = ''
}) => {
  const [captureSystemAudio, setCaptureSystemAudio] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');

  const {
    isListening,
    isLoading,
    error,
    joinMeeting,
    leaveMeeting
  } = useAudioRecorder({ captureSystemAudio });

  const [statusMessage, setStatusMessage] = useState<string>('');
  const [modelsStatus, setModelsStatus] = useState<'ready' | 'loading' | 'waiting'>('waiting');

  // 🆕 LIVE MODERATION CALLBACK (ТОЛЬКО статус, БЕЗ списка)
  const handleLiveAlert = (alert: any) => {
    setStatusMessage(`🚨 score: ${alert.score.toFixed(1)} ${alert.reason}`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const checkModelsStatus = async () => {
    try {
      const status = await conversationService.getModelsStatus();
      updateModelsStatus(status);
    } catch (error) {
      console.error('Error checking models status:', error);
    }
  };

  const updateModelsStatus = (status: any) => {
    if (status.models_loaded) {
      setModelsStatus('ready');
    } else if (status.models_loading) {
      setModelsStatus('loading');
    } else {
      setModelsStatus('waiting');
    }
  };

  useEffect(() => {
    checkModelsStatus();
  }, []);

  const handleClick = async (): Promise<void> => {
    console.log('=== КЛИК ПО КНОПКЕ ===');
    
    try {
      if (isListening) {
        websocketService.disconnectLive();
        setStatusMessage('Останавливаем запись...');
        await leaveMeeting();
        setStatusMessage('Запись остановлена');
        setTimeout(() => setStatusMessage(''), 2000);
        onLeave?.();
      } else {
        setStatusMessage('Создаем беседу...');
        const convId = await conversationService.createConversation();
        setConversationId(convId);
        
        setStatusMessage('Запускаем запись аудио...');
        await joinMeeting(convId);
        
        // LIVE MODERATION
        websocketService.connectLiveModeration(
          convId, 
          "продажи Q4, бюджет 2025, задачи, план", 
          handleLiveAlert
        );
        
        setStatusMessage('🚀 Модерация активна!');
        setTimeout(() => setStatusMessage(''), 3000);
        onJoin?.(convId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setStatusMessage(`Ошибка: ${errorMessage}`);
      console.error('=== ОШИБКА ===', error);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const getButtonText = (): string => {
    if (isLoading) return 'Подключение...';
    if (isListening) return '🔴 Остановить модерацию';
    return '🚀 Запустить модерацию';
  };

  const getButtonIcon = (): string => {
    if (isLoading) return '⏳';
    if (isListening) return '🚨';
    return '🎯';
  };

  const getStatusColor = (): string => {
    if (error || statusMessage.includes('Ошибка')) return 'text-red-500 bg-red-50 border-red-200';
    if (isListening) return 'text-green-500 bg-green-50 border-green-200';
    return 'text-blue-500 bg-blue-50 border-blue-200';
  };

  const getModelsStatusText = (): string => {
    switch (modelsStatus) {
      case 'ready': return '✅ AI модели готовы';
      case 'loading': return '🔄 AI модели загружаются...';
      case 'waiting': return '⏳ AI модели ожидают загрузки';
      default: return '';
    }
  };

  const getModelsStatusColor = (): string => {
    switch (modelsStatus) {
      case 'ready': return 'text-green-500';
      case 'loading': return 'text-blue-500';
      case 'waiting': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Чекбокс */}
      <div className="flex items-center space-x-2 mb-3 w-full justify-center">
        <Checkbox 
          id="system-audio" 
          checked={captureSystemAudio}
          onCheckedChange={(checked) => setCaptureSystemAudio(checked as boolean)}
          disabled={isListening || isLoading}
        />
        <label htmlFor="system-audio" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Записывать звук других участников
        </label>
      </div>

      <Button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          w-full h-14 md:h-16 text-base md:text-lg px-6 md:px-8
          bg-gradient-to-r from-[#4A6CF7] to-[#C56CF0] 
          hover:from-[#3B5AF0] hover:to-[#B45CE9] 
          text-white border-0 rounded-2xl transition-all duration-200
          ${isListening ? 'from-[#DC2626] to-[#EF4444]' : ''}
          ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
          flex items-center justify-center gap-3 shadow-lg hover:shadow-xl
        `}
      >
        <span className="text-lg">{getButtonIcon()}</span>
        <span className="font-semibold">{getButtonText()}</span>
      </Button>

      {/* Статус моделей */}
      <div className={`mt-2 text-sm ${getModelsStatusColor()}`}>
        {getModelsStatusText()}
      </div>

      {/* Статус сообщение */}
      {(statusMessage || error) && (
        <div className={`mt-3 text-sm px-4 py-2 rounded-lg border max-w-md text-center ${getStatusColor()}`}>
          {statusMessage || error}
        </div>
      )}

      {/* Индикатор записи (БЕЗ счетчика алертов) */}
      {isListening && (
        <div className="mt-3 bg-green-500 text-white text-sm px-4 py-2 rounded-full animate-pulse flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          ИИ анализирует встречу в реальном времени {captureSystemAudio && ' (системный звук)'}
        </div>
      )}
    </div>
  );
};

export default StartListeningButton;
