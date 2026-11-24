//
//  InteractiveBackNavigation.swift
//  Pasur Online
//
//  Created by Garib Agaev on 20.07.2026.
//

import SwiftUI
import UIKit

struct InteractivePopGestureRepresentable: UIViewControllerRepresentable {
	var canGoBack: () -> Bool
	
	func makeCoordinator() -> Coordinator {
		Coordinator(canGoBack: canGoBack)
	}
	
	func makeUIViewController(context: Context) -> UIViewController {
		let viewController = UIViewController()
		viewController.view.backgroundColor = .clear
		
		Task { @MainActor in
			if let nav = viewController.navigationController {
				context.coordinator.originalDelegate = nav.interactivePopGestureRecognizer?.delegate
				context.coordinator.navigationController = nav
				nav.interactivePopGestureRecognizer?.delegate = context.coordinator
			}
		}
		
		return viewController
	}
	
	func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
		context.coordinator.canGoBack = canGoBack
	}
	
	static func dismantleUIViewController(_ uiViewController: UIViewController, coordinator: Coordinator) {
		if let nav = coordinator.navigationController {
			nav.interactivePopGestureRecognizer?.delegate = coordinator.originalDelegate
		}
	}
	
	class Coordinator: NSObject, UIGestureRecognizerDelegate {
		weak var navigationController: UINavigationController?
		weak var originalDelegate: UIGestureRecognizerDelegate?
		var canGoBack: () -> Bool
		
		init(canGoBack: @escaping () -> Bool) {
			self.canGoBack = canGoBack
		}
		
		func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
			// 1. Наша защита: если открыт поиск, свайп мертв
			if !canGoBack() { return false }
			// 2. Системная защита: нельзя свайпнуть корневой экран
			return (navigationController?.viewControllers.count ?? 0) > 1
		}
		
		func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
			return originalDelegate?.gestureRecognizer?(gestureRecognizer, shouldRecognizeSimultaneouslyWith: otherGestureRecognizer) ?? false
		}
		
		func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRequireFailureOf otherGestureRecognizer: UIGestureRecognizer) -> Bool {
			return originalDelegate?.gestureRecognizer?(gestureRecognizer, shouldRequireFailureOf: otherGestureRecognizer) ?? false
		}
		
		func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldBeRequiredToFailBy otherGestureRecognizer: UIGestureRecognizer) -> Bool {
			return originalDelegate?.gestureRecognizer?(gestureRecognizer, shouldBeRequiredToFailBy: otherGestureRecognizer) ?? false
		}
		
		func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
			return originalDelegate?.gestureRecognizer?(gestureRecognizer, shouldReceive: touch) ?? true
		}
		
		func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive press: UIPress) -> Bool {
			return originalDelegate?.gestureRecognizer?(gestureRecognizer, shouldReceive: press) ?? true
		}
		
		func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive event: UIEvent) -> Bool {
			if #available(iOS 13.4, *) {
				return originalDelegate?.gestureRecognizer?(gestureRecognizer, shouldReceive: event) ?? true
			}
			return true
		}
		
		override func responds(to aSelector: Selector!) -> Bool {
			if super.responds(to: aSelector) { return true }
			return originalDelegate?.responds(to: aSelector) ?? false
		}
		
		override func forwardingTarget(for aSelector: Selector!) -> Any? {
			return originalDelegate
		}
	}
}
