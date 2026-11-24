//
//  HubRouter.swift
//  Pasur Online
//
//  Created by Garib Agaev on 20.07.2026.
//

import SwiftUI
import Observation

@Observable
final class HubRouter<Route: HubRoute> {
	var path: [Route] = [] {
		didSet { updateNavigationState(oldPath: oldValue) }
	}
	
	let rootRoute: Route
	
	// То, что мы будем передавать в DynamicBarState1
	var activeSearchContext: SearchContext?
	
	private var searchContexts: [Route: SearchContext] = [:]
	private var rootSearchContext: SearchContext?
	
	init(rootRoute: Route) {
		self.rootRoute = rootRoute
		setupInitialState()
	}
	
	func push(_ route: Route) { path.append(route) }
	func pop() { if !path.isEmpty { path.removeLast() } }
	func popToRoot() { path.removeAll() }
	
	private func setupInitialState() {
		if rootRoute.hasSearch {
			let context = SearchContext()
			rootSearchContext = context
			activeSearchContext = context
		}
	}
	
	private func updateNavigationState(oldPath: [Route]) {
		// Очищаем контексты убитых экранов
		if oldPath.count > path.count {
			let poppedRoutes = Set(oldPath).subtracting(path)
			for route in poppedRoutes {
				searchContexts.removeValue(forKey: route)
			}
		}
		
		// Достаем контекст для активного экрана
		if let currentRoute = path.last {
			if currentRoute.hasSearch {
				if searchContexts[currentRoute] == nil {
					searchContexts[currentRoute] = SearchContext()
				}
				activeSearchContext = searchContexts[currentRoute]
			} else {
				activeSearchContext = nil
			}
		} else {
			activeSearchContext = rootSearchContext
		}
	}
}
