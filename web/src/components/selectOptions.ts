export interface SearchOption {
  label: string;
  disabled?: boolean;
}

export function stepOption(options: readonly SearchOption[], start: number, direction: 1 | -1): number {
  for (let i = start + direction; i >= 0 && i < options.length; i += direction) {
    if (!options[i].disabled) return i;
  }
  return options[start] && !options[start].disabled ? start : -1;
}

export function findOption(options: readonly SearchOption[], query: string, start = 0): number {
  if (!query || !options.length) return -1;
  const prefix = query.normalize('NFC').toLocaleLowerCase();
  for (let offset = 0; offset < options.length; offset++) {
    const i = ((start + offset) % options.length + options.length) % options.length;
    if (!options[i].disabled && options[i].label.trimStart().normalize('NFC').toLocaleLowerCase().startsWith(prefix)) return i;
  }
  return -1;
}
