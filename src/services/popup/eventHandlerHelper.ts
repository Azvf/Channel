import { ErrorHandler } from './errorHandler'
import type { OperationResult } from './types'

export class EventHandlerHelper {
  static createButtonHandler(
    operation: () => Promise<OperationResult>,
    _loadingMessage: string,
    context: string
  ): () => Promise<void> {
    return async () => {
      await ErrorHandler.executeWithStatusUpdate(
        async () => {
          const opResult = await operation()
          return opResult.message
        },
        _loadingMessage,
        '',
        `${context}失败`,
        context
      )
    }
  }

  static createConfirmButtonHandler(
    confirmMessage: string,
    operation: () => Promise<OperationResult>,
    _loadingMessage: string,
    context: string
  ): () => Promise<void> {
    return async () => {
      if (confirm(confirmMessage)) {
        await ErrorHandler.executeWithStatusUpdate(
          async () => {
            const opResult = await operation()
            return opResult.message
          },
          _loadingMessage,
          '',
          `${context}失败`,
          context
        )
      }
    }
  }

  static createEnterKeyHandler(button: HTMLButtonElement): (e: KeyboardEvent) => void {
    return (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        button.click()
      }
    }
  }
}

