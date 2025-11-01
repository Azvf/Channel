export class ErrorHandler {
  static async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    context?: string
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      console.error(`${context ? `[${context}] ` : ''}${errorMessage}:`, error)
      return null
    }
  }

  static async executeWithStatusUpdate<T>(
    operation: () => Promise<T>,
    _loadingMessage: string,
    _successMessage: string,
    errorMessage: string,
    context?: string
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      console.error(`${context ? `[${context}] ` : ''}${errorMessage}:`, error)
      return null
    }
  }
}

