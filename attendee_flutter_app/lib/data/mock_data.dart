import '../models/types.dart';
import '../services/scenario_intelligence_service.dart';

class MockData {
  static EventInfo getEventInfo(ScenarioId scenario) {
    if (scenario == ScenarioId.EVENT_DELAY) {
      return const EventInfo(
        id: "EVT1",
        name: "Mumbai T20 Super League · Final",
        venue: "Wankhede Stadium, Mumbai",
        date: "Today",
        startTime: "20:00 (Delayed +30m)",
        endTime: "23:00",
        totalCapacity: 33000,
        ticketsSold: 33000,
        status: "DELAYED (+30M)",
        allocatedGate: "Gate 3 (South)",
      );
    }
    return const EventInfo(
      id: "EVT1",
      name: "Mumbai T20 Super League · Final",
      venue: "Wankhede Stadium, Mumbai",
      date: "Today",
      startTime: "19:30",
      endTime: "22:30",
      totalCapacity: 33000,
      ticketsSold: 33000,
      status: "LIVE",
      allocatedGate: "Gate 3 (South)",
    );
  }

  static const EventInfo eventInfo = EventInfo(
    id: "EVT1",
    name: "Mumbai T20 Super League · Final",
    venue: "Wankhede Stadium, Mumbai",
    date: "Today",
    startTime: "19:30",
    endTime: "22:30",
    totalCapacity: 33000,
    ticketsSold: 33000,
    status: "LIVE",
    allocatedGate: "Gate 3 (South)",
  );

