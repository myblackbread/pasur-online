//
//  Untitled 8.swift
//  Pasur Online
//
//  Created by Garib Agaev on 25.07.2026.
//

import UIKit
import SwiftUI

final class HubCoordinatorController1: UIViewController {
	private let onSnapshotUpdate: (UUID, UIImage) -> Void
	private let moduleVCFactory: (UUID) -> ModuleContentViewController
	
	init(
		onSnapshotUpdate: @escaping (UUID, UIImage) -> Void,
		moduleVCFactory: @escaping (UUID) -> ModuleContentViewController
	) {
		self.onSnapshotUpdate = onSnapshotUpdate
		self.moduleVCFactory = moduleVCFactory
		super.init(nibName: nil, bundle: nil)
	}
	
	required init?(coder: NSCoder) { fatalError() }
	
	private var loadedModuleVCs: [UUID: ModuleContentViewController] = [:] // Можно в принципе перенести в какой-нибудь класс или структуру.
	
	private struct InteractionState {
		let initialSafeArea: UIEdgeInsets // Перенести в ModuleContentViewController
	}
	private var interactionState: InteractionState?
	
	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .clear
	}
	
	// MARK: - Core VC Management
	
	private func getOrMakeModuleVC(for id: UUID) -> ModuleContentViewController {
		if let existing = loadedModuleVCs[id] { return existing }
		let newVC = moduleVCFactory(id)
		newVC.modalPresentationStyle = .custom
		loadedModuleVCs[id] = newVC
		return newVC
	}
	
	private func detachFromScreen(_ vc: UIViewController) { // скорее всего, после добавления транзишенов - больше будет не нужен
		vc.view.removeFromSuperview()
		vc.removeFromParent()
		vc.view.transform = .identity
		vc.additionalSafeAreaInsets = .zero
	}
	
	private func finalizeAnimation(for id: UUID) {
		guard let vc = loadedModuleVCs[id] else { return }
		
		if vc.state == .pendingRemoval {
			vc.dismiss(animated: false)
			loadedModuleVCs.removeValue(forKey: id)
		} else {
			vc.state = .idle
		}
	}
}

// MARK: - Sync & Validation (State Machine Logic)
extension HubCoordinatorController1: HubWorkspaceDelegate {
	
	func synchronize(with validIds: Set<UUID>, completion: (() -> Void)?) {
		var activeVCWasRemoved = false
		let orphanedIds = loadedModuleVCs.keys.filter { !validIds.contains($0) }
		
		for id in orphanedIds {
			guard let vc = loadedModuleVCs[id] else { continue }
			
			guard vc.state == .idle else {
				vc.state = .pendingRemoval
				continue
			}
			
			if vc.parent != nil { activeVCWasRemoved = true }
			loadedModuleVCs.removeValue(forKey: id)
			detachFromScreen(vc)
		}
		
		if activeVCWasRemoved {
			completion?()
		}
	}
}

// MARK: - Transition API
extension HubCoordinatorController1: LalalalDelegate {
	func expandModule<Content: View>(id: UUID, originFrame: CGRect, @ViewBuilder transitionView: @escaping (Bool, CGFloat) -> Content, animation: Animation, completion: (() -> Void)?) {
		let targetVC = getOrMakeModuleVC(for: id)
		
		guard targetVC.state == .idle else {
			completion?()
			return
		}
		present(targetVC, animated: true, completion: completion)
//		targetVC.state = .animating
//		
//		addChild(targetVC)
//		view.addSubview(targetVC.view)
//		targetVC.view.frame = view.bounds
//		targetVC.view.layoutIfNeeded()
//		targetVC.view.isHidden = true
//		
//		let containerBounds = view.bounds
//		let deviceRadius = view.window?.windowScene?.screen.deviceCornerRadius ?? 0
//		
//		// 1. Создаем обертку с начальным фреймом
//		let wrapperView = createSnapshotWrapper(frame: originFrame)
//		view.addSubview(wrapperView)
//		
//		let hostingVC = UIHostingController(rootView: GeometryReader { proxy in
//			transitionView(false, deviceRadius)
//				.animation(animation, value: false)
//				.animation(animation, value: proxy.size)
//		})
//		hostingVC.view.backgroundColor = .clear
//		
//		addChild(hostingVC)
//		wrapperView.addSubview(hostingVC.view)
//
//		// 2. Связываем размеры хостинга с размерами обертки
//		hostingVC.view.frame = wrapperView.bounds
//		hostingVC.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
//		
//		hostingVC.view.layoutIfNeeded()
//		hostingVC.didMove(toParent: self)
//		
//		hostingVC.rootView = GeometryReader { proxy in
//			transitionView(true, deviceRadius)
//				.animation(animation, value: true)
//				.animation(animation, value: proxy.size)
//		}
//		
//		UIView.animate(animation) {
//			wrapperView.frame = containerBounds
//			wrapperView.layoutIfNeeded()
//		} completion: {
//			targetVC.view.isHidden = false
//			wrapperView.removeFromSuperview()
//			
//			hostingVC.willMove(toParent: nil)
//			hostingVC.view.removeFromSuperview()
//			hostingVC.removeFromParent()
//			
//			targetVC.didMove(toParent: self)
//			self.finalizeAnimation(for: id)
//			completion?()
//		}
	}
	
