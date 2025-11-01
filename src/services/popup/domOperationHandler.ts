export class DOMOperationHandler {
  static clearAndFill<T>(
    container: HTMLElement,
    items: T[],
    createElement: (item: T) => HTMLElement,
    emptyMessage?: string
  ): void {
    container.innerHTML = ''

    if (items.length === 0 && emptyMessage) {
      container.innerHTML = `<div style="text-align: center; opacity: 0.7; padding: 20px;">${emptyMessage}</div>`
      return
    }

    items.forEach((item) => {
      const element = createElement(item)
      container.appendChild(element)
    })
  }
}

