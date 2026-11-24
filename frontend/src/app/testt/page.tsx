'use client';

import { PlayerCardsSwiper } from "./random/random1";
import { CapsuleActionItem, VerticalCapsule } from "./random/random2";

export default PlayerCardsSwiper;

// import { 
//   ArrowLeft, 
//   MoreHorizontal, 
//   Bell, 
//   Search,
// } from 'lucide-react';

// export default function TestCapsulePage() {
//   const actions: CapsuleActionItem[] = [
//     {
//       id: 'back',
//       icon: ArrowLeft,
//       label: 'Назад',
//       onClick: () => console.log('Action: Back'),
//     },
//     {
//       id: 'more',
//       icon: MoreHorizontal,
//       label: 'Дополнительно',
//       onClick: () => console.log('Action: More'),
//     },
//     {
//       id: 'notifications',
//       icon: Bell,
//       label: 'Уведомления',
//       onClick: () => console.log('Action: Notifications'),
//     },
//     {
//       id: 'search',
//       icon: Search,
//       label: 'Поиск',
//       onClick: () => console.log('Action: Search'),
//     },
//   ];

//   return (
//     <main className="fixed inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 pointer-events-none">
//       <VerticalCapsule items={actions} />
//     </main>
//   );
// }

// import React, { useState } from 'react';
// import { 
//   Home, 
//   Compass, 
//   MessageSquare, 
//   Settings, 
//   TrendingUp, 
//   Flame, 
//   Sparkles,
//   ChevronDown
// } from 'lucide-react';
// import { HybridScrollView, type ScrollScreen } from '@/widgets/hybrid-scrollbar';

// export default function HybridScrollDemo() {
//   const [toastMessage, setToastMessage] = useState<string | null>(null);

//   const showToast = (text: string) => {
//     setToastMessage(text);
//     setTimeout(() => setToastMessage(null), 1500);
//   };

//   const screens: ScrollScreen[] = [
//     {
//       id: 'dashboard',
//       icon: <Home size={20} strokeWidth={2.4} />,
//       bgClass: 'bg-gradient-to-b from-neutral-950 via-neutral-900 to-black',
//       content: (
//         <div className="p-6 pt-12 pb-24 text-neutral-100 flex flex-col gap-6">
//           <div className="flex items-center justify-between">
//             <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Экран 1 / 4</span>
//             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs">
//               <Sparkles size={13} className="text-amber-400" />
//               <span>Главная</span>
//             </div>
//           </div>

//           <div>
//             <h1 className="text-3xl font-extrabold tracking-tight">Дашборд</h1>
//             <p className="text-neutral-400 text-sm mt-1">
//               Тяни скроллбар справа: сначала это тонкая полоска, а при захвате пальцем она превратится в тактильную пилюлю-таббар.
//             </p>
//           </div>

//           <div className="grid grid-cols-2 gap-3">
//             <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between h-28">
//               <Flame size={20} className="text-rose-400" />
//               <div>
//                 <div className="text-2xl font-bold">1 420</div>
//                 <div className="text-xs text-neutral-400">Активность</div>
//               </div>
//             </div>
//             <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between h-28">
//               <TrendingUp size={20} className="text-emerald-400" />
//               <div>
//                 <div className="text-2xl font-bold">+18.4%</div>
//                 <div className="text-xs text-neutral-400">Конверсия</div>
//               </div>
//             </div>
//           </div>

//           <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-sm flex items-center justify-between">
//             <span>Листай вниз колесом или свайпом</span>
//             <ChevronDown size={18} className="animate-bounce" />
//           </div>
//         </div>
//       ),
//     },

//     {
//       id: 'feed',
//       icon: <Compass size={20} strokeWidth={2.4} />,
//       bgClass: 'bg-neutral-950',
//       content: (
//         <div className="p-6 pt-12 pb-24 text-neutral-100">
//           <div className="mb-4">
//             <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold">Экран 2 / 4 (Длинный)</span>
//             <h2 className="text-2xl font-bold mt-1">Лента с глубоким скроллом</h2>
//             <p className="text-neutral-400 text-xs mt-1">
//               Здесь контент превышает высоту экрана. Проверь, как скроллбар рассчитывает виртуальную высоту контента (`V_total`).
//             </p>
//           </div>

//           <div className="flex flex-col gap-3">
//             {Array.from({ length: 18 }).map((_, i) => (
//               <div 
//                 key={i} 
//                 className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors"
//               >
//                 <div className="flex justify-between items-center text-xs text-neutral-400 mb-1">
//                   <span>Пост #{i + 1}</span>
//                   <span>10:42</span>
//                 </div>
//                 <p className="text-sm text-neutral-200">
//                   Тестовый элемент ленты. Внутренний скроллер изолирован, но его движение автоматически будит правый индикатор.
//                 </p>
//               </div>
//             ))}
//           </div>
//         </div>
//       ),
//     },

//     {
//       id: 'chat',
//       icon: <MessageSquare size={20} strokeWidth={2.4} />,
//       bgClass: 'bg-gradient-to-b from-neutral-950 via-zinc-900 to-neutral-950',
//       content: (
//         <div className="p-6 pt-12 pb-24 text-neutral-100 flex flex-col gap-4">
//           <span className="text-xs uppercase tracking-widest text-violet-400 font-bold">Экран 3 / 4</span>
//           <h2 className="text-2xl font-bold">Сообщения</h2>
          
//           <div className="flex flex-col gap-2.5">
//             {[
//               { name: 'Гариб', text: 'Архитектура скролла готова к проверке', unread: true },
//               { name: 'PWA Team', text: 'Кэш DOM-нод даёт стабильные 60 FPS', unread: false },
//               { name: 'Система', text: 'Тактильная отдача (Haptics) активна', unread: false },
//             ].map((msg, i) => (
//               <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
//                 <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-300 font-bold flex items-center justify-center text-sm">
//                   {msg.name[0]}
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <div className="flex items-center justify-between">
//                     <span className="text-sm font-semibold truncate">{msg.name}</span>
//                     {msg.unread && <span className="w-2 h-2 rounded-full bg-violet-400" />}
//                   </div>
//                   <p className="text-xs text-neutral-400 truncate">{msg.text}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       ),
//     },

//     {
//       id: 'settings',
//       icon: <Settings size={20} strokeWidth={2.4} />,
//       bgClass: 'bg-black',
//       content: (
//         <div className="p-6 pt-12 pb-24 text-neutral-100 flex flex-col gap-5">
//           <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Экран 4 / 4 (Финал)</span>
//           <h2 className="text-2xl font-bold">Параметры & Тест границы</h2>
//           <p className="text-xs text-neutral-400">
//             Захвати скроллбар и потяни его ниже последнего экрана: сработает rubber-band (сопротивление) и вызовется коллбэк границы.
//           </p>

//           <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
//             Коллбэк <code>onSwipeBlocked</code> подключен и покажет плашку снизу.
//           </div>

//           <div className="flex flex-col gap-2">
//             {['Вибрация ползунка', 'Жесткий Snap', 'Плавное масштабирование'].map((label, idx) => (
//               <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm">
//                 <span>{label}</span>
//                 <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Включено</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       ),
//     },
//   ];

//   return (
//     <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
//       {/* Сам компонент */}
//       <HybridScrollView
//         screens={screens}
//         onSwipeBlocked={() => showToast('Достигнута крайняя граница списка!')}
//       />

//       {/* Всплывающее уведомление для теста границы onSwipeBlocked */}
//       {toastMessage && (
//         <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white text-xs font-medium tracking-wide shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
//           {toastMessage}
//         </div>
//       )}
//     </div>
//   );
// }
