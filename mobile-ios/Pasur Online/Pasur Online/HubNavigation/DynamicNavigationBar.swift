//
//  DynamicNavigationBar.swift
//  Pasur Online
//
//  Created by Garib Agaev on 18.07.2026.
//

import SwiftUI

// MARK: - Main View
struct DynamicNavigationBar: View {
	let workspace: HubWorkspace
	let state: DynamicBarState
	
	@GestureState private var isDragActive: Bool = false
	@FocusState private var isSearchFocused: Bool
	
	var body: some View {
		HStack(spacing: 8) {
			if !isSearchActive {
				controlButton(for: .leading)
			}
			
			middleContainerView
			
			controlButton(for: .trailing)
		}
		.opacity(isBarVisible ? 1 : 0)
		.onSceneBackground {
			if state.dragState != nil {
				cancelDraggingState()
			}
		}
	}
}

private extension DynamicNavigationBar {
	
	// Хелпер для маршрутизации слотов
	func module(for slot: ModuleSlot) -> HubModule? {
		switch slot {
		case .active: return currentModule
		case .left: return leftNeighbor
		case .right: return rightNeighbor
		}
	}
	
	@ViewBuilder
	var middleContainerView: some View {
		ZStack {
			NavigationSearchBar(
				text: Binding(
					get: { state.search?.text ?? "" },
					set: { if state.search?.text != nil { state.search?.text = $0 } }
				),
				isFocused: $isSearchFocused,
				onSubmit: state.search?.onSubmit
			)
			.frame(maxWidth: .infinity, maxHeight: .infinity)
			.background(.regularMaterial)
			.clipShape(Capsule())
			.opacity(isSearchActive ? 1 : 0)
			
			SlidingModulesContainer(
				swipeProgress: swipeProgress,
				content: { slot in
					// 1. Отдаем чистое содержимое (Текст + Иконка)
					if let module = module(for: slot) {
						moduleRawContent(for: module)
					}
				},
				style: { slot, constrainedContent in
					// 2. Оборачиваем в дизайн
					constrainedContent
						.background(.regularMaterial)
						.clipShape(Capsule())
				}
			)
			.opacity(isSearchActive ? 0 : 1)
		}
		.frame(height: barHeight)
		.frame(maxWidth: .infinity, maxHeight: .infinity)
		.overlay(alignment: .bottom) {
			Color.clear
				.frame(minWidth: 44, minHeight: 44)
				.contentShape(Rectangle())
		}
		.onTapGesture(perform: handleTap)
		.highPriorityGesture(dragGesture)
		.frame(height: state.isExpanded ? HubNavigationConfig.DynamicBar.expandedHeight : HubNavigationConfig.DynamicBar.titleCollapsedSize)
	}
	
	@ViewBuilder
	func moduleRawContent(for module: HubModule) -> some View {
		HStack(spacing: 8) {
			// Spacer'ы сами сделают её широкой при state.isExpanded == true
			// И они сами исчезнут, превратив вьюшку в маленький кругляш при state.isExpanded == false
			if state.isExpanded { Spacer(minLength: 0) }
			
			if state.isExpanded {
				Image(systemName: module.iconName)
					.font(.system(size: HubNavigationConfig.DynamicBar.tabIconSize, weight: .medium))
					.transition(.opacity)
			}
			
			Text(module.title)
				.font(.system(size: HubNavigationConfig.DynamicBar.titleCollapsedSize))
				.lineLimit(1)
			// Жестко фиксируем текст только когда развернуты, чтобы капсула его обрезала.
				.fixedSize(horizontal: state.isExpanded, vertical: false)
			
			if state.isExpanded { Spacer(minLength: 0) }
		}
		.scaleEffect(HubNavigationConfig.DynamicBar.collapseScale)
		.padding(.horizontal, state.isExpanded ? 0 : HubNavigationConfig.DynamicBar.titleCollapsedSize / 2)
	}
}

// MARK: - UI Subviews (ViewBuilders)
private extension DynamicNavigationBar {
	
	enum BarControlSide {
		case leading, trailing
	}
	
