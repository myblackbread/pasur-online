//
//  HubNeighborsView.swift
//  Pasur Online
//
//  Created by Garib Agaev on 24.07.2026.
//

import SwiftUI

struct HubNeighborsView: View {
	let workspace: HubWorkspace
	let barState: DynamicBarState
	
	var body: some View {
		if (barState.dragState != nil || isTransitioning) {
			GeometryReader { proxy in
				let screenSize = proxy.size
				// Получаем индекс активного ID для математики макета
				let activeIndex = barState.phase.activeId.flatMap { workspace.index(for: $0) } ?? 0
				let isDragging = barState.dragState != nil
				
				ZStack {
					ForEach(Array(workspace.modules.enumerated()), id: \.element.id) { index, module in
						if module.id != excludedId {
							let layout = calculateLayout(for: index, activeIndex: activeIndex, screenSize: screenSize)
							
							Group {
								if let snapshot = workspace.snapshots[module.id] {
									Image(uiImage: snapshot).resizable().scaledToFill()
								} else {
									module.placeholder
								}
							}
							.ignoresSafeArea()
							.frame(width: screenSize.width, height: screenSize.height)
							.clipShape(RoundedRectangle(cornerRadius: UIScreen.main.deviceCornerRadius, style: .continuous))
							.scaleEffect(layout.scale)
							.offset(x: layout.translation.width, y: layout.translation.height)
						}
					}
				}
				.animation(HubNavigationConfig.Animations.defaultSpring, value: isDragging)
				.animation(HubNavigationConfig.Animations.defaultSpring, value: barState.phase)
			}
			.allowsHitTesting(false)
		}
	}
	
	private var isTransitioning: Bool {
		if case let .transitioning(from, to) = barState.phase { return from != nil && to != nil }
		return false
	}
	
	private var excludedId: UUID? {
		switch barState.phase {
		case .transitioning(let from, let to): return to ?? from
		case .module(let id): return id
		case .grid: return nil
		}
	}
	
	private func calculateLayout(for targetIndex: Int, activeIndex: Int, screenSize: CGSize) -> HubLayoutCalculator.TransformState {
		// 1. Идет физический свайп
		if let drag = barState.dragState {
			return HubLayoutCalculator.calculateNeighborDrag(indexOffset: targetIndex - activeIndex, screenSize: screenSize, translation: drag.translation, startLocation: drag.startLocation)
		}
		
		// 2. Идет программная анимация
		if case .transitioning(let from, let to) = barState.phase {
			if from != nil, let to = to.flatMap({ workspace.index(for: $0) }) {
				return HubLayoutCalculator.calculateSwitch(
					targetIndex: targetIndex,
					newActiveIndex: to,
					screenSize: screenSize
				)
			}
			if let from, let to, from == to, let index = workspace.index(for: to) {
				return HubLayoutCalculator.calculateCancel(
					targetIndex: targetIndex,
					activeIndex: index,
					screenSize: screenSize
				)
			}
		}
		
		// 3. Состояние покоя (cancel)
		return HubLayoutCalculator.calculateCancel(targetIndex: targetIndex, activeIndex: activeIndex, screenSize: screenSize)
	}
}
