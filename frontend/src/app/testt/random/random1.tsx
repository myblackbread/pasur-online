import { motion, useMotionValue, animate, useTransform, useMotionTemplate } from "framer-motion";

const MOCK_PLAYERS = [
  { id: 0, name: "Aragorn", avatar: "🧝‍♂️", cards: ["Меч", "Кольцо", "Плащ"] },
  { id: 1, name: "Gimli", avatar: "🧔‍♂️", cards: ["Топор", "Шлем", "Пиво", "Щит", "Руна", "Монета"] },
  { id: 2, name: "Legolas", avatar: "🧝", cards: ["Лук", "Стрелы", "Кинжал", "Сапоги"] },
  { id: 3, name: "Frodo", avatar: "🧑‍🦱", cards: ["Жало"] },
];

interface SwiperProps {
  numCards?: number;
}

export function PlayerCardsSwiper({ numCards = 4 }: SwiperProps) {
  const n = Math.max(1, Math.min(MOCK_PLAYERS.length, numCards));
  const activePlayers = MOCK_PLAYERS.slice(0, n);
  const progress = useMotionValue(0);

  const w = 250;
  const v = 85;

  const handlePan = (e: any, info: any) => {
    const delta = -info.delta.x / w; 
    const next = Math.max(0, Math.min(n - 1, progress.get() + delta));
    progress.set(next);
  };

  const handlePanEnd = (e: any, info: any) => {
    const current = progress.get();
    const velocity = -info.velocity.x;
    let target = Math.round(current);

    if (velocity > 300) target = Math.ceil(current);
    if (velocity < -300) target = Math.floor(current);
    target = Math.max(0, Math.min(n - 1, target));

    animate(progress, target, { type: "spring", stiffness: 300, damping: 30 });
  };

  return (
    <motion.div
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      style={{
        position: "relative",
        width: "100%",
        height: "350px",
        overflow: "hidden", 
        touchAction: "pan-y",
        backgroundColor: "#0d0d12",
        borderRadius: "24px",
      }}
    >
      {activePlayers.map((player, index) => (
        <PlayerRow
          key={player.id}
          index={index}
          total={n}
          player={player}
          progress={progress}
          w={w}
          v={v}
        />
      ))}
    </motion.div>
  );
}

