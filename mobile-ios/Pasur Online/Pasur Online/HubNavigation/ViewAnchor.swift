//
//  ViewAnchor.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

import SwiftUI
import UIKit

/// Невидимая вью-якорь для получения точных координат SwiftUI-элементов в координатной системе UIKit.
struct ViewAnchor: UIViewRepresentable {
	var onAnchorCreated: (UIView) -> Void
	
	func makeUIView(context: Context) -> UIView {
		let view = UIView()
		view.backgroundColor = .clear
		view.isUserInteractionEnabled = false
		
		Task { @MainActor in
			onAnchorCreated(view)
		}
		
		return view
	}
	
	func updateUIView(_ uiView: UIView, context: Context) {}
}