  static List<AttendeeRoute> getAttendeeRoutes(
    ScenarioId scenario,
    bool redistApproved,
  ) {
    final bool isDisrupted = scenario == ScenarioId.TRANSPORT_DISRUPTION;
    final bool isSurge = scenario == ScenarioId.POST_EVENT_SURGE;
    final bool isRain = scenario == ScenarioId.HEAVY_RAIN;
    final bool isDelay = scenario == ScenarioId.EVENT_DELAY;

    // Under POST_EVENT_SURGE or TRANSPORT_DISRUPTION or HEAVY_RAIN, BALANCED or LOW_CROWD receives higher suitability!
    bool balancedIsRecommended = true;
    bool lowCrowdIsRecommended = false;
    bool fastestIsRecommended = false;

    if (isSurge) {
      balancedIsRecommended = true;
    } else if (isDisrupted) {
      balancedIsRecommended = true;
    } else if (isRain) {
      balancedIsRecommended = true;
    } else if (scenario == ScenarioId.NORMAL && !redistApproved) {
      // In normal ops without redistribution, balanced is recommended for crowd safety
      balancedIsRecommended = true;
    }

    final int fastestTime = isDisrupted ? 45 : isSurge ? 42 : isRain ? 32 : 24;
    final int balancedTime = isRain ? 38 : 31;
    final int lowCrowdTime = isDisrupted ? 62 : isSurge ? 52 : 48;

    final String fastestExplanation = isDisrupted
        ? "Western Railway disruption detected. Direct route via Churchgate incurs severe platform backlog & low reliability."
        : isSurge
            ? "Shortest distance but passes directly through 94% Churchgate choke point during post-event exit surge."
            : isRain
                ? "Direct road corridor exposed to street flooding & heavy traffic slowdowns."
                : "Direct via CSMT/Churchgate. Shortest baseline time, but higher crowd congestion at peak exit.";

    final String balancedExplanation = redistApproved
        ? "★ JUNCTION RECOMMENDED BY ORGANIZER: Dadar corridor provides optimal balance — 40% lower crowd pressure with active electric shuttle lanes."
        : isDisrupted
            ? "★ JUNCTION RECOMMENDED: Western Railway disruption detected. This route bypasses Western Line and uses Central Line via Dadar hub."
            : isSurge
                ? "★ JUNCTION RECOMMENDED: Post-event exit surge active. Bypasses Churchgate bottleneck via Dadar dedicated shuttle lane."
                : isRain
                    ? "★ JUNCTION RECOMMENDED: Heavy rain detected. Uses covered concourses and weather-protected express shuttles."
                    : isDelay
                        ? "★ JUNCTION RECOMMENDED: Match start delayed by 30 mins. Provides optimal relaxed arrival timing."
                        : "★ JUNCTION RECOMMENDED: Dadar corridor provides the best operational balance — minimal extra time with 40% lower crowd exposure.";

    final String lowCrowdExplanation = isDisrupted
        ? "Avoids all primary transit bottlenecks via Marine Lines, but requires a significant time detour (62 mins)."
        : isSurge
            ? "Lowest crowd pressure route, bypassing both Churchgate and CSMT. Takes longer but guarantees a relaxed commute."
            : "Minimizes crowd exposure via coastal promenade path, but creates a detour from current location.";

    return [
      AttendeeRoute(
        id: "FASTEST",
        type: "FASTEST",
        label: "Fastest",
        totalTime: fastestTime,
        crowdLevel: isSurge || isDisrupted ? "CRITICAL" : "HIGH",
        congestionLevel: isDisrupted ? "HIGH" : "HIGH",
        transfers: 1,
        walkingTime: 5,
        reliability: isDisrupted ? "LOW" : "HIGH",
        recommended: fastestIsRecommended,
        steps: const [
          RouteStep(
            from: "Harbour Line Origin",
            to: "Vadala Road Station",
            mode: "WALK",
            duration: 5,
            distance: "400 m",
            instruction: "Walk via station east skywalk to ticket counters.",
          ),
          RouteStep(
            from: "Vadala Road",
            to: "CSMT Station",
            mode: "RAIL",
            duration: 12,
            lineName: "Harbour Line Fast Local",
            platform: "Platform 1",
            distance: "9.8 km",
            instruction: "Board CSMT-bound Fast Local. Alight at CSMT terminus.",
            frequency: "Every 4 mins",
            stops: ["Vadala Road", "Sewri", "Cotton Green", "Reay Road", "Dockyard Road", "Sandhurst Road", "CSMT"],
            crowdStatus: "High Crowd · Peak match flow",
          ),
          RouteStep(
            from: "CSMT Station",
            to: "Wankhede Stadium (Gate 3)",
            mode: "WALK",
            duration: 7,
            lineName: "Event Pedestrian Walkway",
            distance: "1.1 km",
            instruction: "Exit CSMT West Gate 1 -> Follow Mahapalika Marg directly to Gate 3.",
          ),
        ],
        explanation: fastestExplanation,
        score: isDisrupted ? 42 : isSurge ? 52 : 68,
      ),
      AttendeeRoute(
        id: "BALANCED",
        type: "BALANCED",
        label: "Balanced",
        totalTime: balancedTime,
        crowdLevel: redistApproved ? "LOW" : (isSurge ? "MEDIUM" : "LOW"),
        congestionLevel: "LOW",
        transfers: 1,
        walkingTime: isRain ? 4 : 8,
        reliability: "HIGH",
        recommended: balancedIsRecommended,
        steps: [
          const RouteStep(
            from: "Harbour Line Origin",
            to: "Station West Entrance",
            mode: "WALK",
            duration: 4,
            distance: "350 m",
            instruction: "Walk to station entry. Smart tap or UTS QR code accepted.",
          ),
          const RouteStep(
            from: "Kurla / Harbour Interchange",
            to: "Dadar Station",
            mode: "RAIL",
            duration: 14,
            lineName: "Central Suburban Local",
            platform: "Platform 4",
            distance: "6.5 km",
            instruction: "Board Slow Local to Dadar Station. Use FOB 2 to exit towards Dadar TT Circle.",
            frequency: "Every 3 mins",
            stops: ["Kurla", "Sion", "Matunga", "Dadar Central"],
            crowdStatus: "Low Crowd · 40% lower pressure than Churchgate",
          ),
          RouteStep(
            from: "Dadar TT Circle",
            to: "Wankhede Stadium (Gate 3)",
            mode: "BUS",
            duration: isRain ? 16 : 13,
            lineName: "BEST AC Event Express Shuttle #Special-7",
            platform: "Bay 2 (Dadar TT Circle)",
            distance: "9.2 km",
            instruction: "Board AC Electric Shuttle. Runs on dedicated event corridor directly to Gate 3.",
            frequency: "Every 3 mins (Dedicated Event Lane)",
            crowdStatus: "Guaranteed Seating · Bypasses Churchgate bottleneck",
          ),
        ],
        explanation: balancedExplanation,
        score: redistApproved ? 95 : isSurge ? 92 : 88,
      ),
      AttendeeRoute(
        id: "LOW_CROWD",
        type: "LOW_CROWD",
        label: "Low Crowd",
        totalTime: lowCrowdTime,
        crowdLevel: "LOW",
        congestionLevel: "LOW",
        transfers: 2,
        walkingTime: 12,
        reliability: "HIGH",
        recommended: lowCrowdIsRecommended,
        steps: const [
          RouteStep(
            from: "Harbour Line Origin",
            to: "Interchange Skywalk",
            mode: "WALK",
            duration: 5,
            distance: "450 m",
            instruction: "Walk through Skywalk 1 to Western Line connector.",
          ),
          RouteStep(
            from: "Western Rail Connector",
            to: "Marine Lines Station",
            mode: "RAIL",
            duration: 28,
            lineName: "Western Suburban Slow Local",
            platform: "Platform 3",
            distance: "14.5 km",
            instruction: "Board Slow Local toward Churchgate. Alight at Marine Lines.",
            frequency: "Every 6 mins",
            stops: ["Bandra", "Mahim", "Matunga Rd", "Dadar West", "Prabhadevi", "Lower Parel", "Mahalakshmi", "Mumbai Central", "Grant Rd", "Charni Rd", "Marine Lines"],
            crowdStatus: "Low Crowd · Relaxed and seated transit",
          ),
          RouteStep(
            from: "Marine Lines Station",
            to: "Wankhede Stadium (Gate 3)",
            mode: "WALK",
            duration: 12,
            lineName: "Marine Drive Promenade Path",
            distance: "850 m",
            instruction: "Exit Marine Lines East -> Walk along open Marine Drive sea-view walkway to Gate 3.",
          ),
        ],
        explanation: lowCrowdExplanation,
        score: isSurge ? 82 : 58,
      ),
    ];
  }

