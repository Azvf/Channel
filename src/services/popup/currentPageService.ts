import { TagManager } from '../tagManager'
import { DOMOperationHandler } from './domOperationHandler'
import type { GameplayTag, TaggedPage } from '../../types/gameplayTag'

interface CurrentPageElements {
  title: HTMLDivElement
  tagsContainer: HTMLDivElement
}

interface CurrentPageServiceConfig {
  elements: CurrentPageElements
  onTagOperation: (operation: 'add' | 'remove', tagId: string) => Promise<void>
}

const tagManager = TagManager.getInstance()

let config: CurrentPageServiceConfig | null = null
let currentPage: TaggedPage | null = null

export function configureCurrentPageService(serviceConfig: CurrentPageServiceConfig): void {
  config = serviceConfig
}

export function setCurrentPage(page: TaggedPage | null): void {
  currentPage = page
}

export function getCurrentPage(): TaggedPage | null {
  return currentPage
}

export async function ensureCurrentPageRegistered(): Promise<void> {
  currentPage = await tagManager.ensurePageRegistered(currentPage?.id)
}

export async function loadCurrentPageTags(): Promise<void> {
  if (!config) {
    throw new Error('CurrentPageService 尚未配置')
  }

  const { title, tagsContainer } = config.elements

  if (!currentPage) {
    title.textContent = '无当前页面'
    tagsContainer.innerHTML = ''
    return
  }

  title.textContent = `${currentPage.title} (${currentPage.tags.length} 个标签)`

  const allTags = tagManager.getAllTags()
  const pageTags = allTags.filter((tag) => currentPage!.tags.includes(tag.id))

  DOMOperationHandler.clearAndFill(tagsContainer, pageTags, (tag) => createTagElement(tag))
}

export async function refreshCurrentPage(): Promise<void> {
  if (currentPage) {
    const updated = tagManager.getPageById(currentPage.id)
    if (updated) {
      currentPage = updated
    }
  }
  await loadCurrentPageTags()
}

function createTagElement(tag: GameplayTag): HTMLDivElement {
  if (!config) {
    throw new Error('CurrentPageService 尚未配置')
  }

  const tagElement = document.createElement('div')
  tagElement.className = 'tag-item selected'

  const nameSpan = document.createElement('span')
  nameSpan.textContent = tag.name
  tagElement.appendChild(nameSpan)

  const removeSpan = document.createElement('span')
  removeSpan.className = 'tag-remove'
  removeSpan.textContent = '×'
  removeSpan.title = '点击移除标签'
  tagElement.appendChild(removeSpan)

  const handleRemove = async (event: Event) => {
    event.stopPropagation()
    await config!.onTagOperation('remove', tag.id)
  }

  tagElement.addEventListener('click', handleRemove)
  removeSpan.addEventListener('click', handleRemove)

  tagElement.title = '点击移除标签'
  return tagElement
}

