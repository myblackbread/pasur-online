//
//  HubRoute.swift
//  Pasur Online
//
//  Created by Garib Agaev on 20.07.2026.
//

import Foundation

/// Протокол для всех маршрутов хаба
protocol HubRoute: Hashable {
	var hasSearch: Bool { get }
}
