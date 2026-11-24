////
////  Untitled 4.swift
////  Pasur Online
////
////  Created by Garib Agaev on 22.06.2026.
////
//
//import SwiftUI
//
//// MARK: - 1. Создаем ключ Preference
///// Ключ, который будет переносить `Int` (номер экрана) снизу вверх
//struct ActiveScreenPreferenceKey: PreferenceKey {
//	static var defaultValue: Int? = nil
//	
//	static func reduce(value: inout Int?, nextValue: () -> Int?) {
//		// Это правило говорит: "Если есть несколько значений, всегда бери значение от самого верхнего (активного) экрана"
//		print("-----", value, nextValue())
//		value = nextValue()
//	}
//}
//
//// MARK: - 2. Корневой экран (Глобальное окружение)
//struct PreferenceDemoView: View {
//	// Стейт, в который мы будем сохранять прилетевшее снизу значение
//	@State private var activeLevel: Int = 0
//	@State private var path = NavigationPath()
//	
//	var body: some View {
//		VStack(spacing: 0) {
//			
//			// ГЛОБАЛЬНАЯ ПАНЕЛЬ (как твой DynamicBar)
//			// Она живет ВНЕ навигации, но всегда знает, что происходит внутри
//			VStack(spacing: 8) {
//				Text("Глобальный слушатель")
//					.font(.subheadline)
//					.foregroundStyle(.secondary)
//				
//				Text("Сейчас открыт экран: \(activeLevel)")
//					.font(.title.bold())
//					.foregroundStyle(.blue)
//			}
//			.frame(maxWidth: .infinity)
//			.padding()
//			.background(Color.gray.opacity(0.1))
//			
//			// НАВИГАЦИОННЫЙ СТЕК
//			NavigationStack(path: $path) {
//				// Корневой экран стека (Уровень 1)
//				ScreenDetailView(level: 1)
//					.navigationDestination(for: Int.self) { nextLevel in
//						ScreenDetailView(level: nextLevel)
//					}
//			}
//			// ЛОВИМ ДАННЫЕ ОТ ВСЕХ ЭКРАНОВ ВНУТРИ СТЕКА
//			.onPreferenceChange(ActiveScreenPreferenceKey.self) { newValue in
//				// Как только активный экран меняется, сюда прилетает его номер
//				print(activeLevel, newValue)
//				activeLevel = newValue ?? -1
//			}
//		}
//	}
//}
//
//// MARK: - 3. Отдельный экран
//struct ScreenDetailView: View {
//	let level: Int
//	
//	var body: some View {
//		VStack(spacing: 30) {
//			Text("Я экран номер \(level)")
//				.font(.largeTitle)
//			
//			// Кнопка для открытия следующего экрана
//			NavigationLink(value: level + 1) {
//				Text("Открыть экран \(level + 1)")
//					.font(.headline)
//					.padding()
//					.frame(maxWidth: .infinity)
//					.background(Color.blue)
//					.foregroundStyle(.white)
//					.cornerRadius(12)
//			}
//			.padding(.horizontal, 40)
//		}
//		.navigationTitle("Уровень \(level)")
//		
//		// САМОЕ ВАЖНОЕ: Бросаем свой номер наверх
//		.preference(key: ActiveScreenPreferenceKey.self, value: level)
//	}
//}
//
//#Preview {
//	PreferenceDemoView()
//}
