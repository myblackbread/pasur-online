//
//  HubModuleBuilder.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

@resultBuilder
struct HubModuleBuilder {
	static func buildBlock(_ components: HubModule...) -> [HubModule] { return components }
}
