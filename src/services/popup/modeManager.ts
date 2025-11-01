import { TagManager } from '../tagManager'
import type { GameplayTag, TaggedPage } from '../../types/gameplayTag'

export enum AppMode {
  TAGGING = 'tagging',
  TAGGED = 'tagged',
  DEBUG = 'debug'
}

const MODE_STORAGE_KEY = 'app_mode'

interface ModeManagerElements {
  modeTitle: HTMLHeadingElement
  filteredPagesList: HTMLDivElement
}

let modeTitleElement: HTMLHeadingElement | null = null
let filteredPagesListElement: HTMLDivElement | null = null

export function configureModeManager(elements: ModeManagerElements): void {
  modeTitleElement = elements.modeTitle
  filteredPagesListElement = elements.filteredPagesList
}

const tagManager = TagManager.getInstance()

export class ModeManager {
  private static currentMode: AppMode = AppMode.TAGGING
  static readonly STORAGE_KEY = MODE_STORAGE_KEY

  static async init(initialMode: AppMode) {
    if (!modeTitleElement) {
      throw new Error('ModeManager 尚未配置 modeTitle 元素')
    }

    modeTitleElement.removeEventListener('click', this.handleTitleClick)
    modeTitleElement.addEventListener('click', this.handleTitleClick)

    await this.setMode(initialMode, { skipStorageWrite: true })
  }

  private static handleTitleClick = async () => {
    try {
      await this.toggleMode()
    } catch (error) {
      console.error('Error in toggleMode:', error)
    }
  }

  private static async saveModeToStorage() {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: this.currentMode })
    } catch (error) {
      console.error('保存模式失败:', error)
    }
  }

  static async toggleMode() {
    const newMode = this.currentMode === AppMode.TAGGING ? AppMode.TAGGED : AppMode.TAGGING
    await this.setMode(newMode)
  }

  static async toggleDebugMode() {
    const targetMode = this.currentMode === AppMode.DEBUG ? AppMode.TAGGING : AppMode.DEBUG
    await this.setMode(targetMode)
  }

  static getCurrentMode(): AppMode {
    return this.currentMode
  }

  static async setMode(mode: AppMode, options?: { skipStorageWrite?: boolean }) {
    this.currentMode = mode

    if (!options?.skipStorageWrite) {
      await this.saveModeToStorage()
    }

    window.dispatchEvent(new CustomEvent<AppMode>('app:mode-changed', { detail: mode }))

    if (mode === AppMode.TAGGED) {
      await tagManager.reloadFromStorage()
      this.loadAllTaggedPages()
    }
  }

  static loadAllTaggedPages() {
    const allPages = tagManager.getTaggedPages()
    this.displayFilteredPages(allPages)
  }

  static filterPagesByInputs(selectedTagIds: string[], partialText: string, strictSelectedTagId?: string) {
    const allPages = tagManager.getTaggedPages()
    const allTags = tagManager.getAllTags()

    const normalizedPartial = (partialText || '').trim().toLowerCase()
    const hasPartial = normalizedPartial.length > 0 && !strictSelectedTagId

    const partialCandidateIds: Set<string> = new Set()
    if (hasPartial) {
      allTags.forEach((t) => {
        if (t.name.toLowerCase().startsWith(normalizedPartial)) {
          partialCandidateIds.add(t.id)
        }
      })
    }

    const filtered = allPages.filter((p) => {
      for (const id of selectedTagIds) {
        if (!p.tags.includes(id)) return false
      }
      if (strictSelectedTagId) {
        return p.tags.includes(strictSelectedTagId)
      }
      if (hasPartial) {
        return p.tags.some((id) => partialCandidateIds.has(id))
      }
      return true
    })

    this.displayFilteredPages(filtered)
  }

  private static displayFilteredPages(pages: TaggedPage[]) {
    if (!filteredPagesListElement) {
      console.warn('ModeManager 缺少 filteredPagesList 元素')
      return
    }

    filteredPagesListElement.innerHTML = ''

    if (pages.length === 0) {
      filteredPagesListElement.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">暂无匹配的页面</div>'
      return
    }

    pages.forEach((page) => {
      const pageElement = this.createPageElement(page)
      filteredPagesListElement?.appendChild(pageElement)
    })
  }

  private static createPageElement(page: TaggedPage): HTMLDivElement {
    const pageElement = document.createElement('div')
    pageElement.className = 'page-item'

    const allTags = tagManager.getAllTags()
    const pageTags = allTags.filter((tag) => page.tags.includes(tag.id))

    const defaultIcon =
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bS0yIDE1bC01LTUgMS40MS0xLjQxTDEwIDE0LjE3bDcuNTktNy41OUwxOSA4bC05IDl6Ii8+PC9zdmc+'

    const faviconImg = document.createElement('img')
    faviconImg.className = 'page-favicon'
    faviconImg.src = page.favicon || defaultIcon
    faviconImg.onerror = () => {
      faviconImg.src = defaultIcon
    }

    const contentDiv = document.createElement('div')
    contentDiv.className = 'page-content'

    const titleDiv = document.createElement('div')
    titleDiv.className = 'page-item-title'
    titleDiv.textContent = page.title

    const urlDiv = document.createElement('div')
    urlDiv.className = 'page-item-url'
    urlDiv.textContent = page.url

    const tagsDiv = document.createElement('div')
    tagsDiv.className = 'page-tags'

    pageTags.forEach((tag) => {
      const tagSpan = document.createElement('span')
      tagSpan.className = 'page-tag'
      tagSpan.textContent = tag.name
      tagsDiv.appendChild(tagSpan)
    })

    contentDiv.appendChild(titleDiv)
    contentDiv.appendChild(urlDiv)
    contentDiv.appendChild(tagsDiv)

    pageElement.appendChild(faviconImg)
    pageElement.appendChild(contentDiv)

    pageElement.addEventListener('click', () => {
      chrome.tabs.create({ url: page.url })
    })

    return pageElement
  }
}

export async function loadInitialAppMode(): Promise<AppMode> {
  try {
    const result = await chrome.storage.local.get([MODE_STORAGE_KEY])
    const savedMode = result[MODE_STORAGE_KEY] as AppMode
    if (savedMode && Object.values(AppMode).includes(savedMode)) {
      return savedMode
    }
  } catch (error) {
    console.error('加载模式失败:', error)
  }
  return AppMode.TAGGING
}

