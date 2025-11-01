export function isCaretAtStart(input: HTMLInputElement): boolean {
  return input.selectionStart === 0 && input.selectionEnd === 0
}

