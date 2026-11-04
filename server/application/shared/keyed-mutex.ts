/** Serializes operations per resource, while independent resources remain concurrent. */
export class KeyedMutex {
  private readonly pending = new Map<string, Promise<unknown>>()

  async run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.pending.get(key) ?? Promise.resolve()
    const current = previous.catch(() => {}).then(operation)
    this.pending.set(key, current)
    try {
      return await current
    } finally {
      if (this.pending.get(key) === current) this.pending.delete(key)
    }
  }
}
