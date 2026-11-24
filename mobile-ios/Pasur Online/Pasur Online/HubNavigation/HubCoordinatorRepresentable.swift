//
//  HubCoordinatorRepresentable.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import SwiftUI

struct HubCoordinatorRepresentable: UIViewControllerRepresentable {
	let workspace: HubWorkspace
	let barState: DynamicBarState
	
	func makeUIViewController(context: Context) -> HubCoordinatorController {
		let hubController = HubCoordinatorController(
			workspace: workspace,
			getPhase: { barState.phase },
			onGridSelect: { targetId in
				let sharedAnimation = Animation.spring(response: 0.4, dampingFraction: 0.8)
				withAnimation(sharedAnimation) { barState.phase = .transitioning(from: targetId, to: nil) }
				
				Task { @MainActor in
					await barState.delegate?.animateOpen(with: sharedAnimation)
					barState.phase = .module(targetId)
				}
			},
			onSnapshotUpdate: { id, image in
				workspace.snapshots[id] = image
			},
			moduleVCFactory: { id in
				guard let module = workspace.modules.first(where: { $0.id == id }) else { fatalError() }
				let contentView = module.content.environment(barState).environment(workspace)
				return ModuleContentViewController(moduleId: id, contentView: AnyView(contentView))
			}
		)
		barState.delegate = hubController
		return hubController
	}
	
	func updateUIViewController(_ uiViewController: HubCoordinatorController, context: Context) {}
}
