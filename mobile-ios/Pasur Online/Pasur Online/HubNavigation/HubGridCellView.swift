//
//  HubGridCellView.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import SwiftUI

/// Представление отдельной карточки модуля в сетке хаба.
struct HubGridCellView: View {
	let module: HubModule
	let snapshot: UIImage?
	var onAnchorCreated: ((UIView) -> Void)?
	
	var body: some View {
		VStack(spacing: 8) {
			Group {
				if let snapshot = snapshot {
					Color.clear
						.overlay(Image(uiImage: snapshot).resizable().scaledToFill())
						.clipped()
				} else {
					Color.clear
						.overlay(module.placeholder)
						.clipped()
				}
			}
			.background(
				ViewAnchor { view in
					onAnchorCreated?(view)
				}
			)
			.clipShape(RoundedRectangle(cornerRadius: HubNavigationConfig.Grid.cornerRadius, style: .continuous))
			.shadow(color: .black.opacity(0.12), radius: 10, y: 5)
			
			HStack(spacing: 6) {
				Image(systemName: module.iconName)
					.font(.system(size: 12, weight: .medium))
					.frame(width: 16, height: 16)
				
				Text(module.title)
					.font(.system(size: 13, weight: .medium))
					.lineLimit(1)
				
				Spacer(minLength: 0)
			}
			.foregroundStyle(.primary)
			.padding(.horizontal, 4)
		}
	}
}
