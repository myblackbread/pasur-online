//
//  ModuleContentViewController.swift
//  Pasur Online
//
//  Created by Garib Agaev on 17.07.2026.
//

import UIKit
import SwiftUI

protocol ModuleContentViewControllerDelegate: AnyObject {
	func moduleController(_ controller: ModuleContentViewController, didTakeSnapshot snapshot: UIImage)
}

final class ModuleContentViewController: UIViewController {
	let moduleId: UUID
	private let contentView: AnyView
	
	init(moduleId: UUID, contentView: AnyView) {
		self.moduleId = moduleId
		self.contentView = contentView
		super.init(nibName: nil, bundle: nil)
	}
	
	required init?(coder: NSCoder) { fatalError() }
	
	var isAnimating = false
	weak var delegate: ModuleContentViewControllerDelegate?
	
	enum State {
		case idle
		case animating
		case pendingRemoval
	}
	
	var state: State = .idle
	
	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .clear
		
		let hostVC = UIHostingController(rootView: contentView)
		hostVC.view.backgroundColor = .clear
		addChild(hostVC)
		view.addSubview(hostVC.view)
		hostVC.view.frame = view.bounds
		hostVC.didMove(toParent: self)
	}
	
	override func viewWillAppear(_ animated: Bool) {
		super.viewWillAppear(animated)
		state = .animating
	}
	
	override func viewDidAppear(_ animated: Bool) {
		super.viewDidAppear(animated)
		state = .idle
	}
	
	override func viewWillDisappear(_ animated: Bool) {
		super.viewWillDisappear(animated)
		state = .animating
		let snapshot = view.takeSnapshot()
		delegate?.moduleController(self, didTakeSnapshot: snapshot)
	}
}
