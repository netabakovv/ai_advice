class ConversationService {
    private backendUrl = 'http://localhost:8000';

    async createConversation(): Promise<string> {
        console.log('=== СОЗДАНИЕ БЕСЕДЫ ===');
        console.log('URL:', `${this.backendUrl}/conversations/`);
        
        try {
            console.log('Отправляем POST запрос...');
            
            const response = await fetch(`${this.backendUrl}/conversations/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('✅ Ответ получен!');
            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response data:', data);
            
            if (!data.id) {
                throw new Error('Нет ID беседы в ответе сервера');
            }

            console.log('✅ Беседа создана успешно, ID:', data.id);
            return data.id;
            
        } catch (error) {
            console.error('=== ОШИБКА СОЗДАНИЯ БЕСЕДЫ ===', error);
            
            // Если не удалось создать беседу на сервере, используем локальный ID
            console.log('Используем локальный ID для тестирования...');
            const localId = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            console.log('Локальный ID создан:', localId);
            return localId;
        }
    }

    async getModelsStatus(): Promise<any> {
        try {
            const response = await fetch(`${this.backendUrl}/models/status`);
            return await response.json();
        } catch (error) {
            console.error('Error getting models status:', error);
            return { models_loaded: false, models_loading: false, status: 'error' };
        }
    }

    async getConversation(conversationId: string): Promise<any> {
        try {
            const response = await fetch(`${this.backendUrl}/conversations/${conversationId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to get conversation: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting conversation:', error);
            throw error;
        }
    }

    async getConversationPhrases(conversationId: string): Promise<any[]> {
        try {
            const response = await fetch(`${this.backendUrl}/conversations/${conversationId}/phrases`);
            
            if (!response.ok) {
                throw new Error(`Failed to get phrases: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting phrases:', error);
            throw error;
        }
    }

    async endConversation(conversationId: string): Promise<void> {
        try {
            const response = await fetch(`${this.backendUrl}/conversations/${conversationId}/end`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`Failed to end conversation: ${response.status}`);
            }

            console.log('Conversation ended successfully');
        } catch (error) {
            console.error('Error ending conversation:', error);
            throw error;
        }
    }
}

export const conversationService = new ConversationService();