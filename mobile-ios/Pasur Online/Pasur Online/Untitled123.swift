import SwiftUI

// 1. Обертка (Representable) для твоего контроллера
struct HubCoordinatorView: UIViewControllerRepresentable {
	let delegate: Delegate
	let content: () -> AnyView
	
	func makeUIViewController(context: Context) -> HubCoordinatorController1 {
		let coordinator = HubCoordinatorController1(
			onSnapshotUpdate: { _, _ in },
			moduleVCFactory: { id in
				return ModuleContentViewController(moduleId: id, contentView: content())
			}
		)
		delegate.delegate = coordinator
		return coordinator
	}
	func updateUIViewController(_ uiViewController: HubCoordinatorController1, context: Context) {}
}

@Observable
class Delegate {
	weak var delegate: LalalalDelegate?
}

// 2. Вьюшка, объединяющая всё
struct HubPreviewView: View {
	// Инициализируем твой контроллер так же, как в твоем коде
	@State private var delegate = Delegate()

	let moduleId = UUID()
	@State private var thumbnailFrame: CGRect = .zero
	@State private var isExpanded: Bool = false
	
	var body: some View {
		ZStack {
			// --- НИЖНИЙ СЛОЙ: Вьюшка с кнопкой открытия ---
			GeometryReader { geo in
				Button(action: { open() }) {
					Text("Открыть")
						.fontWeight(.bold)
						.frame(maxWidth: .infinity, maxHeight: .infinity)
						.background(Color.blue)
						.foregroundColor(.white)
						.cornerRadius(16)
				}
				.onAppear { thumbnailFrame = geo.frame(in: .global) }
				.onChange(of: geo.frame(in: .global), initial: true) { thumbnailFrame = $1 }
			}
			.frame(width: 150, height: 150) // Размер превью на экране
			
			HubCoordinatorView(delegate: delegate) {
				AnyView(
					ZStack(alignment: .topTrailing) {
						Color.blue.ignoresSafeArea()
						
						if isExpanded {
							Button(action: { close() }) {
								Image(systemName: "xmark.circle.fill")
									.font(.system(size: 32))
									.foregroundColor(.white)
									.padding(24)
							}
						}
					}
				)
			}
				.ignoresSafeArea()
				.allowsHitTesting(isExpanded)
		}
	}
	
	private func open() {
		isExpanded = true
		delegate.delegate?.expandModule(
			id: moduleId,
			originFrame: thumbnailFrame,
			transitionView: { isExpanded, radius in
				Image(systemName: "person")
					.resizable()
					.scaledToFit()
					.frame(maxWidth: .infinity, maxHeight: .infinity)
					.background(Color.blue)
					.clipShape(RoundedRectangle(cornerRadius: isExpanded ? radius : 16, style: .continuous))
					.ignoresSafeArea()
			},
			animation: .easeInOut(duration: 0.3),
			completion: {}
		)
	}
	
	private func close() {
		delegate.delegate?.collapseModule(
			id: moduleId,
			targetFrame: thumbnailFrame,
			transitionView: { isExpanded, radius in
				Image(systemName: "person")
					.resizable()
					.scaledToFit()
					.frame(maxWidth: .infinity, maxHeight: .infinity)
					.background(Color.blue)
					.clipShape(RoundedRectangle(cornerRadius: isExpanded ? radius : 16, style: .continuous))
					.ignoresSafeArea()
			},
			animation: .easeInOut(duration: 0.3),
			completion: { isExpanded = false }
		)
	}
}

// 3. Само превью
#Preview {
	HubPreviewView()
}
