//
//  DynamicBarView.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

import SwiftUI

//struct DynamicBarView1: View {
//	var state: DynamicBarState
//	
//	@GestureState private var isDragActive: Bool = false
//	
//	private var currentHeight: CGFloat {
//		state.isExpanded ? HubNavigationConfig.DynamicBar.expandedHeight : HubNavigationConfig.DynamicBar.collapsedHeight
//	}
//	
//	var body: some View {
//		GlassEffectContainer(spacing: 8) {
//			HStack(spacing: 8) {
//				
//				Group {
//					if state.onBackAction != nil {
//						GlassEffectContainer {
//							Button {
//								state.onBackAction?()
//							} label: {
//								Circle()
//									.fill(.clear)
//									.overlay {
//										Image(systemName: "chevron.left")
//											.font(.system(size: HubNavigationConfig.DynamicBar.backIconSize))
//									}
//									.contentShape(Circle())
//							}
//							.buttonStyle(.plain)
//							.glassEffect(.regular.interactive(), in: .circle)
//						}
//						.transition(.scale(scale: 0.8).combined(with: .opacity))
//					} else {
//						Circle()
//							.fill(.clear)
//							.transition(.scale(scale: 0.8).combined(with: .opacity))
//					}
//				}
//				.frame(width: currentHeight, height: currentHeight)
//				.opacity(state.isExpanded ? 1 : 0)
//				
//				HStack(spacing: 8) {
//					if state.isExpanded {
//						Spacer()
//							.transition(.opacity)
//						Image(systemName: state.iconName)
//							.font(.system(size: HubNavigationConfig.DynamicBar.tabIconSize, weight: .medium))
//							.transition(.opacity)
//					}
//					
//					Text(state.title.isEmpty ? "Module" : state.title)
//						.font(.system(size: HubNavigationConfig.DynamicBar.titleCollapsedSize))
//						.lineLimit(1)
//					
//					if state.isExpanded {
//						Spacer()
//							.transition(.opacity)
//					}
//				}
//				.frame(height: currentHeight)
//				.scaleEffect(HubNavigationConfig.DynamicBar.collapseScale)
//				.padding(.horizontal, state.isExpanded ? 0 : HubNavigationConfig.DynamicBar.capsulePaddingHorizontal)
//				.glassEffect(.regular.interactive())
//				.overlay(alignment: .bottom) {
//					Color.clear
//						.frame(minWidth: 44, minHeight: 44)
//						.contentShape(Rectangle())
//				}
//				.onTapGesture {
//					withAnimation(HubNavigationConfig.Animations.barToggle) {
//						state.isExpanded.toggle()
//					}
//				}
//				.highPriorityGesture(
//					DragGesture(minimumDistance: HubNavigationConfig.DynamicBar.dragMinimumDistance, coordinateSpace: .global)
//						.updating($isDragActive) { _, active, _ in
//							active = true
//						}
//						.onChanged { value in
//							guard state.isExpanded else { return }
//							state.isDragging = true
//							
//							// Твоя оригинальная математика: отсекаем свайп вниз (положительные Y)
//							let finalHeight = min(0, value.translation.height)
//							
//							// В iOS свайп ВВЕРХ — это отрицательные Y.
//							// Если потянули вверх, фиксируем намерение закрыть (с порогом -5 для защиты от дрожания)
//							if finalHeight < -5 {
//								state.isClosingToGrid = true
//							}
//							
//							let translation = CGSize(width: value.translation.width, height: finalHeight)
//							state.onPanChange?(translation, value.startLocation)
//						}
//						.onEnded { value in
//							guard state.isExpanded else { return }
//							state.isDragging = false
//							
//							let finalHeight = min(0, value.translation.height)
//							let translation = CGSize(width: value.translation.width, height: finalHeight)
//							
//							state.onPanEnd?(translation, value.velocity)
//							
//							// Сбрасываем флаг после отработки жеста
//							state.isClosingToGrid = false
//						}
//				)
//				
//				Circle()
//					.fill(.clear)
//					.frame(width: currentHeight, height: currentHeight)
//					.opacity(state.isExpanded ? 1 : 0)
//			}
//		}
//		.opacity(state.isVisible ? ((state.isDragging && state.isClosingToGrid) ? 0 : 1) : 0)
//		.animation(HubNavigationConfig.Animations.barToggle, value: state.isExpanded)
//		.animation(HubNavigationConfig.Animations.barDrag, value: state.isDragging)
//		.animation(HubNavigationConfig.Animations.barVisibility, value: state.isVisible)
//		.animation(HubNavigationConfig.Animations.backButton, value: state.onBackAction != nil)
//		.onChange(of: isDragActive) { oldValue, newValue in
//			if !newValue && state.isDragging {
//				state.isDragging = false
//				state.onPanEnd?(.zero, .zero)
//				state.isClosingToGrid = false
//			}
//		}
//	}
//}
