//
//  HubCoordinatorController.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import UIKit
import SwiftUI

extension Dictionary {
	subscript(key: Key, defaultInserting defaultValue: @autoclosure () -> Value) -> Value {
		mutating get {
			self[key] ?? {
				let value = defaultValue()
				self[key] = value
				return value
			}()
		}
		set {
			self[key] = newValue
		}
		_modify {
			yield &self[key, default: defaultValue()]
		}
	}
}

extension UIView {
	@MainActor
	static func animateAsync(
		_ animation: SwiftUI.Animation,
		changes: @escaping @MainActor () -> Void
	) async {
		await withCheckedContinuation { continuation in
			UIView.animate(animation) {
				changes()
			} completion: {
				continuation.resume()
			}
		}
	}
}

// Перенести в каждый отдельный контроллер. Не задача это HubCoordinatorController
private struct InteractionState {
	let initialSafeArea: UIEdgeInsets
}

final class HubCoordinatorController: UIViewController {
	private let workspace: HubWorkspace
	private let getPhase: () -> HubNavigationPhase
	private let onGridSelect: (UUID) -> Void
	private let onSnapshotUpdate: (UUID, UIImage) -> Void
	private let moduleVCFactory: (UUID) -> ModuleContentViewController
	
	private lazy var gridVC = HubGridViewController(workspace: workspace)
	private var loadedModuleVCs: [UUID: ModuleContentViewController] = [:]
	private var interactionState: InteractionState?
	
	init(
		workspace: HubWorkspace,
		getPhase: @escaping () -> HubNavigationPhase,
		onGridSelect: @escaping (UUID) -> Void,
		onSnapshotUpdate: @escaping (UUID, UIImage) -> Void,
		moduleVCFactory: @escaping (UUID) -> ModuleContentViewController
	) {
		self.workspace = workspace
		self.getPhase = getPhase
		self.onGridSelect = onGridSelect
		self.onSnapshotUpdate = onSnapshotUpdate
		self.moduleVCFactory = moduleVCFactory
		super.init(nibName: nil, bundle: nil)
	}
	
	required init?(coder: NSCoder) { fatalError() }
	
	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .clear
		setupGridVC()
	}
	
	func update() { gridVC.update() }
	
	private func setupGridVC() {
		addChild(gridVC)
		view.addSubview(gridVC.view)
		gridVC.view.frame = view.bounds
		gridVC.delegate = self
		gridVC.didMove(toParent: self)
	}
	
	private func moduleVC(for id: UUID) -> ModuleContentViewController {
		if let existing = loadedModuleVCs[id] { return existing }
		let newVC = moduleVCFactory(id)
		loadedModuleVCs[id] = newVC
		return newVC
	}
}

// MARK: - Module Delegate
extension HubCoordinatorController {
	func moduleController(_ controller: ModuleContentViewController, didTakeSnapshot snapshot: UIImage) {
		// Пробрасываем обратно в SwiftUI
		onSnapshotUpdate(controller.moduleId, snapshot)
	}
}

extension HubCoordinatorController: HubGridViewControllerDelegate {
	func hubGridViewController(_ controller: HubGridViewController, didSelectModuleWith id: UUID) {
		guard case .grid = getPhase() else { return }
		onGridSelect(id)
	}
}

// MARK: - Pan Delegate & Animations
extension HubCoordinatorController: HubPanGestureDelegate {
	var containerSize: CGSize { view.bounds.size }
	
	func didChangePan(translation: CGSize, startLocation: CGPoint) {
		guard let currentVC = getPhase().activeId.flatMap({ loadedModuleVCs[$0] }) else { return }
		
		if interactionState == nil && currentVC.view.transform == .identity {
			interactionState = InteractionState(initialSafeArea: currentVC.view.safeAreaInsets)
			currentVC.view.layer.cornerRadius = view.window?.windowScene?.screen.deviceCornerRadius ?? 0
			currentVC.view.layer.masksToBounds = true
		}
		
		guard let interaction = interactionState else { return }
		
		let activeLayout = HubLayoutCalculator.calculateActiveDrag(
			screenSize: view.bounds.size,
			translation: translation,
			startLocation: startLocation
		)
		currentVC.view.transform = activeLayout.affineTransform
		currentVC.additionalSafeAreaInsets = UIEdgeInsets(
			top: min(translation.height, interaction.initialSafeArea.top),
			left: min(translation.width, interaction.initialSafeArea.left),
			bottom: min(-translation.height, interaction.initialSafeArea.bottom),
			right: min(-translation.width, interaction.initialSafeArea.right)
		)
	}
	
