import UIKit
import SwiftUI
import Observation

// MARK: - 1. Состояние
@Observable
@propertyWrapper
final class ObservableBox<T> {
	var value: T
	
	var wrappedValue: T {
		get { value } set { value = newValue }
	}
	
	var projectedValue: Binding<T> {
		Binding { self.value } set: { self.value = $0 }
	}
	
	init(wrappedValue: T) {
		self.value = wrappedValue
	}
}

// MARK: - 2. SwiftUI Вьюха
struct TransitionMorphView<TransitionView: View>: View {
	@Binding var isExpanded: Bool
	let originFrame: CGRect
	let targetFrame: CGRect
	let content: () -> TransitionView
	
	var body: some View {
		content()
			.frame(
				width: isExpanded ? targetFrame.width : originFrame.width,
				height: isExpanded ? targetFrame.height : originFrame.height
			)
			.position(
				x: isExpanded ? targetFrame.midX : originFrame.midX,
				y: isExpanded ? targetFrame.midY : originFrame.midY
			)
			.ignoresSafeArea()
	}
}

// MARK: - 3. UIKit Аниматор (Честный iOS 17+ API)
final class MorphTransitionAnimatorPresented<TransitionView: View>: NSObject, UIViewControllerAnimatedTransitioning {
	let animation: Animation
	let originFrame: CGRect
	let content: (Bool, CGFloat) -> TransitionView
	
	init(
		animation: Animation,
		originFrame: CGRect,
		content: @escaping (Bool, CGFloat) -> TransitionView
	) {
		self.animation = animation
		self.originFrame = originFrame
		self.content = content
		super.init()
	}
	
	func transitionDuration(using transitionContext: UIViewControllerContextTransitioning?) -> TimeInterval { 0 }
	
	func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
		guard let toView = transitionContext.view(forKey: .to) else {
			transitionContext.completeTransition(false)
			return
		}
		transitionContext.containerView.addSubview(toView)
		toView.isHidden = true
		
		@ObservableBox var morphState = false
		
		let animatorView = TransitionMorphView(
			isExpanded: $morphState,
			originFrame: originFrame,
			targetFrame: transitionContext.containerView.bounds
		) { [content = content] in
			content(morphState, toView.window?.windowScene?.screen.deviceCornerRadius ?? 0)
		}
		
		let hostingVC = UIHostingController(rootView: animatorView)
		transitionContext.containerView.addSubview(hostingVC.view)
		
		hostingVC.view.backgroundColor = .clear
		hostingVC.view.frame = transitionContext.containerView.bounds
		hostingVC.view.layoutIfNeeded()

		Task { @MainActor [animation = animation] in
			withAnimation(animation) {
				morphState = true
			} completion: {
				hostingVC.view.removeFromSuperview()
				
				toView.isHidden = false
				
				let wasCancelled = transitionContext.transitionWasCancelled
				transitionContext.completeTransition(!wasCancelled)
			}
		}
	}
}

final class MorphTransitionAnimatorDismissed: NSObject, UIViewControllerAnimatedTransitioning {
	let originFrame: CGRect
	
	init(originFrame: CGRect) {
		self.originFrame = originFrame
		super.init()
	}
	
	func transitionDuration(using transitionContext: UIViewControllerContextTransitioning?) -> TimeInterval { 0 }
	
	func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
		let container = transitionContext.containerView
		
		let fromView = transitionContext.view(forKey: .from)
		
		// 1. Раскладываем слои нативных экранов
		guard let fromView = fromView else {
			transitionContext.completeTransition(false)
			return
		}
		fromView.isHidden = true
		
		// 2. Готовим SwiftUI-аниматора
		@ObservableBox var morphState = true
		let animatorView = TransitionMorphView(
			isExpanded: $morphState,
			originFrame: originFrame,
			targetFrame: container.bounds
		) {
			RoundedRectangle(cornerRadius: morphState ? 0 : 24)
				.fill(morphState ? Color.purple : Color.blue)
		}
		
		let hostingVC = UIHostingController(rootView: animatorView)
		hostingVC.view.backgroundColor = .clear
		hostingVC.view.frame = container.bounds
		
		container.addSubview(hostingVC.view)
		
