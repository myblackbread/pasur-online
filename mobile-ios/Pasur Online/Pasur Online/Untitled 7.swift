import SwiftUI
import UIKit
import Observation

// MARK: - ================= 1. DELEGATE PROTOCOL =================

protocol HubWorkspaceDelegate: AnyObject {
	func synchronize(with validIds: Set<UUID>, completion: (() -> Void)?)
}

protocol LalalalDelegate: AnyObject {
	func expandModule<Content: View>(id: UUID, originFrame: CGRect, @ViewBuilder transitionView: @escaping (_ isExpanded: Bool, _ deviceRadius: CGFloat) -> Content, animation: SwiftUI.Animation, completion: (() -> Void)?)
	
	func collapseModule<Content: View>(id: UUID, targetFrame: CGRect, @ViewBuilder transitionView: @escaping (_ isExpanded: Bool, _ deviceRadius: CGFloat) -> Content, animation: SwiftUI.Animation, completion: (() -> Void)?)
	
	func applyDragTransform(id: UUID, transform: CGAffineTransform, translation: CGSize)
	func revertDrag(id: UUID, animation: SwiftUI.Animation, completion: @escaping () -> Void)
	func transitionBetweenModules(from activeId: UUID, to targetId: UUID, startTransform: CGAffineTransform, activeFinalTransform: CGAffineTransform, targetFinalTransform: CGAffineTransform, animation: SwiftUI.Animation, completion: @escaping () -> Void)
}

// MARK: - ================= 2. WORKSPACE STATE (Command Center) =================

@Observable
final class Lalalal {
	@ObservationIgnored weak var delegate: LalalalDelegate?
	var activeModuleId: UUID? = nil
}

@Observable
final class HubWorkspace1 {
	@ObservationIgnored weak var delegate: HubWorkspaceDelegate?
	
	var modules: Set<HubModuleItem> = [] {
		didSet {
			let currentIds = Set(modules.map(\.id))
			for key in snapshots.keys where !currentIds.contains(key) {
				snapshots.removeValue(forKey: key)
			}
			
			delegate?.synchronize(with: currentIds, completion: {})
		}
	}
	
	var snapshots: [UUID: UIImage] = [:]
	
	init() {}
	
	func snapshot(for id: UUID) -> UIImage? {
		snapshots[id]
	}
	
	func updateSnapshot(_ image: UIImage, for id: UUID) {
		snapshots[id] = image
	}
}

// MARK: - ================= 3. CORE MODELS & PREFERENCES =================

struct HubModuleItem: Identifiable, Equatable, Hashable {
	let id: UUID
	let content: AnyView
	
	init<V: View>(id: UUID = UUID(), @ViewBuilder content: () -> V) {
		self.id = id
		self.content = AnyView(content())
	}
	