	@ViewBuilder
	func controlButton(for side: BarControlSide) -> some View {
		Group {
			switch side {
			case .leading:
				CircularControlButton(
					iconName: "chevron.left",
					isDisabled: areControlsDisabled,
					action: state.onBackAction
				)
			case .trailing:
				CircularControlButton(
					iconName: isSearchActive ? "xmark" : "magnifyingglass",
					isDisabled: isDragging,
					action: state.search != nil ? toggleSearchAction : nil
				)
				.contentTransition(.symbolEffect(.replace))
			}
		}
		.frame(width: barHeight, height: barHeight)
		.opacity(state.isExpanded && !isDragging ? 1 : 0)
	}
}

// MARK: - Actions & Gestures Logic
private extension DynamicNavigationBar {
	
	var dragGesture: some Gesture {
		DragGesture(minimumDistance: HubNavigationConfig.DynamicBar.dragMinimumDistance, coordinateSpace: .global)
			.updating($isDragActive) { _, active, _ in active = true }
			.onChanged(handleDragChanged)
			.onEnded(handleDragEnded)
	}
	
	func handleTap() {
		guard !isSearchActive else { return }
		withAnimation(HubNavigationConfig.Animations.barToggle) {
			state.isExpanded.toggle()
		}
	}
	
	var toggleSearchAction: () -> Void {
		return {
			guard let searchContext = state.search else { return }
			withAnimation(HubNavigationConfig.Animations.barToggle) {
				if isSearchActive {
					isSearchFocused = false
					searchContext.text = nil
				} else {
					searchContext.text = ""
					isSearchFocused = true
				}
			}
		}
	}
	
	func handleDragChanged(value: DragGesture.Value) {
		// Общая проверка
		guard state.isExpanded, !isSearchActive else { return }
		// Если вью свернуто или включен режим поиска - жеста нет.
		guard state.isExpanded, !isSearchActive else { return }
		// Если жест есть, должен быть открыт какой-то из модулей
		guard case .module(let currentActiveId) = state.phase,
			  let currentActiveIndex = workspace.index(for: currentActiveId)
		else { return }
		// Действие запущено, но делегата нет или делегат имеет нулевые размеры
		// Пока это так, рассчитать dragState не представляется возможным, он должен остаться nil
		guard let delegate = state.delegate, delegate.containerSize != .zero else { return }

		let tx = {
			if ($0 == 0 && $1 > 0) || ($0 == workspace.modules.count - 1 && $1 < 0) {
				HubGestureResolver.rubberBand(translation: $1, limit: $2)
			} else {
				$1
			}
		}(currentActiveIndex, value.translation.width, delegate.containerSize.width)
		
		let ty = min(0, value.translation.height)
		
		let clampedTranslation = CGSize(width: tx, height: ty)
		
		state.dragState = .init(
			translation: clampedTranslation,
			startLocation: value.startLocation,
			containerSize: delegate.containerSize
		)
		
		// Так уж и быть, передаем смещение делегату.
		delegate.didChangePan(translation: clampedTranslation, startLocation: value.startLocation)
	}
	
