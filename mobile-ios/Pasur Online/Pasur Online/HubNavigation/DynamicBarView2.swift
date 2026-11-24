//
//  DynamicBarView1.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

//import SwiftUI
//
///// Динамическая панель управления внизу экрана. Меняет свое состояние (капсула/кнопка) в зависимости от контекста модуля.
//private struct ExapleView: View {
//	@State private var onBackAction: Bool? = false
//	@State private var isExpanded = false
//	@State private var isDragging = false
//	@Namespace private var ns
//	
//	private var currentHeight: CGFloat {
//		isExpanded ? HubNavigationConfig.DynamicBar.expandedHeight : HubNavigationConfig.DynamicBar.collapsedHeight
//	}
//	
//	var body: some View {
//		GlassEffectContainer(spacing: 8) {
//			HStack(spacing: 8) {
//				
//				GlassEffectContainer {
//					Group {
//						if onBackAction != nil {
//							Button {
//								
//							} label: {
//								Circle()
//									.fill(.clear)
//									.overlay {
//										if isExpanded {
//											Image(systemName: "chevron.left")
//												.font(.system(size: HubNavigationConfig.DynamicBar.backIconSize))
//												.transition(.opacity)
//										}
//									}
//									.frame(width: isExpanded ? nil : .zero, height: isExpanded ? nil : .zero)
//									.clipped()
//									.glassEffect(.regular.interactive())
//							}
//							.buttonStyle(.plain)
//							.transition(.scale(scale: 0.8).combined(with: .opacity))
//						} else {
//							Circle()
//								.fill(.clear)
//								.transition(.scale(scale: 0.8).combined(with: .opacity))
//						}
//					}
//					.frame(width: currentHeight, height: currentHeight)
//				}
//				.opacity(0)
//				
//				HStack(spacing: 8) {
//					if isExpanded {
//						Spacer()
//							.transition(.opacity)
//						Image(systemName: "person")
//							.font(.system(size: HubNavigationConfig.DynamicBar.tabIconSize, weight: .medium))
//							.transition(.opacity)
//					}
//					
//					Text("Person")
//						.font(.system(size: HubNavigationConfig.DynamicBar.titleCollapsedSize))
//						.lineLimit(1)
//					
//					if isExpanded {
//						Spacer()
//							.transition(.opacity)
//					}
//				}
//				.frame(height: currentHeight)
//				.scaleEffect(HubNavigationConfig.DynamicBar.collapseScale)
//				.padding(.horizontal, isExpanded ? 0 : HubNavigationConfig.DynamicBar.capsulePaddingHorizontal)
//				.glassEffect(.regular.interactive())
//				.overlay(alignment: .bottom) {
//					Color.clear
//						.frame(minWidth: 44, minHeight: 44)
//						.contentShape(Rectangle())
//				}
//				.onTapGesture {
//					withAnimation(HubNavigationConfig.Animations.barToggle) {
//						isExpanded.toggle()
//					}
//				}
//				.highPriorityGesture(
//					DragGesture(minimumDistance: HubNavigationConfig.DynamicBar.dragMinimumDistance, coordinateSpace: .global)
//						.onChanged { value in
//							guard isExpanded else { return }
//							isDragging = true
//						}
//						.onEnded { value in
//							guard isExpanded else { return }
//							isDragging = false
//						}
//				)
//				
//				Circle()
//					.fill(.clear)
//					.frame(width: currentHeight, height: currentHeight)
//					.opacity(isExpanded ? 1 : 0)
//			}
//		}
//		.opacity(isDragging ? 0 : 1)
//		.animation(HubNavigationConfig.Animations.barToggle, value: isExpanded)
//		.animation(HubNavigationConfig.Animations.barDrag, value: isDragging)
//		.animation(HubNavigationConfig.Animations.backButton, value: onBackAction != nil)
//		.task {
//			try? await Task.sleep(for: .seconds(50))
//			onBackAction = nil
//		}
//	}
//}
//
//struct ExapleView1: View {
//	var body: some View {
//		ZStack {
//			Color.red.ignoresSafeArea()
//			ExapleView()
//		}
//	}
//}
//
//#Preview {
//	ExapleView1()
//}
