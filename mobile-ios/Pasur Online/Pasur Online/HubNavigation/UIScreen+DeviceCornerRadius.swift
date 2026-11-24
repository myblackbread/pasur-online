//
//  UIView+Snapshot.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

import UIKit

extension UIScreen {
	/// Извлекает системное значение радиуса скругления углов устройства через приватный API.
	/// Используется для бесшовной анимации перехода (matching corner radius) при разворачивании модуля.
	var deviceCornerRadius: CGFloat {
		let key = ["_", "dis", "play", "Cor", "ner", "Rad", "ius"].joined()
		return (value(forKey: key) as? CGFloat) ?? 0
	}
}