	func animateCancel(with animation: Animation) async {
		guard let activeId = getPhase().activeId,
			  let activeIndex = workspace.index(for: activeId),
			  let currentVC = loadedModuleVCs[activeId]
		else { return }
		
		
		await UIView.animateAsync(animation) {
			let layout = HubLayoutCalculator.calculateCancel(
				targetIndex: activeIndex,
				activeIndex: activeIndex,
				screenSize: self.view.bounds.size
			)
			
			currentVC.additionalSafeAreaInsets = .zero
			currentVC.view.transform = layout.affineTransform
		}
		
		resetViewState(currentVC)
		interactionState = nil
	}
	
	func animateSwitch(to targetId: UUID, lastTranslation: CGSize, lastStartLocation: CGPoint, with animation: Animation) async {
		guard let activeId = getPhase().activeId,
			  let currentVC = loadedModuleVCs[activeId],
			  let activeIndex = workspace.modules.firstIndex(where: { $0.id == activeId }),
			  let targetIndex = workspace.modules.firstIndex(where: { $0.id == targetId }) else { return }
		
		let targetVC = prepareTargetVC(at: targetId, below: currentVC)
		let screenSize = view.bounds.size
		
		let startLayout = HubLayoutCalculator.calculateNeighborDrag(
			indexOffset: targetIndex - activeIndex,
			screenSize: screenSize,
			translation: lastTranslation,
			startLocation: lastStartLocation
		)
		targetVC.view.transform = startLayout.affineTransform
		
		// Системный вызов Appearance. Он триггерит viewWillDisappear у currentVC -> Снепшот создается и улетает в SwiftUI!
		currentVC.beginAppearanceTransition(false, animated: true)
		targetVC.beginAppearanceTransition(true, animated: true)
		
		await UIView.animateAsync(animation) {
			let finalTargetLayout = HubLayoutCalculator.calculateSwitch(targetIndex: targetIndex, newActiveIndex: targetIndex, screenSize: screenSize)
			targetVC.view.transform = finalTargetLayout.affineTransform
			targetVC.additionalSafeAreaInsets = .zero
			
			let finalCurrentLayout = HubLayoutCalculator.calculateSwitch(targetIndex: activeIndex, newActiveIndex: targetIndex, screenSize: screenSize)
			currentVC.view.transform = finalCurrentLayout.affineTransform
		}
		
		currentVC.endAppearanceTransition()
		targetVC.endAppearanceTransition()
		
		resetViewState(targetVC)
		targetVC.didMove(toParent: self)
		removeModuleVC(currentVC)
		
		gridVC.setCellHidden(false, for: activeId)
		gridVC.setCellHidden(true, for: targetId)
		interactionState = nil
	}
	
