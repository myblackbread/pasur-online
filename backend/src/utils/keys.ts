/**
 * Преобразует 36-символьный UUID в 16-символьную бинарную Latin-1 строку.
 * Сокращает потребление памяти и ускоряет поиск по составным ключам в Map.
 * [Алгоритмическое исключение]: прямой позиционный параметр.
 */
export function uuidToLatin1(uuid: string): string {
  const hex = uuid.replaceAll("-", "");
  let res = "";
  for (let i = 0; i < 32; i += 2) {
    res += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
  }
  return res;
}

/**
 * Генерирует сжатый строковый ключ из произвольного числа UUID.
 * Длина итогового ключа: N * 16 символов.
 * [Алгоритмическое исключение]: rest-параметры.
 */
export function buildIndexKey(...uuids: string[]): string {
  return uuids.map(uuidToLatin1).join("");
}