import { EventHandlerHelper } from './eventHandlerHelper'
import { FilterManager } from './filterManager'
import { ErrorHandler } from './errorHandler'
import { ModeManager } from './modeManager'
import { OperationWrapper } from './operationWrapper'

interface EventBinderConfig {
  createTagButton: HTMLButtonElement
  newTagInput: HTMLInputElement
  tagFilterInput: HTMLInputElement
  onStorageSync: () => Promise<void>
  clearCacheButton?: HTMLButtonElement | null
  debugStorageButton?: HTMLButtonElement | null
  cleanupTagsButton?: HTMLButtonElement | null
  toggleDebugModeButton?: HTMLButtonElement | null
  getVideoTimestampButton?: HTMLButtonElement | null
}

export function bindPopupEvents(config: EventBinderConfig): () => void {
  const {
    createTagButton,
    newTagInput,
    clearCacheButton,
    debugStorageButton,
    cleanupTagsButton,
    toggleDebugModeButton,
    getVideoTimestampButton,
    tagFilterInput,
    onStorageSync
  } = config

  const cleanupTasks: Array<() => void> = []

  const createHandler = EventHandlerHelper.createButtonHandler(
    async () => {
      const tagName = newTagInput.value.trim()
      return await OperationWrapper.executeCreateTag(tagName)
    },
    '正在创建标签...',
    '标签创建'
  )
  createTagButton.addEventListener('click', createHandler)
  cleanupTasks.push(() => createTagButton.removeEventListener('click', createHandler))

  const enterHandler = EventHandlerHelper.createEnterKeyHandler(createTagButton)
  newTagInput.addEventListener('keydown', enterHandler)
  cleanupTasks.push(() => newTagInput.removeEventListener('keydown', enterHandler))

  if (clearCacheButton) {
    const clearHandler = EventHandlerHelper.createConfirmButtonHandler(
      '确定要清空所有本地缓存数据吗？此操作不可撤销！',
      () => OperationWrapper.executeClearCache(),
      '正在清空缓存...',
      '缓存清空'
    )
    clearCacheButton.addEventListener('click', clearHandler)
    cleanupTasks.push(() => clearCacheButton.removeEventListener('click', clearHandler))
  }

  tagFilterInput.addEventListener('input', FilterManager.handleInputEvent)
  tagFilterInput.addEventListener('keydown', FilterManager.handleKeydownEvent)
  cleanupTasks.push(() => tagFilterInput.removeEventListener('input', FilterManager.handleInputEvent))
  cleanupTasks.push(() => tagFilterInput.removeEventListener('keydown', FilterManager.handleKeydownEvent))

  const handleStorageSync = () => {
    void ErrorHandler.executeWithErrorHandling(
      () => onStorageSync(),
      '保存数据失败',
      '存储同步'
    )
  }

  window.addEventListener('beforeunload', handleStorageSync)
  cleanupTasks.push(() => window.removeEventListener('beforeunload', handleStorageSync))

  const visibilityHandler = () => {
    if (document.hidden) {
      handleStorageSync()
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)
  cleanupTasks.push(() => document.removeEventListener('visibilitychange', visibilityHandler))

  if (debugStorageButton) {
    const debugHandler = async () => {
      await ErrorHandler.executeWithErrorHandling(
        async () => {
          await OperationWrapper.executeDebugStorage()
          return null
        },
        '获取存储状态失败',
        '存储状态调试'
      )
    }
    debugStorageButton.addEventListener('click', debugHandler)
    cleanupTasks.push(() => debugStorageButton.removeEventListener('click', debugHandler))
  }

  if (toggleDebugModeButton) {
    const toggleHandler = async () => {
      await ErrorHandler.executeWithErrorHandling(
        async () => {
          await ModeManager.toggleDebugMode()
          return null
        },
        '切换调试模式失败',
        '调试模式切换'
      )
    }
    toggleDebugModeButton.addEventListener('click', toggleHandler)
    cleanupTasks.push(() => toggleDebugModeButton.removeEventListener('click', toggleHandler))
  }

  if (getVideoTimestampButton) {
    const timestampHandler = async () => {
      const timestampedUrl = await ErrorHandler.executeWithErrorHandling(
        () => OperationWrapper.fetchCurrentVideoTimestamp(),
        '获取视频时间戳失败',
        '视频时间戳调试'
      )

      if (typeof timestampedUrl === 'string') {
        console.log(`[Debug] 带时间戳链接: ${timestampedUrl}`)
      }
    }
    getVideoTimestampButton.addEventListener('click', timestampHandler)
    cleanupTasks.push(() => getVideoTimestampButton.removeEventListener('click', timestampHandler))
  }

  if (cleanupTagsButton) {
    const cleanupHandler = EventHandlerHelper.createConfirmButtonHandler(
      '确定要清理所有未使用的标签吗？此操作将删除没有被任何页面使用的标签。',
      () => OperationWrapper.executeCleanupUnusedTags(),
      '正在清理标签...',
      '标签清理'
    )
    cleanupTagsButton.addEventListener('click', cleanupHandler)
    cleanupTasks.push(() => cleanupTagsButton.removeEventListener('click', cleanupHandler))
  }

  const dispose = () => {
    cleanupTasks.reverse().forEach((dispose) => {
      try {
        dispose()
      } catch (error) {
        console.warn('[EventBinder] 清理事件监听器失败', error)
      }
    })
  }

  return dispose
}

