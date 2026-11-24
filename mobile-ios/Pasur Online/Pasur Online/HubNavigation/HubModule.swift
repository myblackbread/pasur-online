//
//  HubModule1.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import SwiftUI

/// Модель, описывающая конфигурацию независимого функционального модуля в хабе.
struct HubModule: Identifiable, Equatable {
	let id: UUID
	let title: String
	let iconName: String
	let placeholder: AnyView
	let content: AnyView
	
	init<B: View, C: View>(
		id: UUID = UUID(),
		title: String,
		iconName: String,
		@ViewBuilder placeholder: () -> B,
		@ViewBuilder content: () -> C
	) {
		self.id = id
		self.title = title
		self.iconName = iconName
		self.placeholder = AnyView(placeholder())
		self.content = AnyView(content())
	}
	
	static func == (lhs: HubModule, rhs: HubModule) -> Bool {
		lhs.id == rhs.id
	}
}

import SwiftUI
import Observation

/// Глобальное хранилище, управляющее подготовкой данных и снепшотами.
@Observable
final class HubWorkspace {
	var modules: [HubModule] = [] {
		didSet {
			let currentIds = Set(modules.map(\.id))
			for key in snapshots.keys where !currentIds.contains(key) {
				snapshots.removeValue(forKey: key)
			}
		}
	}
	var snapshots: [UUID: UIImage] = [:]
	
	init() {}

	func index(for id: UUID) -> Int? {
		modules.firstIndex(where: { $0.id == id })
	}
	
	func snapshot(for index: Int) -> UIImage? {
		snapshots[modules[index].id]
	}
}