	func handleDragEnded(value: DragGesture.Value) {
		// Общая проверка
		// Если вью свернуто или включен режим поиска - жеста нет.
		guard state.isExpanded, !isSearchActive else { return }
		// Чтобы жест вообще начался, мы должны находиться в модуле.
		guard case .module(let currentActiveId) = state.phase,
			  let currentActiveIndex = workspace.index(for: currentActiveId)
		else { return }
		
		if let delegate = state.delegate, delegate.containerSize != .zero {
			let tx = {
				if ($0 == 0 && $1 > 0) || ($0 == workspace.modules.count - 1 && $1 < 0) {
					HubGestureResolver.rubberBand(translation: $1, limit: $2)
				} else {
					$1
				}
			}(currentActiveIndex, value.translation.width, delegate.containerSize.width)
			let clampedTranslation = CGSize(width: tx, height: min(0, value.translation.height))
			
			state.dragState = .init(
				translation: clampedTranslation,
				startLocation: value.startLocation,
				containerSize: delegate.containerSize
			)
		}
		
		// Если нет dragState, значит, делегат ничего не отловил. Можно не волноваться
		guard let dragState = state.dragState else { return }
		
		let clampedVelocity = CGSize(width: value.velocity.width, height: min(0, value.velocity.height))

		let intent = HubGestureResolver.resolvePanIntent(
			screenSize: dragState.containerSize,
			translation: dragState.translation,
			velocity: clampedVelocity,
			isClosingToGrid: isClosingToGrid,
			activeIndex: currentActiveIndex,
			totalModules: workspace.modules.count
		)
		
		let springAnimation = Animation.spring(response: 0.4, dampingFraction: 0.8)
		
		withAnimation(springAnimation) {
			state.dragState = nil
			
			switch intent {
			case .cancel:
				state.phase = .transitioning(from: currentActiveId, to: currentActiveId)
			case .switchModule(let targetIndex):
				state.phase = .transitioning(from: currentActiveId, to: workspace.modules[targetIndex].id)
			case .close:
				state.phase = .transitioning(from: currentActiveId, to: nil)
			}
		}
		
		Task {
			switch intent {
			case .cancel:
				await state.delegate?.animateCancel(with: springAnimation)
				state.phase = .module(currentActiveId)
			case .switchModule(let targetIndex):
				await state.delegate?.animateSwitch(
					to: workspace.modules[targetIndex].id,
					lastTranslation: dragState.translation,
					lastStartLocation: dragState.startLocation,
					with: springAnimation
				)
				state.phase = .module(workspace.modules[targetIndex].id)
			case .close:
				await state.delegate?.animateClose(with: springAnimation)
				state.phase = .grid
			}
		}
	}
	
	func cancelDraggingState() {
		// Если dragState был во время отмены - делегат тоже вполне может существовать
		guard state.dragState != nil else { return }
		
		let springAnimation = Animation.spring(response: 0.4, dampingFraction: 0.8)
		
		withAnimation(springAnimation) {
			state.dragState = nil
			state.phase = .transitioning(from: state.phase.activeId, to: state.phase.activeId)
		}

		Task { @MainActor in
			await state.delegate?.animateCancel(with: springAnimation)
			state.dragState = nil
		}
	}
}

// MARK: - Computed Properties
private extension DynamicNavigationBar {
	var isSearchActive: Bool { state.search?.text != nil }
	
	var barHeight: CGFloat {
		state.isExpanded ? HubNavigationConfig.DynamicBar.expandedHeight : HubNavigationConfig.DynamicBar.titleCollapsedSize
	}
	
	var swipeProgress: CGFloat {
		if let progress = state.dragState?.progress {
			return progress
		}
		
		if case .transitioning(let from, let to) = state.phase, let fromIndex = from, let toIndex = to {
			if toIndex > fromIndex { return -1 }
			if toIndex < fromIndex { return 1 }
			return 0
		}
		
		return 0
	}
	
	var isDragging: Bool { state.dragState != nil || isDragActive }
	
	var isClosingToGrid: Bool { state.dragState?.type == .closing }
	
	var areControlsDisabled: Bool { isDragging || isSearchActive }
	
	var currentActiveIndex: Int? {
		guard let id = state.phase.activeId else { return nil }
		return workspace.index(for: id)
	}
	
	var currentModule: HubModule? {
		currentActiveIndex.map { workspace.modules[$0] }
	}
	
	var leftNeighbor: HubModule? {
		currentActiveIndex.flatMap { $0 - 1 >= 0 ? workspace.modules[$0 - 1] : nil }
	}
	
	var rightNeighbor: HubModule? {
		currentActiveIndex.flatMap { $0 + 1 < workspace.modules.count ? workspace.modules[$0 + 1] : nil }
	}
	
	var isBarVisible: Bool {
		switch state.phase {
		case .grid: false
		case .transitioning(let from, let to): (from != nil && to != nil) && !isClosingToGrid
		case .module: !isDragging || !isClosingToGrid
		}
	}
}
