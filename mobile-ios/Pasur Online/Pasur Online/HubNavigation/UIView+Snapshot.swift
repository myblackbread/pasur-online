//
//  UIScreen+DeviceCornerRadius.swift
//  Pasur Online
//
//  Created by Garib Agaev on 21.06.2026.
//

import UIKit

//extension UIView {
//	/// Создает растровое изображение (снапшот) текущего содержимого UIView.
//	/// Используется для оптимизации анимации перехода, подменяя тяжелый UI картинкой.
//	func takeSnapshot() -> UIImage {
//		let renderer = UIGraphicsImageRenderer(size: bounds.size)
//		return renderer.image { context in layer.render(in: context.cgContext) }
//	}
//}

extension UIView {
	func takeSnapshot() -> UIImage {
		let format = UIGraphicsImageRendererFormat()
		// Снижаем scale до 1.0 (или 0.0 для автоматического, но 1.0 быстрее всего)
		// Для карточки в гриде качества 1.0 хватит с головой
		format.scale = 1.0
		format.opaque = isOpaque
		
		let renderer = UIGraphicsImageRenderer(bounds: bounds, format: format)
		return renderer.image { _ in
			// false означает "снять прямо сейчас", не дожидаясь следующего кадра.
			// Вьюха всё ещё в окне, Safe Area на месте!
			self.drawHierarchy(in: bounds, afterScreenUpdates: false)
		}
	}
}
