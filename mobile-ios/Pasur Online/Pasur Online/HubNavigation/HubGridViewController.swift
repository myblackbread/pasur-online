//
//  HubGridViewController.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import UIKit

protocol HubGridViewControllerDelegate: AnyObject {
	func hubGridViewController(_ controller: HubGridViewController, didSelectModuleWith id: UUID)
}

final class HubGridViewController: UICollectionViewController {
	weak var delegate: HubGridViewControllerDelegate?
	
	private let workspace: HubWorkspace
	
	init(workspace: HubWorkspace) {
		self.workspace = workspace
		
		let layout = UICollectionViewCompositionalLayout { _, _ in
			let spacing = HubNavigationConfig.Grid.spacing
			let item = NSCollectionLayoutItem(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(0.5),
					heightDimension: .fractionalHeight(1.0)
				)
			)
			let group = NSCollectionLayoutGroup.horizontal(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(1.0),
					heightDimension: .fractionalWidth(0.65)
				),
				subitems: [item, item]
			)
			group.interItemSpacing = .fixed(spacing)
			
			let section = NSCollectionLayoutSection(group: group)
			section.contentInsets = NSDirectionalEdgeInsets(
				top: spacing,
				leading: spacing,
				bottom: spacing + 80,
				trailing: spacing
			)
			section.interGroupSpacing = spacing
			return section
		}
		
		super.init(collectionViewLayout: layout)
	}
	
	required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		collectionView.backgroundColor = .clear
		collectionView.register(HubGridCell.self, forCellWithReuseIdentifier: HubGridCell.identifier)
	}
	
	/// Обновляет кэш снапшота для конкретной ячейки (вызывается перед закрытием модуля).
	func update() {
		// Точечное обновление без полного reloadData()
		for cell in collectionView.visibleCells {
			if let gridCell = cell as? HubGridCell, let indexPath = collectionView.indexPath(for: gridCell) {
				let module = workspace.modules[indexPath.item]
				gridCell.configure(with: module, snapshot: workspace.snapshots[module.id])
			}
		}
	}
	
	
	/// Рассчитывает фрейм ячейки в переданной системе координат для выстраивания анимации перехода.
	func getFrameForCell(with id: UUID, in targetView: UIView) -> CGRect? {
		guard let index = workspace.modules.firstIndex(where: { $0.id == id }) else { return nil }
		let indexPath = IndexPath(item: index, section: 0)
		
		if !collectionView.indexPathsForVisibleItems.contains(indexPath) {
			collectionView.scrollToItem(at: indexPath, at: .centeredVertically, animated: false)
			collectionView.layoutIfNeeded()
		}
		
		return (collectionView.cellForItem(at: indexPath) as? HubGridCell)?
			.anchorView
			.map { $0.convert($0.bounds, to: targetView) }
	}
	
	override func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
		return workspace.modules.count
	}
	
	override func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
		let cell = collectionView.dequeueReusableCell(withReuseIdentifier: HubGridCell.identifier, for: indexPath) as! HubGridCell
		cell.configure(with: workspace.modules[indexPath.item], snapshot: workspace.snapshot(for: indexPath.item))
		return cell
	}
	
	override func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		delegate?.hubGridViewController(self, didSelectModuleWith: workspace.modules[indexPath.item].id)
	}
	
	func setCellHidden(_ hidden: Bool, for id: UUID) {
		guard let index = workspace.modules.firstIndex(where: { $0.id == id }) else { return }
		if let cell = collectionView.cellForItem(at: IndexPath(item: index, section: 0)) {
			cell.isHidden = hidden
		}
	}
}