	static func == (lhs: HubModuleItem, rhs: HubModuleItem) -> Bool { lhs.id == rhs.id }
	func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct HubModuleWrapper: Identifiable, Hashable {
	let module: HubModuleItem
	var id: UUID { module.id }
	
	private let buildSystemView: (@escaping (UIImage?) -> AnyView) -> AnyView
	
	init(module: HubModuleItem, buildSystemView: @escaping (@escaping (UIImage?) -> AnyView) -> AnyView) {
		self.module = module
		self.buildSystemView = buildSystemView
	}
	
	func render<Content: View>(@ViewBuilder content: @escaping (UIImage?) -> Content) -> some View {
		buildSystemView { AnyView(content($0)) }
	}
	
	static func == (lhs: HubModuleWrapper, rhs: HubModuleWrapper) -> Bool { lhs.id == rhs.id }
	func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct HubFramePreferenceKey: PreferenceKey {
	static var defaultValue: [UUID: CGRect] = [:]
	static func reduce(value: inout [UUID: CGRect], nextValue: () -> [UUID: CGRect]) {
		value.merge(nextValue(), uniquingKeysWith: { $1 })
	}
}

// MARK: - ================= 4. SYSTEM ADAPTER (UI Layer) =================

struct HubSystemAdapter<Layout: View>: View {
	let items: Set<HubModuleItem>
	let snapshots: [UUID: UIImage]
	let onOpen: (UUID, CGRect) -> Void
	
	@ViewBuilder let layout: (Set<HubModuleWrapper>) -> Layout
	
	var body: some View {
		let wrappers = items.map { item in
			HubModuleWrapper(module: item) { userContentBuilder in
				let snapshot = snapshots[item.id]
				return AnyView(
					userContentBuilder(snapshot)
						.overlay {
							GeometryReader { proxy in
								let bbox = proxy.frame(in: .named("HubContainer"))
								let size = proxy.size

								let unrotatedFrame = CGRect(
									x: bbox.midX - size.width / 2,
									y: bbox.midY - size.height / 2,
									width: size.width,
									height: size.height
								)
								
								Color.clear
									.contentShape(Rectangle())
									.onTapGesture { onOpen(item.id, unrotatedFrame) }
									.preference(key: HubFramePreferenceKey.self, value: [item.id: unrotatedFrame])
							}
						}
				)
			}
		}
		layout(Set(wrappers))
	}
}

// MARK: - ================= 5. THE BRIDGE (Representable) =================

struct HubCoordinatorRepresentable1: UIViewControllerRepresentable {
	let workspace: HubWorkspace1
	let lalal: Lalalal
	let moduleVCFactory: (UUID) -> ModuleContentViewController
	
	func makeUIViewController(context: Context) -> HubCoordinatorController1 {
		let vc = HubCoordinatorController1(
			onSnapshotUpdate: { id, image in
				workspace.snapshots[id] = image
			},
			moduleVCFactory: moduleVCFactory
		)
		lalal.delegate = vc
		workspace.delegate = vc
		return vc
	}
	
	func updateUIViewController(_ uiViewController: HubCoordinatorController1, context: Context) {}
}

// MARK: - ================= 6. MAIN CONTAINER (ZStack) =================

struct HubContainer<Layout: View, Content: View>: View {
	let workspace: HubWorkspace1
	let lalal: Lalalal
	@ViewBuilder let content: (Bool, CGFloat, UIImage?, Int) -> Content
	let moduleVCFactory: (UUID) -> ModuleContentViewController
	
	@ViewBuilder let layout: (Set<HubModuleWrapper>) -> Layout
	
	@State private var frames: [UUID: CGRect] = [:]
	
	@Environment(\.closeHubModule) private var closeModule
	
	func index(for id: UUID) -> Int? {
		workspace
			.modules
			.sorted { $0.id.uuidString < $1.id.uuidString }
			.firstIndex { $0.id == lalal.activeModuleId }
	}
	
	var body: some View {
		ZStack {
			HubSystemAdapter(
				items: workspace.modules,
				snapshots: workspace.snapshots,
				onOpen: { id, originFrame in
					lalal.activeModuleId = id
					let sharedAnimation = Animation.spring(response: 0.4, dampingFraction: 0.8)
					lalal.delegate?.expandModule(
						id: id,
						originFrame: originFrame,
						transitionView: { isExpanded, deviceRadius in
							content(isExpanded, deviceRadius, workspace.snapshots[id], index(for: id)!)
								.ignoresSafeArea()
						},
						animation: sharedAnimation
					) {}
				},
				layout: layout
			)
			.onPreferenceChange(HubFramePreferenceKey.self) { newFrames in
				frames = newFrames
			}
			
			Color.clear
				.ignoresSafeArea()
				.coordinateSpace(name: "HubContainer")
			
			HubCoordinatorRepresentable1(
				workspace: workspace,
				lalal: lalal,
				moduleVCFactory: moduleVCFactory
			)
			.ignoresSafeArea()
			.allowsHitTesting(lalal.activeModuleId != nil)
		}
		.onChange(of: lalal.activeModuleId, initial: true) { _, newId in
			closeModule.wrappedValue = {
				guard let activeId = lalal.activeModuleId, let targetFrame = frames[activeId] else { return }
				
				let sharedAnimation = Animation.spring(response: 0.4, dampingFraction: 0.8)
				lalal.delegate?.collapseModule(
					id: activeId,
					targetFrame: targetFrame,
					transitionView: { isExpanded, deviceRadius in
						let sortedItems = workspace.modules.sorted { $0.id.uuidString < $1.id.uuidString }
						let index = sortedItems.firstIndex {
							$0.id == activeId
						}
						content(isExpanded, deviceRadius, workspace.snapshots[activeId], index!)
							.ignoresSafeArea()
					},
					animation: sharedAnimation
				) {
					lalal.activeModuleId = nil
				}
			}
		}
	}
}

// MARK: - ================= 7. ENVIRONMENT =================

struct CloseHubModuleKey: EnvironmentKey {
	static let defaultValue: Binding<(() -> Void)?> = Binding(get: { nil }, set: { _ in })
}

extension EnvironmentValues {
	/// Вызов этой функции из любой вьюшки внутри HubContainer плавно закроет активный модуль
	var closeHubModule: Binding<(() -> Void)?> {
		get { self[CloseHubModuleKey.self] }
		set { self[CloseHubModuleKey.self] = newValue }
	}
}

// MARK: - ================= 8. PREVIEW & USAGE =================

struct MessyDeskLayoutView0: View {
	var bool: Bool = true
	var radius: CGFloat = 8
	let snapshot: UIImage?
	let index: Int
	
	// Флаг: false если карточка статично сидит внутри обертки на столе.
	// true если это летящая анимация перехода.
	var isFloatingTransition: Bool = false
	
	var body: some View {
		// ТОЛЬКО СНЕПШОТ. Он не вращается, если лежит на столе.
		GeometryReader { proxy in
			ZStack {
				Color.black.opacity(0.5)
				if let snapshot {
					Image(uiImage: snapshot)
						.resizable()
						.scaledToFill()
				}
			}
			.frame(width: proxy.size.width, height: proxy.size.height)
		}
		.clipShape(RoundedRectangle(cornerRadius: bool ? radius : 8))
		.rotationEffect(.degrees({
			if isFloatingTransition {
				return bool ? 0 : Double((index * 37) % 40) - 20 // Убран print
			} else {
				return 0
			}
		}()))
	}
}

struct MessyDeskLayoutView<Content: View>: View {
	let items: Set<HubModuleWrapper>
	let content: (UIImage?, Int) -> Content
	
	var body: some View {
		GeometryReader { proxy in
			ZStack {
				let sortedItems = items.sorted { $0.id.uuidString < $1.id.uuidString }
				ForEach(Array(sortedItems.enumerated()), id: \.element.id) { index, wrapper in
					let widthBounds = Int(max(proxy.size.width - 200, 1))
					let heightBounds = Int(max(proxy.size.height - 250, 1))
					
					let offsetX = CGFloat((index * 83) % widthBounds) - (proxy.size.width / 2) + 100
					let offsetY = CGFloat((index * 61) % heightBounds) - (proxy.size.height / 2) + 125
					
					VStack(spacing: 0) {
						
						// Внутренняя карточка. Её фрейм замерится до того, как применится ротейшн к обертке
						wrapper.render { snapshot in
							content(snapshot, index)
						}
						.frame(width: 140, height: 140)
						.padding([.top, .horizontal], 10)
						
						// Визуальная информация
						Text("Module")
							.font(.caption.bold())
							.foregroundStyle(.black)
							.frame(height: 40)
					}
					.background(Color.white)
					.clipShape(RoundedRectangle(cornerRadius: 8))
					.shadow(color: .black.opacity(0.15), radius: 8, x: 2, y: 5)
					// Ротейшн на всей обертке-карте
					.rotationEffect(.degrees(Double((index * 37) % 40) - 20.0))
					.offset(x: offsetX, y: offsetY)
					.zIndex(Double(index))
				}
			}
			.frame(maxWidth: .infinity, maxHeight: .infinity)
		}
	}
}

struct AppPreview: View {
	@State private var closeModule: (() -> Void)?
	@State private var workspace = HubWorkspace1()
	@State private var lalal = Lalalal()
	
	var body: some View {
		ZStack {
			Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
			
			HubContainer(
				workspace: workspace,
				lalal: lalal
			) {
				// При анимации перехода ставим isFloatingTransition: true
				MessyDeskLayoutView0(bool: $0, radius: $1, snapshot: $2, index: $3, isFloatingTransition: true)
			} moduleVCFactory: { id in
				let item = workspace.modules.first(where: { $0.id == id })
				let content = item?.content ?? AnyView(Color.clear)
				return ModuleContentViewController(moduleId: id, contentView: content)
			} layout: { wrappers in
				MessyDeskLayoutView(items: wrappers) {
					// На столе карточка сидит внутри обертки статично, ротейшн не применяет к самой себе
					MessyDeskLayoutView0(bool: false, radius: 8, snapshot: $0, index: $1, isFloatingTransition: false)
				}
			}
			
			if lalal.activeModuleId != nil {
				CloseButtonOverlay()
			}
		}
		.onAppear {
			workspace.modules = [
				HubModuleItem { Text("Game 1").frame(maxWidth: .infinity, maxHeight: .infinity).background(Color.red) },
				HubModuleItem { Text("Game 2").frame(maxWidth: .infinity, maxHeight: .infinity).background(Color.blue) },
				HubModuleItem { Text("Game 3").frame(maxWidth: .infinity, maxHeight: .infinity).background(Color.green) }
			]
		}
		.environment(\.closeHubModule, $closeModule)
	}
}

struct CloseButtonOverlay: View {
	@Environment(\.closeHubModule) var closeModule
	
	var body: some View {
		VStack {
			HStack {
				Button {
					closeModule.wrappedValue?()
				} label: {
					Image(systemName: "xmark.circle.fill")
						.font(.system(size: 32))
						.foregroundStyle(.white, .black.opacity(0.5))
				}.padding()
				Spacer()
			}
			Spacer()
		}
	}
}


#Preview {
	AppPreview()
}
