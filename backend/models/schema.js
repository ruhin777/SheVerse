const mongoose = require("mongoose");

// ================= USER =================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  profilePhoto: String,
  bio: String,
  interests: [String],
  height: Number,
  weight: Number,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// ================= SAFETY SYSTEM =================
const trustedContactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  phone: String
});
const TrustedContact = mongoose.model("TrustedContact", trustedContactSchema);

const sosAlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  locationLink: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});
const SOSAlert = mongoose.model("SOSAlert", sosAlertSchema);

const liveLocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now }
});
const LiveLocation = mongoose.model("LiveLocation", liveLocationSchema);

const incidentReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: String,
  location: String,
  dateTime: Date,
  anonymous: Boolean
});
const IncidentReport = mongoose.model("IncidentReport", incidentReportSchema);

const emergencyServiceSchema = new mongoose.Schema({
  name: String,
  type: String,
  address: String,
  contactNumber: String,
  latitude: Number,
  longitude: Number
});
const EmergencyService = mongoose.model("EmergencyService", emergencyServiceSchema);

// ================= MENSTRUAL TRACKER =================
const periodCycleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  startDate: Date,
  endDate: Date
});
const PeriodCycle = mongoose.model("PeriodCycle", periodCycleSchema);

const symptomLogSchema = new mongoose.Schema({
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: "PeriodCycle" },
  symptom: String,
  date: Date
});
const SymptomLog = mongoose.model("SymptomLog", symptomLogSchema);

// ================= LIFESTYLE =================
const bmiRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  height: Number,
  weight: Number,
  bmi: Number,
  category: String
});
const BMIRecord = mongoose.model("BMIRecord", bmiRecordSchema);

const todoTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  completed: Boolean
});
const TodoTask = mongoose.model("TodoTask", todoTaskSchema);

// ================= EXERCISE SYSTEM =================
const exerciseSchema = new mongoose.Schema({
  name: String,
  category: String,
  difficulty: String,
  duration: String,
  instructions: String
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

const exerciseLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
  completed: Boolean,
  date: Date
});
const ExerciseLog = mongoose.model("ExerciseLog", exerciseLogSchema);

// ================= HEALTH ARTICLES =================
const articleSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  category: String,
  content: String,
  rating: Number
});
const Article = mongoose.model("Article", articleSchema);

const bookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: "Article" }
});
const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

// ================= AI BOT =================
const chatBotQuerySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  question: String,
  response: String,
  timestamp: { type: Date, default: Date.now }
});
const ChatBotQuery = mongoose.model("ChatBotQuery", chatBotQuerySchema);

// ================= TRAVEL SYSTEM =================
const placeSchema = new mongoose.Schema({
  name: String,
  category: String,
  location: String,
  description: String,
  rating: Number
});
const Place = mongoose.model("Place", placeSchema);

const restaurantSchema = new mongoose.Schema({
  name: String,
  location: String,
  rating: Number,
  placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" }
});
const Restaurant = mongoose.model("Restaurant", restaurantSchema);

const recommendationSchema = new mongoose.Schema({
  placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
  recommendedPlaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
  distance: Number
});
const Recommendation = mongoose.model("Recommendation", recommendationSchema);

const guideSchema = new mongoose.Schema({
  name: String,
  destination: String,
  language: String,
  rating: Number,
  verified: Boolean,
  pricePerDay: Number,
  contact: String
});
const Guide = mongoose.model("Guide", guideSchema);

const guideBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  guideId: { type: mongoose.Schema.Types.ObjectId, ref: "Guide" },
  bookingDate: Date,
  paymentStatus: String
});
const GuideBooking = mongoose.model("GuideBooking", guideBookingSchema);

const hotelSchema = new mongoose.Schema({
  name: String,
  location: String,
  pricePerNight: Number,
  rating: Number,
  safetyVerified: Boolean
});
const Hotel = mongoose.model("Hotel", hotelSchema);

const tripPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  destination: String,
  category: String,
  startDate: Date,
  endDate: Date,
  budget: Number,
  travelType: String,
  teamSize: Number,
  preferences: String
});
const TripPlan = mongoose.model("TripPlan", tripPlanSchema);

const travelBuddyMatchSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "TripPlan" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  matchedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: String
});
const TravelBuddyMatch = mongoose.model("TravelBuddyMatch", travelBuddyMatchSchema);

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel" },
  checkIn: Date,
  checkOut: Date,
  paymentStatus: String,
  stripePaymentId: String
});
const Booking = mongoose.model("Booking", bookingSchema);

// ================= MARKETPLACE =================
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  image: String,
  description: String,
  type: String
});
const Product = mongoose.model("Product", productSchema);

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  totalPrice: Number,
  paymentStatus: String,
  orderDate: { type: Date, default: Date.now }
});
const Order = mongoose.model("Order", orderSchema);

const orderItemSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
  price: Number
});
const OrderItem = mongoose.model("OrderItem", orderItemSchema);

// ================= PAYMENT SYSTEM =================
const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  paymentMethod: String,
  stripePaymentId: String,
  paymentStatus: String,
  paymentDate: { type: Date, default: Date.now }
});
const Payment = mongoose.model("Payment", paymentSchema);

// ================= REVIEW SYSTEM =================
const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating: Number,
  comment: String,
  date: { type: Date, default: Date.now }
});
const Review = mongoose.model("Review", reviewSchema);

// ================= SOCIAL FEED =================
const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  image: String,
  isAnonymous: Boolean,
  timestamp: { type: Date, default: Date.now }
});
const Post = mongoose.model("Post", postSchema);

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  groupPostId: { type: mongoose.Schema.Types.ObjectId, ref: "GroupPost" },
  emoji: String
});
const Reaction = mongoose.model("Reaction", reactionSchema);

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  groupPostId: { type: mongoose.Schema.Types.ObjectId, ref: "GroupPost" },
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Comment = mongoose.model("Comment", commentSchema);

// ================= GROUP SYSTEM =================
const groupSchema = new mongoose.Schema({
  name: String,
  category: String,
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});
const Group = mongoose.model("Group", groupSchema);

const groupMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }
});
const GroupMember = mongoose.model("GroupMember", groupMemberSchema);

const groupPostSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  timestamp: { type: Date, default: Date.now }
});
const GroupPost = mongoose.model("GroupPost", groupPostSchema);

// ================= FRIEND SYSTEM =================
const friendRequestSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: String
});
const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

// ================= CHAT SYSTEM =================
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

// ================= EXPORT ALL =================
module.exports = {
  User,
  TrustedContact,
  SOSAlert,
  LiveLocation,
  IncidentReport,
  EmergencyService,
  PeriodCycle,
  SymptomLog,
  BMIRecord,
  TodoTask,
  Exercise,
  ExerciseLog,
  Article,
  Bookmark,
  ChatBotQuery,
  Place,
  Restaurant,
  Recommendation,
  Guide,
  GuideBooking,
  Hotel,
  TripPlan,
  TravelBuddyMatch,
  Booking,
  Product,
  Order,
  OrderItem,
  Payment,
  Review,
  Post,
  Reaction,
  Comment,
  Group,
  GroupMember,
  GroupPost,
  FriendRequest,
  Message
};