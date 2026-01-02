// Simple event emitter for network reconnection events
type NetworkReconnectCallback = () => void;

class NetworkEventEmitter {
  private listeners: NetworkReconnectCallback[] = [];

  subscribe(callback: NetworkReconnectCallback): () => void {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Error in network reconnect callback:', error);
      }
    });
  }
}

export const networkEventEmitter = new NetworkEventEmitter();