function PlayerRow({ index, total, player, progress, w, v }: any) {
  // --- РАСЧЕТ Z-INDEX И ГРАНИЦ (Остается без изменений) ---
  const zInputs: number[] = [];
  const zOutputs: number[] = [];
  for (let step = 0; step < total; step++) {
    zInputs.push(step);
    zOutputs.push(total - Math.abs(step - index));
    if (step < total - 1) {
      zInputs.push(step + 0.499);
      zOutputs.push(total - Math.abs(step - index));
      zInputs.push(step + 0.501);
      zOutputs.push(total - Math.abs(step + 1 - index));
    }
  }
  const zIndex = useTransform(progress, zInputs, zOutputs);

  const inputs: number[] = [];
  const leftPctOutputs: number[] = [];
  const leftPxOutputs: number[] = [];
  const rightPctOutputs: number[] = [];
  const rightPxOutputs: number[] = [];
  const emojiOffsetOutputs: number[] = [];

  for (let step = 0; step <= total - 1; step += 0.5) {
    inputs.push(step);
    if (step === index) {
      leftPctOutputs.push(0); leftPxOutputs.push(index * v);
      rightPctOutputs.push(0); rightPxOutputs.push((total - 1 - index) * v);
      emojiOffsetOutputs.push(0); 
    } else if (step === index - 0.5) {
      leftPctOutputs.push(50); leftPxOutputs.push((-(total - 2 * index) * v) / 2);
      rightPctOutputs.push(0); rightPxOutputs.push((total - 1 - index) * v);
      emojiOffsetOutputs.push(0); 
    } else if (step === index + 0.5) {
      leftPctOutputs.push(0); leftPxOutputs.push(index * v);
      rightPctOutputs.push(50); rightPxOutputs.push(((total - 2 * index - 2) * v) / 2);
      emojiOffsetOutputs.push(0);
    } else if (step < index - 0.5) {
      leftPctOutputs.push(100); leftPxOutputs.push(-((total - 1 - index) * v + w));
      rightPctOutputs.push(0); rightPxOutputs.push((total - 1 - index) * v);
      emojiOffsetOutputs.push(2 * v); 
    } else if (step > index + 0.5) {
      leftPctOutputs.push(0); leftPxOutputs.push(index * v);
      rightPctOutputs.push(100); rightPxOutputs.push(-(index * v + w));
      emojiOffsetOutputs.push(0); 
    }
  }

  const leftPct = useTransform(progress, inputs, leftPctOutputs);
  const leftPx = useTransform(progress, inputs, leftPxOutputs);
  const left = useMotionTemplate`calc(${leftPct}% + ${leftPx}px)`;

  const rightPct = useTransform(progress, inputs, rightPctOutputs);
  const rightPx = useTransform(progress, inputs, rightPxOutputs);
  const right = useMotionTemplate`calc(${rightPct}% + ${rightPx}px)`;

  const emojiOffset = useTransform(progress, inputs, emojiOffsetOutputs);

  // --- НОВАЯ ЛОГИКА: Фактор раскрытия карт (от 0 до 1) ---
  // 1 = карточка игрока активна (карты разложены)
  // 0 = карточка игрока свернута (карты собраны в колоду под аватаркой)
  const spreadFactor = useTransform(
    progress,
    [index - 0.5, index, index + 0.5],
    [0, 1, 0]
  );

  return (
    <motion.div
      onClick={() => animate(progress, index, { type: "spring", stiffness: 300, damping: 30 })}
      style={{
        position: "absolute",
        top: 0, bottom: 0, left, right,
        zIndex, minWidth: w, cursor: "pointer",
      }}
    >
      {/* 1. КАРТОЧКА ПРОФИЛЯ ИГРОКА */}
      <div style={{ width: w, position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2, padding: "12px" }}>
        <div style={{ 
          width: "100%", height: "100%", 
          backgroundColor: "#1e1e28", 
          borderRadius: "16px", 
          overflow: "hidden", 
          position: "relative",
          boxShadow: "4px 0 25px rgba(0,0,0,0.8)", // Усилили тень для глубины
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <motion.div style={{ 
            x: emojiOffset, width: v, height: "100%", 
            display: "flex", flexDirection: "column", 
            alignItems: "center", justifyContent: "center", gap: "8px" 
          }}>
            <div style={{ fontSize: "40px", lineHeight: 1 }}>{player.avatar}</div>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>
              {player.name}
            </div>
            <div style={{ color: "#888", fontSize: "11px" }}>
              Карт: {player.cards.length}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. КОНТЕЙНЕР С КАРТАМИ (Теперь с абсолютным позиционированием элементов) */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 1 }}>
        {player.cards.map((cardName: string, i: number) => {
          // Позиция карты когда она разложена (ширина аватарки + отступ + индекс * ширина карты)
          const expandedX = w + 16 + i * 136;
          // Позиция карты когда она спрятана (под аватаркой, с легким сдвигом для эффекта колоды)
          const collapsedX = 20 + i * 3;

          // Динамические значения на основе spreadFactor
          const x = useTransform(spreadFactor, [0, 1], [collapsedX, expandedX]);
          // Легкий наклон карт, когда они собраны в колоду (создает эффект небрежно брошенной стопки)
          const rotate = useTransform(spreadFactor, [0, 1], [(i % 2 === 0 ? -4 : 4) + i, 0]);
          // Небольшой сдвиг по вертикали в колоде
          const y = useTransform(spreadFactor, [0, 1], [i * -2, 0]);

          return (
            <motion.div 
              key={i} 
              style={{
                position: "absolute",
                left: 0,
                top: "calc(50% - 90px)", // Центрирование по вертикали (высота карты 180 / 2)
                width: "120px",
                height: "180px",
                x,
                y,
                rotate,
                zIndex: player.cards.length - i, // Первая карта сверху
                backgroundColor: "#2a2a35",
                borderRadius: "12px",
                border: "2px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 600,
                boxShadow: "0 4px 10px rgba(0,0,0,0.5)"
              }}
            >
              {cardName}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}