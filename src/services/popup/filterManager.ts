import { TagManager } from '../tagManager'
import type { GameplayTag } from '../../types/gameplayTag'
import { isCaretAtStart } from './utils'

interface FilterElements {
  input: HTMLInputElement
  dropdown: HTMLDivElement
  container: HTMLDivElement
  measure: HTMLSpanElement
}

interface FilterManagerConfig {
  elements: FilterElements
  placeholderDefault: string
  onFilterChange: (selectedTagIds: string[], partialText: string, strictSelectedTagId?: string) => void
}

export class FilterManager {
  private static config: FilterManagerConfig | null = null
  private static selectedTags: GameplayTag[] = []
  private static focusedChipIndex = -1
  private static activeStrictTag: GameplayTag | null = null
  private static readonly tagManager = TagManager.getInstance()

  static configure(config: FilterManagerConfig): void {
    this.config = config
    this.selectedTags = []
    this.focusedChipIndex = -1
    this.activeStrictTag = null
    const elements = this.ensureElements()
    elements.input.value = ''
    this.updateUI()
  }

  static reset(): void {
    if (!this.config) return
    this.selectedTags = []
    this.focusedChipIndex = -1
    this.activeStrictTag = null
    const { input } = this.ensureElements()
    input.value = ''
    this.updateUI()
    this.notify('')
  }

  static getSelectedTagIds(): string[] {
    return this.selectedTags.map((tag) => tag.id)
  }

  static getSelectedTags(): GameplayTag[] {
    return [...this.selectedTags]
  }

  static setActiveStrictTag(tag: GameplayTag | null): void {
    this.activeStrictTag = tag
  }

  static getActiveStrictId(): string | undefined {
    return this.activeStrictTag?.id
  }

  static clearActiveStrictTag(): void {
    this.activeStrictTag = null
  }

  static applyPartial(partial: string): void {
    if (!this.config) {
      return
    }
    const { input } = this.ensureElements()
    input.value = partial
    this.focusedChipIndex = -1
    this.clearActiveStrictTag()
    this.updateUI()
    this.notify(partial)
  }

  static commitTag(tag: GameplayTag): void {
    if (!this.config) {
      return
    }
    const { input } = this.ensureElements()
    if (!this.selectedTags.some((item) => item.id === tag.id)) {
      this.selectedTags.push(tag)
    }
    input.value = ''
    this.focusedChipIndex = -1
    this.clearActiveStrictTag()
    this.updateUI()
    this.notify('')
  }

  static removeTagAt(index: number): void {
    if (!this.config) {
      return
    }
    if (index < 0 || index >= this.selectedTags.length) {
      return
    }
    this.selectedTags.splice(index, 1)
    if (this.focusedChipIndex >= this.selectedTags.length) {
      this.focusedChipIndex = -1
    }
    this.updateUI()
    const { input } = this.ensureElements()
    this.notify(input.value, this.getActiveStrictId())
  }

  static handleInputEvent = (_e: Event): void => {
    if (!this.config) {
      return
    }
    const { input } = this.ensureElements()
    const partial = input.value
    this.focusedChipIndex = -1
    this.clearActiveStrictTag()
    this.updateUI()
    this.notify(partial)
  }

  static handleKeydownEvent = (e: KeyboardEvent): void => {
    if (!this.config) {
      return
    }
    if (e.key === 'Backspace') {
      if (this.canHandleBackspace() && this.handleBackspace()) {
        e.preventDefault()
      }
      return
    }

    if (e.key === 'Enter') {
      if (this.handleEnter()) {
        e.preventDefault()
      }
      return
    }

    if (e.key === 'Escape') {
      this.clearActiveStrictTag()
    }
  }

  static handleResize = (): void => {
    if (!this.config) {
      return
    }
    this.positionDropdown()
  }

  private static handleBackspace(): boolean {
    if (this.selectedTags.length === 0) {
      return false
    }

    const lastIndex = this.selectedTags.length - 1
    if (this.focusedChipIndex === lastIndex) {
      this.selectedTags.pop()
      this.focusedChipIndex = -1
      const { input } = this.ensureElements()
      this.updateUI()
      this.notify(input.value, this.getActiveStrictId())
    } else {
      this.focusChip(lastIndex)
    }
    return true
  }