		// КРИТИЧНО: Заставляем SwiftUI просчитать верстку внутри контейнера транзиции
		hostingVC.view.layoutIfNeeded()
		
		// 3. Отступаем на 1 тик RunLoop'а, чтобы SwiftUI осознал себя на экране
		DispatchQueue.main.async {
			
			// ТОТ САМЫЙ ЧЕСТНЫЙ COMPLITION. И ТОЧКА!
			withAnimation(.spring(response: 0.6, dampingFraction: 0.75)) {
				morphState = false
			} completion: {
				
				// Этот блок сработает ровно в ту миллисекунду,
				// когда микроколебания пружины SwiftUI полностью остановятся.
				hostingVC.view.removeFromSuperview()
				
				let wasCancelled = transitionContext.transitionWasCancelled
				transitionContext.completeTransition(!wasCancelled)
			}
			
		}
	}
}


// MARK: - 4. Хаб (Отправитель)
final class HubViewController: UIViewController, UIViewControllerTransitioningDelegate {
	
	private let openButton = UIButton(type: .system)
	
	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .systemBackground
		
		openButton.backgroundColor = .systemBlue
		openButton.setTitle("Открыть модуль", for: .normal)
		openButton.setTitleColor(.white, for: .normal)
		openButton.titleLabel?.font = .systemFont(ofSize: 18, weight: .bold)
		openButton.layer.cornerRadius = 24
		
		openButton.translatesAutoresizingMaskIntoConstraints = false
		view.addSubview(openButton)
		
		NSLayoutConstraint.activate([
			openButton.centerXAnchor.constraint(equalTo: view.centerXAnchor, constant: 40),
			openButton.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: 40),
			openButton.widthAnchor.constraint(equalToConstant: 220),
			openButton.heightAnchor.constraint(equalToConstant: 60)
		])
		
		openButton.addTarget(self, action: #selector(didTapOpen), for: .touchUpInside)
	}
	
	@objc private func didTapOpen() {
		let detailVC = DetailViewController()
		detailVC.modalPresentationStyle = .custom
		detailVC.transitioningDelegate = self
		present(detailVC, animated: true)
	}
	
	func animationController(forPresented presented: UIViewController, presenting: UIViewController, source: UIViewController) -> UIViewControllerAnimatedTransitioning? {
		MorphTransitionAnimatorPresented(
			animation: .spring(response: 0.6, dampingFraction: 0.75),
			originFrame: openButton.convert(openButton.bounds, to: nil)
		) { bool, radius in
			RoundedRectangle(cornerRadius: bool ? 0 : 24)
				.fill(bool ? Color.purple : Color.blue)
		}
	}
	
	func animationController(forDismissed dismissed: UIViewController) -> UIViewControllerAnimatedTransitioning? {
		let frame = openButton.convert(openButton.bounds, to: nil)
		return MorphTransitionAnimatorDismissed(originFrame: frame)
	}
}

// MARK: - 5. Модуль (Получатель)
final class DetailViewController: UIViewController {
	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .purple
		
		let closeButton = UIButton(type: .system)
		closeButton.setTitle("Закрыть", for: .normal)
		closeButton.setTitleColor(.white, for: .normal)
		closeButton.titleLabel?.font = .systemFont(ofSize: 18, weight: .bold)
		closeButton.backgroundColor = UIColor.white.withAlphaComponent(0.2)
		closeButton.layer.cornerRadius = 16
		
		closeButton.translatesAutoresizingMaskIntoConstraints = false
		view.addSubview(closeButton)
		
		NSLayoutConstraint.activate([
			closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
			closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
			closeButton.widthAnchor.constraint(equalToConstant: 100),
			closeButton.heightAnchor.constraint(equalToConstant: 44)
		])
		
		closeButton.addTarget(self, action: #selector(didTapClose), for: .touchUpInside)
		
		let label = UILabel()
		label.text = "Экран загружен!"
		label.textColor = .white
		label.font = .systemFont(ofSize: 28, weight: .bold)
		label.translatesAutoresizingMaskIntoConstraints = false
		view.addSubview(label)
		NSLayoutConstraint.activate([
			label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
			label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
		])
	}
	
	@objc private func didTapClose() {
		dismiss(animated: true)
	}
}

#Preview {
	HubViewController()
}
