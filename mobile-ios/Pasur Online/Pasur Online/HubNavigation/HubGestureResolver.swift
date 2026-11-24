//
//  HubGestureResolver.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

import CoreGraphics

/// Чистая функция для расшифровки физики жеста
enum HubGestureResolver {
	
	/// Математика "пружины" при свайпе за пределы крайних модулей
	static func rubberBand(translation: CGFloat, limit: CGFloat) -> CGFloat {
		let x = abs(translation)
		let sign = translation < 0 ? -1.0 : 1.0
		let elasticity: CGFloat = 0.55
		
		let y = limit * (1.0 - (1.0 / ((x * elasticity / limit) + 1.0)))
		return y * sign
	}
	
	static func resolvePanIntent(
		screenSize: CGSize,
		translation: CGSize,
		velocity: CGSize,
		isClosingToGrid: Bool,
		activeIndex: Int,
		totalModules: Int,
		spacing: CGFloat = 40
	) -> HubPanIntent {
		let h = screenSize.height
		let w = screenSize.width
		
		let progress = min(1.0, abs(translation.height) / h)
		
		if isClosingToGrid {
			let isFastFlick = velocity.height < -800
			if progress >= 0.25 || isFastFlick {
				return .close
			} else {
				return .cancel
			}
		} else {
			let tx = translation.width
			let scale = max(0.5, 1.0 - progress)
			let sideScale = max(0.75, scale)
			let centerDistance = (w * sideScale) + spacing
			
			var indexOffset = Int(round(-tx / centerDistance))
			
			if velocity.width < -800 && indexOffset <= 0 {
				indexOffset = 1
			} else if velocity.width > 800 && indexOffset >= 0 {
				indexOffset = -1
			}
			
			let targetIndex = max(0, min(totalModules - 1, activeIndex + indexOffset))
			
			if targetIndex != activeIndex {
				return .switchModule(targetIndex: targetIndex)
			} else {
				return .cancel
			}
		}
	}
}