  static List<Hotel> getHotels(ScenarioId scenario) {
    final bool isSat = scenario == ScenarioId.ACCOMMODATION_SATURATION;
    final bool isSurge = scenario == ScenarioId.POST_EVENT_SURGE;
    final bool isDisrupted = scenario == ScenarioId.TRANSPORT_DISRUPTION;
    final bool isRain = scenario == ScenarioId.HEAVY_RAIN;

    // Zone A & B pressure multiplier under saturation / surge / disruption
    final int zoneAPressure = isSat ? 96 : isSurge ? 94 : isDisrupted ? 88 : isRain ? 82 : 78;
    final int zoneBPressure = isSat ? 92 : isSurge ? 86 : isDisrupted ? 84 : 72;
    final int zoneCPressure = isSat ? 48 : isSurge ? 44 : 38;

    final int zoneAAvail = isSat ? 2 : isSurge ? 4 : 8;
    final int zoneBAvail = isSat ? 3 : isSurge ? 5 : 12;

    return [
      Hotel(
        id: "H1",
        name: "Trident Nariman Point",
        zone: "ZONE_A",
        totalRooms: 540,
        availableRooms: zoneAAvail,
        usableRooms: (zoneAAvail * 0.75).round(),
        expectedCheckIns: 24,
        expectedCheckOuts: 18,
        travelTimeToVenue: isRain ? 18 : 12,
        pressure: zoneAPressure,
        pressureLevel: zoneAPressure >= 85 ? PressureLevel.CRITICAL : PressureLevel.HIGH,
        transportConnectivity: "EXCELLENT",
        eventDemand: "VERY_HIGH",
        source: "SIMULATED",
        priceRange: isSat ? "₹28,000 – ₹45,000" : "₹18,000 – ₹32,000",
        imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        reviewsCount: 4210,
        address: "Nariman Point, Mumbai, Maharashtra 400021",
        shuttleInfo: "Walking distance to Gate 3 & Wankhede Promenade (10 min)",
        phone: "+91 22 6632 4343",
        latitude: 18.9272,
        longitude: 72.8205,
        googleMapsPlaceId: "ChIJy--rLrfR5zsRoU_k5kX_H1Y",
        bookingUrl: "https://www.tridenthotels.com/hotels-in-mumbai-nariman-point",
        amenities: const [
          HotelAmenity(icon: "🌊", name: "Arabian Sea View"),
          HotelAmenity(icon: "🏊", name: "Infinity Pool"),
          HotelAmenity(icon: "🍽", name: "3 Fine Dining Restos"),
          HotelAmenity(icon: "🚗", name: "Valet & EV Charging"),
        ],
        roomTypes: const [
          HotelRoomType(name: "Deluxe Sea View King", price: "₹24,500/night", bedType: "1 King Bed", perks: "Complimentary breakfast & sea view"),
          HotelRoomType(name: "Trident Club Suite", price: "₹38,000/night", bedType: "1 Super King", perks: "Lounge access & luxury transfer"),
        ],
      ),
      Hotel(
        id: "H2",
        name: "Intercontinental Marine Drive",
        zone: "ZONE_A",
        totalRooms: 410,
        availableRooms: zoneAAvail + 1,
        usableRooms: zoneAAvail,
        expectedCheckIns: 19,
        expectedCheckOuts: 12,
        travelTimeToVenue: isRain ? 22 : 15,
        pressure: zoneAPressure - 2,
        pressureLevel: (zoneAPressure - 2) >= 85 ? PressureLevel.CRITICAL : PressureLevel.HIGH,
        transportConnectivity: "EXCELLENT",
        eventDemand: "VERY_HIGH",
        source: "SIMULATED",
        priceRange: isSat ? "₹24,000 – ₹38,000" : "₹14,000 – ₹28,000",
        imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
        rating: 4.7,
        reviewsCount: 3180,
        address: "135 Marine Drive, Churchgate, Mumbai, Maharashtra 400020",
        shuttleInfo: "5-minute stroll to Wankhede Gate 3 South Entry",
        phone: "+91 22 3987 9999",
        latitude: 18.9348,
        longitude: 72.8239,
        googleMapsPlaceId: "ChIJT6v0g7bR5zsRP85l0XgGg7s",
        bookingUrl: "https://www.ihg.com/intercontinental/hotels/us/en/mumbai/bomhb/hoteldetail",
        amenities: const [
          HotelAmenity(icon: "🍸", name: "Dome Rooftop Lounge"),
          HotelAmenity(icon: "💆", name: "Ayurvedic Spa"),
          HotelAmenity(icon: "📶", name: "High-Speed Wi-Fi"),
          HotelAmenity(icon: "🧳", name: "Match Day Concierge"),
        ],
        roomTypes: const [
          HotelRoomType(name: "Classic Marine View", price: "₹18,200/night", bedType: "1 Queen Bed", perks: "Free high-speed Wi-Fi & ocean breeze"),
          HotelRoomType(name: "Executive Ocean Suite", price: "₹31,000/night", bedType: "1 King Bed", perks: "Panoramic Marine Drive view"),
        ],
      ),
      Hotel(
        id: "H3",
        name: "Hotel Marine Plaza",
        zone: "ZONE_B",
        totalRooms: 68,
        availableRooms: zoneBAvail,
        usableRooms: (zoneBAvail * 0.8).round(),
        expectedCheckIns: 11,
        expectedCheckOuts: 8,
        travelTimeToVenue: 18,
        pressure: zoneBPressure,
        pressureLevel: zoneBPressure >= 85 ? PressureLevel.CRITICAL : PressureLevel.HIGH,
        transportConnectivity: "GOOD",
        eventDemand: "HIGH",
        source: "SIMULATED",
        priceRange: "₹7,000 – ₹12,000",
        imageUrl: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80",
        rating: 4.4,
        reviewsCount: 1950,
        address: "29 Marine Drive, Churchgate, Mumbai, Maharashtra 400020",
        shuttleInfo: "8 min direct transfer / 12 min walking path",
        phone: "+91 22 2285 1212",
        latitude: 18.9312,
        longitude: 72.8234,
        googleMapsPlaceId: "ChIJ9Z_k77bR5zsRB891-xgHg7t",
        bookingUrl: "https://www.hotelmarineplaza.com/",
        amenities: const [
          HotelAmenity(icon: "🏊", name: "Glass Rooftop Pool"),
          HotelAmenity(icon: "☕", name: "The Bayview 24/7"),
          HotelAmenity(icon: "🍳", name: "Complimentary Buffet"),
          HotelAmenity(icon: "🚕", name: "Airport Pickup"),
        ],
        roomTypes: const [
          HotelRoomType(name: "Standard City Room", price: "₹8,500/night", bedType: "1 Double Bed", perks: "Full breakfast included"),
          HotelRoomType(name: "Bayview Executive Room", price: "₹12,400/night", bedType: "1 King Bed", perks: "Overlooks Queen's Necklace"),
        ],
      ),
      Hotel(
        id: "H4",
        name: "Ramada by Wyndham Dadar",
        zone: "ZONE_C",
        totalRooms: 250,
        availableRooms: 68,
        usableRooms: 54,
        expectedCheckIns: 27,
        expectedCheckOuts: 14,
        travelTimeToVenue: 22,
        pressure: zoneCPressure,
        pressureLevel: PressureLevel.NORMAL,
        transportConnectivity: "EXCELLENT",
        eventDemand: "HIGH",
        source: "SIMULATED",
        priceRange: "₹4,500 – ₹8,000",
        imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        reviewsCount: 2840,
        address: "Millenium Business Park, Senapati Bapat Marg, Dadar West, Mumbai 400028",
        shuttleInfo: "Dedicated Junction Express Shuttle to Wankhede (20 mins)",
        phone: "+91 22 2419 8888",
        latitude: 19.0180,
        longitude: 72.8430,
        amenities: const [
          HotelAmenity(icon: "🚌", name: "Dedicated Venue Shuttle"),
          HotelAmenity(icon: "🎟", name: "Match Pass 15% OFF"),
          HotelAmenity(icon: "🏋️", name: "Fitness Center"),
          HotelAmenity(icon: "🅿️", name: "Free Secure Parking"),
        ],
        roomTypes: const [
          HotelRoomType(name: "Superior Twin Room", price: "₹4,800/night", bedType: "2 Twin Beds", perks: "Includes express breakfast & free shuttle"),
          HotelRoomType(name: "Deluxe King Room", price: "₹6,900/night", bedType: "1 King Bed", perks: "Late checkout (2 PM) for match night"),
        ],
      ),
      Hotel(
        id: "H5",
        name: "Hotel Kohinoor Dadar",
        zone: "ZONE_C",
        totalRooms: 180,
        availableRooms: 42,
        usableRooms: 36,
        expectedCheckIns: 18,
        expectedCheckOuts: 9,
        travelTimeToVenue: 25,
        pressure: zoneCPressure - 4,
        pressureLevel: PressureLevel.NORMAL,
        transportConnectivity: "GOOD",
        eventDemand: "MODERATE",
        source: "SIMULATED",
        priceRange: "₹3,200 – ₹6,000",
        imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
        rating: 4.4,
        reviewsCount: 1620,
        address: "Kohinoor Bhavan, Dadar East, Mumbai, Maharashtra 400014",
        shuttleInfo: "2 min walk to Dadar Central Station -> Fast local to CSMT",
        phone: "+91 22 2410 7777",
        latitude: 19.0191,
        longitude: 72.8436,
        googleMapsPlaceId: "ChIJVVVV5LTR5zsRwX_k5kX_H1Z",
        bookingUrl: "https://hotelkohinoorpark.com/",
        amenities: const [
          HotelAmenity(icon: "🚆", name: "200m from Dadar Station"),
          HotelAmenity(icon: "🥞", name: "Traditional Maharashtrian Buffet"),
          HotelAmenity(icon: "📶", name: "High-Speed Wi-Fi"),
          HotelAmenity(icon: "⏰", name: "24-Hour Room Service"),
        ],
        roomTypes: const [
          HotelRoomType(name: "Comfort Double", price: "₹3,600/night", bedType: "1 Double Bed", perks: "Value choice for budget attendees"),
          HotelRoomType(name: "Executive Suite", price: "₹5,200/night", bedType: "1 King Bed", perks: "Complimentary breakfast & tea bar"),
        ],
      ),
    ];
  }

