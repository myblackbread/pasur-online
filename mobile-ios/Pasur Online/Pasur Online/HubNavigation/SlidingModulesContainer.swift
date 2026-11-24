//
//  SlidingModulesContainer.swift
//  Pasur Online
//
//  Created by Garib Agaev on 22.07.2026.
//

import SwiftUI

struct SlidingModulesContainer<Content: View, StyledContent: View>: View, Animatable {
	var swipeProgress: CGFloat
	
	@ViewBuilder let content: (ModuleSlot) -> Content?
	
	@ViewBuilder let style: (ModuleSlot, ConstrainedModule<Content>) -> StyledContent
	
	var animatableData: CGFloat {
		get { swipeProgress }
		set { swipeProgress = newValue }
	}
	
	var body: some View {
		GeometryReader { proxy in
			let fullWidth = proxy.size.width
			let barHeight = proxy.size.height
			
			let spacing = HubNavigationConfig.DynamicBar.swipeSpacing
			let absProgress = abs(animatableData)
			
			let isSwiping = absProgress > 0
			let isDraggingRight = animatableData > 0
			let neighborSlot: ModuleSlot = isDraggingRight ? .left : .right
			
			let mappedOffset = (fullWidth + spacing) * absProgress
			
			let rawActiveWidth: CGFloat? = isSwiping ? (fullWidth - mappedOffset) : nil
			let safeActiveWidth = rawActiveWidth.map { max(barHeight, $0) }
			
			let rawNeighborWidth = mappedOffset - spacing
			let safeNeighborWidth = max(barHeight, rawNeighborWidth)
			
			let isActiveVisible = rawActiveWidth.flatMap({ $0 >= barHeight }) != false // rawActiveWidth == nil || rawActiveWidth! >= barHeight
			let isNeighborVisible = rawNeighborWidth >= barHeight
			
			let activeAlignment: Alignment = {
				if animatableData > 0 { return .trailing }
				if animatableData < 0 { return .leading }
				return .center
			}()
			
			ZStack {
				if isSwiping, let neighborRaw = content(neighborSlot) {
					let constrained = ConstrainedModule(content: neighborRaw, width: safeNeighborWidth)
					
					style(neighborSlot, constrained)
						.frame(height: barHeight)
						.opacity(isNeighborVisible ? 1 : 0)
						.frame(maxWidth: .infinity, alignment: isDraggingRight ? .leading : .trailing)
				}
				
				if let activeRaw = content(.active) {
					let constrained = ConstrainedModule(content: activeRaw, width: safeActiveWidth)
					
					style(.active, constrained)
						.frame(height: barHeight)
						.opacity(isActiveVisible ? 1 : 0)
						.frame(maxWidth: .infinity, alignment: activeAlignment)
				}
			}
			.frame(width: fullWidth, height: barHeight)
		}
	}
}
