//
//  HubNavigationStack.swift
//  Pasur Online
//
//  Created by Garib Agaev on 20.07.2026.
//

import SwiftUI

struct HubNavigationStack<Route: HubRoute, RootContent: View, DestinationContent: View>: View {
	@Bindable var router: HubRouter<Route>
	@Environment(DynamicBarState.self) private var barState
	
	// Идентификатор модуля, чтобы бар понимал, от кого он получает команды
	let moduleId: UUID
	
	let rootContent: () -> RootContent
	let destinationContent: (Route) -> DestinationContent
	
	init(
		router: HubRouter<Route>,
		moduleId: UUID,
		@ViewBuilder rootContent: @escaping () -> RootContent,
		@ViewBuilder destinationContent: @escaping (Route) -> DestinationContent
	) {
		self.router = router
		self.moduleId = moduleId
		self.rootContent = rootContent
		self.destinationContent = destinationContent
	}
	
	var body: some View {
		NavigationStack(path: $router.path) {
			rootContent()
				.navigationDestination(for: Route.self) { route in
					destinationContent(route)
				}
		}
		.background(
			InteractivePopGestureRepresentable {
				// БЛОКИРУЕМ свайп назад, если введена строка поиска
				return router.activeSearchContext?.text == nil
			}
		)
		// Синхронизация поиска текущего модуля с глобальным баром
		.onChange(of: router.activeSearchContext, initial: true) { _, newContext in
			// Передаем контекст только если мы находимся внутри этого модуля
			if case .module(let id) = barState.phase, id == moduleId {
				withAnimation(HubNavigationConfig.Animations.backButton) {
					barState.search = newContext
				}
			}
		}
		// Управление кнопкой "Назад" в глобальном баре
		.onChange(of: router.path.count, initial: true) { _, newCount in
			updateBackAction(pathCount: newCount)
		}
		// Восстанавливаем стейт при возвращении в модуль из сетки
//		.onChange(of: barState.phase) { _, newPhase in
//			if case .module(let index) = newPhase, index == moduleIndex {
//				updateBackAction(pathCount: router.path.count)
//				withAnimation(HubNavigationConfig.Animations.backButton) {
//					barState.search = router.activeSearchContext
//				}
//			} else if case .grid = newPhase {
//				barState.search = nil
//				barState.onBackAction = nil
//			}
//		}
		.onChange(of: barState.phase) { _, newPhase in
			if case .module(let id) = newPhase, id == moduleId {
				updateBackAction(pathCount: router.path.count)
			}
		}
	}
	
	private func updateBackAction(pathCount: Int) {
		guard case .module(let id) = barState.phase, id == moduleId else { return }
		
		withAnimation(HubNavigationConfig.Animations.backButton) {
			if pathCount > 0 {
				barState.onBackAction = {
					router.pop()
				}
			} else {
				barState.onBackAction = nil
			}
		}
	}
}
