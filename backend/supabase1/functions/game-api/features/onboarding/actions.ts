import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/core/database/database.types.ts";
import { BaseActionParams } from "@/core/types.ts";
import { SuccessResponse } from "@/shared/dto/responses.ts";
import { GameError, ErrorCode, UserSettings } from "@/shared/index.ts";
import { getUser } from "@/data/users/repository.ts";
// (Не забудь добавить эти функции в switch (action) в твоем index.ts!)
export interface CompleteOnboardingParams extends BaseActionParams {
    payload: {
        gender: 'male' | 'female';
        displayName: string;
        avatarEmoji?: string;
    }
}

/**
 * Завершает регистрацию, собирает JSON настроек и обнуляет дедлайн.
 */
export async function completeOnboardingAction({ db, userId, payload }: CompleteOnboardingParams): Promise<SuccessResponse> {
    // Берем юзера с флагом requireActive: false, чтобы нас не отбило ошибкой
    const user = await getUser({ db, userId, requireActive: false });
    
    // Если дедлайн уже null, значит онбординг пройден, ничего не делаем
    if (user.onboardingDeadline === null) return { success: true };

    // Бизнес-логика: девушкам всегда инкогнито
    const isIncognito = (payload.gender === 'female');

    const newSettings: UserSettings = {
        gender: payload.gender,
        displayName: payload.displayName,
        avatarEmoji: payload.avatarEmoji || '👤',
        blockedUids: [],
        isIncognito: isIncognito
    };

    // Обновляем юзера: записываем настройки и СБРАСЫВАЕМ дедлайн в null
    const { error } = await db.from('users')
        .update({
            settings: newSettings as unknown as string,
            onboarding_deadline: null // Воскрешаем пользователя навсегда
        })
        .eq('id', userId);

    if (error) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    return { success: true };
}

/**
 * Продлевает дедлайн на 1 час. Swift будет дергать это каждые 15 минут.
 */
export async function extendOnboardingAction({ db, userId }: BaseActionParams): Promise<SuccessResponse> {
    const newDeadline = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 час

    // Обновляем ТОЛЬКО если onboarding_deadline не null
    // Если он уже null, база просто не найдет такую строку (ничего не сломается)
    const { error } = await db.from('users')
        .update({ onboarding_deadline: newDeadline as any })
        .eq('id', userId)
        .not('onboarding_deadline', 'is', null); 

    if (error) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    return { success: true };
}