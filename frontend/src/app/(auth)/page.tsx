'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Scissors, Image as ImageIcon, MessageCircle, Info, User,
  Calendar, Clock, MapPin, Star, CheckCircle2,
  Phone, AlertTriangle, ShieldCheck, Navigation, Settings,
  Plus, ArrowUp, X, Mic, Paperclip, ChevronRight, Award,
  History, Sparkles, FileText, ArrowLeft
} from 'lucide-react';

// ==========================================
// ИМПОРТ ELASTIC PULL PICKER (путь для теста)
// ==========================================
import { ElasticPullPicker } from './ElasticPullPicker';

import {
  HybridScrollView,
  useCapsuleSheet,
  useSheet,
  useNavigation,
  NavigationDestination,
  SheetDestination,
  MorphDestination,
  MorphHost,
  type ScrollScreen,
  type HubNotification,
} from '@/widgets/hybrid-scrollbar';

import { defineContract } from '@/widgets/hybrid-scrollbar/shared/contract';

// ==========================================
// 0. ХУК ВИРТУАЛЬНОЙ КЛАВИАТУРЫ
// ==========================================

function useVirtualKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;

    const handleResize = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(offset > 80 ? offset : 0);
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  return keyboardHeight;
}

// ==========================================
// 1. КОНТРАКТЫ
// ==========================================

interface Service { id: string; name: string; price: number; duration: string; }
interface Photo { id: string; url: string; style: string; tools: string; }
interface ChatMessage { id: string; text: string; sender: 'me' | 'barber'; time: string; }

// Шторки
const BookingConfirmContract = defineContract<'booking-confirm', { service: Service; time: string }>('booking-confirm');
const PhotoDetailContract = defineContract<'photo-detail', { photo: Photo }>('photo-detail');
const MapLocationContract = defineContract<'map-location', void>('map-location');
const ChatActionsContract = defineContract<'chat-actions', void>('chat-actions');
const ProfileSettingsContract = defineContract<'profile-settings', void>('profile-settings');
const ChatAttachmentContract = defineContract<'chat-attachment', void>('chat-attachment');

// Морфинг
const ChatMorphContract = defineContract<'chat-morph', ChatMessage>('chat-morph');

// Экраны стека (NavigationStack)
const BarberProfileContract = defineContract<'barber-profile', void>('barber-profile');
const VisitHistoryContract = defineContract<'visit-history', void>('visit-history');
const VisitDetailContract = defineContract<'visit-detail', { id: string; date: string; service: string; price: number; rating: number }>('visit-detail');

// ==========================================
// 2. БАЗА ДАННЫХ (МОКИ)
// ==========================================

interface StylePreset {
  id: string;
  name: string;
  tag: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { id: 'fade', name: 'Low Fade', tag: 'Топ' },
  { id: 'crop', name: 'Textured Crop', tag: 'Хит' },
  { id: 'pompadour', name: 'Pompadour', tag: 'Классика' },
  { id: 'buzz', name: 'Buzz Cut', tag: 'Быстро' },
  { id: 'beard', name: 'Beard Trim', tag: 'Уход' },
];

const SERVICES: Service[] = [
  { id: 's1', name: 'Мужская стрижка', price: 2000, duration: '1 час' },
  { id: 's2', name: 'Стрижка + Борода', price: 3000, duration: '1.5 часа' },
  { id: 's3', name: 'Оформление бороды', price: 1200, duration: '45 мин' },
  { id: 's4', name: 'Стрижка машинкой', price: 1000, duration: '30 мин' },
];

