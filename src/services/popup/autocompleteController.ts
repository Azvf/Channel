import { TagManager } from '../tagManager'
import type { GameplayTag } from '../../types/gameplayTag'
import { FilterManager } from './filterManager'

interface BaseAutocompleteOptions {
  input: HTMLInputElement
  dropdown: HTMLDivElement
}

interface TagAutocompleteOptions extends BaseAutocompleteOptions {
  mode: 'tag'
  onSubmit: () => void
}

interface FilterAutocompleteOptions extends BaseAutocompleteOptions {
  mode: 'filter'
}

type AutocompleteOptions = TagAutocompleteOptions | FilterAutocompleteOptions

const inputInstanceMap = new WeakMap<HTMLInputElement, AutocompleteInstance>()
const dropdownInstanceMap = new WeakMap<HTMLDivElement, AutocompleteInstance>()

class AutocompleteInstance {
  private readonly tagManager = TagManager.getInstance()
  private selectedIndex = -1
  private currentMatches: GameplayTag[] = []
  private currentQuery = ''
  private blurTimer: number | undefined

  constructor(private readonly options: AutocompleteOptions) {
    this.options.input.addEventListener('input', this.handleInput)
    this.options.input.addEventListener('keydown', this.handleKeydown)
    this.options.input.addEventListener('blur', this.handleBlur)
    this.options.input.addEventListener('focus', this.handleFocus)
    dropdownInstanceMap.set(this.options.dropdown, this)
  }

  dismiss(): void {
    this.hideDropdown()
  }

  private handleInput = (event: Event): void => {
    const input = event.target as HTMLInputElement
    const query = input.value.trim()

    if (this.options.mode === 'filter') {
      FilterManager.clearActiveStrictTag()
    }

    this.refreshMatches(query)
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    const { dropdown } = this.options

    if (!dropdown.classList.contains('show')) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentMatches.length - 1)
        this.updateSelection()
        break
      case 'ArrowUp':
        e.preventDefault()
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1)
        this.updateSelection()
        break
      case 'Enter':
        e.preventDefault()
        if (this.selectedIndex >= 0 && this.selectedIndex < this.currentMatches.length) {
          this.selectItem(this.currentMatches[this.selectedIndex])
        } else if (this.options.mode === 'filter' && this.currentQuery) {
          FilterManager.applyPartial(this.currentQuery)
          this.hideDropdown()
        } else if (this.options.mode === 'tag') {
          this.options.onSubmit()
        }
        break
      case 'Escape':
        this.hideDropdown()
        break
      case 'Tab':
        this.hideDropdown()
        break
      default:
        break
    }
  }

  private handleBlur = (): void => {
    this.blurTimer = window.setTimeout(() => {
      this.hideDropdown()
    }, 150)
  }

  private handleFocus = (): void => {
    if (this.blurTimer) {
      window.clearTimeout(this.blurTimer)
      this.blurTimer = undefined
    }
    const { input } = this.options
    const query = input.value.trim()
    if (query) {
      this.refreshMatches(query)
    }
  }

  private refreshMatches(query: string): void {
    if (!query) {
      this.hideDropdown()
      return
    }

    const allTags = this.tagManager.getAllTags()
    this.currentMatches = allTags.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()))
    this.currentQuery = query

    if (this.options.mode === 'filter') {
      FilterManager.clearActiveStrictTag()
    }

    if (this.currentMatches.length === 0) {
      this.hideDropdown()
      return
    }

    this.renderDropdownItems()
    this.selectedIndex = -1
    this.showDropdown()
  }

  private renderDropdownItems(): void {
    const { dropdown } = this.options
    dropdown.innerHTML = ''

    this.currentMatches.forEach((tag, index) => {
      const item = document.createElement('div')
      item.className = 'autocomplete-item'
      item.innerHTML = `
        <div class="tag-color" style="background-color: ${tag.color}"></div>
        <div class="tag-name">${tag.name}</div>
      `

      item.addEventListener('click', () => {
        this.selectItem(tag)
      })

      dropdown.appendChild(item)

      if (index === this.selectedIndex) {
        item.classList.add('selected')
      }
    })
  }

  private updateSelection(): void {
    const { dropdown } = this.options
    const items = dropdown.querySelectorAll('.autocomplete-item')
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === this.selectedIndex)
    })

    if (this.options.mode === 'filter') {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.currentMatches.length) {
        FilterManager.setActiveStrictTag(this.currentMatches[this.selectedIndex])
      } else {
        FilterManager.clearActiveStrictTag()
      }
    }
  }

  private selectItem(tag: GameplayTag): void {
    if (this.options.mode === 'filter') {
      FilterManager.commitTag(tag)
    } else {
      this.options.input.value = tag.name
      this.options.onSubmit()
    }
    this.hideDropdown()
  }

  private showDropdown(): void {
    const { dropdown } = this.options
    dropdown.classList.add('show')
    if (this.options.mode === 'filter') {
      FilterManager.positionDropdown()
    }
  }

  private hideDropdown(): void {
    const { dropdown } = this.options
    dropdown.classList.remove('show')
    this.selectedIndex = -1
    if (this.options.mode === 'filter') {
      FilterManager.clearActiveStrictTag()
    }
  }
}

export class AutocompleteController {
  static initTagInput(options: { input: HTMLInputElement; dropdown: HTMLDivElement; onSubmit: () => void }): void {
    if (inputInstanceMap.has(options.input)) {
      return
    }
    const instance = new AutocompleteInstance({ ...options, mode: 'tag' })
    inputInstanceMap.set(options.input, instance)
  }

  static initFilterInput(options: { input: HTMLInputElement; dropdown: HTMLDivElement }): void {
    if (inputInstanceMap.has(options.input)) {
      return
    }
    const instance = new AutocompleteInstance({ ...options, mode: 'filter' })
    inputInstanceMap.set(options.input, instance)
  }

  static dismissDropdown(dropdown: HTMLDivElement): void {
    const instance = dropdownInstanceMap.get(dropdown)
    if (instance) {
      instance.dismiss()
    } else {
      dropdown.classList.remove('show')
    }
  }
}

