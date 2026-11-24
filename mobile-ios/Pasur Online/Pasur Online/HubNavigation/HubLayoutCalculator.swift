//
//  HubLayoutCalculator.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

import CoreGraphics

enum HubLayoutCalculator {
	struct TransformState {
		let translation: CGSize
		let scale: CGFloat
		
		var affineTransform: CGAffineTransform {
			CGAffineTransform(translationX: translation.width, y: translation.height)
				.scaledBy(x: scale, y: scale)
		}
	}
	
	// MARK: - Private Shared Math (Решает проблему дублирования)
	private static func calculateDragMetrics(
		screenSize: CGSize,
		translation: CGSize,
		startLocation: CGPoint,
		spacing: CGFloat
	) -> (baseTx: CGFloat, baseTy: CGFloat, activeScale: CGFloat, sideScale: CGFloat, centerDistance: CGFloat) {
		let w = screenSize.width
		let h = screenSize.height
		
		let progress = min(1.0, abs(translation.height) / h)
		let activeScale = max(0.5, 1.0 - progress)
		let sideScale = max(0.75, activeScale)
		
		let dx = startLocation.x - (w / 2)
		let dy = startLocation.y - (h / 2)
		
		let baseTx = translation.width + dx * (1 - activeScale)
		let baseTy = translation.height + dy * (1 - activeScale)
		
		let centerDistance = (w + spacing) * sideScale
		
		return (baseTx, baseTy, activeScale, sideScale, centerDistance)
	}
	
	// MARK: - Active Module Drag (Для UIKit во время жеста)
	static func calculateActiveDrag(
		screenSize: CGSize,
		translation: CGSize,
		startLocation: CGPoint
	) -> TransformState {
		let metrics = calculateDragMetrics(screenSize: screenSize, translation: translation, startLocation: startLocation, spacing: 0)
		
		return TransformState(
			translation: CGSize(width: metrics.baseTx, height: metrics.baseTy),
			scale: metrics.activeScale
		)
	}
	
	// MARK: - Neighbor Module Drag (Для SwiftUI и точки спавна в UIKit)
	static func calculateNeighborDrag(
		indexOffset: Int, // <-- Вместо active/target передаем просто смещение (-1, 1, 2 и т.д.)
		screenSize: CGSize,
		translation: CGSize,
		startLocation: CGPoint,
		spacing: CGFloat = HubNavigationConfig.DynamicBar.swipeSpacing
	) -> TransformState {
		let metrics = calculateDragMetrics(screenSize: screenSize, translation: translation, startLocation: startLocation, spacing: spacing)
		
		let finalTx = metrics.baseTx + (CGFloat(indexOffset) * metrics.centerDistance)
		
		return TransformState(
			translation: CGSize(width: finalTx, height: metrics.baseTy),
			scale: metrics.sideScale
		)
	}
	
	// MARK: - Cancel State
	static func calculateCancel(targetIndex: Int, activeIndex: Int, screenSize: CGSize, spacing: CGFloat = HubNavigationConfig.DynamicBar.swipeSpacing) -> TransformState {
		let centerDistance = screenSize.width + spacing
		let indexOffset = CGFloat(targetIndex - activeIndex)
		return TransformState(translation: CGSize(width: indexOffset * centerDistance, height: 0), scale: 1.0)
	}
	
	// MARK: - Switch State
	static func calculateSwitch(targetIndex: Int, newActiveIndex: Int, screenSize: CGSize, spacing: CGFloat = HubNavigationConfig.DynamicBar.swipeSpacing) -> TransformState {
		let centerDistance = screenSize.width + spacing
		let indexOffset = CGFloat(targetIndex - newActiveIndex)
		return TransformState(translation: CGSize(width: indexOffset * centerDistance, height: 0), scale: 1.0)
	}
}
