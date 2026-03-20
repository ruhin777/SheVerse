const express = require("express");
const router = express.Router();
const { Place, Restaurant, Recommendation } = require("../models/schema");

// ── Haversine distance helper (km) ──────────────────────────
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── POST /api/places/seed ────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await Place.deleteMany();
    await Restaurant.deleteMany();

    await Place.insertMany([
      { name: "Ramna Park",             category: "park",       city: "Dhaka",       location: "Ramna, Dhaka",                    description: "A large urban park in the heart of Dhaka.",                              rating: 4.5, tags: ["nature","outdoor","walking"],                   coordinates: { lat: 23.7368, lng: 90.3971 }, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Entrance_gate_of_Ramna_Park_at_Dhaka%2C_31_August_2017_%2836798446781%29.jpg/1280px-Entrance_gate_of_Ramna_Park_at_Dhaka%2C_31_August_2017_%2836798446781%29.jpg?_=20171003163206" },
      { name: "Shaheed Suhrawardy Udyan",category: "park",      city: "Dhaka",       location: "Sher-e-Bangla Nagar, Dhaka",      description: "Historic park where Bangladesh's independence was declared.",           rating: 4.3, tags: ["history","outdoor","nature"],                   coordinates: { lat: 23.7389, lng: 90.3944 }, image: "https://cdn.pixabay.com/photo/2022/07/04/03/05/suhrawardy-udyan-7300262_1280.jpg" },
      { name: "Dhaka University Campus", category: "historical", city: "Dhaka",       location: "Nilkhet, Dhaka",                  description: "The oldest university in Bangladesh with beautiful architecture.",      rating: 4.6, tags: ["education","architecture","history","walking"], coordinates: { lat: 23.7283, lng: 90.3961 }, image: "https://w0.peakpx.com/wallpaper/324/906/HD-wallpaper-curzon-hall-asia-bangladesh-castles-dhaka-dhaka-university-du-heritage-history-university-of-dhaka.jpg" },
      { name: "Lalbagh Fort",            category: "historical", city: "Dhaka",       location: "Lalbagh, Old Dhaka",              description: "Mughal-era fort from the 17th century.",                               rating: 4.4, tags: ["history","architecture","mughal"],              coordinates: { lat: 23.7195, lng: 90.3878 }, image: "https://thumbs.dreamstime.com/b/lalbagh-fort-dhaka-bangladesh-sunset-incomplete-th-century-mughal-complex-stands-proudly-55742473.jpg" },
      { name: "Ahsan Manzil",            category: "museum",     city: "Dhaka",       location: "Kumartoli, Dhaka",                description: "The Pink Palace — former residence of the Nawabs of Dhaka.",          rating: 4.5, tags: ["history","museum","architecture"],              coordinates: { lat: 23.7097, lng: 90.4072 }, image: "https://i.pinimg.com/736x/72/ec/e7/72ece7523b9161e61970039becb9b90f.jpg" },
      { name: "Hatirjheel Lake",         category: "park",       city: "Dhaka",       location: "Hatirjheel, Dhaka",               description: "Urban lake with walking paths, bridges and city views.",               rating: 4.2, tags: ["lake","walking","outdoor","nature"],            coordinates: { lat: 23.7627, lng: 90.4057 }, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_JqtP6mALOBoLiz-trLXFJy-pPN85iTEyhg&s" },
      { name: "Cox's Bazar Beach",       category: "beach",      city: "Cox's Bazar", location: "Cox's Bazar, Chittagong Division",description: "World's longest natural sea beach.",                                    rating: 4.8, tags: ["beach","sea","nature","vacation"],             coordinates: { lat: 21.4272, lng: 92.0058 }, image: "https://image.vietnamnews.vn/uploadvnnews/Article/2023/1/5/258976_cox.jpg" },
      { name: "Sajek Valley",            category: "hill",       city: "Rangamati",   location: "Baghaichhari, Rangamati",         description: "Cloud-kissed hill valley, one of the most scenic spots in Bangladesh.",rating: 4.8, tags: ["hill","clouds","nature","trekking","vacation"],  coordinates: { lat: 23.3831, lng: 92.2935 }, image: "https://images.unsplash.com/photo-1658383895221-173f07c6a9d0?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2FqZWslMjB2YWxsZXl8ZW58MHx8MHx8fDA%3D" },
      { name: "Bandarban Hill",          category: "hill",       city: "Bandarban",   location: "Bandarban, Chittagong Division",  description: "Scenic hill tracts with tribal culture.",                              rating: 4.7, tags: ["hill","trekking","nature","adventure"],          coordinates: { lat: 22.1953, lng: 92.2184 }, image: "https://t4.ftcdn.net/jpg/05/17/09/57/360_F_517095709_TTVKc9Jlk34g2HyAS1W6isKRChFGzx40.jpg" },
      { name: "Sundarbans",              category: "other",      city: "Khulna",      location: "Khulna Division",                 description: "The largest mangrove forest in the world.",                            rating: 4.9, tags: ["nature","wildlife","forest","adventure"],        coordinates: { lat: 21.9497, lng: 89.1833 }, image: "https://images.unsplash.com/photo-1706459671567-43529d418cd1?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8c3VuZGFyYmFufGVufDB8fDB8fHww" },
    ]);

    await Restaurant.insertMany([
      { name: "Kacchi Bhai",         city: "Dhaka",       location: "Dhanmondi, Dhaka",      cuisine: "Bangladeshi", rating: 4.6, priceRange: "$$" },
      { name: "Haji Biryani",        city: "Dhaka",       location: "Old Dhaka",             cuisine: "Biryani",     rating: 4.7, priceRange: "$"  },
      { name: "Star Kebab",          city: "Dhaka",       location: "Purana Paltan, Dhaka",  cuisine: "BBQ",         rating: 4.3, priceRange: "$"  },
      { name: "Cafe Mango",          city: "Dhaka",       location: "Gulshan, Dhaka",        cuisine: "Continental", rating: 4.1, priceRange: "$$$"},
      { name: "Niribili Restaurant", city: "Cox's Bazar", location: "Cox's Bazar Sadar",     cuisine: "Seafood",     rating: 4.5, priceRange: "$$" },
      { name: "Hill View Cafe",      city: "Bandarban",   location: "Bandarban Sadar",       cuisine: "Local",       rating: 4.2, priceRange: "$"  },
      { name: "Meghla Restaurant",   city: "Rangamati",   location: "Rangamati Sadar",       cuisine: "Local",       rating: 4.1, priceRange: "$"  },
      { name: "Sundarban Eco Cafe",  city: "Khulna",      location: "Khulna Sadar",          cuisine: "Local",       rating: 4.0, priceRange: "$"  },
    ]);

    res.json({ message: "✅ Seed data inserted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/places/all ──────────────────────────────────────
router.get("/all", async (req, res) => {
  try {
    const { category, city, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (city) filter.city = new RegExp(city, "i");
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { tags: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
      ];
    }
    const places = await Place.find(filter).sort({ rating: -1 });
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/places/restaurants/all ─────────────────────────
router.get("/restaurants/all", async (req, res) => {
  try {
    const { city } = req.query;
    const filter = city ? { city: new RegExp(city, "i") } : {};
    const restaurants = await Restaurant.find(filter).sort({ rating: -1 });
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/places/search/:name ─────────────────────────────
router.get("/search/:name", async (req, res) => {
  try {
    const place = await Place.findOne({
      name: new RegExp(req.params.name, "i"),
    });
    if (!place) return res.status(404).json({ message: "Place not found" });

    const candidates = await Place.find({
      _id: { $ne: place._id },
      $or: [
        { city: place.city },
        { category: place.category },
        { tags: { $in: place.tags || [] } },
      ],
    }).limit(10);

    const similarPlaces = candidates
      .map((p) => {
        let score = 0;
        if (p.city === place.city) score += 3;
        if (p.category === place.category) score += 2;
        const sharedTags = (p.tags || []).filter((t) =>
          (place.tags || []).includes(t)
        ).length;
        score += sharedTags;
        if (place.coordinates?.lat && p.coordinates?.lat) {
          const dist = getDistance(
            place.coordinates.lat, place.coordinates.lng,
            p.coordinates.lat, p.coordinates.lng
          );
          if (dist < 5) score += 3;
          else if (dist < 20) score += 1;
        }
        return { ...p.toObject(), _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);

    const restaurants = await Restaurant.find({ city: place.city }).limit(5);

    const manualRecs = await Recommendation.find({ placeId: place._id })
      .populate("recommendedPlaceId")
      .lean();

    res.json({
      place,
      similarPlaces,
      nearbyRestaurants: restaurants,
      manualRecommendations: manualRecs.map((r) => r.recommendedPlaceId),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/places/:id/recommendations ─────────────────────
router.get("/:id/recommendations", async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ message: "Place not found" });

    const candidates = await Place.find({
      _id: { $ne: place._id },
      $or: [
        { city: place.city },
        { category: place.category },
        { tags: { $in: place.tags || [] } },
      ],
    }).limit(10);

    const similarPlaces = candidates
      .map((p) => {
        let score = 0;
        if (p.city === place.city) score += 3;
        if (p.category === place.category) score += 2;
        const sharedTags = (p.tags || []).filter((t) =>
          (place.tags || []).includes(t)
        ).length;
        score += sharedTags;
        if (place.coordinates?.lat && p.coordinates?.lat) {
          const dist = getDistance(
            place.coordinates.lat, place.coordinates.lng,
            p.coordinates.lat, p.coordinates.lng
          );
          if (dist < 5) score += 3;
          else if (dist < 20) score += 1;
        }
        return { ...p.toObject(), _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);

    const restaurants = await Restaurant.find({ city: place.city }).limit(5);

    res.json({ place, similarPlaces, nearbyRestaurants: restaurants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/places/add-place ───────────────────────────────
router.post("/add-place", async (req, res) => {
  try {
    const place = new Place(req.body);
    await place.save();
    res.json(place);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/places/add-restaurant ─────────────────────────
router.post("/add-restaurant", async (req, res) => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/places/add-recommendation ─────────────────────
router.post("/add-recommendation", async (req, res) => {
  try {
    const rec = new Recommendation(req.body);
    await rec.save();
    res.json(rec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;