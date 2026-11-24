//import SwiftUI
//import UIKit
////
////// MARK: - 1. Модель Данных и Состояние
////struct ScrollPageItem: Identifiable {
////	let id = UUID()
////	let content: AnyView
////	
////	init<Content: View>(@ViewBuilder content: () -> Content) {
////		self.content = AnyView(content())
////	}
////}
////
////@Observable
////class ScrollState {
////	var progress: CGFloat = 0.0
////	var thumbRatio: CGFloat = 1.0
////	var isTabBarMode: Bool = false
////	var activeIndex: Int = 0
////	var totalPages: Int = 0
////}
////
////// MARK: - 1.5 Магия Safe Area
////class PageHostingController: UIHostingController<AnyView> {
////	var globalSafeArea: UIEdgeInsets = .zero {
////		didSet { updateSafeArea() }
////	}
////	
////	override func viewSafeAreaInsetsDidChange() {
////		super.viewSafeAreaInsetsDidChange()
////		updateSafeArea()
////	}
////	
////	private func updateSafeArea() {
////		let currentTotal = view.safeAreaInsets
////		let currentAdditional = additionalSafeAreaInsets
////		
////		let rawSystem = UIEdgeInsets(
////			top: currentTotal.top - currentAdditional.top,
////			left: currentTotal.left - currentAdditional.left,
////			bottom: currentTotal.bottom - currentAdditional.bottom,
////			right: currentTotal.right - currentAdditional.right
////		)
////		
////		let neededAdditional = UIEdgeInsets(
////			top: max(0, globalSafeArea.top - rawSystem.top),
////			left: max(0, globalSafeArea.left - rawSystem.left),
////			bottom: max(0, globalSafeArea.bottom - rawSystem.bottom),
////			right: max(0, globalSafeArea.right - rawSystem.right)
////		)
////		
////		if neededAdditional != currentAdditional {
////			additionalSafeAreaInsets = neededAdditional
////		}
////	}
////}
////
////private extension UIViewController {
////	func removeSafely() {
////		willMove(toParent: nil)
////		view.removeFromSuperview()
////		removeFromParent()
////	}
////}
////
////// MARK: - 2. Главный Контроллер Контейнера
////class UnifiedScrollViewController: UIViewController {
////	
////	var mainScrollView: UIScrollView {
////		if view == nil { loadView() }
////		return view as! UIScrollView
////	}
////	
////	let stackView = UIStackView()
////	var scrollState: ScrollState?
////	
////	private var currentTabBarMode: Bool = false
////	private var currentActiveIndex: Int = 0
////	
////	struct LoadedPage {
////		let scrollView: UIScrollView
////		let hostingVC: PageHostingController
////	}
////	
////	private var loadedPages: [Int: LoadedPage] = [:]
////	private let windowSize = 1
////	
////	private var knownPageHeights: [Int: CGFloat] = [:]
////	private var sizeObservations: [Int: NSKeyValueObservation] = [:]
////	
////	var pages: [ScrollPageItem] = [] {
////		didSet { if isViewLoaded { setupPages() } }
////	}
////	
////	override func loadView() { view = UIScrollView() }
////	
////	override func viewDidLoad() {
////		super.viewDidLoad()
////		view.backgroundColor = .black
////		setupMainScrollView()
////		setupPages()
////	}
////	
////	override func viewDidLayoutSubviews() {
////		super.viewDidLayoutSubviews()
////		updateVisiblePages()
////		updateCustomScrollbar()
////	}
////	
////	override func viewSafeAreaInsetsDidChange() {
////		super.viewSafeAreaInsetsDidChange()
////		let insets = view.safeAreaInsets
////		for page in loadedPages.values {
////			page.hostingVC.globalSafeArea = insets
////		}
////		updateCustomScrollbar()
////	}
////	
////	override func didReceiveMemoryWarning() {
////		super.didReceiveMemoryWarning()
////		let screenHeight = mainScrollView.bounds.height
////		guard screenHeight > 0 else { return }
////		let currentIndex = Int(round(mainScrollView.contentOffset.y / screenHeight))
////		let keysToRemove = loadedPages.keys.filter { abs($0 - currentIndex) > windowSize }
////		for key in keysToRemove {
////			if let page = loadedPages[key] {
////				page.hostingVC.removeSafely()
////				page.scrollView.removeFromSuperview()
////			}
////			loadedPages.removeValue(forKey: key)
////			sizeObservations.removeValue(forKey: key)
////		}
////	}
////	
////	func syncState(_ state: ScrollState) {
////		if state.totalPages != pages.count {
////			state.totalPages = pages.count
////		}
////		
////		// 1. Анимация входа/выхода из режима таббара (Уменьшение до 0.5 и возврат до 1.0)
////		if currentTabBarMode != state.isTabBarMode {
////			currentTabBarMode = state.isTabBarMode
////			setTabBarMode(state.isTabBarMode)
////		}
////		
////		// 2. Анимация переключения экранов внутри режима таббара
////		if currentTabBarMode && currentActiveIndex != state.activeIndex {
////			currentActiveIndex = state.activeIndex
////			switchTo(index: state.activeIndex)
////		} else if !currentTabBarMode {
////			currentActiveIndex = state.activeIndex
////		}
////	}
////}
////
////// MARK: - 3. Lazy Loading & Переходы
////private extension UnifiedScrollViewController {
////	
////	func setupMainScrollView() {
////		mainScrollView.isPagingEnabled = true
////		mainScrollView.showsVerticalScrollIndicator = false
////		mainScrollView.contentInsetAdjustmentBehavior = .never
////		mainScrollView.backgroundColor = .clear
////		mainScrollView.delegate = self
////		
////		stackView.translatesAutoresizingMaskIntoConstraints = false
////		stackView.axis = .vertical
////		stackView.distribution = .fill
////		stackView.alignment = .fill
////		mainScrollView.addSubview(stackView)
////		
////		NSLayoutConstraint.activate([
////			stackView.topAnchor.constraint(equalTo: mainScrollView.contentLayoutGuide.topAnchor),
////			stackView.bottomAnchor.constraint(equalTo: mainScrollView.contentLayoutGuide.bottomAnchor),
////			stackView.leadingAnchor.constraint(equalTo: mainScrollView.contentLayoutGuide.leadingAnchor),
////			stackView.trailingAnchor.constraint(equalTo: mainScrollView.contentLayoutGuide.trailingAnchor),
////			stackView.widthAnchor.constraint(equalTo: mainScrollView.frameLayoutGuide.widthAnchor)
////		])
////	}
////	
////	func setupPages() {
////		loadedPages.values.forEach {
////			$0.hostingVC.removeSafely()
////			$0.scrollView.removeFromSuperview()
////		}
////		loadedPages.removeAll()
////		sizeObservations.removeAll()
////		knownPageHeights.removeAll()
////		stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
////		
////		for _ in pages {
////			let container = UIView()
////			container.translatesAutoresizingMaskIntoConstraints = false
////			container.backgroundColor = .clear
////			stackView.addArrangedSubview(container)
////			
////			NSLayoutConstraint.activate([
////				container.heightAnchor.constraint(equalTo: mainScrollView.frameLayoutGuide.heightAnchor),
////				container.widthAnchor.constraint(equalTo: mainScrollView.frameLayoutGuide.widthAnchor)
////			])
////		}
////		view.setNeedsLayout()
////	}
////	
////	func updateVisiblePages() {
////		let screenHeight = mainScrollView.bounds.height
////		guard screenHeight > 0, !pages.isEmpty else { return }
////		
////		let offsetY = mainScrollView.contentOffset.y
////		let currentIndex = Int(round(offsetY / screenHeight))
////		
////		let startIndex = max(0, currentIndex - windowSize)
////		let endIndex = min(pages.count - 1, currentIndex + windowSize)
////		let visibleRange = startIndex...endIndex
////		
////		for (index, page) in loadedPages {
////			if !visibleRange.contains(index) {
////				page.scrollView.removeFromSuperview()
////			}
////		}
////		
////		for index in visibleRange {
////			let container = stackView.arrangedSubviews[index]
////			if let existingPage = loadedPages[index] {
////				if existingPage.scrollView.superview == nil {
////					container.addSubview(existingPage.scrollView)
////					pin(view: existingPage.scrollView, to: container)
////					existingPage.hostingVC.globalSafeArea = view.safeAreaInsets
////					
////					// Жестко поддерживаем актуальный масштаб при возврате вьюхи из памяти
////					applyCurrentScale(to: existingPage.scrollView)
////				}
////			} else {
////				let newPage = buildPage(at: index)
////				loadedPages[index] = newPage
////				container.addSubview(newPage.scrollView)
////				pin(view: newPage.scrollView, to: container)
////				
////				// Жестко поддерживаем актуальный масштаб при ленивом создании
////				applyCurrentScale(to: newPage.scrollView)
////			}
////		}
////	}
////	
////	private func pin(view child: UIView, to container: UIView) {
////		child.translatesAutoresizingMaskIntoConstraints = false
////		NSLayoutConstraint.activate([
////			child.topAnchor.constraint(equalTo: container.topAnchor),
////			child.bottomAnchor.constraint(equalTo: container.bottomAnchor),
////			child.leadingAnchor.constraint(equalTo: container.leadingAnchor),
////			child.trailingAnchor.constraint(equalTo: container.trailingAnchor)
////		])
////	}
////	
////	private func buildPage(at index: Int) -> LoadedPage {
////		// СКРОЛЛ ВЬЮ — ЭТО И ЕСТЬ НАШЕ ОКНО ЭКРАНА
////		let innerScrollView = UIScrollView()
////		innerScrollView.translatesAutoresizingMaskIntoConstraints = false
////		innerScrollView.showsVerticalScrollIndicator = false
////		innerScrollView.contentInsetAdjustmentBehavior = .never
////		innerScrollView.alwaysBounceVertical = false
////		innerScrollView.delegate = self
////		
////		let hostingVC = PageHostingController(rootView: pages[index].content)
////		hostingVC.globalSafeArea = view.safeAreaInsets
////		
////		addChild(hostingVC)
////		
////		if let hostView = hostingVC.view {
////			hostView.translatesAutoresizingMaskIntoConstraints = false
////			hostView.backgroundColor = .clear
////			
////			innerScrollView.addSubview(hostView)
////			NSLayoutConstraint.activate([
////				hostView.topAnchor.constraint(equalTo: innerScrollView.contentLayoutGuide.topAnchor),
////				hostView.bottomAnchor.constraint(equalTo: innerScrollView.contentLayoutGuide.bottomAnchor),
////				hostView.leadingAnchor.constraint(equalTo: innerScrollView.contentLayoutGuide.leadingAnchor),
////				hostView.trailingAnchor.constraint(equalTo: innerScrollView.contentLayoutGuide.trailingAnchor),
////				hostView.widthAnchor.constraint(equalTo: innerScrollView.frameLayoutGuide.widthAnchor),
////				hostView.heightAnchor.constraint(greaterThanOrEqualTo: innerScrollView.frameLayoutGuide.heightAnchor)
////			])
////		}
////		
////		hostingVC.didMove(toParent: self)
////		
////		sizeObservations[index] = innerScrollView.observe(\.contentSize, options: [.new]) { [weak self] scroll, _ in
////			self?.knownPageHeights[index] = scroll.contentSize.height
////			self?.updateCustomScrollbar()
////		}
////		return LoadedPage(scrollView: innerScrollView, hostingVC: hostingVC)
////	}
////	
////	// ВАЖНО: Применяется только к окну (innerScrollView)
////	private func applyCurrentScale(to view: UIView) {
////		view.alpha = 1.0 // Сбрасываем прозрачность на 100%
////		if currentTabBarMode {
////			view.transform = CGAffineTransform(scaleX: 0.5, y: 0.5)
////			view.layer.cornerRadius = 80 // При масштабе 0.5 скругление 80 визуально выглядит как 40
////		} else {
////			view.transform = .identity
////			view.layer.cornerRadius = 0
////		}
////		view.layer.masksToBounds = true // Обязательно обрезаем длинный контент маской
////	}
////	
////	// ✅ Анимация уменьшения (входа) и увеличения (выхода)
////	func setTabBarMode(_ active: Bool) {
////		mainScrollView.isScrollEnabled = !active
////		
////		// Используем железобетонный UIViewPropertyAnimator, чтобы перебить транзакции SwiftUI
////		let animator = UIViewPropertyAnimator(duration: 0.35, dampingRatio: 0.8)
////		animator.addAnimations {
////			// Анимируем абсолютно все загруженные окна, чтобы не было "рваных" кусков на фоне
////			for page in self.loadedPages.values {
////				self.applyCurrentScale(to: page.scrollView)
////			}
////		}
////		animator.startAnimation()
////	}
////	
////	// ✅ Анимация переключения экранов (Scale + Opacity)
////	func switchTo(index: Int) {
////		guard index >= 0 && index < pages.count else { return }
////		let screenHeight = mainScrollView.bounds.height
////		guard screenHeight > 0 else { return }
////		
////		// 1. Старый экран исчезает МГНОВЕННО
////		mainScrollView.setContentOffset(CGPoint(x: 0, y: CGFloat(index) * screenHeight), animated: false)
////		
////		// Принудительно вызываем обновление видимости, чтобы создать/показать новый экран
////		updateVisiblePages()
////		
////		// Достаем окно (scrollView) нового экрана
////		guard let newScrollView = loadedPages[index]?.scrollView else { return }
////		
////		// Останавливаем любые застрявшие анимации на этом окне
////		newScrollView.layer.removeAllAnimations()
////		
////		// 2. Подготавливаем стартовое состояние нового экрана
////		newScrollView.transform = CGAffineTransform(scaleX: 0.48, y: 0.48) // Чуть меньше, чем нужно
////		newScrollView.alpha = 0.0 // Полностью прозрачный
////		newScrollView.layer.cornerRadius = 80
////		newScrollView.layer.masksToBounds = true
////		
////		// 3. Плавно проявляем новый экран
////		let animator = UIViewPropertyAnimator(duration: 0.25, curve: .easeOut) {
////			newScrollView.transform = CGAffineTransform(scaleX: 0.5, y: 0.5) // Доводим до 0.5
////			newScrollView.alpha = 1.0 // Делаем полностью видимым
////		}
////		animator.startAnimation()
////	}
////}
////
////// MARK: - 4. Делегат Скролла
////extension UnifiedScrollViewController: UIScrollViewDelegate {
////	
////	func scrollViewDidScroll(_ scrollView: UIScrollView) {
////		let screenHeight = mainScrollView.bounds.height
////		if scrollView === mainScrollView {
////			updateVisiblePages()
////			if screenHeight > 0, !currentTabBarMode {
////				let currentIndex = Int(round(mainScrollView.contentOffset.y / screenHeight))
////				if scrollState?.activeIndex != currentIndex {
////					scrollState?.activeIndex = currentIndex
////				}
////			}
////		}
////		updateCustomScrollbar()
////	}
////	
////	private func updateCustomScrollbar() {
////		guard let scrollState = scrollState else { return }
////		let screenHeight = view.bounds.height
////		guard screenHeight > 0, !pages.isEmpty else { return }
////		
////		let pageHeights = (0..<pages.count).map { max(screenHeight, knownPageHeights[$0] ?? screenHeight) }
////		let totalVirtualHeight = pageHeights.reduce(0, +)
////		let mainY = mainScrollView.contentOffset.y
////		let maxMainY = CGFloat(pages.count - 1) * screenHeight
////		let clampedMainY = max(0, min(mainY, maxMainY))
////		
////		let currentPageIndex = Int(clampedMainY / screenHeight)
////		let pageProgress = (clampedMainY / screenHeight) - CGFloat(currentPageIndex)
////		
////		let currentInnerOffset = loadedPages[currentPageIndex]?.scrollView.contentOffset.y ?? 0
////		let maxInnerOffset = pageHeights[currentPageIndex] - screenHeight
////		let clampedInnerOffset = max(0, min(currentInnerOffset, maxInnerOffset))
////		
////		let currentBaseY = pageHeights[0..<currentPageIndex].reduce(0, +)
////		let virtualYStart = currentBaseY + clampedInnerOffset
////		var finalVirtualY = virtualYStart
////		
////		if pageProgress > 0 && currentPageIndex + 1 < pages.count {
////			let nextInnerOffset = loadedPages[currentPageIndex + 1]?.scrollView.contentOffset.y ?? 0
////			let maxNextInnerOffset = pageHeights[currentPageIndex + 1] - screenHeight
////			let clampedNextInnerOffset = max(0, min(nextInnerOffset, maxNextInnerOffset))
////			
////			let nextBaseY = pageHeights[0..<(currentPageIndex + 1)].reduce(0, +)
////			let virtualYEnd = nextBaseY + clampedNextInnerOffset
////			
////			finalVirtualY = virtualYStart * (1.0 - pageProgress) + virtualYEnd * pageProgress
////		}
////		
////		let maxVirtualOffset = totalVirtualHeight - screenHeight
////		let percentScrolled = maxVirtualOffset > 0 ? (finalVirtualY / maxVirtualOffset) : 0
////		
////		scrollState.progress = percentScrolled
////		scrollState.thumbRatio = max(0.05, min(screenHeight / totalVirtualHeight, 1.0))
////	}
////}
////
////// MARK: - 5. SwiftUI Обертка
////struct UnifiedPagingScrollView: UIViewControllerRepresentable {
////	let pages: [ScrollPageItem]
////	let scrollState: ScrollState
////	
////	func makeUIViewController(context: Context) -> UnifiedScrollViewController {
////		let vc = UnifiedScrollViewController()
////		vc.pages = pages
////		vc.scrollState = scrollState
////		return vc
////	}
////	
////	func updateUIViewController(_ uiViewController: UnifiedScrollViewController, context: Context) {
////		uiViewController.pages = pages
////		uiViewController.syncState(scrollState)
////	}
////}
////
////// MARK: - 6. Кастомный Скроллбар с физикой ScrubState
//struct CustomScrollbarView1: View {
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
//			let finalTop = state.isTabBarMode ? tabBarTop : normalY
//			let finalBottom = state.isTabBarMode ? tabBarBottom : normalY + normalHeight
//			let finalHeight = max(finalBottom - finalTop, 10)
//			let width: CGFloat = state.isTabBarMode ? 44 : 4
//			
//			ZStack(alignment: .topLeading) {
//				// Основная Капсула
//				ZStack(alignment: .top) {
//					Capsule()
//						.fill(state.isTabBarMode ? Color.white.opacity(0.15) : Color.white.opacity(0.4))
//						.background(Capsule().fill(.ultraThinMaterial).opacity(state.isTabBarMode ? 1 : 0))
//					
//					// Иконки Таббара (Отслеживают isPathOpen)
//					if state.isTabBarMode {
//						GeometryReader { capGeo in
//							ForEach(0..<state.totalPages, id: \.self) { index in
//								let isPathOpen: Bool = {
//									switch scrubState {
//									case .ideal: return true
//									case .tooHigh: return index >= state.activeIndex
//									case .tooLow: return index <= state.activeIndex
//									case .none: return false
//									}
//								}()
//								
//								let isActive = (index == state.activeIndex)
//								let absY = (CGFloat(index) + 0.5) * h_ideal
//								let localY = absY - finalTop // Проекция на координаты капсулы
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
//							// 1. Инициализация Долгого Нажатия
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
//							// 2. Движение (Rubber Band Physics)
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
//								case .ideal:
//									let targetIndex = Int(max(0, min(CGFloat(state.totalPages - 1), Y_f / h_ideal)))
//									if targetIndex != state.activeIndex {
//										state.activeIndex = targetIndex
//										UIImpactFeedbackGenerator(style: .light).impactOccurred()
//									}
//									
//									let new_top = CGFloat(state.activeIndex) * h_ideal
//									let new_bottom = new_top + h_ideal
//									
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
//								case .none: break
//								}
//							}
//						}
//						.onEnded { _ in
//							isTouching = false
//							dragTimer?.invalidate()
//							if state.isTabBarMode {
//								withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
//									state.isTabBarMode = false
//									scrubState = .none
//								}
//							}
//						}
//				)
//			}
//		}
//		.coordinateSpace(name: "ScrollArea") // Точная система координат для математики жестов
//	}
//}
////
////// MARK: - 7. Тестовая Вьюха (ExampleView)
////struct ExampleView: View {
////	@State private var scrollState = ScrollState()
////	
////	var body: some View {
////		let mockData = [
////			(title: "Экран 1", color: Color(red: 0.1, green: 0.1, blue: 0.15), isLong: false),
////			(title: "Экран 2 (ДЛИННЫЙ)", color: Color(red: 0.15, green: 0.1, blue: 0.2), isLong: true),
////			(title: "Экран 3", color: Color(red: 0.1, green: 0.15, blue: 0.1), isLong: false),
////			(title: "Экран 4 (ДЛИННЫЙ)", color: Color(red: 0.2, green: 0.1, blue: 0.1), isLong: true),
////			(title: "Экран 5", color: Color(red: 0.1, green: 0.1, blue: 0.25), isLong: false)
////		]
////		
////		ZStack {
////			Color.black.ignoresSafeArea()
////			
////			UnifiedPagingScrollView(pages: mockData.map { item in
////				ScrollPageItem {
////					ZStack {
////						item.color.ignoresSafeArea()
////						VStack(spacing: 20) {
////							Text(item.title)
////								.font(.system(size: 32, weight: .black, design: .rounded))
////								.foregroundColor(.white)
////							
////							if item.isLong {
////								Text("👇 Скролль вниз, тут 50 блоков!")
////									.foregroundColor(.white.opacity(0.7))
////								ForEach(1...50, id: \.self) { i in
////									HStack {
////										Text("Блок №\(i)").foregroundColor(.white).fontWeight(.semibold)
////										Spacer()
////									}
////									.padding().background(Color.white.opacity(0.08)).cornerRadius(16).padding(.horizontal)
////								}
////							} else {
////								Spacer()
////								Text("Короткий экран").foregroundColor(.white.opacity(0.4))
////								Spacer()
////							}
////						}
////						.padding(.bottom, 60)
////					}
////				}
////			}, scrollState: scrollState)
////			.ignoresSafeArea()
////			
////			CustomScrollbarView(state: scrollState)
////				.padding(.vertical, 8)
////		}
////	}
////}
////
////#Preview {
////	ExampleView()
////}
