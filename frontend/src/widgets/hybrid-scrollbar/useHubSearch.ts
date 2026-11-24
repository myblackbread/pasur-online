'use client';

import { useEffect, useRef, useContext, useId, useState } from 'react';
import { 
  HubSearchContext, 
  type HubSearchConfig, 
  type SearchSubmitHandler 
} from './HubSearchBus';
import { MYHubRouteContext } from './my/HubRouteContext';

export function useHubSearch(optionsOrSubmit: HubSearchConfig | SearchSubmitHandler) {
  const bus = useContext(HubSearchContext);
  const screenCtx = useContext(MYHubRouteContext);
  const fallbackId = useId();

  const screenId = screenCtx?.screenId || fallbackId;
  const isActive = screenCtx ? screenCtx.isActive : true;

  const options: HubSearchConfig = typeof optionsOrSubmit === 'function' 
    ? { onSubmit: optionsOrSubmit } 
    : optionsOrSubmit;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Стейт хранится локально в хуке (внутри экрана). 
  // Не теряется при навигации вперёд-назад!
  const [localQuery, setLocalQuery] = useState(options.initialValue || '');
  const [localIsOpen, setLocalIsOpen] = useState(false);

  const localStateRef = useRef({ query: localQuery, isOpen: localIsOpen });
  localStateRef.current = { query: localQuery, isOpen: localIsOpen };

  const registerScreen = bus?._registerScreen;
  const unregisterScreen = bus?._unregisterScreen;
  const syncFromScreen = bus?._syncFromScreen;

  // 1. Регистрация экрана при активации
  useEffect(() => {
    if (!registerScreen || !unregisterScreen || !isActive) return;

    registerScreen(screenId, {
      placeholder: optionsRef.current.placeholder,
      onQueryChange: (q) => {
        setLocalQuery(q);
        optionsRef.current.onChange?.(q);
      },
      onOpenChange: (open) => {
        setLocalIsOpen(open);
      },
      onSubmit: (text) => {
        optionsRef.current.onSubmit?.(text);
      }
    });

    // При возвращении на экран восстанавливаем глобальный стейт поиска из локального
    syncFromScreen?.(localStateRef.current.query, localStateRef.current.isOpen);

    return () => {
      unregisterScreen(screenId);
    };
  }, [isActive, screenId, registerScreen, unregisterScreen, syncFromScreen]); 

  // 2. Двусторонний биндинг: пушим стейт в шину, если он изменился изнутри компонента
  useEffect(() => {
    if (isActive && syncFromScreen) {
      syncFromScreen(localQuery, localIsOpen);
    }
  }, [localQuery, localIsOpen, isActive, syncFromScreen]);
}