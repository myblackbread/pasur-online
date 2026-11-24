//
//  CircularControlButton.swift
//  Pasur Online
//
//  Created by Garib Agaev on 22.07.2026.
//

import SwiftUI

struct CircularControlButton: View {
	let iconName: String
	let isDisabled: Bool
	let action: (() -> Void)?
	
	var body: some View {
		if let action = action {
			Button(action: action) {
				Circle()
					.fill(.regularMaterial)
					.overlay {
						Image(systemName: iconName)
							.font(.system(size: HubNavigationConfig.DynamicBar.backIconSize))
							.foregroundStyle(.primary)
					}
					.shadow(
						color: .black.opacity(0.2),
						radius: HubNavigationConfig.DynamicBar.shadowRadius,
						y: HubNavigationConfig.DynamicBar.shadowY
					)
			}
			.buttonStyle(.plain)
			.disabled(isDisabled)
		} else {
			Circle().fill(.clear)
		}
	}
}
