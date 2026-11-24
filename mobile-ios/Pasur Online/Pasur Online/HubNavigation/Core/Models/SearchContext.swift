//
//  SearchContext.swift
//  Pasur Online
//
//  Created by Garib Agaev on 20.07.2026.
//

import Observation
import Foundation

@Observable
final class SearchContext: Equatable {
	var text: String?
	
	var onSubmit: (() -> Void)?
	
	static func == (lhs: SearchContext, rhs: SearchContext) -> Bool {
		lhs === rhs
	}
}
