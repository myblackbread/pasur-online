//
//  HubNavigationPhase.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import Foundation

enum HubNavigationPhase: Equatable {
	case grid
	case transitioning(from: UUID?, to: UUID?)
	case module(UUID)
	
	var activeId: UUID? {
		switch self {
		case .transitioning(let from, let to): return from ?? to
		case .module(let id): return id
		case .grid: return nil
		}
	}
}
