//
//  HubNavigationView.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import SwiftUI

struct HubNavigationView: View {
	private let initialModules: [HubModule]
	
	@State private var workspace = HubWorkspace()
	@State private var barState = DynamicBarState()
	
	init(@HubModuleBuilder _ modules: () -> [HubModule]) {
		self.initialModules = modules()
	}
	
	public var body: some View {
		ZStack {
			HubCoordinatorRepresentable(workspace: workspace, barState: barState)
				.ignoresSafeArea()
			
			HubNeighborsView(workspace: workspace, barState: barState)
				.ignoresSafeArea()
				.opacity(barState.phase == .grid ? 0 : 1)
			
			VStack {
				Spacer()
				DynamicNavigationBar(workspace: workspace, state: barState)
					.padding(.horizontal, barState.isExpanded ? HubNavigationConfig.DynamicBar.expandedPaddingHorizontal : HubNavigationConfig.DynamicBar.collapsedPaddingHorizontal)
					.padding(.bottom, barState.search?.text != nil ? 8 : (barState.isExpanded ? HubNavigationConfig.DynamicBar.expandedPaddingBottom : HubNavigationConfig.DynamicBar.collapsedPaddingBottom))
			}
			.ignoresSafeArea(.container, edges: barState.isExpanded ? [] : .bottom)
		}
		.onChange(of: initialModules, initial: true) { _, newModules in
			workspace.modules = newModules
		}
		.environment(workspace)
		.environment(barState)
	}
}

/*
 x*a
 2*x*(a+1)
 (2xa+2x)/xa
 2+2/a
 */
