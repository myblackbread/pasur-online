import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoSection } from '@/shared/ui/lists/InfoSection';
import { ActionRow } from '@/shared/ui/lists/ActionRow';
import { CapsuleModal } from '@/shared/ui/overlays/CapsuleModal';
import { MorphingCapsule, sharedSpringTransition } from '@/shared/ui/animations/MorphingCapsule';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export default function AboutWidget() {
    const { t, i18n } = useTranslation();
    const [isRulesOpen, setIsRulesOpen] = React.useState(false);
    const [rulesMode, setRulesMode] = React.useState<'classic' | 'local'>('classic');
    const [portalNode, setPortalNode] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
        setPortalNode(document.getElementById('overlay-root'));
    }, []);

    React.useEffect(() => {
        if (!isRulesOpen) {
            setTimeout(() => setRulesMode('classic'), 300);
        }
    }, [isRulesOpen]);

    const isRu = i18n.language === 'ru';

    return (
        <div className="flex flex-col w-full">
            <h1 className="text-2xl sm:text-3xl font-black mb-6">{t('about_title')}</h1>

            <InfoSection
                items={[{
                    id: '1',
                    interactive: true,
                    variant: 'default',
                    content: (
                        <MorphingCapsule
                            isCapsule={false}
                            layoutId="rules-modal"
                            transition={sharedSpringTransition}
                            className="w-full"
                        >
                            <ActionRow
                                icon="📜" iconBg="bg-blue-500"
                                title={t('profile_rules')}
                                onClick={() => setIsRulesOpen(true)}
                            />
                        </MorphingCapsule>
                    )
                }]}
            />

            <InfoSection
                title={t('about_authors')}
                items={[{
                    id: '1',
                    interactive: true,
                    variant: 'default',
                    content: (<>
                        <ActionRow
                            icon="👨‍💻" iconBg="bg-theme-main text-xl shadow-inner border border-theme-border/30"
                            title="Ту ту туууу"
                            subtitle={t('about_developer')}
                            showArrow={false}
                        />
                        <div className="p-4 text-sm font-medium text-theme-text opacity-70 leading-relaxed">
                            {t('about_credits_text')}
                        </div>
                    </>)
                }]}
            />

            <div className="flex flex-col items-center justify-center opacity-50 mt-8">
                <div className="text-4xl mb-2 grayscale">♠️♥️</div>
                <div className="font-black tracking-widest uppercase text-sm">Pasur Card Game</div>
                <div className="font-mono text-xs mt-1">v1.0.0</div>
            </div>

            {/* Модальное окно с правилами остается без изменений... */}
            {portalNode && (
                <CapsuleModal
                    isOpen={isRulesOpen}
                    onClose={() => setIsRulesOpen(false)}
                    layoutId="rules-modal"
                    portalNode={portalNode}
                    headerLeft={
                        <div className="flex items-center gap-4">
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                onClick={() => setIsRulesOpen(false)}
                                className="w-14 h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:opacity-90 rounded-full cursor-pointer"
                            >
                                <Check className="w-6 h-6 text-white" />
                            </motion.button>
                            <h2 className="text-xl sm:text-2xl font-black text-theme-text">{t('profile_rules')}</h2>
                        </div>
                    }
                >
                    {/* ... Контент правил ... */}
                    <div className="flex flex-col px-4 pb-8 text-theme-text mt-4">

                        <div className="flex bg-theme-main p-1 rounded-2xl border border-theme-border/50 shadow-inner mb-6 shrink-0">
                            <button
                                onClick={() => setRulesMode('classic')}
                                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all ${rulesMode === 'classic' ? 'bg-theme-primary text-white shadow-md' : 'text-theme-text opacity-60 hover:opacity-100'}`}
                            >
                                🏛️ {t('rule_classic')}
                            </button>
                            <button
                                onClick={() => setRulesMode('local')}
                                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all ${rulesMode === 'local' ? 'bg-theme-primary text-white shadow-md' : 'text-theme-text opacity-60 hover:opacity-100'}`}
                            >
                                🏡 {t('rule_local')}
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={rulesMode}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col gap-6"
                            >
                                <section>
                                    <h3 className="text-lg sm:text-xl font-black mb-3 text-theme-primary flex items-center gap-2">🎯 {isRu ? 'Цель игры' : 'Objective'}</h3>
                                    <div className="bg-theme-main p-4 sm:p-5 rounded-2xl shadow-inner font-medium opacity-90 leading-relaxed text-sm sm:text-base border border-theme-border/30">
                                        {rulesMode === 'classic' ? (
                                            isRu
                                                ? 'Собрать как можно больше ценных карт. Игра идет несколько раундов, пока одна из команд не наберет 11 очков. Подсчет очков происходит в конце каждого раунда.'
                                                : 'Collect as many valuable cards as possible. The game spans multiple rounds until a team reaches 11 points. Scores are calculated at the end of each round.'
                                        ) : (
                                            isRu
                                                ? 'Динамичный режим, в котором игра также идет до 11 очков, но подсчет баллов ведется «на лету» прямо во время раунда по мере взятия карт.'
                                                : 'A dynamic mode where the game is also played to 11 points, but scores are calculated "on the fly" during the round as cards are captured.'
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-lg sm:text-xl font-black mb-3 text-theme-primary flex items-center gap-2">🃏 {isRu ? 'Как забирать карты' : 'Capturing Cards'}</h3>
                                    <div className="bg-theme-main p-4 sm:p-5 rounded-2xl shadow-inner font-medium opacity-90 text-sm sm:text-base border border-theme-border/30 space-y-3">
                                        <p><strong>{isRu ? 'Числа (1-10):' : 'Numbers (1-10):'}</strong> {isRu ? 'Сумма вашей карты и одной или нескольких карт на столе должна быть равна 11.' : 'The sum of your card and one or more cards on the table must equal 11.'}</p>
                                        <p><strong>{isRu ? 'Короли (K) и Дамы (Q):' : 'Kings (K) & Queens (Q):'}</strong> {isRu ? 'Берут только одну такую же карту со стола.' : 'Capture exactly one matching card from the table.'}</p>
                                        <p><strong>{isRu ? 'Валет (J):' : 'Jacks (J):'}</strong> {isRu ? 'Забирает ВСЕ числовые карты и других Валетов со стола. Короли и Дамы остаются.' : 'Captures ALL number cards and Jacks from the table. Kings and Queens remain.'}</p>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-lg sm:text-xl font-black mb-3 text-theme-primary flex items-center gap-2">⭐ {isRu ? 'Сур (Sur)' : 'Sur'}</h3>
                                    <div className="bg-theme-main p-4 sm:p-5 rounded-2xl shadow-inner font-medium opacity-90 leading-relaxed text-sm sm:text-base border border-theme-border/30">
                                        {rulesMode === 'classic' ? (
                                            isRu
                                                ? 'Если вы очистили весь стол, вы получаете "Сур" (+5 очков). Валет не может сделать Сур. В классическом режиме Суры противников отменяют друг друга (взаимоуничтожаются).'
                                                : 'If you clear the entire table, you score a "Sur" (+5 points). Jacks cannot score a Sur. In classic mode, opponent Surs cancel each other out.'
                                        ) : (
                                            isRu
                                                ? 'В локальном режиме правило Сура полностью отключено. Очистка стола не приносит дополнительных очков.'
                                                : 'In local mode, the Sur rule is completely disabled. Clearing the table does not grant extra points.'
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-lg sm:text-xl font-black mb-3 text-theme-primary flex items-center gap-2">⚙️ {isRu ? 'Спец. настройки' : 'Special Rules'}</h3>
                                    <div className="bg-theme-main p-4 sm:p-5 rounded-2xl shadow-inner font-medium opacity-90 text-sm sm:text-base border border-theme-border/30 space-y-3">
                                        <p><strong className="text-red-500">⚖️ {isRu ? 'Строгий режим:' : 'Strict Mode:'}</strong> {isRu ? 'Обязывает вас забрать карты со стола, если у вас есть подходящая комбинация (сбросить карту просто так нельзя).' : 'Forces you to capture cards from the table if a valid combination exists (you cannot just discard).'}</p>
                                        {rulesMode === 'local' && (
                                            <p><strong className="text-amber-500">⚡ {isRu ? 'Досрочная победа:' : 'Sudden Death:'}</strong> {isRu ? 'Игра моментально заканчивается прямо посреди раунда, как только кто-то набирает 11 очков.' : 'The game ends instantly mid-round as soon as someone reaches 11 points.'}</p>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-lg sm:text-xl font-black mb-3 text-theme-primary flex items-center gap-2">🏆 {isRu ? 'Подсчет очков' : 'Scoring'}</h3>
                                    <div className="bg-theme-main p-4 sm:p-5 rounded-2xl shadow-inner font-bold opacity-90 text-sm sm:text-base border border-theme-border/30">
                                        <ul className="space-y-3">
                                            <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="text-red-500 text-lg">♦</span> {isRu ? '10 Буби' : '10 of Diamonds'}</span> <span>3 {isRu ? 'очка' : 'pts'}</span></li>
                                            <li className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="text-slate-500 text-lg">♣</span> {isRu ? '2 Трефы' : '2 of Clubs'}</span> <span>2 {isRu ? 'очка' : 'pts'}</span></li>

                                            {rulesMode === 'classic' && (
                                                <>
                                                    <li className="flex justify-between items-center"><span>A {isRu ? '(Тузы)' : '(Aces)'}</span> <span>1 {isRu ? 'очко' : 'pt'}</span></li>
                                                    <li className="flex justify-between items-center"><span>J {isRu ? '(Валеты)' : '(Jacks)'}</span> <span>1 {isRu ? 'очко' : 'pt'}</span></li>
                                                    <li className="flex justify-between items-center text-amber-500"><span className="flex items-center gap-2">⭐ {isRu ? 'Каждый Сур' : 'Each Sur'}</span> <span>5 {isRu ? 'очков' : 'pts'}</span></li>
                                                </>
                                            )}

                                            <div className="w-full h-px bg-theme-border/50 my-2"></div>

                                            {rulesMode === 'classic' ? (
                                                <li className="flex justify-between items-center text-blue-500"><span className="flex items-center gap-2"><span className="text-slate-500 text-lg">♣</span> {isRu ? 'Больше Треф' : 'Most Clubs'}</span> <span>7 {isRu ? 'очков' : 'pts'}</span></li>
                                            ) : (
                                                <>
                                                    <li className="flex justify-between items-center text-blue-500"><span className="flex items-center gap-2"><span className="text-slate-500 text-lg">♣</span> {isRu ? 'Больше Треф (7+)' : 'Most Clubs (7+)'}</span> <span>1 {isRu ? 'очко' : 'pt'}</span></li>
                                                    <li className="flex justify-between items-center"><span className="flex items-center gap-2">🃏 {isRu ? 'Больше карт (27+)' : 'Most Cards (27+)'}</span> <span>2 {isRu ? 'очка' : 'pts'}</span></li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                </section>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </CapsuleModal>
            )}
        </div>
    );
}