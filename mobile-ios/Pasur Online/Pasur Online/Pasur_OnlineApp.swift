//
//  Pasur_OnlineApp.swift
//  Pasur Online
//
//  Created by Garib Agaev on 18.06.2026.
//

import SwiftUI
import CoreData

@main
struct Pasur_OnlineApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
			AppPreview()
//                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}

#Preview {
	HubDemoView()
}
