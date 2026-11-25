import type { Contract, ContractCreator, Envelope } from './types';

function isRecord(value: unknown): value is Record<string | number | symbol, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Создает изолированный дескриптор контракта.
 *
 * @param type Уникальный строковый литерал типа
 *
 * @example
 * // С данными:
 * const UserContract = defineContract<'user/open', { id: string }>('user/open');
 * const msg = UserContract.create({ id: '42' });
 *
 * @example
 * // Без данных:
 * const CloseAllContract = defineContract<'close_all'>('close_all');
 * const msg = CloseAllContract.create();
 */
export function defineContract<TType extends string, TData = void>(
    type: TType
): Contract<TType, TData> {
    const create = ((data?: TData) => ({
        type,
        data: data as TData,
    })) as ContractCreator<TType, TData>;

    const match = (envelope: unknown): envelope is Envelope<TType, TData> => {
        if (!isRecord(envelope)) return false;
        return envelope.type === type && 'data' in envelope;
    };

    return Object.freeze({
        type,
        create,
        match,
    });
}