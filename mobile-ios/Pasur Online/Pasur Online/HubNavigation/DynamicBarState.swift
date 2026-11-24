//
//  DynamicBarState.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import Observation
import CoreGraphics
import Foundation
import SwiftUI

@MainActor
protocol HubPanGestureDelegate: AnyObject {
	var containerSize: CGSize { get }
	
	func didChangePan(translation: CGSize, startLocation: CGPoint)
	
	func animateCancel(with animation: Animation) async
//	func animateCancel(with animation: Animation, completion: @escaping () -> Void)
	func animateSwitch(to targetId: UUID, lastTranslation: CGSize, lastStartLocation: CGPoint, with animation: Animation) async
//	func animateSwitch(to targetId: UUID, lastTranslation: CGSize, lastStartLocation: CGPoint, with animation: Animation, completion: @escaping () -> Void)
	func animateClose(with animation: Animation) async
//	func animateClose(with animation: Animation, completion: @escaping () -> Void)
	func animateOpen(with animation: Animation) async
//	func animateOpen(with animation: Animation, completion: @escaping () -> Void)
}

@Observable
class DynamicBarState {
	var phase: HubNavigationPhase = .grid {
		didSet {
			onBackAction = nil
			search = nil
		}
	}
	
	var dragState: HubDragContext?
	weak var delegate: HubPanGestureDelegate?
	
	var isExpanded: Bool = false
	var onBackAction: (() -> Void)?
	var search: SearchContext?
}
