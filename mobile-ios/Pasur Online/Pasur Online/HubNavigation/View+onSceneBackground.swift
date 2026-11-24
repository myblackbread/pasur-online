//
//  View+.swift
//  Pasur Online
//
//  Created by Garib Agaev on 22.07.2026.
//

import SwiftUI

// MARK: - Scene Phase Modifiers
private struct OnBackgroundSceneModifier: ViewModifier {
	let action: () -> Void
	@Environment(\.scenePhase) private var scenePhase
	
	func body(content: Content) -> some View {
		content
			.onChange(of: scenePhase) { _, newPhase in
				if newPhase != .active {
					action()
				}
			}
	}
}

extension View {
	func onSceneBackground(perform action: @escaping () -> Void) -> some View {
		modifier(OnBackgroundSceneModifier(action: action))
	}
}