  static List<Restaurant> getRestaurants(ScenarioId scenario) {
    final bool isSurge = scenario == ScenarioId.POST_EVENT_SURGE;
    final bool isDelay = scenario == ScenarioId.EVENT_DELAY;

    final int r1Wait = isSurge ? 75 : isDelay ? 40 : 55;
    final int r1PredWait = isSurge ? 95 : isDelay ? 60 : 75;
    final int r1Pressure = isSurge ? 98 : isDelay ? 78 : 91;

    final int r2Wait = isSurge ? 60 : isDelay ? 35 : 42;
    final int r2PredWait = isSurge ? 80 : isDelay ? 50 : 60;
    final int r2Pressure = isSurge ? 92 : isDelay ? 72 : 84;

    final int r4Wait = isSurge ? 8 : isDelay ? 12 : 5;
    final int r4PredWait = isSurge ? 14 : isDelay ? 18 : 12;
    final int r4Pressure = isSurge ? 38 : isDelay ? 42 : 46;

    return [
      Restaurant(
        id: "R1",
        name: "Trishna",
        cuisine: "Coastal Seafood & Mangalorean",
        zone: "ZONE_A",
        capacity: 80,
        currentOccupancy: (80 * (r1Pressure / 100)).round(),
        availableTables: isSurge ? 0 : 2,
        waitTime: r1Wait,
        predictedWaitTime: r1PredWait,
        distanceFromVenue: 8,
        pressure: r1Pressure,
        pressureLevel: r1Pressure >= 85 ? PressureLevel.CRITICAL : PressureLevel.HIGH,
        source: "SIMULATED",
        hasIncentive: false,
        recommended: false,
        imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        rating: 4.6,
        reviewsCount: 3840,
        address: "7, Sai Baba Marg, Kala Ghoda, Fort, Mumbai",
        openingHours: "12:00 PM – 3:30 PM, 6:30 PM – 12:00 AM",
        phone: "+91 22 2270 3208",
        latitude: 18.9281,
        longitude: 72.8318,
        googleMapsPlaceId: "ChIJ-x3iGbbR5zsRoU_k5kX_H1a",
        websiteUrl: "https://www.trishna.co.in",
        reservationUrl: "https://www.trishna.co.in",
        menuItems: const [
          MenuItem(name: "Butter Pepper Garlic Crab", price: "₹1,850", description: "Iconic signature jumbo mud crab in garlic butter sauce", isVeg: false, isSpecial: true),
          MenuItem(name: "Koliwada Prawns", price: "₹720", description: "Crispy Mumbai fisherfolk spiced fried prawns", isVeg: false),
          MenuItem(name: "Neer Dosa (4 pcs)", price: "₹180", description: "Delicate coastal rice crepes served with coconut chutney", isVeg: true),
          MenuItem(name: "Hyderabadi Fish Biryani", price: "₹680", description: "Fragrant spiced basmati with fresh kingfish fillet", isVeg: false),
        ],
      ),
      Restaurant(
        id: "R2",
        name: "Bade Miya",
        cuisine: "Street Grill & Seekh Kebabs",
        zone: "ZONE_A",
        capacity: 60,
        currentOccupancy: (60 * (r2Pressure / 100)).round(),
        availableTables: isSurge ? 1 : 3,
        waitTime: r2Wait,
        predictedWaitTime: r2PredWait,
        distanceFromVenue: 10,
        pressure: r2Pressure,
        pressureLevel: r2Pressure >= 85 ? PressureLevel.CRITICAL : PressureLevel.HIGH,
        source: "SIMULATED",
        hasIncentive: false,
        recommended: false,
        imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
        rating: 4.2,
        reviewsCount: 6520,
        address: "Tulloch Road, Behind Taj Mahal Palace, Colaba, Mumbai",
        openingHours: "1:00 PM – 4:00 AM (Late Night)",
        phone: "+91 22 2284 8038",
        latitude: 18.9220,
        longitude: 72.8327,
        googleMapsPlaceId: "ChIJjX_k7bbR5zsRkU_k5kX_H1b",
        websiteUrl: "https://bademiya.com",
        reservationUrl: "https://bademiya.com",
        menuItems: const [
          MenuItem(name: "Mutton Seekh Kebab Roll", price: "₹340", description: "Charcoal roasted spiced minced meat wrapped in rumali roti", isVeg: false, isSpecial: true),
          MenuItem(name: "Chicken Baida Roti", price: "₹290", description: "Crispy griddled egg and spiced chicken parcel with mint chutney", isVeg: false, isSpecial: true),
          MenuItem(name: "Paneer Bhuna Roll", price: "₹240", description: "Tandoori cottage cheese chunks in rich roasted onion gravy", isVeg: true),
          MenuItem(name: "Bheja Fry with Pav", price: "₹380", description: "Mumbai street specialty spiced brain masala served with hot pav", isVeg: false),
        ],
      ),
      Restaurant(
        id: "R3",
        name: "Britannia & Co.",
        cuisine: "Parsi & Irani Heritage Café",
        zone: "ZONE_B",
        capacity: 120,
        currentOccupancy: 88,
        availableTables: 8,
        waitTime: 15,
        predictedWaitTime: 28,
        distanceFromVenue: 14,
        pressure: 68,
        pressureLevel: PressureLevel.WATCH,
        source: "SIMULATED",
        hasIncentive: false,
        recommended: false,
        imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        reviewsCount: 5120,
        address: "Wakefield House, 11 Sprott Rd, Ballard Estate, Fort, Mumbai",
        openingHours: "11:30 AM – 4:30 PM (Vintage Lunch Only)",
        phone: "+91 22 2261 5264",
        latitude: 18.9351,
        longitude: 72.8392,
        googleMapsPlaceId: "ChIJy-_k7bbR5zsRlU_k5kX_H1c",
        websiteUrl: "https://www.zomato.com/mumbai/britannia-co-restaurant-fort",
        reservationUrl: "https://www.zomato.com/mumbai/britannia-co-restaurant-fort/book",
        menuItems: const [
          MenuItem(name: "Berry Pulao (Mutton / Chicken)", price: "₹650", description: "Legendary Iranian barberries over aromatic saffron rice & succulent meat", isVeg: false, isSpecial: true),
          MenuItem(name: "Salli Boti with Rotli", price: "₹480", description: "Slow-cooked sweet and sour mutton stew topped with crunchy potato straws", isVeg: false, isSpecial: true),
          MenuItem(name: "Caramel Custard", price: "₹180", description: "Classic 100-year old recipe silky vanilla custard with burnt sugar glaze", isVeg: true, isSpecial: true),
          MenuItem(name: "Dhansak with Brown Rice", price: "₹520", description: "Traditional lentils, spiced vegetables & meat served with caramelized rice", isVeg: false),
        ],
      ),
      Restaurant(
        id: "R4",
        name: "Café Madras",
        cuisine: "Authentic South Indian & Filter Coffee",
        zone: "ZONE_C",
        capacity: 90,
        currentOccupancy: (90 * (r4Pressure / 100)).round(),
        availableTables: 18,
        waitTime: r4Wait,
        predictedWaitTime: r4PredWait,
        distanceFromVenue: 24,
        pressure: r4Pressure,
        pressureLevel: PressureLevel.NORMAL,
        source: "SIMULATED",
        hasIncentive: true,
        incentiveLabel: "10% OFF for match ticket holders",
        recommended: true, // JUNCTION RECOMMENDS: Zone C low wait time
        imageUrl: "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80",
        rating: 4.9,
        reviewsCount: 8900,
        address: "38 B, Circle House, King's Circle, Matunga East, Mumbai",
        openingHours: "7:00 AM – 2:30 PM, 4:00 PM – 10:30 PM",
        phone: "+91 22 2401 4419",
        latitude: 19.0270,
        longitude: 72.8533,
        googleMapsPlaceId: "ChIJ-y3iGbbR5zsRmU_k5kX_H1d",
        websiteUrl: "https://www.zomato.com/mumbai/cafe-madras-matunga-east",
        reservationUrl: null,
        menuItems: const [
          MenuItem(name: "Butter Idli Podi (3 pcs)", price: "₹130", description: "Fluffy steamed rice cakes bathed in pure melted butter & gun powder spice", isVeg: true, isSpecial: true),
          MenuItem(name: "Mysore Masala Dosa", price: "₹160", description: "Crisp golden crepe layered with fiery red chutney & spiced potato mash", isVeg: true, isSpecial: true),
          MenuItem(name: "Degree Filter Coffee", price: "₹65", description: "Traditional frothed South Indian chicory coffee in stainless steel tumbler", isVeg: true, isSpecial: true),
          MenuItem(name: "Rava Onion Dosa", price: "₹170", description: "Lacy semolina crepe studded with green chilies, cashews & chopped onions", isVeg: true),
        ],
      ),
    ];
  }

  static List<Alert> getAlerts(ScenarioId scenario) {
    return ScenarioIntelligenceService.getScenarioAlerts(scenario);
  }
}