const GALLERY: Photo[] = [
  { id: 'p1', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&q=80', style: 'Fade & Crop', tools: 'Wahl Magic Clip, Ножницы' },
  { id: 'p2', url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=500&q=80', style: 'Classic Pompadour', tools: 'Помада Reuzel, Фен' },
  { id: 'p3', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&q=80', style: 'Beard Trim', tools: 'Опасная бритва, Масло' },
  { id: 'p4', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&q=80', style: 'Buzz Cut', tools: 'Машинка, Шейвер' },
];

const PAST_VISITS = [
  { id: 'v1', date: '14 октября 2026', service: 'Стрижка + Борода', price: 3000, rating: 5 },
  { id: 'v2', date: '2 сентября 2026', service: 'Мужская стрижка', price: 2000, rating: 5 },
  { id: 'v3', date: '18 июля 2026', service: 'Оформление бороды', price: 1200, rating: 5 },
];

const MOCK_NOTIFICATIONS: HubNotification[] = [
  { id: 'n1', title: 'Свободное окно!', message: 'Освободилось время сегодня в 18:00. Занять?', targetHubId: 'booking', time: 'Только что' },
  { id: 'n2', title: 'Новая поставка 📦', message: 'Приехала свежая матовая глина от Reuzel.', targetHubId: 'chat', time: '1 час назад' },
];

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'm14', text: 'Супер, договорились! Без проблем.', sender: 'me', time: '12:20' },
  { id: 'm13', text: 'Без проблем, захвачу зеленую банку Reuzel, как раз осталась одна.', sender: 'barber', time: '12:15' },
  { id: 'm12', text: 'Кстати, захвати тот воск, про который мы говорили в прошлый раз.', sender: 'me', time: '12:12' },
  { id: 'm11', text: 'Понял, сделаем фейд. Оставляем макушку подлиннее. До завтра! ✂️', sender: 'barber', time: '12:10' },
];

// ==========================================
// 3. ХАБ 1: ЗАПИСЬ (СО СТЕК-ЭКРАНОМ МАСТЕРА И ELASTIC PICKER)
// ==========================================

const BookingHub: React.FC = () => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(STYLE_PRESETS[0]);
  const nav = useNavigation();
  
  useCapsuleSheet({
    icon: CheckCircle2,
    contract: BookingConfirmContract,
    data: { service: selectedService!, time: selectedTime! },
    options: { detents: ['medium'] }
  });

  const availableTimes = ['10:00', '11:30', '14:00', '15:30', '18:00', '19:30'];

  return (
    <div className="min-h-full w-full bg-neutral-950 text-white p-4 pt-3 pb-32">
      {/* Кликабельная плашка мастера */}
      <div 
        onClick={() => nav.push({ contract: BarberProfileContract, options: { title: 'О мастере' } })}
        className="flex items-center justify-between p-3.5 mb-4 bg-neutral-900/60 border border-white/5 rounded-3xl cursor-pointer active:scale-98 transition-all hover:border-amber-500/30"
      >
        <div className="flex items-center gap-3.5">
          <img src="https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=150&q=80" alt="Master" className="w-14 h-14 rounded-full border-2 border-amber-500 object-cover" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-black tracking-tight">ALEX<span className="text-amber-500">.BARBER</span></h1>
              <Sparkles size={14} className="text-amber-500 fill-amber-500" />
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-400 mt-1">
              <MapPin size={12} /> Невский, 42 <span className="mx-1">•</span> <Star size={12} className="text-amber-500 fill-amber-500"/> 5.0 (148)
            </div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400">
          <ChevronRight size={18} />
        </div>
      </div>

      {/* ТЕСТОВЫЙ БЛОК: ELASTIC PULL PICKER */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Стиль стрижки
          </span>
          <span className="text-[11px] text-amber-500/80 font-medium">← потяните плашку</span>
        </div>
        <div className="h-14 w-full rounded-2xl bg-neutral-900 border border-white/5 relative overflow-hidden shadow-inner">
          <ElasticPullPicker
            items={STYLE_PRESETS}
            selectedId={selectedStyle.id}
            getItemId={(it) => it.id}
            onSelect={(item) => setSelectedStyle(item)}
            overlay={
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Sparkles size={13} className="text-amber-500" />
                <span>Потяните влево для выбора</span>
              </div>
            }
            renderItem={(item) => (
              <div className="h-9 px-3.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-md whitespace-nowrap cursor-pointer">
                <span>{item.name}</span>
                <span className="text-[9px] bg-neutral-950/20 px-1.5 py-0.5 rounded-md font-semibold text-neutral-900">
                  {item.tag}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      {/* Список услуг */}
      <div className="space-y-3 mb-6">
        {SERVICES.map(srv => (
          <div 
            key={srv.id} 
            onClick={() => setSelectedService(srv)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
              selectedService?.id === srv.id ? 'bg-amber-500/10 border-amber-500' : 'bg-neutral-900 border-white/5 hover:border-white/10'
            }`}
          >
            <div>
              <h3 className="font-bold">{srv.name}</h3>
              <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1"><Clock size={12}/> {srv.duration}</p>
            </div>
            <span className="font-black text-lg">{srv.price} ₽</span>
          </div>
        ))}
      </div>

      {selectedService && (
        <>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 px-1">Свободное время (Завтра)</p>
          <div className="flex flex-wrap gap-2.5 mb-8">
            {availableTimes.map(time => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`px-5 py-3 rounded-xl font-bold transition-colors ${
                  selectedTime === time ? 'bg-amber-500 text-black' : 'bg-neutral-900 text-white border border-white/5'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Шторка подтверждения записи */}
      <SheetDestination contract={BookingConfirmContract} destination={({ service, time }) => (
        <div className="pt-6 px-6 text-white h-full flex flex-col bg-neutral-900" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-center mb-6">Подтверждение</h3>
          
          <div className="bg-neutral-950 p-4 rounded-2xl border border-white/5 space-y-3 mb-8">
            <div className="flex justify-between text-neutral-400 text-sm"><span>Услуга</span> <span className="text-white font-medium">{service?.name}</span></div>
            <div className="flex justify-between text-neutral-400 text-sm"><span>Стиль</span> <span className="text-amber-500 font-medium">{selectedStyle.name}</span></div>
            <div className="flex justify-between text-neutral-400 text-sm"><span>Время</span> <span className="text-white font-medium">Завтра, {time}</span></div>
            <div className="flex justify-between text-neutral-400 text-sm"><span>Сумма</span> <span className="text-white font-medium">{service?.price} ₽</span></div>
          </div>

          <button className="w-full py-4 bg-amber-500 text-black font-black rounded-2xl mt-auto transition-transform active:scale-95">
            Записаться
          </button>
        </div>
      )} />

      {/* Стек-экран: Профиль мастера */}
      <NavigationDestination contract={BarberProfileContract} destination={() => (
        <div className="min-h-full w-full bg-neutral-950 text-white p-6 pt-6 pb-32">
          <div className="flex flex-col items-center text-center mb-6">
            <img 
              src="https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=300&q=80" 
              alt="Alex" 
              className="w-24 h-24 rounded-full border-4 border-amber-500 object-cover shadow-2xl mb-3" 
            />
            <h2 className="text-2xl font-black">Александр «Blade»</h2>
            <p className="text-amber-500 text-sm font-semibold">Top Barber & Educator</p>
            <p className="text-neutral-400 text-xs mt-1">Опыт более 8 лет • Санкт-Петербург</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex flex-col items-center text-center">
              <Award size={22} className="text-amber-500 mb-1.5" />
              <span className="font-bold text-sm">Barber King 2024</span>
              <span className="text-[11px] text-neutral-400">1-е место в СПб</span>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex flex-col items-center text-center">
              <Scissors size={22} className="text-amber-500 mb-1.5" />
              <span className="font-bold text-sm">4 500+ стрижек</span>
              <span className="text-[11px] text-neutral-400">Фирменная техника</span>
            </div>
          </div>

          <div className="bg-neutral-900 p-5 rounded-3xl border border-white/5 space-y-3 mb-6">
            <h4 className="font-bold text-sm text-neutral-200">О себе</h4>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Специализируюсь на классических техниках и идеальном Fade. Работаю только японской сталью и премиальной американской косметикой.
            </p>
          </div>

          <button 
            type="button" 
            onClick={() => nav.pop()}
            className="w-full py-4 rounded-2xl bg-neutral-800 border border-white/10 text-white font-bold active:scale-98 transition-all"
          >
            Вернуться к записи
          </button>
        </div>
      )} />
    </div>
  );
};

// ==========================================
// 4. ХАБ 2: АЛЬБОМ
// ==========================================

const GalleryHub: React.FC = () => {
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  useCapsuleSheet({
    icon: ImageIcon,
    contract: PhotoDetailContract,
    data: { photo: activePhoto! },
    options: { detents: ['large'] }
  });

  return (
    <div className="min-h-full w-full bg-neutral-950 text-white p-4 pt-3 pb-32">
      <div className="grid grid-cols-2 gap-3">
        {GALLERY.map((item, i) => (
          <div key={item.id} onClick={() => setActivePhoto(item)} className={`relative rounded-2xl overflow-hidden cursor-pointer bg-neutral-900 ${i % 3 === 0 ? 'row-span-2 h-64' : 'h-32'}`}>
            <img src={item.url} alt={item.style} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3"><p className="font-bold text-sm">{item.style}</p></div>
          </div>
        ))}
      </div>
      <SheetDestination contract={PhotoDetailContract} destination={({ photo }) => (
        <div className="h-full w-full bg-neutral-950 text-white flex flex-col relative">
          <img src={photo?.url} alt="Detail" className="w-full h-72 object-cover rounded-t-3xl" />
          <div className="p-6">
            <h3 className="text-2xl font-black mb-2">{photo?.style}</h3>
            <p className="text-amber-500 text-sm font-bold uppercase tracking-wider mb-6">Инструменты:</p>
            <div className="bg-neutral-900 p-4 rounded-2xl border border-white/5"><p className="text-neutral-300">{photo?.tools}</p></div>
          </div>
        </div>
      )} />
    </div>
  );
};

// ==========================================
// 5. ХАБ 3: ЧАТ С МАСТЕРОМ
// ==========================================

interface ChatAnchorButtonProps {
  hasText: boolean;
  onClick: () => void;
}

const ChatAnchorButton: React.FC<ChatAnchorButtonProps> = ({ hasText, onClick }) => (
  <button
    id="chat-anchor-btn"
    type="button"
    onClick={onClick}
    aria-label={hasText ? 'Отправить сообщение' : 'Начать печатать'}
    style={{
      transition: 'background-color 0.2s, border-color 0.2s, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
    }}
    className={`w-full h-full rounded-full flex items-center justify-center border shadow-xl pointer-events-auto active:scale-90 ${
      hasText 
        ? 'bg-amber-500 text-neutral-950 border-amber-400 scale-105 shadow-amber-500/25' 
        : 'bg-neutral-800 text-neutral-300 border-white/10 hover:text-white'
    }`}
  >
    <div className="transition-transform duration-200">
      {hasText ? <ArrowUp size={22} strokeWidth={2.8} /> : <Plus size={22} strokeWidth={2.5} />}
    </div>
  </button>
);

export const ChatHub: React.FC = () => {
  useCapsuleSheet({
    icon: Phone,
    contract: ChatActionsContract,
    options: { detents: ['medium'] }
  });

  const { open: openSheet, close: closeSheet } = useSheet();

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isMultiLine, setIsMultiLine] = useState(false);

  const keyboardHeight = useVirtualKeyboard();
  const [inputBarHeight, setInputBarHeight] = useState(68);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ANCHOR_SIZE = 44;
  const BASE_ANCHOR_BOTTOM = 24;
  const dynamicAnchorBottom = BASE_ANCHOR_BOTTOM + keyboardHeight;

  const hasText = inputText.trim().length > 0;

  useEffect(() => {
    if (!inputContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setInputBarHeight(entry.target.clientHeight);
      }
    });
    observer.observe(inputContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: 'me',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [newMessage, ...prev]);
    setInputText('');
    setIsMultiLine(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputText]);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    const el = e.target;
    el.style.height = 'auto';
    const nextHeight = el.scrollHeight;
    el.style.height = `${Math.min(nextHeight, 140)}px`;
    setIsMultiLine(nextHeight > 34);
  };

  const handleAnchorClick = useCallback(() => {
    if (!inputText.trim()) {
      textareaRef.current?.focus();
    } else {
      handleSendMessage();
    }
  }, [inputText, handleSendMessage]);

  const handleOpenAttachments = () => {
    openSheet({
      contract: ChatAttachmentContract,
      options: {
        sourceId: 'chat-clip-btn',
        detents: ['medium']
      }
    });
  };

  return (
    <div className="relative min-h-full w-full bg-neutral-950 text-white flex flex-col select-none">
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={inputContainerRef}
          className="absolute top-0 inset-x-0 z-30 px-4 pt-3 pb-2 pointer-events-none transition-all duration-300"
        >
          <div className="w-full flex items-end gap-2.5 pointer-events-auto">
            <div 
              className="flex-1 min-w-0 bg-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl px-4 py-3 transition-all duration-300 focus-within:border-amber-500/50 flex items-center min-h-[44px]"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={handleTextareaInput}
                placeholder="Сообщение мастеру..."
                className="w-full bg-transparent border-none outline-none resize-none text-[14px] leading-[20px] text-white placeholder-neutral-500 max-h-[140px] scrollbar-none font-normal block"
              />
            </div>

            <div 
              className={`shrink-0 overflow-hidden transition-all duration-300 ease-out flex items-center justify-center ${
                isMultiLine 
                  ? 'w-0 opacity-0 pointer-events-none scale-75 -mr-2.5' 
                  : 'w-[44px] opacity-100 scale-100'
              }`}
            >
              <motion.button
                layoutId="chat-clip-btn"
                type="button"
                onClick={handleOpenAttachments}
                aria-label="Прикрепить файл"
                className="w-[44px] h-[44px] rounded-full bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
              >
                <Paperclip size={20} strokeWidth={2.2} className="rotate-45" />
              </motion.button>
            </div>
          </div>
        </div>

        <MorphDestination
          contract={ChatMorphContract}
          anchorConfig={{ 
            width: ANCHOR_SIZE, 
            height: ANCHOR_SIZE, 
            right: 16, 
            bottom: dynamicAnchorBottom 
          }}
          renderAnchor={() => (
            <ChatAnchorButton 
              hasText={hasText} 
              onClick={handleAnchorClick} 
            />
          )}
          renderItem={(msg: ChatMessage) => {
            const isBarber = msg.sender === 'barber';
            const baseRadius = `calc((var(--morph-initial-h) * 0.5) * (1 - var(--morph-progress)) + 20px * var(--morph-progress))`;
            const sharpRadius = `calc((var(--morph-initial-h) * 0.5) * (1 - var(--morph-progress)) + 4px * var(--morph-progress))`;

            return (
              <div className="w-full relative">
                <div className="w-full opacity-0 pointer-events-none select-none" aria-hidden="true">
                  <div className={`w-full flex ${isBarber ? 'flex-row' : 'flex-row-reverse'} items-end gap-2.5`}>
                    {isBarber && <div className="w-[44px] h-[44px] shrink-0 rounded-full" />}
                    <div className="flex-1 px-4 pt-3 pb-7">
                      <p className="text-[13.5px] leading-[20px] whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute inset-x-0 top-0 w-full flex ${
                    isBarber ? 'flex-row' : 'flex-row-reverse'
                  } items-end gap-2.5 overflow-hidden`}
                  style={{ height: 'var(--morph-current-h, 44px)' }}
                >
                  {isBarber && (
                    <div className="w-[44px] h-[44px] shrink-0 rounded-full overflow-hidden bg-neutral-900 border border-white/10 shadow-md flex items-center justify-center select-none">
                      <img 
                        src="https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=150&q=80" 
                        alt="Barber" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}

                  <div
                    className={`flex-1 h-full min-w-0 relative shadow-lg overflow-hidden transition-colors ${
                      isBarber 
                        ? 'bg-neutral-800 border border-white/10 text-white' 
                        : 'bg-amber-500 text-neutral-950 font-medium'
                    }`}
                    style={{
                      borderTopLeftRadius: baseRadius,
                      borderTopRightRadius: baseRadius,
                      borderBottomLeftRadius: isBarber ? sharpRadius : baseRadius,
                      borderBottomRightRadius: !isBarber ? sharpRadius : baseRadius,
                    }}
                  >
                    <div 
                      className="w-full h-full px-4 overflow-hidden"
                      style={{
                        paddingTop: '12px',
                        paddingBottom: 'calc(12px + 14px * var(--morph-progress))',
                      }}
                    >
                      <p className={`text-[13.5px] leading-[20px] whitespace-pre-wrap ${
                        isBarber ? 'text-neutral-200' : 'text-neutral-950 font-medium'
                      }`}>
                        {msg.text}
                      </p>
                    </div>

                    <div
                      className="absolute bottom-1.5 right-3.5 pointer-events-none overflow-hidden"
                      style={{
                        opacity: 'clamp(0, calc((var(--morph-progress) - 0.3) * 2), 1)',
                        transform: 'translateY(calc(4px * (1 - var(--morph-progress))))',
                      }}
                    >
                      <span className={`text-[9.5px] font-semibold tracking-tight ${
                        isBarber ? 'text-neutral-400' : 'text-neutral-900/70'
                      }`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        />

        <div className="absolute inset-0 z-10">
          <MorphHost 
            activeContractType={ChatMorphContract.type} 
            items={messages} 
            paddingTop={inputBarHeight + 12} 
            paddingBottom={0}
            paddingHorizontal={16}
            estimatedItemHeight={72}
          />
        </div>
      </div>

      <SheetDestination 
        contract={ChatAttachmentContract} 
        destination={() => (
          <div 
            className="pt-6 px-6 text-white h-full flex flex-col bg-neutral-900" 
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Вложения к сообщению</h3>
              <button onClick={() => closeSheet()} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => closeSheet()}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-neutral-800/60 border border-white/5 text-neutral-200 active:scale-98 transition-all font-medium"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-400">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Фотография причёски</div>
                  <div className="text-xs text-neutral-400">Показать мастеру желаемый результат</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => closeSheet()}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-neutral-800/60 border border-white/5 text-neutral-200 active:scale-98 transition-all font-medium"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-400">
                  <Mic size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Голосовое сообщение</div>
                  <div className="text-xs text-neutral-400">Записать аудио до 1 минуты</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => closeSheet()}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-neutral-800/60 border border-white/5 text-neutral-200 active:scale-98 transition-all font-medium"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
                  <Paperclip size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Файл или контакт</div>
                  <div className="text-xs text-neutral-400">Отправить документ</div>
                </div>
              </button>
            </div>
          </div>
        )} 
      />

      <SheetDestination 
        contract={ChatActionsContract} 
        destination={() => (
          <div 
            className="pt-6 px-6 text-white h-full flex flex-col bg-neutral-900" 
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <h3 className="text-xl font-bold mb-6">Связь с мастером</h3>
            <div className="space-y-3">
              <button 
                type="button"
                className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <Phone size={20}/> Позвонить +7 (999) 123-45-67
              </button>
              <button 
                type="button"
                className="w-full p-4 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <MessageCircle size={20}/> Написать в Telegram
              </button>
            </div>
          </div>
        )} 
      />
    </div>
  );
};

// ==========================================
// 6. ХАБ 4: ПРАВИЛА
// ==========================================

const RulesHub: React.FC = () => {
  useCapsuleSheet({
    icon: Navigation,
    contract: MapLocationContract,
    options: { detents: ['large'] }
  });

  return (
    <div className="min-h-full w-full bg-neutral-950 text-white p-4 pt-3 pb-32">
      <div className="space-y-4">
        <div className="bg-neutral-900 border border-white/5 p-5 rounded-3xl relative overflow-hidden">
          <AlertTriangle className="absolute -right-4 -top-4 w-24 h-24 text-white/5" />
          <h3 className="font-bold text-lg mb-2 text-amber-500">Опоздания</h3>
          <p className="text-sm text-neutral-400 leading-relaxed">Пожалуйста, приходите за 5 минут до назначенного времени.</p>
        </div>
      </div>
      <SheetDestination contract={MapLocationContract} destination={() => (
        <div className="h-full w-full bg-neutral-950 text-white flex flex-col relative">
          <div className="p-6"><h3 className="text-2xl font-black mb-2">BarberSpace</h3></div>
        </div>
      )} />
    </div>
  );
};

// ==========================================
// 7. ХАБ 5: ПРОФИЛЬ КЛИЕНТА (МНОГОУРОВНЕВЫЙ СТЕК)
// ==========================================

const ProfileHub: React.FC = () => {
  const nav = useNavigation();

  useCapsuleSheet({
    icon: Settings,
    contract: ProfileSettingsContract,
    options: { detents: ['medium'] }
  });

  return (
    <div className="min-h-full w-full bg-neutral-950 text-white p-4 pt-3 pb-32">
      <div className="bg-neutral-900 border border-white/5 p-5 rounded-3xl mb-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-full flex items-center justify-center text-2xl font-black text-neutral-950 shadow-lg shadow-amber-500/20">
          М
        </div>
        <div>
          <h3 className="font-bold text-lg">Максим</h3>
          <p className="text-sm text-neutral-400">+7 (999) 000-11-22</p>
          <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold">
            Постоянный клиент
          </div>
        </div>
      </div>

      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 px-1">Активность</p>
      <div className="bg-neutral-900 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 mb-6">
        <div 
          onClick={() => nav.push({ contract: VisitHistoryContract, options: { title: 'История визитов' } })}
          className="flex items-center justify-between p-4 cursor-pointer active:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <History size={18} />
            </div>
            <div>
              <div className="font-medium text-sm">История визитов</div>
              <div className="text-xs text-neutral-400">3 завершённых визита</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-neutral-500" />
        </div>

        <div className="flex items-center justify-between p-4 cursor-pointer active:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="font-medium text-sm">Бонусный баланс</div>
              <div className="text-xs text-neutral-400">450 баллов доступно</div>
            </div>
          </div>
          <span className="text-amber-500 font-bold text-sm">450 ₽</span>
        </div>
      </div>

      <SheetDestination contract={ProfileSettingsContract} destination={() => (
        <div className="pt-6 px-6 text-white h-full flex flex-col bg-neutral-900">
          <h3 className="text-xl font-bold mb-6">Настройки аккаунта</h3>
          <p className="text-sm text-neutral-400">Управление личными данными и сессиями.</p>
        </div>
      )} />

      {/* Стек-экран Уровня 1: Список визитов */}
      <NavigationDestination contract={VisitHistoryContract} destination={() => (
        <div className="min-h-full w-full bg-neutral-950 text-white p-4 pt-3 pb-32">
          <div className="space-y-3">
            {PAST_VISITS.map(visit => (
              <div
                key={visit.id}
                onClick={() => nav.push({ contract: VisitDetailContract, data: visit, options: { title: 'Чек' } })}
                className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-between cursor-pointer active:scale-98 transition-all hover:border-amber-500/20"
              >
                <div>
                  <h4 className="font-bold text-sm">{visit.service}</h4>
                  <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                    <Calendar size={12} /> {visit.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">{visit.price} ₽</span>
                  <ChevronRight size={16} className="text-neutral-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )} />

      {/* Стек-экран Уровня 2: Детали чека */}
      <NavigationDestination contract={VisitDetailContract} destination={(visit) => (
        <div className="min-h-full w-full bg-neutral-950 text-white p-6 pt-6 pb-32 flex flex-col">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <FileText size={28} />
          </div>

          <p className="text-center text-xs text-neutral-400 mb-6">{visit?.id}</p>

          <div className="bg-neutral-900 p-5 rounded-3xl border border-white/5 space-y-4 mb-8">
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
              <span className="text-neutral-400">Услуга</span>
              <span className="font-bold">{visit?.service}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
              <span className="text-neutral-400">Дата и время</span>
              <span className="font-bold">{visit?.date}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
              <span className="text-neutral-400">Мастер</span>
              <span className="font-bold text-amber-500">Alex Barber</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">Оплачено</span>
              <span className="font-black text-lg text-emerald-400">{visit?.price} ₽</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => nav.pop()}
            className="w-full py-4 rounded-2xl bg-neutral-800 border border-white/10 text-white font-bold active:scale-98 transition-all mt-auto"
          >
            Назад к истории
          </button>
        </div>
      )} />
    </div>
  );
};

// ==========================================
// 8. СБОРКА ПРИЛОЖЕНИЯ С ТАЙТЛАМИ ХАБОВ
// ==========================================

const SCREENS: ScrollScreen[] = [
  { 
    id: 'booking', 
    title: 'Запись', 
    icon: <Calendar size={18} />, 
    content: <BookingHub /> 
  },
  { 
    id: 'gallery', 
    title: 'Работы', 
    icon: <ImageIcon size={18} />, 
    content: <GalleryHub /> 
  },
  { 
    id: 'chat',    
    title: 'Чат с мастером', 
    icon: <MessageCircle size={18} />, 
    content: <ChatHub /> 
  },
  { 
    id: 'rules',   
    title: 'Правила визита', 
    icon: <Info size={18} />, 
    content: <RulesHub /> 
  },
  { 
    id: 'profile', 
    title: 'Профиль', 
    icon: <User size={18} />, 
    content: <ProfileHub /> 
  },
];

export default function BarberApp() {
  return (
    <main className="fixed inset-0 bg-neutral-950 overflow-hidden font-sans antialiased selection:bg-amber-500/30">
      <HybridScrollView
        screens={SCREENS}
        initialHubId="booking"
        notifications={MOCK_NOTIFICATIONS}
        renderNotificationCard={(notif) => (
          <div 
            className="h-full bg-neutral-900 text-white shadow-2xl flex flex-col justify-center p-5"
            style={{ opacity: 'var(--morph-progress, 1)' }}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-amber-500">{notif.title}</h4>
              <span className="text-xs text-neutral-400 whitespace-nowrap ml-2">{notif.time}</span>
            </div>
            <p className="text-neutral-300 text-sm leading-relaxed">{notif.message}</p>
          </div>
        )}
      />
    </main>
  );
}