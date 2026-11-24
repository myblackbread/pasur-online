//
//  ConstrainedModule.swift
//  Pasur Online
//
//  Created by Garib Agaev on 22.07.2026.
//

import SwiftUI

struct ConstrainedModule<Content: View>: View {
	let content: Content
	let width: CGFloat?
	
	var body: some View {
		content
			.frame(width: width)
			.frame(maxHeight: .infinity)
	}
}
