class WebSocketService {
    private socket: WebSocket | null = null;
    private backendUrl = 'http://localhost:8000';
    private currentConversationId: string | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts = 5;
    private onModelsStatus?: (ready: boolean, loading: boolean) => void;

    setModelsStatusCallback(callback: (ready: boolean, loading: boolean) => void) {
        this.onModelsStatus = callback;
    }

    async connect(conversationId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `${this.backendUrl.replace('http', 'ws')}/ws/${conversationId}`;
                console.log('WebSocket URL:', wsUrl);
                
                this.socket = new WebSocket(wsUrl);
                this.currentConversationId = conversationId;

                this.socket.onopen = () => {
                    console.log('✅ WebSocket connected for conversation:', conversationId);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.socket.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };

                this.socket.onclose = (event) => {
                    console.log('WebSocket disconnected:', event.code, event.reason);
                    this.isConnected = false;
                    this.handleReconnection();
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    async sendRawAudio(pcmBuffer: ArrayBufferLike): Promise<void> {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            // Не бросаем ошибку, чтобы не прерывать поток, если соединение momentarily потеряно
            console.warn('WebSocket is not connected, cannot send audio data.');
            return;
        }

        try {
            // pcmBuffer уже является ArrayBuffer в нужном формате
            const arrayBufferToSend = pcmBuffer.slice(0);
            this.socket.send(arrayBufferToSend);
        } catch (error) {
            console.error('❌ Error sending raw audio data via WebSocket:', error);
            // Здесь можно решить, бросать ли ошибку или просто логировать
        }
    }

    async endConversation(): Promise<void> {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            this.socket.send(JSON.stringify({
                type: 'end_conversation'
            }));
            console.log('End conversation command sent');
        } catch (error) {
            console.error('Error ending conversation:', error);
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentConversationId = null;
    }

    private handleReconnection(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentConversationId) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect(this.currentConversationId!).catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }, 2000 * this.reconnectAttempts);
        }
    }

    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);
            console.log('📨 WebSocket message received:', message);
            
            if (message.type === 'models_status') {
                console.log(`🤖 Models status - Ready: ${message.models_ready}, Loading: ${message.models_loading}`);
                if (this.onModelsStatus) {
                    this.onModelsStatus(message.models_ready, message.models_loading);
                }
            }
            
            if (message.type === 'audio_received') {
                console.log('✅ Server received audio chunk:', message.chunk_id);
            }
            
            if (message.type === 'audio_processed') {
                console.log('🎯 AI started processing audio chunk:', message.chunk_id);
            }
            
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
        }
    }

    getConnectionStatus(): boolean {
        return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
    }

    getConversationId(): string | null {
        return this.currentConversationId;
    }
}

export const websocketService = new WebSocketService();