//
//  NavigationSearchBar.swift
//  Pasur Online
//
//  Created by Garib Agaev on 22.07.2026.
//

import SwiftUI

struct NavigationSearchBar: View {
	@Binding var text: String
	var isFocused: FocusState<Bool>.Binding
	var onSubmit: (() -> Void)?
	
	var body: some View {
		TextField("Поиск...", text: $text)
			.focused(isFocused)
			.onSubmit { onSubmit?() }
			.font(.system(size: HubNavigationConfig.DynamicBar.titleCollapsedSize))
			.padding(.horizontal, 16)
	}
}
