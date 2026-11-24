/**
 * Тип результата операции без выбрасывания исключений (паттерн Result/Either).
 * Кортеж из двух элементов:
 * - В случае успеха: [null, данные]
 * - В случае ошибки: [ошибка, null]
 */
export type Result<T, E = Error> =
  | [error: null, data: T]
  | [error: E, data: null];

/**
 * Создает успешный результат операции.
 * @param data Возвращаемые данные.
 */
export const ok = <T>(data: T): Result<T, never> => [null, data];

/**
 * Создает результат операции с ошибкой.
 * @param error Объект ошибки.
 */
export const err = <E>(error: E): Result<never, E> => [error, null];

/**
 * Безопасно выполняет синхронную функцию, перехватывая любые исключения.
 */
export function safe<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return [null, fn()];
  } catch (error) {
    return [error as E, null];
  }
}

/**
 * Безопасно ожидает завершения Promise, перехватывая отказ (reject/throw).
 */
export async function safeAsync<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    return [error as E, null];
  }
}