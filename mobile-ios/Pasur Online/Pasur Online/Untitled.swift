//import SwiftUI
//
//struct PremiumDashboardView: View {
//	@State private var securityPath = NavigationPath()
//	
//	var body: some View {
//		HubNavigationView {
//			
//			// MARK: - MODULE 1: VEHICLE (Главный статус автомобиля)
//			HubModule(title: "Vehicle", iconName: "car.side.fill") {
//				PlaceholderCard(
//					title: "Apex",
//					subtitle: "Model S",
//					icon: "car.side.fill",
//					color: .cyan
//				)
//			} content: {
//				ScrollView(.vertical, showsIndicators: false) {
//					VStack(spacing: 24) {
//						// Car Presentation Mock
//						ZStack {
//							Circle()
//								.fill(RadialGradient(colors: [.cyan.opacity(0.2), .clear], center: .center, startRadius: 0, endRadius: 150))
//								.frame(height: 280)
//							
//							Image(systemName: "car.side.fill")
//								.font(.system(size: 140, weight: .thin))
//								.foregroundStyle(.white)
//								.shadow(color: .cyan.opacity(0.4), radius: 20, y: 10)
//						}
//						.padding(.top, 40)
//						
//						// Quick Actions
//						HStack(spacing: 16) {
//							GlassActionButton(icon: "lock.fill", title: "Lock", isActive: true)
//							GlassActionButton(icon: "fan.fill", title: "Climate", isActive: false)
//							GlassActionButton(icon: "bolt.fill", title: "Charge", isActive: false)
//							GlassActionButton(icon: "suitcase.fill", title: "Trunk", isActive: false)
//						}
//						.padding(.horizontal, 20)
//						
//						// Status Cards
//						VStack(spacing: 16) {
//							GlassStatusRow(icon: "location.fill", title: "Location", value: "Parked • 7th Ave, NY")
//							GlassStatusRow(icon: "speedometer", title: "Odometer", value: "12,450 km")
//							GlassStatusRow(icon: "shield.checkerboard", title: "Software", value: "v4.12 Up to date")
//						}
//						.padding(.horizontal, 20)
//					}
//					.padding(.bottom, 120)
//				}
//			}
//			
//			// MARK: - MODULE 2: CLIMATE (Управление климатом)
//			HubModule(title: "Climate", iconName: "thermometer.sun") {
//				PlaceholderCard(
//					title: "Climate",
//					subtitle: "22.5°C",
//					icon: "fan.fill",
//					color: .orange
//				)
//			} content: {
//				ScrollView(.vertical, showsIndicators: false) {
//					VStack(spacing: 40) {
//						Text("Interior Climate")
//							.font(.title3.weight(.semibold))
//							.foregroundStyle(.white)
//							.frame(maxWidth: .infinity, alignment: .leading)
//							.padding(.horizontal, 24)
//							.padding(.top, 40)
//						
//						// Beautiful Circular Dial Mockup
//						ZStack {
//							Circle()
//								.stroke(.white.opacity(0.1), lineWidth: 30)
//								.frame(width: 250, height: 250)
//							
//							Circle()
//								.trim(from: 0.2, to: 0.8)
//								.stroke(
//									AngularGradient(colors: [.cyan, .blue, .purple, .orange, .red], center: .center, startAngle: .degrees(90), endAngle: .degrees(270)),
//									style: StrokeStyle(lineWidth: 30, lineCap: .round)
//								)
//								.frame(width: 250, height: 250)
//								.rotationEffect(.degrees(90))
//							
//							VStack(spacing: 4) {
//								Text("22.5°")
//									.font(.system(size: 56, weight: .light, design: .rounded))
//									.foregroundStyle(.white)
//								Text("Cooling to 21°")
//									.font(.subheadline)
//									.foregroundStyle(.cyan)
//							}
//						}
//						
//						// Seat Heaters
//						HStack(spacing: 24) {
//							SeatHeaterButton(side: "L", level: 2)
//							SeatHeaterButton(side: "R", level: 0)
//						}
//					}
//					.padding(.bottom, 120)
//				}
//			}
//			
//			// MARK: - MODULE 3: ENERGY (Состояние батареи)
//			HubModule(title: "Energy", iconName: "bolt.car.fill") {
//				PlaceholderCard(
//					title: "Battery",
//					subtitle: "84%",
//					icon: "bolt.batteryblock.fill",
//					color: .green
//				)
//			} content: {
//				ScrollView(.vertical, showsIndicators: false) {
//					VStack(alignment: .leading, spacing: 24) {
//						Text("Energy Overview")
//							.font(.title2.bold())
//							.foregroundStyle(.white)
//							.padding(.top, 40)
//							.padding(.horizontal, 24)
//						
//						// Battery Graphic
//						VStack(spacing: 16) {
//							HStack(alignment: .lastTextBaseline) {
//								Text("342")
//									.font(.system(size: 64, weight: .bold, design: .rounded))
//									.foregroundStyle(.white)
//								Text("km est.")
//									.font(.title3)
//									.foregroundStyle(.secondary)
//							}
//							
//							GeometryReader { geo in
//								ZStack(alignment: .leading) {
//									Capsule()
//										.fill(.white.opacity(0.1))
//										.frame(height: 40)
//									
//									Capsule()
//										.fill(LinearGradient(colors: [.green, .cyan], startPoint: .leading, endPoint: .trailing))
//										.frame(width: geo.size.width * 0.84, height: 40)
//										.shadow(color: .green.opacity(0.4), radius: 10)
//								}
//							}
//							.frame(height: 40)
//							
//							HStack {
//								Text("84% Available")
//								Spacer()
//								Text("Limit: 90%")
//							}
//							.font(.subheadline.weight(.medium))
//							.foregroundStyle(.secondary)
//						}
//						.padding(24)
//						.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
//						.overlay(RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.1), lineWidth: 1))
//						.padding(.horizontal, 24)
//						
//						// Charging Stats
//						HStack(spacing: 16) {
//							StatSquare(title: "Consumption", value: "14.2", unit: "kWh/100")
//							StatSquare(title: "Time to Full", value: "1h 15m", unit: "on 11kW")
//						}
//						.padding(.horizontal, 24)
//					}
//					.padding(.bottom, 120)
//				}
//			}
//			
//			// MARK: - MODULE 4: SECURITY (Навигация и события)
//			HubModule(title: "Security", iconName: "shield.checkerboard") {
//				PlaceholderCard(
//					title: "Sentry Mode",
//					subtitle: "3 Events",
//					icon: "eye.fill",
//					color: .red
//				)
//			} content: {
//				NavigationStack(path: $securityPath) {
//					SecurityRootView()
//						.navigationDestination(for: SecurityRoute.self) { route in
//							switch route {
//							case .level2(let id, let allowDeepSearch):
//								SecurityLevel2View(eventId: id, allowDeepSearch: allowDeepSearch)
//							case .level3(let id, let isSearchEnabled):
//								SecurityLevel3View(eventId: id, isSearchEnabled: isSearchEnabled)
//							}
//						}
//						.trackDynamicBarNavigation(path: $securityPath)
//				}
//			}
//		}
//		.background {
//			ZStack {
//				Color(red: 0.05, green: 0.05, blue: 0.07).ignoresSafeArea()
//				
//				Circle()
//					.fill(Color.cyan.opacity(0.12))
//					.blur(radius: 90)
//					.frame(width: 350, height: 350)
//					.offset(x: -120, y: -250)
//					.allowsHitTesting(false)
//					.ignoresSafeArea()
//				
//				Circle()
//					.fill(Color.blue.opacity(0.15))
//					.blur(radius: 120)
//					.frame(width: 400, height: 400)
//					.offset(x: 150, y: 350)
//					.allowsHitTesting(false)
//					.ignoresSafeArea()
//			}
//		}
//		.colorScheme(.dark)
//	}
//}
//
//// MARK: - Навигационные маршруты
//enum SecurityRoute: Hashable {
//	case level2(eventId: Int, allowDeepSearch: Bool)
//	case level3(eventId: Int, isSearchEnabled: Bool)
//}
//
//// MARK: - Уровень 1: Корневой экран (Поиск ВКЛЮЧЕН)
//struct SecurityRootView: View {
//	@State private var localSearchText: String = ""
//	@State private var isSearchActive: Bool = false // Добавили стейт
//	
//	let events: [(id: Int, title: String, allowDeepSearch: Bool)] = [
//		(1, "Motion Detected", true), (2, "Person Seen", false),
//		(3, "Glass Break Warning", true), (4, "Suspicious Activity", false)
//	]
//	
//	var filteredEvents: [(id: Int, title: String, allowDeepSearch: Bool)] {
//		guard !localSearchText.isEmpty else { return events }
//		return events.filter { $0.title.localizedCaseInsensitiveContains(localSearchText) }
//	}
//	
//	var body: some View {
//		ScrollView(.vertical, showsIndicators: false) {
//			VStack(spacing: 16) {
//				if filteredEvents.isEmpty {
//					Text("No events found")
//						.foregroundStyle(.secondary)
//						.padding(.top, 40)
//				}
//				
//				ForEach(filteredEvents, id: \.id) { event in
//					NavigationLink(value: SecurityRoute.level2(eventId: event.id, allowDeepSearch: event.allowDeepSearch)) {
//						HStack(spacing: 16) {
//							Circle()
//								.fill(Color.red.opacity(0.15))
//								.frame(width: 50, height: 50)
//								.overlay(Image(systemName: "video.fill").foregroundStyle(.red))
//							
//							VStack(alignment: .leading, spacing: 6) {
//								Text(event.title)
//									.font(.headline)
//									.foregroundStyle(.white)
//								Text("Deep search: \(event.allowDeepSearch ? "ON" : "OFF")")
//									.font(.caption)
//									.foregroundStyle(event.allowDeepSearch ? .cyan : .secondary)
//							}
//							
//							Spacer()
//							Image(systemName: "chevron.right").font(.caption.bold()).foregroundStyle(.secondary)
//						}
//						.padding(16)
//						.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
//						.overlay(RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.1), lineWidth: 1))
//					}
//					.buttonStyle(.plain)
//				}
//			}
//			.padding(.horizontal, 20)
//			.padding(.top, 40)
//			.padding(.bottom, 120)
//		}
//		// МАГИЯ ЗДЕСЬ:
//		.hubSearchable(text: $localSearchText, isActive: $isSearchActive, isAvailable: true)
//	}
//}
//
//// MARK: - Уровень 2: Детальный просмотр (Поиск ВЫКЛЮЧЕН)
//struct SecurityLevel2View: View {
//	let eventId: Int
//	let allowDeepSearch: Bool
//	
//	var body: some View {
//		ZStack {
//			Color(red: 0.05, green: 0.05, blue: 0.07).ignoresSafeArea()
//			
//			ScrollView(.vertical, showsIndicators: false) {
//				VStack(spacing: 24) {
//					ZStack {
//						RoundedRectangle(cornerRadius: 24).fill(Color.black).frame(height: 250).overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
//						Image(systemName: "play.circle.fill").font(.system(size: 64)).foregroundStyle(.white.opacity(0.8)).shadow(radius: 10)
//					}
//					.padding(.horizontal, 20)
//					.padding(.top, 20)
//					
//					VStack(alignment: .leading, spacing: 12) {
//						Text("Event Report #\(eventId * 739)")
//							.font(.title2.bold())
//							.foregroundStyle(.white)
//						
//						// Текст изменен, так как поиск теперь глобальный для всего модуля
//						Text("Search is available globally in this module. Tap the search icon below anytime.")
//							.font(.body)
//							.foregroundStyle(.secondary)
//					}
//					.padding(.horizontal, 20)
//					
//					NavigationLink(value: SecurityRoute.level3(eventId: eventId, isSearchEnabled: allowDeepSearch)) {
//						Text("Go to Level 3")
//							.font(.headline)
//							.foregroundStyle(.black)
//							.frame(maxWidth: .infinity)
//							.padding(.vertical, 16)
//							.background(Color.cyan)
//							.clipShape(RoundedRectangle(cornerRadius: 20))
//							.padding(.horizontal, 20)
//					}
//				}
//			}
//		}
//		.navigationBarHidden(true)
//		// МАГИЯ ЗДЕСЬ: Выключаем поиск для этого слоя
//		.hubSearchable(false)
//	}
//}
//
//// MARK: - Уровень 3: Глубокий просмотр (Поиск зависит от корневого выбора)
//struct SecurityLevel3View: View {
//	let eventId: Int
//	let isSearchEnabled: Bool
//	
//	@State private var searchText: String = ""
//	@State private var isSearchActive: Bool = false
//	
//	var body: some View {
//		ZStack {
//			Color(red: 0.05, green: 0.05, blue: 0.07).ignoresSafeArea()
//			
//			VStack(spacing: 20) {
//				Image(systemName: isSearchEnabled ? "magnifyingglass.circle.fill" : "xmark.circle.fill")
//					.font(.system(size: 80))
//					.foregroundStyle(isSearchEnabled ? .cyan : .secondary)
//					.padding(.top, 80)
//				
//				Text(isSearchEnabled ? "Search is ENABLED here" : "Search is DISABLED here")
//				
//				if isSearchEnabled {
//					Text(searchText.isEmpty ? "Try tapping the search icon below" : "Searching for: \(searchText)")
//						.font(.body)
//						.foregroundStyle(.cyan)
//				}
//				
//				Spacer()
//			}
//		}
//		.navigationBarHidden(true)
//		// РАСКОММЕНТИРОВАНО И РАБОТАЕТ:
//		.hubSearchable(text: $searchText, isActive: $isSearchActive, isAvailable: isSearchEnabled)
//	}
//}
//
//// MARK: - Вложенные представления для навигации
//
//struct SecurityDetailView: View {
//	let eventId: Int
//	
//	var body: some View {
//		ZStack {
//			Color(red: 0.05, green: 0.05, blue: 0.07).ignoresSafeArea()
//			
//			ScrollView(.vertical, showsIndicators: false) {
//				VStack(spacing: 24) {
//					// Mock Video Player
//					ZStack {
//						RoundedRectangle(cornerRadius: 24)
//							.fill(Color.black)
//							.frame(height: 250)
//							.overlay(
//								RoundedRectangle(cornerRadius: 24)
//									.strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
//							)
//						
//						Image(systemName: "play.circle.fill")
//							.font(.system(size: 64))
//							.foregroundStyle(.white.opacity(0.8))
//							.shadow(radius: 10)
//						
//						VStack {
//							Spacer()
//							HStack {
//								Text("CAM: LEFT REATER")
//									.font(.caption2.bold())
//									.foregroundStyle(.red)
//								Spacer()
//								Text("REC")
//									.font(.caption2.bold())
//									.foregroundStyle(.red)
//								Circle().fill(.red).frame(width: 8, height: 8)
//							}
//							.padding(16)
//						}
//					}
//					.padding(.horizontal, 20)
//					.padding(.top, 20)
//					
//					VStack(alignment: .leading, spacing: 12) {
//						Text("Event Report #\(eventId * 739)")
//							.font(.title2.bold())
//							.foregroundStyle(.white)
//						
//						Text("Proximity alert triggered by movement on the left side of the vehicle. Sentry mode automatically recorded 2 minutes of footage and flashed headlights as a warning.")
//							.font(.body)
//							.foregroundStyle(.secondary)
//							.lineSpacing(6)
//					}
//					.padding(.horizontal, 20)
//				}
//			}
//		}
//		.navigationBarHidden(true)
//	}
//}
//
//// MARK: - UI Components
//
//struct PlaceholderCard: View {
//	let title: String
//	let subtitle: String
//	let icon: String
//	let color: Color
//	
//	var body: some View {
//		ZStack(alignment: .bottomLeading) {
//			LinearGradient(
//				colors: [color.opacity(0.3), color.opacity(0.05)],
//				startPoint: .topLeading, endPoint: .bottomTrailing
//			)
//			
//			Image(systemName: icon)
//				.font(.system(size: 64, weight: .ultraLight))
//				.foregroundStyle(color.opacity(0.2))
//				.offset(x: 20, y: 10)
//			
//			VStack(alignment: .leading, spacing: 4) {
//				Text(title)
//					.font(.headline)
//					.foregroundStyle(.white)
//				Text(subtitle)
//					.font(.subheadline)
//					.foregroundStyle(color)
//			}
//			.padding(16)
//		}
//	}
//}
//
//struct GlassActionButton: View {
//	let icon: String
//	let title: String
//	let isActive: Bool
//	
//	var body: some View {
//		Button(action: {}) {
//			VStack(spacing: 12) {
//				Image(systemName: icon)
//					.font(.system(size: 24))
//					.foregroundStyle(isActive ? Color.black : Color.white)
//				Text(title)
//					.font(.caption.bold())
//					.foregroundStyle(isActive ? Color.black : Color.secondary)
//			}
//			.frame(maxWidth: .infinity)
//			.padding(.vertical, 16)
//			.background(isActive ? Color.cyan : Color.clear)
//			.background(isActive ? AnyView(EmptyView()) : AnyView(Rectangle().fill(.ultraThinMaterial)))
//			.clipShape(RoundedRectangle(cornerRadius: 20))
//			.overlay(
//				RoundedRectangle(cornerRadius: 20)
//					.stroke(isActive ? Color.clear : Color.white.opacity(0.1), lineWidth: 1)
//			)
//		}
//	}
//}
//
//struct GlassStatusRow: View {
//	let icon: String
//	let title: String
//	let value: String
//	
//	var body: some View {
//		HStack(spacing: 16) {
//			Image(systemName: icon)
//				.font(.title2)
//				.foregroundStyle(.cyan)
//				.frame(width: 30)
//			
//			Text(title)
//				.font(.body)
//				.foregroundStyle(.secondary)
//			
//			Spacer()
//			
//			Text(value)
//				.font(.body.weight(.medium))
//				.foregroundStyle(.white)
//		}
//		.padding(20)
//		.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
//		.overlay(RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.1), lineWidth: 1))
//	}
//}
//
//struct SeatHeaterButton: View {
//	let side: String
//	let level: Int
//	
//	var body: some View {
//		Button(action: {}) {
//			VStack(spacing: 12) {
//				Text(side)
//					.font(.headline)
//					.foregroundStyle(.secondary)
//				
//				Image(systemName: "heater.vertical.fill")
//					.font(.system(size: 32))
//					.foregroundStyle(level > 0 ? Color.red : Color.white.opacity(0.3))
//				
//				HStack(spacing: 4) {
//					ForEach(0..<3) { i in
//						Circle()
//							.fill(i < level ? Color.red : Color.white.opacity(0.1))
//							.frame(width: 6, height: 6)
//					}
//				}
//			}
//			.frame(width: 100, height: 120)
//			.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
//			.overlay(RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.1), lineWidth: 1))
//		}
//	}
//}
//
//struct StatSquare: View {
//	let title: String
//	let value: String
//	let unit: String
//	
//	var body: some View {
//		VStack(alignment: .leading, spacing: 8) {
//			Text(title)
//				.font(.subheadline)
//				.foregroundStyle(.secondary)
//			
//			Text(value)
//				.font(.system(size: 28, weight: .bold, design: .rounded))
//				.foregroundStyle(.white)
//			
//			Text(unit)
//				.font(.caption)
//				.foregroundStyle(.cyan)
//		}
//		.frame(maxWidth: .infinity, alignment: .leading)
//		.padding(20)
//		.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
//		.overlay(RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.1), lineWidth: 1))
//	}
//}