	func collapseModule<Content: View>(id: UUID, targetFrame: CGRect, @ViewBuilder transitionView: @escaping (Bool, CGFloat) -> Content, animation: Animation, completion: (() -> Void)?){
		guard let currentVC = loadedModuleVCs[id],
			  currentVC.state == .idle
		else {
			completion?()
			return
		}
		
		currentVC.dismiss(animated: true, completion: completion)
//		onSnapshotUpdate(id, currentVC.view.takeSnapshot())
//		currentVC.state = .animating
//		
//		currentVC.willMove(toParent: nil)
//		
//		let containerBounds = view.bounds
//		let deviceRadius = view.window?.windowScene?.screen.deviceCornerRadius ?? 0
//		
//		// 1. Создаем обертку размером во весь экран
//		let wrapperView = createSnapshotWrapper(frame: containerBounds)
//		view.addSubview(wrapperView)
//		
//		let hostingVC = UIHostingController(rootView: GeometryReader { proxy in
//			transitionView(true, deviceRadius)
//				.animation(animation, value: true)
//				.animation(animation, value: proxy.size)
//		})
//		
//		hostingVC.view.backgroundColor = .clear
//		
//		addChild(hostingVC)
//		wrapperView.addSubview(hostingVC.view)
//		
//		// 2. Связываем размеры хостинга с размерами обертки
//		hostingVC.view.frame = wrapperView.bounds
//		hostingVC.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
//		
//		hostingVC.view.layoutIfNeeded()
//		hostingVC.didMove(toParent: self)
//		
//		currentVC.view.isHidden = true
//		
//		hostingVC.rootView = GeometryReader { proxy in
//			transitionView(false, deviceRadius)
//				.animation(animation, value: false)
//				.animation(animation, value: proxy.size)
//		}
//		
//		UIView.animate(animation) {
//			wrapperView.frame = targetFrame
//			wrapperView.layoutIfNeeded()
//		} completion: {
//			hostingVC.willMove(toParent: nil)
//			hostingVC.view.removeFromSuperview()
//			hostingVC.removeFromParent()
//			
//			wrapperView.removeFromSuperview()
//			
//			self.detachFromScreen(currentVC)
//			self.interactionState = nil
//			
//			self.finalizeAnimation(for: id)
//			completion?()
//		}
	}
	
	func applyDragTransform(id: UUID, transform: CGAffineTransform, translation: CGSize) {
		guard let vc = loadedModuleVCs[id], vc.state == .idle else { return }
		
		if interactionState == nil && vc.view.transform == .identity {
			interactionState = InteractionState(initialSafeArea: vc.view.safeAreaInsets)
			vc.view.layer.cornerRadius = view.window?.windowScene?.screen.deviceCornerRadius ?? 0
			vc.view.layer.masksToBounds = true
		}
		
		guard let interaction = interactionState else { return }
		
		vc.view.transform = transform
		vc.additionalSafeAreaInsets = UIEdgeInsets(
			top: min(translation.height, interaction.initialSafeArea.top),
			left: min(translation.width, interaction.initialSafeArea.left),
			bottom: min(-translation.height, interaction.initialSafeArea.bottom),
			right: min(-translation.width, interaction.initialSafeArea.right)
		)
	}
	
