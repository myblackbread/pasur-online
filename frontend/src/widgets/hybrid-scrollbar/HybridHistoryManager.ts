'use client';

import { useEffect } from 'react';
import { myGetPlatformType } from './shared/platform/MYPlatformType';

class HistoryManager {
    private currentIndex = 0;
    public isInitialized = false;

    private burnedTokens = new Set<string>();
    public isPopping = false;
    private hubHistory: string[] = [];
    private tokenStack: string[] = [];
    private onBackDispatcher: (() => void) | null = null;

    // --- Стейт транзакции ---
    private activeTransactionToken: string | null = null;
    private transactionOriginHub: string | null = null;

    init(initialHub: string) {
        if (typeof window === 'undefined' || this.isInitialized) return;
        this.isInitialized = true;

        this.hubHistory = [initialHub];
        
        const state = window.history.state || {};
        if (typeof state.__idx === 'number') {
            this.currentIndex = state.__idx;
            this.tokenStack[this.currentIndex] = state.__id || 'root';
        } else {
            this.currentIndex = 0;
            this.tokenStack[0] = 'root';
            window.history.replaceState({ __idx: 0, __id: 'root' }, '');
        }

        window.addEventListener('popstate', this.onPopState);
    }

    setDispatcher(dispatcher: () => void) {
        this.onBackDispatcher = dispatcher;
    }

    pushHub(hubId: string) {
        if (!this.isInitialized) return;
        
        const current = this.hubHistory[this.hubHistory.length - 1];
        if (current === hubId) return;

        this.hubHistory.push(hubId);
        this.pushToken();
    }

    popHub(): string | null {
        if (this.hubHistory.length > 1) {
            this.hubHistory.pop();
            return this.hubHistory[this.hubHistory.length - 1];
        }
        return null;
    }

    pushToken(): string {
        this.currentIndex++;
        const id = Math.random().toString(36).substring(2, 10);
        
        this.tokenStack.length = this.currentIndex;
        this.tokenStack.push(id);
        
        window.history.pushState({ __idx: this.currentIndex, __id: id }, '');
        return id;
    }

    burnToken(id: string) {
        if (this.isPopping || !this.isInitialized) return;
        this.burnedTokens.add(id);
        window.history.back();
    }

    // ==========================================
    // ТРАНЗАКЦИИ (ДЛЯ СВАЙПОВ И СКРОЛЛОВ)
    // ==========================================

    hasActiveTransaction(): boolean {
        return this.activeTransactionToken !== null;
    }

    startTransaction() {
        if (!this.isInitialized || this.activeTransactionToken) return;

        // Запоминаем хаб, с которого начали жест
        this.transactionOriginHub = this.hubHistory[this.hubHistory.length - 1];
        
        // ДОБАВЛЯЕМ ДО (pushState в самом начале)
        this.currentIndex++;
        const id = Math.random().toString(36).substring(2, 10);
        
        this.tokenStack.length = this.currentIndex;
        this.tokenStack.push(id);
        this.activeTransactionToken = id;
        
        window.history.pushState({ __idx: this.currentIndex, __id: id }, '');
    }

    commitTransaction(finalHubId: string) {
        if (!this.isInitialized) return;
        
        if (!this.activeTransactionToken) {
            // Если транзакции не было, делаем обычный push
            this.pushHub(finalHubId);
            return;
        }

        const isSameHub = this.transactionOriginHub === finalHubId;
        const tokenToBurn = this.activeTransactionToken;

        // Очищаем стейт ДО burnToken
        this.activeTransactionToken = null;
        this.transactionOriginHub = null;

        if (isSameHub) {
            // И СРАЗУ ДЕЛАЕМ POP, если конечный хаб совпадает с начальным
            this.burnToken(tokenToBurn);
        } else {
            // Переход успешен (pushState уже был сделан в startTransaction). Просто фиксируем хаб.
            this.hubHistory.push(finalHubId);
        }
    }

    private onPopState = (e: PopStateEvent) => {
        const state = e.state || {};
        const incomingIdx = state.__idx ?? 0;
        const leftId = this.tokenStack[this.currentIndex];

        if (leftId && this.burnedTokens.has(leftId)) {
            this.burnedTokens.delete(leftId);
            this.currentIndex = incomingIdx;
            return;
        }

        // Если во время транзакции пользователь нажал системную кнопку "Назад" - обнуляем
        this.activeTransactionToken = null;
        this.transactionOriginHub = null;

        const isBack = incomingIdx < this.currentIndex;
        this.currentIndex = incomingIdx;

        if (!isBack) return;

        this.isPopping = true;
        if (this.onBackDispatcher) this.onBackDispatcher();
        setTimeout(() => { this.isPopping = false; }, 50);
    };
}

export const HybridHistoryManager = new HistoryManager();

export function useHybridHistory(isOpen: boolean, _deprecatedOnClose?: () => void) {
    useEffect(() => {
        if (!isOpen) return;
        if (myGetPlatformType() === 'ios') return;

        const id = HybridHistoryManager.pushToken();
        return () => {
            HybridHistoryManager.burnToken(id);
        };
    }, [isOpen]);
}