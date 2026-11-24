'use client';

import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { HubSearchContext } from './HubSearchBus';

export const HubSearchBar: React.FC<{ buttonSize: number }> = ({ buttonSize }) => {
  const ctx = React.useContext(HubSearchContext);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConfig = ctx?.activeConfig;
  const isSearchOpen = ctx?.isSearchOpen || false;
  const setIsSearchOpen = ctx?.setIsSearchOpen;
  const query = ctx?.query || '';
  const setQuery = ctx?.setQuery;

  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus();
    }
  }, [isSearchOpen]);

  if (!ctx || !activeConfig || !setIsSearchOpen || !setQuery) return null;

  if (!isSearchOpen) {
    return (
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setIsSearchOpen(true);
        }}
        style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
        className="rounded-full flex items-center justify-center text-neutral-200 bg-white/10 hover:bg-white/20 active:scale-90 transition-transform pointer-events-auto shrink-0"
      >
        <Search size={Math.round(buttonSize * 0.48)} strokeWidth={2.2} />
      </button>
    );
  }

  return (
    <form
      onPointerDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        activeConfig.onSubmit(query);
        inputRef.current?.blur();
      }}
      className="flex items-center pointer-events-auto"
      style={{ height: `${buttonSize}px`, width: '220px' }}
    >
      {/* SwiftUI-стиль: Обособленное поле ввода (UISearchBar background) */}
      <div className="flex-1 flex items-center h-full bg-neutral-800/90 rounded-full px-3 shadow-inner overflow-hidden transition-all">
        
        {/* Иконка лупы внутри инпута. Пропадает, если есть хотя бы 1 символ */}
        {query.length === 0 && (
          <Search size={16} className="text-neutral-500 shrink-0 mr-1.5 transition-opacity" />
        )}
        
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={query}
          placeholder={activeConfig.placeholder || 'Поиск...'}
          onChange={(e) => setQuery(e.target.value)}
          style={{ fontSize: '16px' }}
          className="w-full bg-transparent border-none outline-none text-white placeholder-neutral-500"
        />
      </div>

      {/* Вынесенная круглая кнопка отмены (X) рядом с полем */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setQuery('');           // Очищаем текст
          setIsSearchOpen(false); // Закрываем поиск
        }}
        style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
        className="ml-1.5 rounded-full flex items-center justify-center text-neutral-400 bg-white/5 hover:bg-white/10 hover:text-white active:scale-90 transition-all shrink-0"
      >
        <X size={18} strokeWidth={2.2} />
      </button>
    </form>
  );
};