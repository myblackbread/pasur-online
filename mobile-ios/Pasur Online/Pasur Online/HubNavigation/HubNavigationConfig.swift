//
//  HubNavigationConfig.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

import SwiftUI

/// Глобальная конфигурация метрик и анимаций для архитектуры Hub Navigation.
enum HubNavigationConfig {
	
	// MARK: - Dynamic Bar
	enum DynamicBar {
		/// Высота навигационной панели в активном (развернутом) состоянии.
		static let expandedHeight: CGFloat = 50
		/// Высота навигационной панели в неактивном (свернутом) состоянии.
		static let collapsedHeight: CGFloat = 21
		
		static let expandedPaddingHorizontal: CGFloat = 16
		static let collapsedPaddingHorizontal: CGFloat = 0
		
		static let expandedPaddingBottom: CGFloat = 0
		static let collapsedPaddingBottom: CGFloat = 14
		static let capsulePaddingHorizontal: CGFloat = 19
		
		static let backIconSize: CGFloat = 25
		static let tabIconSize: CGFloat = 22
		static let titleCollapsedSize: CGFloat = 20
		
		static let collapseScale: CGFloat = CGFloat(sqrt(0.5))
		
		static let shadowRadius: CGFloat = 12
		static let shadowY: CGFloat = 6
		static let dragMinimumDistance: CGFloat = 1
		
		static let swipeSpacing: CGFloat = 40.0
		static let closeToGridThreshold: CGFloat = -5.0
	}
	
	// MARK: - Grid Modules
	enum Grid {
		static let cornerRadius: CGFloat = 20
		static let spacing: CGFloat = 16
		static let shadowRadius: CGFloat = 12
		static let shadowY: CGFloat = 8
		
		static let iconSize: CGFloat = 18
		static let titleSize: CGFloat = 14
		static let headerHeight: CGFloat = 40
		
		/// Порог смещения при свайпе (pan gesture), после которого модуль инициирует закрытие.
		static let panCloseThreshold: CGFloat = 50
	}
	
	// MARK: - Animations
	enum Animations {
		static let barToggle = Animation.spring(response: 0.4, dampingFraction: 0.75)
		static let barDrag = Animation.easeInOut(duration: 0.2)
		static let barVisibility = Animation.easeInOut(duration: 0.3)
		static let backButton = Animation.spring(response: 0.3, dampingFraction: 0.7)
		
		static let transitionDuration: TimeInterval = 0.55
		static let transitionSpringDampingOpen: CGFloat = 0.8
		static let transitionSpringDampingClose: CGFloat = 0.85
		
		static let panReleaseDuration: TimeInterval = 0.4
		static let panReleaseDamping: CGFloat = 0.8
		
		static let defaultSpringResponse: Double = 0.4
		static let defaultSpringDamping: Double = 0.8
		
		static let defaultSpring = Animation.spring(
			response: defaultSpringResponse,
			dampingFraction: defaultSpringDamping
		)
	}
}