	func animateClose(with animation: Animation) async {
		guard let activeId = getPhase().activeId, let currentVC = loadedModuleVCs[activeId],
			  let originFrame = gridVC.getFrameForCell(with: activeId, in: view),
			  let snapshot = currentVC.view.snapshotView(afterScreenUpdates: false) else { return }
		
		// Вызов Appearance -> Триггерит viewWillDisappear -> Снепшот обновляется в стейте!
		currentVC.beginAppearanceTransition(false, animated: true)
		
		currentVC.willMove(toParent: nil)
		gridVC.setCellHidden(true, for: activeId)
		
		let containerBounds = view.bounds
		let widthScale = originFrame.width / containerBounds.width
		let heightScale = originFrame.height / containerBounds.height
		let scale = max(widthScale, heightScale)
		
		let tx = (originFrame.width / 2) - (containerBounds.width / 2)
		let ty = (originFrame.height / 2) - (containerBounds.height / 2)
		let snapshotTransform = CGAffineTransform(translationX: tx, y: ty).scaledBy(x: scale, y: scale)
		
		let wrapperView = createSnapshotWrapper(frame: containerBounds, cornerRadius: currentVC.view.layer.cornerRadius, transform: currentVC.view.transform)
		view.addSubview(wrapperView)
		wrapperView.addSubview(snapshot)
		snapshot.frame = wrapperView.bounds
		currentVC.view.isHidden = true
		
		await UIView.animateAsync(animation) {
			wrapperView.transform = .identity
			wrapperView.frame = originFrame
			wrapperView.layer.cornerRadius = HubNavigationConfig.Grid.cornerRadius
			snapshot.transform = snapshotTransform
		}
		
		currentVC.endAppearanceTransition()
		
		wrapperView.removeFromSuperview()
		gridVC.setCellHidden(false, for: activeId)
		removeModuleVC(currentVC)
		interactionState = nil
	}
	
	func animateOpen(with animation: SwiftUI.Animation) async {
		guard let activeId = getPhase().activeId,
			  let activeIndex = workspace.index(for: activeId),
			  let originFrame = gridVC.getFrameForCell(with: activeId, in: view)
		else { return }
		
		let targetVC = prepareTargetVC(at: activeId, below: nil)
		gridVC.setCellHidden(true, for: activeId)
		
		guard let snapshot = targetVC.view.snapshotView(afterScreenUpdates: true) else {
			targetVC.didMove(toParent: self)
			return
		}
		
		targetVC.view.isHidden = true
		let containerBounds = view.bounds
		let widthScale = originFrame.width / containerBounds.width
		let heightScale = originFrame.height / containerBounds.height
		let scale = max(widthScale, heightScale)
		
		let tx = (originFrame.width / 2) - (containerBounds.width / 2)
		let ty = (originFrame.height / 2) - (containerBounds.height / 2)
		let snapshotTransform = CGAffineTransform(translationX: tx, y: ty).scaledBy(x: scale, y: scale)
		
		let wrapperView = createSnapshotWrapper(frame: originFrame, cornerRadius: HubNavigationConfig.Grid.cornerRadius)
		view.addSubview(wrapperView)
		wrapperView.addSubview(snapshot)
		snapshot.frame = containerBounds
		snapshot.transform = snapshotTransform
		
		let deviceRadius = view.window?.windowScene?.screen.deviceCornerRadius ?? 0
		await UIView.animateAsync(animation) {
			wrapperView.frame = containerBounds
			wrapperView.layer.cornerRadius = deviceRadius
			snapshot.transform = .identity
		}
		
		targetVC.view.isHidden = false
		resetViewState(targetVC)
		wrapperView.removeFromSuperview()
		targetVC.didMove(toParent: self)
	}
}

private extension HubCoordinatorController {
	func prepareTargetVC(at id: UUID, below currentVC: UIViewController?) -> UIViewController {
		let targetVC = moduleVC(for: id)
		addChild(targetVC)
		if let currentVC {
			view.insertSubview(targetVC.view, belowSubview: currentVC.view)
		} else {
			view.addSubview(targetVC.view)
		}
		targetVC.view.frame = view.bounds
		targetVC.view.layoutIfNeeded()
		targetVC.view.isHidden = false
		return targetVC
	}
	
	func resetViewState(_ vc: UIViewController) {
		vc.view.layer.cornerRadius = 0
		vc.view.layer.masksToBounds = false
		vc.view.transform = .identity
		vc.additionalSafeAreaInsets = .zero
	}
	
	func removeModuleVC(_ vc: UIViewController) {
		vc.view.removeFromSuperview()
		vc.removeFromParent()
		resetViewState(vc)
	}
	
	func createSnapshotWrapper(frame: CGRect, cornerRadius: CGFloat, transform: CGAffineTransform = .identity) -> UIView {
		let wrapper = UIView(frame: frame)
		wrapper.transform = transform
		wrapper.layer.cornerRadius = cornerRadius
		wrapper.layer.cornerCurve = .continuous
		wrapper.clipsToBounds = true
		return wrapper
	}
}