  private static handleEnter(): boolean {
    const { input } = this.ensureElements()
    const partial = input.value.trim()

    if (this.activeStrictTag) {
      this.commitTag(this.activeStrictTag)
      return true
    }

    if (this.focusedChipIndex >= 0 && this.selectedTags[this.focusedChipIndex]) {
      const tag = this.selectedTags.splice(this.focusedChipIndex, 1)[0]
      this.focusedChipIndex = -1
      input.value = tag.name
      this.updateUI()
      this.notify(input.value)
      setTimeout(() => input.focus(), 0)
      return true
    }

    if (partial) {
      const exact = this.tagManager.findTagByName(partial)
      if (exact) {
        this.commitTag(exact)
        return true
      }
    }

    return false
  }

  private static canHandleBackspace(): boolean {
    const { input } = this.ensureElements()
    return isCaretAtStart(input)
  }

  private static focusChip(index: number): void {
    this.focusedChipIndex = index
    this.renderChips()
  }

  private static renderChips(): void {
    const { container, input } = this.ensureElements()
    const existing = Array.from(container.querySelectorAll('.filter-chip'))
    existing.forEach((el) => el.remove())

    this.selectedTags.forEach((tag, index) => {
      const chip = this.createChipElement(tag, index)
      container.insertBefore(chip, input)
    })
  }

  private static createChipElement(tag: GameplayTag, index: number): HTMLDivElement {
    const chip = document.createElement('div')
    chip.className = 'tag-item selected filter-chip'
    if (index === this.focusedChipIndex) {
      chip.classList.add('focused')
    }

    const nameSpan = document.createElement('span')
    nameSpan.textContent = tag.name
    chip.appendChild(nameSpan)

    const remove = document.createElement('span')
    remove.className = 'tag-remove'
    remove.textContent = '×'
    remove.title = '移除筛选标签'
    chip.appendChild(remove)

    chip.addEventListener('click', (e) => {
      e.stopPropagation()
      this.focusChip(index)
      this.ensureElements().input.focus()
    })

    remove.addEventListener('click', (e) => {
      e.stopPropagation()
      this.removeTagAt(index)
    })

    return chip
  }

  private static updateMeasure(): void {
    const { input, measure, container } = this.ensureElements()
    const value = input.value || ''
    measure.textContent = value.length > 0 ? value : '\u200b'
    const containerRect = container.getBoundingClientRect()
    const inputRect = input.getBoundingClientRect()
    measure.style.left = `${inputRect.left - containerRect.left}px`
    measure.style.top = `${inputRect.top - containerRect.top}px`
  }

  static positionDropdown(): void {
    if (!this.config) {
      return
    }
    const { container, dropdown, measure, input } = this.ensureElements()
    if (!dropdown.classList.contains('show')) {
      return
    }
    const containerRect = container.getBoundingClientRect()
    const inputRect = input.getBoundingClientRect()
    const measureRect = measure.getBoundingClientRect()
    dropdown.style.left = `${measureRect.right - containerRect.left}px`
    dropdown.style.top = `${inputRect.bottom - containerRect.top}px`
    dropdown.style.right = '10px'
  }

  private static updatePlaceholder(): void {
    const { input } = this.ensureElements()
    const hasChips = this.selectedTags.length > 0
    const hasText = (input.value || '').trim().length > 0
    const placeholder = this.ensureConfig().placeholderDefault
    input.placeholder = hasChips || hasText ? '' : placeholder
  }

  private static updateUI(): void {
    this.renderChips()
    this.updateMeasure()
    this.updatePlaceholder()
    this.positionDropdown()
  }

  private static notify(partial: string, strictSelectedTagId?: string): void {
    const callback = this.ensureConfig().onFilterChange
    callback(this.getSelectedTagIds(), partial, strictSelectedTagId)
  }

  private static ensureConfig(): FilterManagerConfig {
    if (!this.config) {
      throw new Error('FilterManager 尚未配置')
    }
    return this.config
  }

  private static ensureElements(): FilterElements {
    return this.ensureConfig().elements
  }
}

