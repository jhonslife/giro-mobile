type Listener = (...args: any[]) => void;

interface Events {
  [event: string]: Listener[];
}

export class EventEmitter {
  private events: Events = {};

  on(event: string, listener: Listener): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  off(event: string, listener: Listener): this {
    if (!this.events[event]) return this;

    this.events[event] = this.events[event].filter((l) => l !== listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.events[event]) return false;

    this.events[event].forEach((listener) => {
      listener(...args);
    });
    return true;
  }

  removeListener(event: string, listener: Listener): this {
    return this.off(event, listener);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }

  // Alias for addListener (common in Node.js EventEmitter)
  addListener(event: string, listener: Listener): this {
    return this.on(event, listener);
  }
}
