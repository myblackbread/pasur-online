//
//  HubGridCell.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import UIKit
import SwiftUI

/// Ячейка UICollectionView, интегрирующая SwiftUI-вью для отображения превью модуля.
final class HubGridCell: UICollectionViewCell {
	static let identifier = "HubGridCell"
	
	weak var anchorView: UIView?
	
	func configure(with module: HubModule, snapshot: UIImage?) {
		contentConfiguration = UIHostingConfiguration {
			HubGridCellView(module: module, snapshot: snapshot) { [weak self] anchor in
				self?.anchorView = anchor
			}
		}.margins(.all, 0)
	}
}
