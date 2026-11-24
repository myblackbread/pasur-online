//
//  Untitled 6.swift
//  Pasur Online
//
//  Created by Garib Agaev on 18.07.2026.
//

import SwiftUI

enum MessagesRoute: HubRoute {
	case inbox
	case chat(userName: String)
	
	// Декларируем, где нужна лупа
	var hasSearch: Bool {
		switch self {
		case .inbox: return true  // На главном экране ищем сообщения
		case .chat: return true  // Внутри чата поиск скрываем
		}
	}
}

// MARK: - Контейнер модуля (Точка входа)
struct MessagesModuleView: View {
	// Индекс модуля в хабе (0 - Дашборд, 1 - Профиль, 2 - Сообщения)
	let moduleId: UUID
	
	// Создаем локальный роутер для этого модуля
	@State private var router = HubRouter<MessagesRoute>(rootRoute: .inbox)
	
	var body: some View {
		HubNavigationStack(
			router: router,
			moduleId: moduleId,
			rootContent: {
				InboxView(router: router)
			},
			destinationContent: { route in
				switch route {
				case .chat(let userName):
					ChatView(userName: userName, router: router)
				case .inbox:
					EmptyView()
				}
			}
		)
	}
}

// MARK: - Корневой экран (С поиском)
struct InboxView: View {
	var router: HubRouter<MessagesRoute>
	
	var body: some View {
		ZStack {
			Color.green.ignoresSafeArea()
			
			VStack(spacing: 20) {
				Image(systemName: "tray.fill")
					.font(.system(size: 60))
					.foregroundColor(.white.opacity(0.8))
				
				Text("Входящие")
					.font(.system(size: 40, weight: .bold, design: .rounded))
					.foregroundColor(.white)
				
				// Читаем текст прямо из активного контекста поиска
				if let searchText = router.activeSearchContext?.text, !searchText.isEmpty {
					Text("🔍 Ищем: \(searchText)")
						.font(.headline)
						.foregroundColor(.white)
						.padding()
						.background(.black.opacity(0.2))
						.clipShape(Capsule())
				}
				
				Button(action: {
					router.push(.chat(userName: "Алексей"))
				}) {
					Text("Открыть чат с Алексеем")
						.font(.headline)
						.foregroundColor(.green)
						.padding()
						.background(Color.white)
						.clipShape(RoundedRectangle(cornerRadius: 12))
				}
			}
		}
	}
}

// MARK: - Вложенный экран (Без поиска)
struct ChatView: View {
	let userName: String
	var router: HubRouter<MessagesRoute>
	
	var body: some View {
		ZStack {
			Color.teal.ignoresSafeArea()
			
			VStack(spacing: 20) {
				Text("Чат: \(userName)")
					.font(.system(size: 30, weight: .bold))
					.foregroundColor(.white)
				
				Text("Здесь поиска нет. Кнопка 'Назад' в баре должна появиться автоматически.")
					.multilineTextAlignment(.center)
					.foregroundColor(.white.opacity(0.9))
					.padding()
				
				Button(action: {
					router.pop()
				}) {
					Text("Вернуться назад (Программно)")
						.font(.headline)
						.foregroundColor(.teal)
						.padding()
						.background(Color.white)
						.clipShape(RoundedRectangle(cornerRadius: 12))
				}
			}
		}
	}
}

// MARK: - Главный экран для теста
struct HubDemoView: View {
	var body: some View {
		HubNavigationView {
			
			// Модуль 0
			HubModule(
				title: "Дашборд",
				iconName: "chart.pie.fill",
				placeholder: { Color.blue.opacity(0.7) },
				content: { DemoModuleView(color: .blue, title: "Дашборд", text: "Простой экран без роутера") }
			)
			
			// Модуль 1
			HubModule(
				title: "Профиль",
				iconName: "person.crop.circle.fill",
				placeholder: { Color.orange.opacity(0.7) },
				content: { DemoModuleView(color: .orange, title: "Профиль", text: "Простой экран без роутера") }
			)
			
			// Модуль 2 (С НАШЕЙ НАВИГАЦИЕЙ И ПОИСКОМ)
			HubModule(
				title: "Сообщения",
				iconName: "message.fill",
				placeholder: { Color.green.opacity(0.7) },
				content: {
					// Передаем индекс 2, чтобы бар знал, кого слушать
					MessagesModuleView(moduleId: UUID())
				}
			)
			
			// Модуль 3
			HubModule(
				title: "Настройки",
				iconName: "gearshape.fill",
				placeholder: { Color.gray.opacity(0.7) },
				content: { DemoModuleView(color: .gray, title: "Настройки", text: "Управление приложением") }
			)
			
			// Модуль 4
			HubModule(
				title: "Аналитика",
				iconName: "waveform.path.ecg",
				placeholder: { Color.purple.opacity(0.7) },
				content: { DemoModuleView(color: .purple, title: "Аналитика", text: "Свайпните вправо") }
			)
			
		}
	}
}

// MARK: - Шаблонная вьюшка для контента
struct DemoModuleView: View {
	let color: Color
	let title: String
	let text: String
	
	var body: some View {
		ZStack {
			// Фон модуля
			color.ignoresSafeArea()
			
			// Паттерн для красоты (чтобы было видно, что это не просто сплошной цвет)
			VStack(spacing: 20) {
				Image(systemName: "cube.transparent")
					.font(.system(size: 80))
					.foregroundColor(.white.opacity(0.5))
				
				Text(title)
					.font(.system(size: 40, weight: .bold, design: .rounded))
					.foregroundColor(.white)
				
				Text(text)
					.font(.headline)
					.foregroundColor(.white.opacity(0.9))
					.multilineTextAlignment(.center)
					.padding(.horizontal)
				
				Spacer()
			}
			.padding(.top, 100)
		}
	}
}

#Preview {
	HubDemoView()
}
