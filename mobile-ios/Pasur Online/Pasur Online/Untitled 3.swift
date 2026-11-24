//import SwiftUI
//import UIKit
//
//// MARK: - 1. Модель Данных и Состояние
//struct ScrollPageItem: Identifiable {
//	let id: String
//	let content: AnyView
//	
//	init<Content: View>(id: String, @ViewBuilder content: () -> Content) {
//		self.id = id
//		self.content = AnyView(content())
//	}
//}
//
//@Observable
//class ScrollState {
//	var progress: CGFloat = 0.0
//	var thumbRatio: CGFloat = 1.0
//	var isTabBarMode: Bool = false
//	var activeIndex: Int = 0
//	var totalPages: Int = 0
//}
//
//// MARK: - 1.5 Магия Safe Area
//class PageHostingController: UIHostingController<AnyView> {
//	var globalSafeArea: UIEdgeInsets = .zero {
//		didSet { updateSafeArea() }
//	}
//	
//	override func viewSafeAreaInsetsDidChange() {
//		super.viewSafeAreaInsetsDidChange()
//		updateSafeArea()
//	}
//	
//	private func updateSafeArea() {
//		let currentTotal = view.safeAreaInsets
//		let currentAdditional = additionalSafeAreaInsets
//		
//		let rawSystem = UIEdgeInsets(
//			top: currentTotal.top - currentAdditional.top,
//			left: currentTotal.left - currentAdditional.left,
//			bottom: currentTotal.bottom - currentAdditional.bottom,
//			right: currentTotal.right - currentAdditional.right
//		)
//		
//		let neededAdditional = UIEdgeInsets(
//			top: max(0, globalSafeArea.top - rawSystem.top),
//			left: max(0, globalSafeArea.left - rawSystem.left),
//			bottom: max(0, globalSafeArea.bottom - rawSystem.bottom),
//			right: max(0, globalSafeArea.right - rawSystem.right)
//		)
//		
//		if neededAdditional != currentAdditional {
//			additionalSafeAreaInsets = neededAdditional
//		}
//	}
//}
//
//private extension UIViewController {
//	func removeSafely() {
//		willMove(toParent: nil)
//		view.removeFromSuperview()
//		removeFromParent()
//	}
//}
//
//// MARK: - 2. Главный Контроллер
//class UnifiedScrollViewController: UIViewController {
//	
//	var mainScrollView: UIScrollView {
//		if view == nil { loadView() }
//		return view as! UIScrollView
//	}
//	
//	let stackView = UIStackView()
//	var scrollState: ScrollState?
//	
//	private var currentTabBarMode: Bool = false
//	private var currentActiveIndex: Int = 0
//	
//	// Это лютый пиздец. Радиус должен накладыватся на скроллвью, а уже на скроллвью накладываться scale. Что за треш тут происходит?
//	private let targetCornerRadius: CGFloat = 40.0
//	private var cardScale: CGFloat { CGFloat(sqrt(0.5)) }
//	private var cardCornerRadius: CGFloat { targetCornerRadius / cardScale }
//	
//	struct LoadedPage {
//		let scrollView: UIScrollView
//		let hostingVC: PageHostingController
//	}
//	
//	private var loadedPages: [Int: LoadedPage] = [:]
//	private let windowSize = 1
//	
//	private var knownPageHeights: [Int: CGFloat] = [:]
//	private var sizeObservations: [Int: NSKeyValueObservation] = [:]
//	
//	var pages: [ScrollPageItem] = []
//	
//	/*
//	 Почему не?
//	 var pages: [ScrollPageItem] = [] {
//	 didSet { if isViewLoaded { setupPages() } }
//	 }
//	 */
//	
//	override func loadView() { view = UIScrollView() }
//	
//	override func viewDidLoad() {
//		super.viewDidLoad()
//		// НИКАКОЙ НЕ .black!!!!
//		view.backgroundColor = .clear
//		setupMainScrollView()
//		
//		if !pages.isEmpty {
//			setupPages()
//		}
//	}
//	
//	override func viewDidLayoutSubviews() {
//		super.viewDidLayoutSubviews()
//		updateVisiblePages()
//		updateCustomScrollbar()
//	}
//	
//	override func viewSafeAreaInsetsDidChange() {
//		super.viewSafeAreaInsetsDidChange()
//		let insets = view.safeAreaInsets
//		for page in loadedPages.values {
//			page.hostingVC.globalSafeArea = insets
//		}
//		updateCustomScrollbar()
//	}
//	
//	override func didReceiveMemoryWarning() {
//		super.didReceiveMemoryWarning()
//		let screenHeight = mainScrollView.bounds.height
//		guard screenHeight > 0 else { return }
//		let currentIndex = Int(round(mainScrollView.contentOffset.y / screenHeight))
//		let keysToRemove = loadedPages.keys.filter { abs($0 - currentIndex) > windowSize }
//		for key in keysToRemove {
//			if let page = loadedPages[key] {
//				page.hostingVC.removeSafely()
//				page.scrollView.removeFromSuperview()
//			}
//			loadedPages.removeValue(forKey: key)
//			sizeObservations.removeValue(forKey: key)
//		}
//	}
//	
//	func updatePages(_ newPages: [ScrollPageItem]) {
//		let oldIds = pages.map { $0.id }
//		let newIds = newPages.map { $0.id }
//		
//		pages = newPages
//		
//		if oldIds != newIds {
//			if isViewLoaded { setupPages() }
//		} else {
//			for (index, page) in loadedPages {
//				page.hostingVC.rootView = newPages[index].content
//			}
//		}
//	}
//	
//	func syncState(_ state: ScrollState) {
//		if state.totalPages != pages.count {
//			state.totalPages = pages.count
//		}
//		if currentTabBarMode != state.isTabBarMode {
//			currentTabBarMode = state.isTabBarMode
//			setTabBarMode(state.isTabBarMode)
//		}
//		if currentTabBarMode && currentActiveIndex != state.activeIndex {
//			currentActiveIndex = state.activeIndex
//			switchTo(index: state.activeIndex)
//		} else if !currentTabBarMode {
//			currentActiveIndex = state.activeIndex
//		}
//	}
//}
//
//// MARK: - 3. Lazy Loading & Переходы
//private extension UnifiedScrollViewController {
//	
//	func setupMainScrollView() {
//		mainScrollView.isPagingEnabled = true
//		mainScrollView.showsVerticalScrollIndicator = false
//		mainScrollView.contentInsetAdjustmentBehavior = .never
//		mainScrollView.backgroundColor = .clear
//		mainScrollView.delegate = self
//		
//		stackView.translatesAutoresizingMaskIntoConstraints = false
//		stackView.axis = .vertical
//		stackView.distribution = .fill
//		stackView.alignment = .fill
//		mainScrollView.addSubview(stackView)
//		
//		NSLayoutConstraint.activate([
//			stackView.topAnchor.constraint(equalTo: mainScrollView.contentLayoutGuide.topAnchor),
//			stackView.bottomAnchor.constraint(equalTo: mainScrollView.contentLayoutGuide.bottomAnchor),
//			stackView.leadingAnchor.constraint(equalTo: mainScrollView.contentLayoutGuide.leadingAnchor),
//			stackView.trailingAnchor.constraint(equalTo: mainScrollView.contentLayoutGuide.trailingAnchor),
//			stackView.widthAnchor.constraint(equalTo: mainScrollView.frameLayoutGuide.widthAnchor)
//		])
//	}
//	
//	func setupPages() {
//		loadedPages.values.forEach {
//			$0.hostingVC.removeSafely()
//			$0.scrollView.removeFromSuperview()
//		}
//		loadedPages.removeAll()
//		sizeObservations.removeAll()
//		knownPageHeights.removeAll()
//		stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
//		
//		for _ in pages {
//			let container = UIView()
//			container.translatesAutoresizingMaskIntoConstraints = false
//			container.backgroundColor = .clear
//			stackView.addArrangedSubview(container)
//			
//			NSLayoutConstraint.activate([
//				container.heightAnchor.constraint(equalTo: mainScrollView.frameLayoutGuide.heightAnchor),
//				container.widthAnchor.constraint(equalTo: mainScrollView.frameLayoutGuide.widthAnchor)
//			])
//		}
//		view.setNeedsLayout()
//	}
//	
//	func updateVisiblePages() {
//		let screenHeight = mainScrollView.bounds.height
//		guard screenHeight > 0, !pages.isEmpty else { return }
//		
//		// Зачем это? Разве архитектура сама не должна ГАРАНТИРОВАТЬ их равенство? Непонятно
//		guard stackView.arrangedSubviews.count == pages.count else { return }
//		
//		let offsetY = mainScrollView.contentOffset.y
//		let currentIndex = Int(round(offsetY / screenHeight))
//		
//		let startIndex = max(0, currentIndex - windowSize)
//		let endIndex = min(pages.count - 1, currentIndex + windowSize)
//		let visibleRange = startIndex...endIndex
//		
//		for (index, page) in loadedPages {
//			if !visibleRange.contains(index) {
//				page.scrollView.removeFromSuperview()
//			}
//		}
//		
//		for index in visibleRange {
//			let container = stackView.arrangedSubviews[index]
//			if let existingPage = loadedPages[index] {
//				if existingPage.scrollView.superview == nil {
//					container.addSubview(existingPage.scrollView)
//					pin(view: existingPage.scrollView, to: container)
//					existingPage.hostingVC.globalSafeArea = view.safeAreaInsets
//					applyCurrentScale(to: existingPage.scrollView)
//				}
//			} else {
//				let newPage = buildPage(at: index)
//				loadedPages[index] = newPage
//				container.addSubview(newPage.scrollView)
//				pin(view: newPage.scrollView, to: container)
//				applyCurrentScale(to: newPage.scrollView)
//			}
//		}
//	}
//	
//	private func pin(view child: UIView, to container: UIView) {
//		child.translatesAutoresizingMaskIntoConstraints = false
//		NSLayoutConstraint.activate([
//			child.topAnchor.constraint(equalTo: container.topAnchor),
//			child.bottomAnchor.constraint(equalTo: container.bottomAnchor),
//			child.leadingAnchor.constraint(equalTo: container.leadingAnchor),
//			child.trailingAnchor.constraint(equalTo: container.trailingAnchor)
//		])
//	}
//	
//	private func buildPage(at index: Int) -> LoadedPage {
//		let innerScrollView = UIScrollView()
//		innerScrollView.translatesAutoresizingMaskIntoConstraints = false
//		innerScrollView.showsVerticalScrollIndicator = false
//		innerScrollView.contentInsetAdjustmentBehavior = .never
//		innerScrollView.alwaysBounceVertical = false
//		innerScrollView.delegate = self
//		
//		let hostingVC = PageHostingController(rootView: pages[index].content)
//		
//		// ✅ ИСПРАВЛЕНИЕ 1: Заставляем UIHostingController отдавать размер SwiftUI-контента
//		// Так, еще одно очень сомнительное действеие, но ладно
//		if #available(iOS 16.0, *) {
//			hostingVC.sizingOptions = [.intrinsicContentSize]
//		}
//		
//		hostingVC.globalSafeArea = view.safeAreaInsets
//		
//		addChild(hostingVC)
//		
//		if let hostView = hostingVC.view {
//			hostView.translatesAutoresizingMaskIntoConstraints = false
//			hostView.backgroundColor = .clear
//			
//			innerScrollView.addSubview(hostView)
//			NSLayoutConstraint.activate([
//				hostView.topAnchor.constraint(equalTo: innerScrollView.contentLayoutGuide.topAnchor),
//				hostView.bottomAnchor.constraint(equalTo: innerScrollView.contentLayoutGuide.bottomAnchor),
//				hostView.leadingAnchor.constraint(equalTo: innerScrollView.contentLayoutGuide.leadingAnchor),
//				hostView.trailingAnchor.constraint(equalTo: innerScrollView.contentLayoutGuide.trailingAnchor),
//				hostView.widthAnchor.constraint(equalTo: innerScrollView.frameLayoutGuide.widthAnchor),
//				hostView.heightAnchor.constraint(greaterThanOrEqualTo: innerScrollView.frameLayoutGuide.heightAnchor)
//			])
//		}
//		
//		hostingVC.didMove(toParent: self)
//		
//		sizeObservations[index] = innerScrollView.observe(\.contentSize, options: [.new]) { [weak self] scroll, _ in
//			self?.knownPageHeights[index] = scroll.contentSize.height
//			self?.updateCustomScrollbar()
//		}
//		return LoadedPage(scrollView: innerScrollView, hostingVC: hostingVC)
//	}
//	
//	private func applyCurrentScale(to view: UIView) {
//		view.alpha = 1.0
//		if currentTabBarMode {
//			view.transform = CGAffineTransform(scaleX: cardScale, y: cardScale)
//			// Ну что это за пиздец? Я просто по другому не знаю как выразиться
//			// Кто это вообще придумал?
//			view.layer.cornerRadius = cardCornerRadius
//		} else {
//			view.transform = .identity
//			view.layer.cornerRadius = 0
//		}
//		view.layer.masksToBounds = true
//	}
//	
//	func setTabBarMode(_ active: Bool) {
//		mainScrollView.isScrollEnabled = !active
//		let animator = UIViewPropertyAnimator(duration: 0.35, dampingRatio: 0.8)
//		animator.addAnimations {
//			for page in self.loadedPages.values {
//				self.applyCurrentScale(to: page.scrollView)
//			}
//		}
//		animator.startAnimation()
//	}
//	
//	func switchTo(index: Int) {
//		guard index >= 0 && index < pages.count else { return }
//		let screenHeight = mainScrollView.bounds.height
//		guard screenHeight > 0 else { return }
//		
//		mainScrollView.setContentOffset(CGPoint(x: 0, y: CGFloat(index) * screenHeight), animated: false)
//		updateVisiblePages()
//		
//		guard let newScrollView = loadedPages[index]?.scrollView else { return }
//		newScrollView.layer.removeAllAnimations()
//		
//		let startScale = cardScale * 0.95
//		newScrollView.transform = CGAffineTransform(scaleX: startScale, y: startScale)
//		newScrollView.alpha = 0.0
//		// ЧТО ЭТО? КТО ЭТО ВЫДУМАЛ ВООБЩЕ???? НУ ЭТОЖ БРЕД!!!!!!
//		newScrollView.layer.cornerRadius = cardCornerRadius
//		newScrollView.layer.masksToBounds = true
//		
//		let animator = UIViewPropertyAnimator(duration: 0.25, curve: .easeOut) {
//			newScrollView.transform = CGAffineTransform(scaleX: self.cardScale, y: self.cardScale)
//			newScrollView.alpha = 1.0
//		}
//		animator.startAnimation()
//	}
//}
//
//// MARK: - 4. Делегат Скролла
//extension UnifiedScrollViewController: UIScrollViewDelegate {
//	
//	func scrollViewDidScroll(_ scrollView: UIScrollView) {
//		let screenHeight = mainScrollView.bounds.height
//		if scrollView === mainScrollView {
//			updateVisiblePages()
//			if screenHeight > 0, !currentTabBarMode {
//				let currentIndex = Int(round(mainScrollView.contentOffset.y / screenHeight))
//				if scrollState?.activeIndex != currentIndex {
//					scrollState?.activeIndex = currentIndex
//				}
//			}
//		}
//		updateCustomScrollbar()
//	}
//	
//	private func updateCustomScrollbar() {
//		guard let scrollState = scrollState else { return }
//		let screenHeight = view.bounds.height
//		guard screenHeight > 0, !pages.isEmpty else { return }
//		
//		let pageHeights = (0..<pages.count).map { max(screenHeight, knownPageHeights[$0] ?? screenHeight) }
//		let totalVirtualHeight = pageHeights.reduce(0, +)
//		let mainY = mainScrollView.contentOffset.y
//		let maxMainY = CGFloat(pages.count - 1) * screenHeight
//		let clampedMainY = max(0, min(mainY, maxMainY))
//		
//		let currentPageIndex = Int(clampedMainY / screenHeight)
//		let pageProgress = (clampedMainY / screenHeight) - CGFloat(currentPageIndex)
//		
//		let currentInnerOffset = loadedPages[currentPageIndex]?.scrollView.contentOffset.y ?? 0
//		let maxInnerOffset = pageHeights[currentPageIndex] - screenHeight
//		let clampedInnerOffset = max(0, min(currentInnerOffset, maxInnerOffset))
//		
//		let currentBaseY = pageHeights[0..<currentPageIndex].reduce(0, +)
//		let virtualYStart = currentBaseY + clampedInnerOffset
//		var finalVirtualY = virtualYStart
//		
//		if pageProgress > 0 && currentPageIndex + 1 < pages.count {
//			let nextInnerOffset = loadedPages[currentPageIndex + 1]?.scrollView.contentOffset.y ?? 0
//			let maxNextInnerOffset = pageHeights[currentPageIndex + 1] - screenHeight
//			let clampedNextInnerOffset = max(0, min(nextInnerOffset, maxNextInnerOffset))
//			
//			let nextBaseY = pageHeights[0..<(currentPageIndex + 1)].reduce(0, +)
//			let virtualYEnd = nextBaseY + clampedNextInnerOffset
//			
//			finalVirtualY = virtualYStart * (1.0 - pageProgress) + virtualYEnd * pageProgress
//		}
//		
//		let maxVirtualOffset = totalVirtualHeight - screenHeight
//		let percentScrolled = maxVirtualOffset > 0 ? (finalVirtualY / maxVirtualOffset) : 0
//		
//		scrollState.progress = percentScrolled
//		scrollState.thumbRatio = max(0.05, min(screenHeight / totalVirtualHeight, 1.0))
//	}
//}
//
//// MARK: - 5. SwiftUI Обертка
//struct UnifiedPagingScrollView: UIViewControllerRepresentable {
//	let pages: [ScrollPageItem]
//	let scrollState: ScrollState
//	
//	func makeUIViewController(context: Context) -> UnifiedScrollViewController {
//		let vc = UnifiedScrollViewController()
//		vc.updatePages(pages)
//		vc.scrollState = scrollState
//		return vc
//	}
//	
//	func updateUIViewController(_ uiViewController: UnifiedScrollViewController, context: Context) {
//		uiViewController.updatePages(pages)
//		uiViewController.syncState(scrollState)
//	}
//}
//
//// MARK: - 6. Кастомный Скроллбар
//struct CustomScrollbarView: View {
//	var state: ScrollState
//	
//	enum ScrubState: Equatable {
//		case none
//		case tooHigh(bestY: CGFloat)
//		case tooLow(bestY: CGFloat)
//		case ideal
//	}
//	
//	@State private var scrubState: ScrubState = .none
//	@State private var dragTimer: Timer?
//	@State private var isTouching: Bool = false
//	
//	@State private var tabBarTop: CGFloat = 0
//	@State private var tabBarBottom: CGFloat = 0
//	
//	var body: some View {
//		GeometryReader { geo in
//			let workingHeight = geo.size.height
//			let N = CGFloat(max(1, state.totalPages))
//			let h_ideal = workingHeight / N
//			
//			let normalHeight = max(36, workingHeight * state.thumbRatio)
//			let normalY = state.progress * (workingHeight - normalHeight)
//			
//			// 1. Абсолютные идеальные координаты (Используем как "якорь" безопасности)
//			let currentActiveTop = CGFloat(state.activeIndex) * h_ideal
//			let currentActiveBottom = currentActiveTop + h_ideal
//			
//			// 2. Умное вычисление рамки.
//			// Если состояние .none (палец отпущен), жестко привязываемся к математике индекса.
//			// Во время жеста доверяем tabBarTop/Bottom для физики натяжения.
//			let finalTop: CGFloat = state.isTabBarMode
//			? (scrubState == .none ? currentActiveTop : tabBarTop)
//			: normalY
//			
//			let finalBottom: CGFloat = state.isTabBarMode
//			? (scrubState == .none ? currentActiveBottom : tabBarBottom)
//			: (normalY + normalHeight)
//			
//			let finalHeight = max(finalBottom - finalTop, 10)
//			let width: CGFloat = state.isTabBarMode ? 44 : 4
//			
//			ZStack(alignment: .topLeading) {
//				ZStack(alignment: .top) {
//					Capsule()
//						.fill(state.isTabBarMode ? Color.white.opacity(0.15) : Color.white.opacity(0.4))
//						.background(Capsule().fill(.ultraThinMaterial).opacity(state.isTabBarMode ? 1 : 0))
//					
//					if state.isTabBarMode {
//						GeometryReader { capGeo in
//							ForEach(0..<state.totalPages, id: \.self) { index in
//								// Логика из 2-го варианта: плавное появление/исчезновение
//								let isPathOpen: Bool = {
//									switch scrubState {
//									case .ideal, .none: return true
//									case .tooHigh: return index >= state.activeIndex
//									case .tooLow: return index <= state.activeIndex
//									}
//								}()
//								
//								let isActive = (index == state.activeIndex)
//								let absY = (CGFloat(index) + 0.5) * h_ideal
//								let localY = absY - finalTop
//								
//								Circle()
//									.fill(Color.white)
//									.frame(width: 14, height: 14)
//									.position(x: capGeo.size.width / 2, y: localY)
//									.opacity(isPathOpen ? (isActive ? 1.0 : 0.4) : 0.0)
//									.scaleEffect(isPathOpen ? (isActive ? 1.3 : 1.0) : 0.5)
//									.animation(.spring(response: 0.3, dampingFraction: 0.7), value: isActive)
//									.animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPathOpen)
//							}
//						}
//					}
//				}
//				.frame(width: width, height: finalHeight)
//				.contentShape(Rectangle().inset(by: -20))
//				.offset(x: geo.size.width - width - 6, y: finalTop)
//				.gesture(
//					DragGesture(minimumDistance: 0, coordinateSpace: .named("ScrollArea"))
//						.onChanged { value in
//							let Y_f = value.location.y
//							let r: CGFloat = 22.0
//							
//							// Логика из 1-го варианта: Мягкий захват позиции без телепортации
//							if !isTouching {
//								isTouching = true
//								dragTimer = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: false) { _ in
//									let i = CGFloat(state.activeIndex)
//									let y_top_ideal = i * h_ideal
//									let y_bottom_ideal = y_top_ideal + h_ideal
//									
//									if Y_f < y_top_ideal {
//										scrubState = .tooHigh(bestY: Y_f)
//										tabBarTop = Y_f - r
//										tabBarBottom = y_bottom_ideal
//									} else if Y_f > y_bottom_ideal {
//										scrubState = .tooLow(bestY: Y_f)
//										tabBarTop = y_top_ideal
//										tabBarBottom = Y_f + r
//									} else {
//										scrubState = .ideal
//										tabBarTop = y_top_ideal
//										tabBarBottom = y_bottom_ideal
//									}
//									
//									withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
//										state.isTabBarMode = true
//									}
//									UIImpactFeedbackGenerator(style: .medium).impactOccurred()
//								}
//							}
//							
//							if state.isTabBarMode {
//								let y_top_ideal = CGFloat(state.activeIndex) * h_ideal
//								let y_bottom_ideal = y_top_ideal + h_ideal
//								
//								switch scrubState {
//								case .tooHigh(let bestY):
//									if Y_f < bestY {
//										let rubberBand = sqrt(bestY - Y_f) * 1.5
//										tabBarTop = bestY - r - rubberBand
//										tabBarBottom = y_bottom_ideal
//									} else {
//										let newBestY = Y_f
//										if newBestY - r >= y_top_ideal {
//											scrubState = .ideal
//											tabBarTop = y_top_ideal
//											tabBarBottom = y_bottom_ideal
//											UIImpactFeedbackGenerator(style: .light).impactOccurred()
//										} else {
//											scrubState = .tooHigh(bestY: newBestY)
//											tabBarTop = newBestY - r
//											tabBarBottom = y_bottom_ideal
//										}
//									}
//								case .tooLow(let bestY):
//									if Y_f > bestY {
//										let rubberBand = sqrt(Y_f - bestY) * 1.5
//										tabBarTop = y_top_ideal
//										tabBarBottom = bestY + r + rubberBand
//									} else {
//										let newBestY = Y_f
//										if newBestY + r <= y_bottom_ideal {
//											scrubState = .ideal
//											tabBarTop = y_top_ideal
//											tabBarBottom = y_bottom_ideal
//											UIImpactFeedbackGenerator(style: .light).impactOccurred()
//										} else {
//											scrubState = .tooLow(bestY: newBestY)
//											tabBarTop = y_top_ideal
//											tabBarBottom = newBestY + r
//										}
//									}
//								case .ideal, .none:
//									let targetIndex = Int(max(0, min(CGFloat(state.totalPages - 1), Y_f / h_ideal)))
//									if targetIndex != state.activeIndex {
//										state.activeIndex = targetIndex
//										UIImpactFeedbackGenerator(style: .light).impactOccurred()
//									}
//									
//									let new_top = CGFloat(state.activeIndex) * h_ideal
//									let new_bottom = new_top + h_ideal
//									
//									// Логика из 1-го варианта: оттяжка за края экрана (overscroll)
//									if Y_f < 0 {
//										tabBarTop = -sqrt(-Y_f) * 1.5
//										tabBarBottom = h_ideal
//									} else if Y_f > workingHeight {
//										tabBarTop = workingHeight - h_ideal
//										tabBarBottom = workingHeight + sqrt(Y_f - workingHeight) * 1.5
//									} else {
//										tabBarTop = new_top
//										tabBarBottom = new_bottom
//									}
//								}
//							}
//						}
//						.onEnded { _ in
//							isTouching = false
//							dragTimer?.invalidate()
//							if state.isTabBarMode {
//								withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
//									// Сбрасываем в .none. Это мгновенно "включит" currentActiveTop/Bottom
//									// в формуле finalTop/finalBottom, обеспечив идеальное выравнивание.
//									state.isTabBarMode = false
//									scrubState = .none
//								}
//							}
//						}
//				)
//			}
//		}
//		.coordinateSpace(name: "ScrollArea")
//	}
//}
//
//// MARK: - 7. Тестовая Вьюха (ExampleView)
//struct ExampleView: View {
//	@State private var scrollState = ScrollState()
//	
//	var body: some View {
//		let mockData = [
//			(id: "page1", title: "Экран 1", color: Color(red: 0.1, green: 0.1, blue: 0.15), isLong: false),
//			(id: "page2", title: "Экран 2 (ДЛИННЫЙ)", color: Color(red: 0.15, green: 0.1, blue: 0.2), isLong: true),
//			(id: "page3", title: "Экран 3", color: Color(red: 0.1, green: 0.15, blue: 0.1), isLong: false),
//			(id: "page4", title: "Экран 4 (ДЛИННЫЙ)", color: Color(red: 0.2, green: 0.1, blue: 0.1), isLong: true),
//			(id: "page5", title: "Экран 5", color: Color(red: 0.1, green: 0.1, blue: 0.25), isLong: false)
//		]
//		
//		// ✅ ИСПРАВЛЕНИЕ 2: NavigationStack вынесен наружу, чтобы не мешать внутреннему скроллу
//		NavigationStack {
//			ZStack {
//				Color.black.ignoresSafeArea()
//				
//				UnifiedPagingScrollView(pages: mockData.map { item in
//					ScrollPageItem(id: item.id) {
//						// ✅ Оставляем чистый VStack без ZStack, чтобы он отдавал свою честную высоту UIKit'у
//						VStack(spacing: 20) {
//							Text(item.title)
//								.font(.system(size: 32, weight: .black, design: .rounded))
//								.foregroundColor(.white)
//							
//							if item.id == "page1" {
//								NavigationLink("Тест Навигации (Сохранение стейта)") {
//									ZStack {
//										Color.blue.ignoresSafeArea()
//										Text("Вы ушли вглубь Экрана 1!\nПереключите таб и вернитесь сюда, чтобы убедиться, что всё сохранилось.")
//											.multilineTextAlignment(.center)
//											.font(.headline)
//											.foregroundColor(.white)
//											.padding()
//									}
//								}
//								.buttonStyle(.borderedProminent)
//								.tint(.white.opacity(0.2))
//							}
//							
//							if item.isLong {
//								Text("👇 Скролль вниз, тут 50 блоков!")
//									.foregroundColor(.white.opacity(0.7))
//								ForEach(1...50, id: \.self) { i in
//									HStack {
//										Text("Блок №\(i)").foregroundColor(.white).fontWeight(.semibold)
//										Spacer()
//									}
//									.padding().background(Color.white.opacity(0.08)).cornerRadius(16).padding(.horizontal)
//								}
//							} else {
//								Spacer()
//								Text("Короткий экран").foregroundColor(.white.opacity(0.4))
//								Spacer()
//							}
//						}
//						.padding(.bottom, 60)
//						.padding(.top, 20)
//						.frame(maxWidth: .infinity, maxHeight: .infinity)
//						.background(item.color.ignoresSafeArea()) // ✅ Цвета фона применяются напрямую сюда
//					}
//				}, scrollState: scrollState)
//				.ignoresSafeArea()
//				
//				CustomScrollbarView(state: scrollState)
//					.padding(.vertical, 8)
//			}
//		}
//	}
//}
//
//#Preview {
//	ExampleView()
//}
