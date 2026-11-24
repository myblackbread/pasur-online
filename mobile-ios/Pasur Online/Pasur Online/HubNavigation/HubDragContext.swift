//
//  HubDragContext.swift
//  Pasur Online
//
//  Created by Garib Agaev on 22.07.2026.
//

import Foundation
import CoreGraphics

struct HubDragContext: Equatable {
	enum DragType {
		case switching
		case closing
	}
	
	var translation: CGSize = .zero
	var startLocation: CGPoint = .zero
	var containerSize: CGSize = .zero
	
	var type: DragType {
		translation.height < HubNavigationConfig.DynamicBar.closeToGridThreshold ? .closing : .switching
	}
	
	var progress: CGFloat {
		// Не может такого быть, чтобы не был containerSize.width > 0
		guard containerSize.width > 0 else { fatalError() }
		let centerDistance = containerSize.width + HubNavigationConfig.DynamicBar.swipeSpacing
		return translation.width / centerDistance
	}
}
