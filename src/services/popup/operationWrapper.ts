import { logger } from '../logger'
import { TagManager } from '../tagManager'
import type { GameplayTag, TaggedPage } from '../../types/gameplayTag'
import type { OperationResult } from './types'

interface OperationWrapperContext {
  getCurrentPage: () => TaggedPage | null
  ensureCurrentPageRegistered: () => Promise<void>
  updateCurrentPageAndReload: () => Promise<void>
  loadCurrentPageTags: () => Promise<void>
  resetInitialization: () => Promise<void>
  getNewTagNameInput: () => HTMLInputElement
  dismissAutocompleteDropdown: () => void
}

let operationContext: OperationWrapperContext | null = null

export function configureOperationWrapper(context: OperationWrapperContext): void {
  operationContext = context
}

function requireContext(): OperationWrapperContext {
  if (!operationContext) {
    throw new Error('OperationWrapper 尚未配置上下文')
  }
  return operationContext
}

const tagManager = TagManager.getInstance()

export class OperationWrapper {
  private static async executeTagOperationCore<T>(
    validate: () => Promise<{ valid: boolean; error?: string }>,
    operation: () => Promise<T>,
    onSuccess: (result: T) => Promise<void>,
    successMessage: string | ((result: T) => string),
    errorMessage: string
  ): Promise<OperationResult> {
    const context = requireContext()

    const validation = await validate()
    if (!validation.valid) {
      return { success: false, message: validation.error || errorMessage, isError: true }
    }

    try {
      const result = await operation()
      await onSuccess(result)
      await tagManager.syncToStorage()
      await context.updateCurrentPageAndReload()

      const message = typeof successMessage === 'function' ? successMessage(result) : successMessage
      return { success: true, message }
    } catch (error) {
      console.error('操作执行失败:', error)
      return { success: false, message: errorMessage, isError: true }
    }
  }

  static async executeTagOperation(
    operation: 'add' | 'remove',
    tagId: string,
    successMessage: string,
    errorMessage: string
  ): Promise<OperationResult> {
    const context = requireContext()
    const currentPage = context.getCurrentPage()
    const log = logger('TagOp')
    const t = log.timeStart('execute')
    log.debug('start', { operation, tagId, pageId: currentPage?.id })
    const result = await this.executeTagOperationCore(
      async () => {
        if (!context.getCurrentPage()) {
          log.error('no currentPage', { operation, tagId })
          return { valid: false, error: '当前页面为空' }
        }
        return { valid: true }
      },
      async () => {
        const cp = context.getCurrentPage()
        if (!cp) {
          throw new Error('当前页面为空')
        }
        const opTimer = log.timeStart('op')
        log.debug('executing', { operation, tagId, pageId: cp.id })

        const success = tagManager.toggleTagOnPage(cp.id, tagId, operation === 'add')

        if (!success) {
          log.warn('op returned false', { operation, tagId, pageId: cp.id })
          throw new Error(`${operation === 'add' ? '添加' : '移除'}标签失败`)
        }

        log.timeEnd(opTimer, { stage: 'op', operation, tagId, pageId: cp.id })
        return { success }
      },
      async () => {},
      successMessage,
      errorMessage
    )
    log.timeEnd(t, { stage: 'execute', operation, tagId, pageId: context.getCurrentPage()?.id })
    log.debug('end', { result })
    return result
  }