	func revertDrag(id: UUID, animation: SwiftUI.Animation, completion: @escaping () -> Void) {
		guard let vc = loadedModuleVCs[id], vc.state == .idle else {
			completion()
			return
		}
		
		vc.state = .animating
		
		vc.view.layer.cornerRadius = view.window?.windowScene?.screen.deviceCornerRadius ?? 0
		vc.view.layer.masksToBounds = true
		
		UIView.animate(animation) {
			vc.view.transform = .identity
			vc.additionalSafeAreaInsets = .zero
		} completion: {
			vc.view.layer.cornerRadius = 0
			vc.view.layer.masksToBounds = false
			self.interactionState = nil
			
			self.finalizeAnimation(for: id)
			completion()
		}
	}
	
	func transitionBetweenModules(from activeId: UUID, to targetId: UUID, startTransform: CGAffineTransform, activeFinalTransform: CGAffineTransform, targetFinalTransform: CGAffineTransform, animation: SwiftUI.Animation, completion: @escaping () -> Void) {
		
		guard let currentVC = loadedModuleVCs[activeId], currentVC.state == .idle else {
			completion()
			return
		}
		
		let targetVC = getOrMakeModuleVC(for: targetId)
		guard targetVC.state == .idle else {
			completion()
			return
		}
		
		onSnapshotUpdate(activeId, currentVC.view.takeSnapshot())
		currentVC.state = .animating
		targetVC.state = .animating
		
		addChild(targetVC)
		view.insertSubview(targetVC.view, belowSubview: currentVC.view)
		targetVC.view.frame = view.bounds
		targetVC.view.layoutIfNeeded()
		targetVC.view.transform = startTransform
		targetVC.view.isHidden = false
		
		UIView.animate(animation) {
			targetVC.view.transform = targetFinalTransform
			targetVC.additionalSafeAreaInsets = .zero
			currentVC.view.transform = activeFinalTransform
		} completion: {
			targetVC.view.layer.cornerRadius = 0
			targetVC.view.layer.masksToBounds = false
			targetVC.didMove(toParent: self)
			
			self.detachFromScreen(currentVC)
			self.interactionState = nil
			
			self.finalizeAnimation(for: activeId)
			self.finalizeAnimation(for: targetId)
			completion()
		}
	}

	
	func transitionBetweenModules1(
		from activeId: UUID,
		to targetId: UUID,
		startTransform: CGAffineTransform,
		activeFinalTransform: CGAffineTransform,
		targetFinalTransform: CGAffineTransform,
		animation: SwiftUI.Animation, completion: (() -> Void)?
	) {
		guard let currentVC = loadedModuleVCs[activeId], currentVC.state == .idle else {
			//Возможно, тут можно вызвать открытие без анимации, а потом смещение
			//Почему нет?
			completion?()
			return
		}
		
		let targetVC = getOrMakeModuleVC(for: targetId)
		// Точнее, окнечно же, здесь. После создания targetVC
		guard targetVC.state == .idle else {
			completion?()
			return
		}
		
		currentVC.dismiss(animated: false)
		present(targetVC, animated: false)
		
//		onSnapshotUpdate(activeId, currentVC.view.takeSnapshot())
		currentVC.state = .animating
		targetVC.state = .animating
		
		targetVC.view.frame = view.bounds
		targetVC.view.layer.cornerRadius = view.window?.windowScene?.screen.deviceCornerRadius ?? 0
		targetVC.view.layer.masksToBounds = true
		targetVC.view.layoutIfNeeded()
		targetVC.view.transform = startTransform
		
		UIView.animate(animation) {
			targetVC.view.transform = targetFinalTransform
			targetVC.additionalSafeAreaInsets = .zero
		} completion: {
			targetVC.view.layer.cornerRadius = 0
			targetVC.view.layer.masksToBounds = false

			self.interactionState = nil
			
			self.finalizeAnimation(for: activeId)
			self.finalizeAnimation(for: targetId)
			completion?()
		}
	}
}


// MARK: - Module Delegate
extension HubCoordinatorController1: ModuleContentViewControllerDelegate {
	func moduleController(_ controller: ModuleContentViewController, didTakeSnapshot snapshot: UIImage) {
		onSnapshotUpdate(controller.moduleId, snapshot)
	}
}

// MARK: - Helpers
private extension HubCoordinatorController1 {
	func createSnapshotWrapper(frame: CGRect) -> UIView {
		let wrapper = UIView(frame: frame)
//		wrapper.clipsToBounds = true
		return wrapper
	}
}