  static async executeCreateTag(tagName: string): Promise<OperationResult> {
    const context = requireContext()
    const log = logger('CreateTag')
    const t = log.timeStart('execute')
    log.debug('start', { tagName, pageId: context.getCurrentPage()?.id })
    const result = await this.executeTagOperationCore(
      async () => tagManager.validateTagName(tagName),
      async () => {
        const trimmedName = tagName.trim()
        log.debug('executing', { trimmedName })

        await context.ensureCurrentPageRegistered()
        const cp = context.getCurrentPage()
        if (!cp) {
          throw new Error('无法获取当前页面')
        }

        const existing = tagManager.findTagByName(trimmedName)
        const tag = tagManager.createTagAndAddToPage(trimmedName, cp.id)

        log.info(existing && existing.id === tag.id ? 'hit existing' : 'created', {
          tagId: tag.id,
          name: tag.name
        })

        return tag
      },
      async () => {
        const input = context.getNewTagNameInput()
        input.value = ''

        context.dismissAutocompleteDropdown()

        if (context.getCurrentPage()) {
          await context.loadCurrentPageTags()
        }
      },
      (res) => {
        if (res && typeof res === 'object' && 'name' in (res as GameplayTag)) {
          return `标签 "${(res as GameplayTag).name}" 已添加到当前页面`
        }
        return '标签已添加到当前页面'
      },
      '创建标签失败'
    )
    log.timeEnd(t, { stage: 'execute', tagName, pageId: context.getCurrentPage()?.id })
    log.debug('end', { result })
    return result
  }

  static async executeClearCache(): Promise<OperationResult> {
    const context = requireContext()
    try {
      await chrome.storage.local.clear()
      tagManager.clearAllData()
      await context.resetInitialization()
      return { success: true, message: '本地缓存已清空' }
    } catch (error) {
      console.error('清空缓存失败:', error)
      return { success: false, message: '清空缓存失败', isError: true }
    }
  }

  static async executeDebugStorage(): Promise<void> {
    await tagManager.reloadFromStorage()
    await chrome.storage.local.get(['gameplay_tags', 'tagged_pages'])
    await tagManager.testStorage()
  }

  static async fetchCurrentVideoTimestamp(): Promise<string | null> {
    let originalUrl: string | null = null
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab || typeof tab.id !== 'number' || !tab.url) {
        console.warn('[Debug] 无法获取活动标签页信息')
        return null
      }

      originalUrl = tab.url

      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const video = document.querySelector('video')
          if (!video) {
            return null
          }

          return {
            currentTime: video.currentTime,
            duration: video.duration,
            paused: video.paused,
            readyState: video.readyState
          }
        }
      })

      const result = injectionResults?.[0]?.result as VideoTimestampResult | null | undefined

      if (!result || typeof result.currentTime !== 'number' || Number.isNaN(result.currentTime)) {
        console.info('[Debug] 未找到可用的视频元素或当前时间不可用', { url: originalUrl })
        return originalUrl
      }

      console.info('[Debug] 当前视频播放状态', {
        currentTimeSeconds: result.currentTime,
        durationSeconds: result.duration,
        paused: result.paused,
        readyState: result.readyState,
        url: originalUrl
      })

      const timestampSeconds = Math.max(0, Math.floor(result.currentTime))
      const timestampedUrl = this.buildTimestampedUrl(originalUrl, timestampSeconds)

      if (!timestampedUrl) {
        console.info('[Debug] 未能为该站点生成带时间戳的链接', {
          url: originalUrl,
          timestampSeconds
        })
        return originalUrl
      }

      console.info('[Debug] 生成带时间戳的链接', {
        originalUrl,
        timestampedUrl,
        timestampSeconds
      })

      return timestampedUrl
    } catch (error) {
      console.error('获取视频时间戳失败:', error)
      return originalUrl
    }
  }

  private static buildTimestampedUrl(originalUrl: string, timestampSeconds: number): string | null {
    try {
      const urlObj = new URL(originalUrl)
      const host = urlObj.hostname.toLowerCase()

      if (host.includes('bilibili.com')) {
        urlObj.searchParams.set('t', timestampSeconds.toString())
        return urlObj.toString()
      }

      if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
        urlObj.searchParams.set('t', timestampSeconds.toString())
        return urlObj.toString()
      }

      if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
        urlObj.searchParams.set('t', `${timestampSeconds}s`)
        urlObj.searchParams.set('start', timestampSeconds.toString())
        return urlObj.toString()
      }

      return null
    } catch (error) {
      console.error('[Debug] 解析 URL 失败', { originalUrl, error })
      return null
    }
  }
}

interface VideoTimestampResult {
  currentTime: number
  duration: number
  paused: boolean
  readyState: number
}

