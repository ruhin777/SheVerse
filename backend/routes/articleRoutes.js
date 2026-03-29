const express = require("express");
const router  = express.Router();
const { Article, Bookmark } = require("../models/schema");

// ── GET all articles (search + category filter) ──────────────
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};
    if (category && category !== "All") filter.category = category;
    if (search) filter.title = { $regex: search, $options: "i" };
    const articles = await Article.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, articles });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET user bookmarks ────────────────────────────────────────
router.get("/bookmarks/:userId", async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.params.userId }).populate("articleId");
    const articles = bookmarks.map(b => b.articleId).filter(Boolean);
    res.json({ success: true, articles });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET single article ────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, article });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST create article ───────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { title, content, category, authorId, authorName, image } = req.body;
    const article = new Article({ title, content, category, authorId, authorName, image });
    await article.save();
    res.json({ success: true, article });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST like/unlike ──────────────────────────────────────────
router.post("/:id/like", async (req, res) => {
  try {
    const { userId } = req.body;
    const article = await Article.findById(req.params.id);
    const liked = (article.likes || []).map(id => id.toString()).includes(userId);
    if (liked) article.likes = article.likes.filter(id => id.toString() !== userId);
    else { article.likes = article.likes || []; article.likes.push(userId); }
    await article.save();
    res.json({ success: true, liked: !liked, likeCount: article.likes.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST rate article ─────────────────────────────────────────
router.post("/:id/rate", async (req, res) => {
  try {
    const { userId, rating } = req.body;
    const article = await Article.findById(req.params.id);
    article.ratings = article.ratings || [];
    const existing = article.ratings.find(r => r.userId?.toString() === userId);
    if (existing) existing.rating = rating;
    else article.ratings.push({ userId, rating });
    await article.save();
    const avg = article.ratings.reduce((s, r) => s + r.rating, 0) / article.ratings.length;
    res.json({ success: true, avgRating: avg.toFixed(1) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST bookmark/unbookmark ──────────────────────────────────
router.post("/:id/bookmark", async (req, res) => {
  try {
    const { userId } = req.body;
    const existing = await Bookmark.findOne({ userId, articleId: req.params.id });
    if (existing) {
      await Bookmark.findByIdAndDelete(existing._id);
      res.json({ success: true, bookmarked: false });
    } else {
      await Bookmark.create({ userId, articleId: req.params.id });
      res.json({ success: true, bookmarked: true });
    }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST seed articles ────────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    await Article.deleteMany({ authorName: "SheVerse Team" });
    await Article.insertMany(SEED_ARTICLES);
    res.json({ success: true, message: `✅ ${SEED_ARTICLES.length} articles seeded successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

// ═══════════════════════════════════════════════════════════════
//  SEED DATA
// ═══════════════════════════════════════════════════════════════
const SEED_ARTICLES = [

  // ─────────────────────────────────────────
  //  NUTRITION (8 articles)
  // ─────────────────────────────────────────
  {
    title: "Complete Nutrition Guide for Women at Every Life Stage",
    category: "Nutrition",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800",
    content: `Nutrition is not one-size-fits-all, especially for women. Our nutritional needs change dramatically across different life stages — from adolescence through menopause and beyond. Understanding what your body needs at each stage is the foundation of lasting health and vitality.

ADOLESCENCE (13-18 years):
During puberty, girls experience rapid growth and the onset of menstruation. This creates increased demand for several key nutrients. Iron becomes critically important as menstruation begins — teenage girls need 15mg daily. Good sources include red meat, fortified cereals, lentils and dark leafy greens. Pair iron-rich foods with Vitamin C sources like orange juice to enhance absorption. Calcium requirements peak during adolescence — aim for 1300mg daily through dairy products, fortified plant milks, tofu and sardines. Zinc supports healthy growth and immune function — found in pumpkin seeds, chickpeas and whole grains.

REPRODUCTIVE YEARS (18-40 years):
Women in their reproductive years need to pay special attention to folate (400-600mcg daily), especially if planning pregnancy. Folate prevents neural tube defects and supports cell division. Rich sources include dark leafy greens, avocado, beans and fortified grains. Continue prioritizing iron (18mg daily) to compensate for monthly blood loss. Omega-3 fatty acids support hormonal balance — eat fatty fish like salmon twice weekly, or take algae-based supplements if vegetarian. Magnesium (320mg daily) reduces PMS symptoms, improves sleep and supports hundreds of enzymatic reactions. Find it in nuts, seeds, dark chocolate and whole grains.

PREGNANCY AND BREASTFEEDING:
Caloric needs increase by only 340-450 calories in the second and third trimesters — quality matters more than quantity. Protein needs rise to 71g daily to support fetal growth. Iron requirements double to 27mg daily. Choline (450mg daily) is crucial for fetal brain development — eggs are an excellent source. DHA omega-3 fatty acids are essential for baby's brain and eye development. Continue prenatal vitamins throughout breastfeeding as well.

PERIMENOPAUSE AND MENOPAUSE (40+ years):
As estrogen declines, bone loss accelerates. Calcium needs increase to 1200mg daily and Vitamin D to 600-800 IU to maintain bone density. Phytoestrogens from soy, flaxseeds and legumes may help manage hot flashes naturally. Protein needs increase to preserve muscle mass — aim for 1.0-1.2g per kilogram of body weight. Fiber (21g daily) supports gut health and cardiovascular protection.

PRACTICAL TIPS FOR ALL AGES:
• Eat a rainbow of vegetables and fruits daily for diverse phytonutrients
• Choose whole grains over refined carbohydrates
• Include healthy fats — avocado, olive oil, nuts — at every meal
• Stay hydrated with 8-10 glasses of water daily
• Limit ultra-processed foods, added sugars and excessive sodium
• Consider a comprehensive multivitamin designed for women as nutritional insurance
• Work with a registered dietitian for personalized guidance

Remember that food is medicine. Every meal is an opportunity to nourish your body and invest in your long-term health.`,
  },
  {
    title: "Iron Deficiency in Women: Causes, Symptoms and Solutions",
    category: "Nutrition",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    content: `Iron deficiency is the most common nutritional deficiency worldwide, affecting approximately 30% of the global population. Women are disproportionately affected due to monthly blood loss through menstruation, increased needs during pregnancy and breastfeeding, and often lower dietary intake of iron-rich foods.

UNDERSTANDING IRON AND ITS ROLE:
Iron is a mineral that serves as the backbone of hemoglobin — the protein in red blood cells that carries oxygen from your lungs to every cell in your body. Without adequate iron, your body cannot produce enough healthy red blood cells, leading to iron deficiency anemia. Iron also plays crucial roles in energy metabolism, immune function, temperature regulation and cognitive performance.

There are two forms of dietary iron: heme iron (from animal sources) which is absorbed at 15-35% efficiency, and non-heme iron (from plant sources) which is absorbed at only 2-20% efficiency. This difference is why vegetarian and vegan women are particularly vulnerable to deficiency.

CAUSES OF IRON DEFICIENCY IN WOMEN:
• Heavy menstrual periods (menorrhagia) — losing more than 80ml blood per cycle significantly depletes iron stores
• Pregnancy — blood volume increases 50% and the growing baby requires iron for development
• Breastfeeding — iron is transferred to breast milk
• Poor dietary intake — restrictive diets, vegetarian/vegan diets without careful planning
• Malabsorption conditions — celiac disease, inflammatory bowel disease
• Excessive exercise — foot strike hemolysis in runners, sweat losses
• Frequent blood donation
• Gastrointestinal bleeding from ulcers, fibroids or colorectal issues

RECOGNIZING THE SYMPTOMS:
Iron deficiency develops gradually through stages, and symptoms become more pronounced as stores deplete.

Early stage (depleted iron stores):
• Fatigue and low energy despite adequate sleep
• Reduced exercise tolerance
• Difficulty concentrating

Moderate deficiency:
• Pale skin, particularly inside eyelids and gums
• Headaches, especially upon standing
• Cold hands and feet
• Brittle nails that break easily
• Hair loss or thinning

Severe deficiency (anemia):
• Extreme fatigue that interferes with daily activities
• Shortness of breath during minimal exertion
• Heart palpitations
• Pica — unusual cravings for non-food items like ice, dirt or chalk
• Restless leg syndrome
• Impaired immune function leading to frequent infections
• Poor cognitive function and mood disturbances

IRON-RICH FOODS TO INCLUDE:
Animal sources (heme iron — highly bioavailable):
• Beef liver (6.5mg per 85g serving)
• Oysters (8mg per 85g)
• Lean beef (2.1mg per 85g)
• Chicken dark meat (1.1mg per 85g)
• Canned sardines (2.5mg per 85g)
• Tuna (1.3mg per 85g)

Plant sources (non-heme iron):
• Cooked lentils (6.6mg per cup)
• Cooked spinach (6.4mg per cup)
• Cooked white beans (8mg per cup)
• Tofu (3.4mg per half cup)
• Pumpkin seeds (2.5mg per 28g)
• Dark chocolate 70%+ (3.4mg per 28g)
• Fortified breakfast cereals (18mg per serving)

MAXIMIZING IRON ABSORPTION:
• Pair iron-rich foods with Vitamin C sources — squeeze lemon on lentil soup, have orange juice with iron-fortified cereal
• Cook in cast iron cookware — acidic foods absorb measurable iron from the pan
• Avoid coffee and tea with iron-rich meals — tannins inhibit absorption by up to 60%
• Separate calcium-rich foods from iron-rich meals by 2 hours
• Vitamin A enhances non-heme iron absorption — combine with orange and yellow vegetables

TREATMENT OPTIONS:
If diagnosed with iron deficiency through blood tests (serum ferritin, hemoglobin, complete blood count), treatment depends on severity. Dietary modification is the first line. Iron supplements (ferrous sulfate, ferrous gluconate or ferrous fumarate) are commonly prescribed — take on empty stomach with Vitamin C for best absorption, but with food if causing GI distress. Intravenous iron is used in severe cases or when oral supplementation is not tolerated.

Never self-diagnose or self-treat iron deficiency — excess iron is toxic. Always work with your healthcare provider for testing and appropriate treatment.`,
  },
  {
    title: "Gut Health and Women: The Microbiome Connection",
    category: "Nutrition",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800",
    content: `Your gut is often called your "second brain" — and for good reason. The gut microbiome, comprising trillions of bacteria, fungi and other microorganisms living in your digestive tract, influences virtually every aspect of your health. For women specifically, the gut microbiome has unique implications for hormonal balance, mental health, immune function and even reproductive health.

THE GUT-HORMONE CONNECTION:
A specialized subset of gut bacteria called the "estrobolome" produces an enzyme called beta-glucuronidase that regulates estrogen levels in your body. These bacteria help metabolize estrogen that has been processed by the liver and sent to the gut for elimination. When the microbiome is disrupted — a condition called dysbiosis — estrogen can be reabsorbed rather than eliminated, leading to estrogen dominance. This imbalance is linked to conditions like endometriosis, polycystic ovary syndrome (PCOS), PMS, fibroids and even estrogen-receptor positive breast cancer.

Conversely, healthy gut bacteria also help convert certain plant compounds (phytoestrogens) into active forms that can beneficially modulate estrogen activity in the body. Women with diverse, healthy microbiomes may experience less severe menopausal symptoms due to this conversion of plant estrogens.

THE GUT-BRAIN AXIS:
Women are twice as likely as men to experience anxiety and depression — and emerging research suggests the gut microbiome plays a significant role. The gut produces approximately 90-95% of the body's serotonin, the neurotransmitter responsible for mood regulation, sleep and appetite. Gut bacteria communicate with the brain through the vagus nerve, inflammatory pathways and the production of neuroactive compounds. Dysbiosis has been directly linked to increased anxiety, depression and cognitive difficulties.

SIGNS YOUR GUT HEALTH NEEDS ATTENTION:
• Bloating, gas and abdominal discomfort
• Constipation or diarrhea or alternating between both
• Food intolerances developing in adulthood
• Frequent infections — gut bacteria train 70% of your immune system
• Skin issues like eczema, acne or rosacea
• Chronic fatigue despite adequate sleep
• Brain fog and difficulty concentrating
• Mood disturbances including anxiety and depression
• Sugar and carbohydrate cravings — harmful bacteria feed on sugar
• Autoimmune conditions — leaky gut allows bacterial fragments to enter bloodstream, triggering immune responses

FOODS THAT NOURISH YOUR MICROBIOME:

Probiotic foods (live beneficial bacteria):
• Yogurt with live active cultures — look for Lactobacillus and Bifidobacterium strains
• Kefir — fermented milk with up to 61 strains of bacteria and yeast
• Kimchi — fermented vegetables rich in Lactobacillus bacteria
• Sauerkraut — fermented cabbage, also rich in Vitamin C
• Miso — fermented soybean paste used in soups and marinades
• Tempeh — fermented soybeans, also an excellent protein source
• Kombucha — fermented tea, drink in moderation due to sugar content
• Traditional pickles — fermented in brine, not vinegar

Prebiotic foods (fiber that feeds beneficial bacteria):
• Garlic and onions — rich in inulin fiber
• Jerusalem artichokes — highest known source of inulin
• Green bananas and slightly unripe bananas — resistant starch
• Oats — beta-glucan fiber
• Leeks and asparagus
• Chicory root
• Cooked and cooled rice and potatoes — resistant starch increases upon cooling
• Apples — pectin fiber

LIFESTYLE FACTORS AFFECTING GUT HEALTH:
• Antibiotics — necessary for infection treatment but significantly disrupt microbiome; always take probiotics during and after antibiotic courses
• Stress — cortisol directly alters gut bacterial composition and increases intestinal permeability
• Sleep — microbiome follows circadian rhythms; poor sleep disrupts bacterial balance
• Exercise — physically active people have more diverse microbiomes; even walking 30 minutes daily makes a difference
• Artificial sweeteners — research suggests they negatively alter microbiome composition
• Alcohol — disrupts microbiome balance and increases intestinal permeability

BUILDING A GUT-HEALTHY EATING PATTERN:
Aim for 30 different plant foods weekly — variety is the single most important predictor of microbiome diversity. Include a fermented food daily. Eat fiber from diverse sources — aim for 25-38g daily from vegetables, fruits, legumes and whole grains. Minimize ultra-processed foods which feed harmful bacteria. Consider a high-quality probiotic supplement if dietary sources are insufficient, especially after antibiotic use or during periods of high stress.`,
  },
  {
    title: "Superfoods for Women's Hormonal Balance",
    category: "Nutrition",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800",
    content: `Hormonal balance is the foundation of women's health. From regulating your menstrual cycle and fertility to influencing your mood, energy, skin and weight, hormones touch every aspect of your wellbeing. While medical conditions require professional treatment, the foods you eat daily have a profound impact on hormonal health. Here are the most powerful foods for supporting women's hormonal balance.

FLAXSEEDS — THE HORMONAL SUPERFOOD:
Flaxseeds are perhaps the most powerful food for women's hormonal health. They contain lignans — phytoestrogens that bind to estrogen receptors and exert weak estrogenic effects, helping to balance estrogen levels whether they are too high or too low. Studies show consuming 1-2 tablespoons daily can reduce hot flashes in menopausal women, improve menstrual regularity and even reduce breast cancer risk. Flaxseeds also provide alpha-linolenic acid (ALA), an omega-3 fatty acid that reduces inflammation. Always use ground flaxseeds — whole seeds pass through undigested. Add to smoothies, oatmeal, yogurt or baking.

FATTY FISH — OMEGA-3 FOR HORMONAL HARMONY:
Salmon, sardines, mackerel and herring provide EPA and DHA omega-3 fatty acids that are essential building blocks for hormone production. Omega-3s reduce prostaglandins — the compounds responsible for menstrual cramps and inflammation. Research shows women who eat fatty fish twice weekly experience less severe PMS symptoms and menstrual pain. Omega-3s also support thyroid function, which regulates metabolism and energy. If you don't eat fish, algae-based omega-3 supplements provide the same EPA and DHA.

CRUCIFEROUS VEGETABLES — ESTROGEN DETOXIFICATION:
Broccoli, cauliflower, Brussels sprouts, cabbage and kale contain indole-3-carbinol (I3C) and diindylmethane (DIM), compounds that support healthy estrogen metabolism in the liver. These compounds help convert potent estradiol into weaker, less stimulating estrogen metabolites, reducing the risk of estrogen dominance. They also support liver detoxification pathways that process excess hormones. Aim for 1-2 servings of cruciferous vegetables daily. Lightly steaming preserves more nutrients than boiling.

AVOCADO — HEALTHY FATS FOR HORMONE PRODUCTION:
All steroid hormones — including estrogen, progesterone, testosterone and cortisol — are made from cholesterol and healthy fats. Avocados provide monounsaturated fats that support hormone synthesis. They also contain beta-sitosterol, a plant sterol that helps balance cortisol levels and may support progesterone production. Rich in magnesium, potassium, B vitamins and Vitamin E, avocados support adrenal function and reduce PMS symptoms. Half an avocado daily is an excellent addition to any women's health diet.

ASHWAGANDHA AND ADAPTOGENIC HERBS:
While not technically a food, ashwagandha is an adaptogenic herb with robust clinical evidence for supporting women's hormonal health. It reduces cortisol (stress hormone) levels by up to 30%, supports thyroid function and may improve symptoms of PCOS. It can be added to smoothies as a powder or taken as a supplement. Other beneficial adaptogens include maca root (particularly for libido and menopausal symptoms), rhodiola (for stress and energy) and holy basil (for blood sugar balance and cortisol regulation).

WALNUTS AND BRAZIL NUTS:
Walnuts are one of the best plant sources of omega-3 fatty acids and also contain melatonin to support sleep, which is critical for hormonal regulation. Brazil nuts are unique — just 2-3 per day provides your entire daily selenium requirement. Selenium is essential for thyroid hormone conversion and production, and deficiency is linked to hypothyroidism, fatigue and hormonal imbalances.

FERMENTED SOY PRODUCTS:
Traditional fermented soy foods — tempeh, miso and natto — contain isoflavones that act as phytoestrogens. Unlike processed soy products, fermented soy is more bioavailable and beneficial. Research on Japanese women who consume traditional soy regularly shows significantly lower rates of menopausal symptoms and breast cancer compared to Western women. Fermented soy also supports gut health through beneficial bacteria.

DARK LEAFY GREENS:
Spinach, kale, Swiss chard and collard greens are nutritional powerhouses for hormonal health. They provide magnesium — essential for liver detoxification of hormones, insulin sensitivity, progesterone production and sleep quality. They also provide folate for methylation (a critical process for hormone processing), iron, calcium and Vitamins C, E and K. Women with higher magnesium intake consistently show better hormonal profiles and less severe PMS.

PRACTICAL HORMONE-SUPPORTING MEAL IDEAS:
• Breakfast: Greek yogurt with ground flaxseeds, walnuts and berries
• Lunch: Salmon salad with avocado, leafy greens and lemon dressing
• Dinner: Tempeh stir-fry with broccoli, Brussels sprouts and brown rice
• Snacks: Apple slices with almond butter, Brazil nuts, edamame

Foods to minimize for better hormonal balance:
• Refined sugar — spikes insulin and disrupts all other hormones
• Alcohol — impairs liver function needed for hormone processing
• Conventional dairy and meat — may contain synthetic hormones
• Processed foods — contain endocrine-disrupting chemicals in packaging
• Excessive caffeine — raises cortisol and can worsen PMS`,
  },
  {
    title: "Eating Well During Your Menstrual Cycle",
    category: "Nutrition",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800",
    content: `Your hormones fluctuate significantly across your menstrual cycle — and so do your nutritional needs, energy levels, hunger signals and food preferences. Eating in sync with your cycle, a practice called "cycle syncing," can help reduce PMS symptoms, improve energy and mood, support hormonal balance and make your relationship with food feel more intuitive.

THE FOUR PHASES OF YOUR CYCLE AND WHAT TO EAT:

MENSTRUAL PHASE (Days 1-5: During Your Period):
Estrogen and progesterone are at their lowest. The uterine lining sheds, causing blood loss and potential inflammation. Energy is typically lowest during this phase.

What your body needs:
• Iron to replace losses — focus on red meat, organ meats, lentils, dark leafy greens
• Anti-inflammatory foods to reduce cramping and discomfort — turmeric, ginger, omega-3 rich foods
• Warming, cooked foods that are easy to digest — soups, stews, warm teas
• Magnesium to reduce cramps and support relaxation — dark chocolate, nuts, seeds
• Zinc for immune support and repair — pumpkin seeds, oysters, meat

Foods to emphasize: Bone broth, lentil soup, salmon, beets, dark chocolate, raspberry leaf tea, ginger tea
Foods to avoid: Alcohol (worsens inflammation), excessive caffeine (constricts blood vessels and worsens cramps), salty processed foods (worsens bloating)

FOLLICULAR PHASE (Days 6-13: After Period Until Ovulation):
Estrogen rises steadily, FSH stimulates follicle development. Energy and mood improve, metabolism slightly slower, body tolerates carbohydrates better.

What your body needs:
• Phytoestrogens to support rising estrogen — flaxseeds, soy, sesame seeds
• Fermented foods to support estrogen metabolism through the gut
• Light, fresh foods that match your increased energy — salads, fresh fruits, sprouts
• Protein to support the developing follicle — eggs, lean poultry, legumes
• B vitamins for energy and neurotransmitter production — whole grains, nutritional yeast

Foods to emphasize: Eggs, avocado, broccoli, fermented foods, flaxseeds, green smoothies, fresh spring vegetables
This is a great time to try new foods and recipes as your palate is more adventurous.

OVULATION PHASE (Days 14-16: Ovulation):
Estrogen peaks, LH surge triggers ovulation, testosterone briefly rises. Energy, confidence and libido peak. Metabolism increases slightly.

What your body needs:
• Antioxidant-rich foods to protect the egg from oxidative damage — berries, colorful vegetables
• Zinc for egg quality and LH surge — oysters, pumpkin seeds, beef
• Vitamin C to support corpus luteum formation after ovulation — bell peppers, citrus, kiwi
• Light, cooling foods match your natural tendency toward raw foods during this phase
• Anti-inflammatory omega-3s — fatty fish, chia seeds, walnuts

Foods to emphasize: Raw salads, berries, asparagus, quinoa, light grilled proteins, coconut water for hydration, raw vegetables
Cravings are typically lowest during this phase — a great time to focus on clean eating.

LUTEAL PHASE (Days 17-28: After Ovulation Until Period):
Progesterone rises (if not pregnant, then falls before menstruation). Metabolism increases by 100-300 calories. Hunger increases. PMS symptoms may appear in the second half of this phase.

What your body needs:
• Complex carbohydrates to manage serotonin levels and reduce PMS mood symptoms — sweet potato, oats, brown rice
• Magnesium to reduce bloating, cramping and mood disturbances (up to 360mg daily) — dark chocolate, leafy greens, pumpkin seeds
• Calcium to reduce PMS symptoms — dairy, fortified plant milks, sardines
• B6 to support progesterone production and reduce PMS — poultry, fish, bananas, potatoes
• Fiber to support estrogen clearance as it declines toward menstruation

Foods to emphasize: Sweet potatoes, dark chocolate, lentils, chickpeas, leafy greens, ginger, chamomile tea, complex carbohydrates
PMS cravings: If craving sugar, opt for dark chocolate and fruit. If craving salt, choose roasted nuts or olives.

HYDRATION ACROSS YOUR CYCLE:
Water needs vary with your cycle. Progesterone in the luteal phase has a mild diuretic effect initially, then promotes water retention — drink consistently throughout the day. During menstruation, herbal teas like raspberry leaf, ginger and chamomile provide hydration plus symptom relief. Throughout your cycle, aim for at least 8 glasses of water daily, increasing with exercise and heat.

TRACKING YOUR CYCLE FOR BETTER NUTRITION:
Use a period tracking app or journal to note your symptoms, energy levels and food cravings across your cycle. After 2-3 cycles, patterns will emerge that help you anticipate and prepare for your body's changing needs. This self-knowledge is incredibly empowering and can dramatically improve your relationship with both your body and food.`,
  },
  {
    title: "Plant-Based Eating for Women: Complete Nutritional Guide",
    category: "Nutrition",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    content: `Plant-based diets offer remarkable health benefits — reduced risk of heart disease, type 2 diabetes, certain cancers and obesity. However, women who eat primarily plant-based foods face specific nutritional challenges that require careful attention. This guide covers everything you need to thrive on a plant-based diet as a woman.

NUTRIENTS REQUIRING SPECIAL ATTENTION:

VITAMIN B12:
B12 is found almost exclusively in animal products. Deficiency causes irreversible neurological damage, megaloblastic anemia and can mimic symptoms of dementia. Every plant-based woman MUST supplement with B12 — 250-500mcg of cyanocobalamin or methylcobalamin daily, or 2500mcg weekly. Fortified foods like nutritional yeast, plant milks and fortified cereals provide some B12 but are often insufficient alone.

IRON:
Plant-based women absorb iron less efficiently due to relying on non-heme iron. Strategies to maximize absorption: eat Vitamin C rich foods with every iron-rich meal, avoid coffee and tea with meals, cook in cast iron, soak and sprout legumes and grains to reduce phytates that inhibit absorption. Monitor iron levels annually through blood tests.

OMEGA-3 FATTY ACIDS:
ALA from flaxseeds, chia seeds and walnuts converts to EPA and DHA at low efficiency (5-15%). Consider algae-based EPA/DHA supplements — 250-500mg daily — which provide the same fatty acids as fish (fish get their omega-3s from algae anyway).

CALCIUM:
Dairy is not the only calcium source. Excellent plant sources include: fortified plant milks (choose those with 300mg+ per cup), tofu made with calcium sulfate, tempeh, tahini, almonds, bok choy, kale, broccoli and fortified orange juice. Aim for 1000-1200mg daily from diverse sources.

VITAMIN D:
Most people are deficient regardless of diet. Get 15-20 minutes of midday sun when possible, and supplement with 1000-2000 IU Vitamin D3 (from lichen for vegan) daily, especially in winter months or if you spend most time indoors.

ZINC:
Plant-based zinc is less bioavailable due to phytates in grains and legumes. Soaking, sprouting and fermenting reduces phytates. Good plant sources: hemp seeds, pumpkin seeds, cashews, chickpeas, oats and nutritional yeast. Consider a zinc supplement providing 8-12mg daily.

IODINE:
Critical for thyroid function, iodine is found primarily in seafood and dairy. Plant-based women should use iodized salt or take an iodine supplement (150mcg daily). Seaweed provides iodine but in highly variable amounts — not a reliable daily source.

PROTEIN ON A PLANT-BASED DIET:
Complete protein sources containing all essential amino acids: soy products (tofu, tempeh, edamame, soy milk), quinoa, amaranth, hemp seeds and buckwheat. Complementary proteins — combining foods to create complete protein profiles: rice and beans, pita and hummus, whole grain bread with nut butter. Aim for 0.8-1.0g protein per kilogram of body weight, increasing to 1.2-1.6g during pregnancy, breastfeeding or intensive exercise.

SAMPLE DAY OF PLANT-BASED EATING FOR WOMEN:
Breakfast: Fortified oat milk porridge with ground flaxseeds, hemp seeds, berries and a handful of almonds. Nutritional yeast sprinkled on top.
Lunch: Lentil and kale soup with whole grain bread, followed by a Vitamin C rich orange.
Snack: Apple with almond butter, or edamame with sea salt.
Dinner: Tempeh stir-fry with broccoli, bell peppers, brown rice and sesame-ginger sauce.
Supplements: B12, Vitamin D, algae omega-3, iodine.

With thoughtful planning, a plant-based diet can meet all of a woman's nutritional needs while supporting both personal health and environmental wellbeing.`,
  },
  {
    title: "Managing PCOS Through Diet and Lifestyle",
    category: "Nutrition",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800",
    content: `Polycystic Ovary Syndrome (PCOS) affects 1 in 10 women of reproductive age, making it the most common endocrine disorder in women. While PCOS is a complex hormonal condition requiring medical management, diet and lifestyle interventions are among the most effective tools for managing symptoms and improving quality of life.

UNDERSTANDING PCOS:
PCOS is characterized by irregular or absent periods, excess androgen (male hormones) causing acne, excess facial and body hair and hair loss, and polycystic ovaries visible on ultrasound. Approximately 70-80% of women with PCOS have insulin resistance — where cells don't respond properly to insulin, leading to elevated blood sugar and compensatory high insulin levels. Excess insulin further stimulates androgen production, creating a vicious cycle.

THE INSULIN-PCOS CONNECTION:
Since insulin resistance drives many PCOS symptoms, dietary strategies that improve insulin sensitivity are central to management. Research consistently shows that even a 5-10% reduction in body weight in overweight women with PCOS significantly improves hormonal profiles, menstrual regularity and fertility.

DIETARY STRATEGIES FOR PCOS:

Low Glycemic Index (GI) Eating:
Foods that cause rapid blood sugar spikes worsen insulin resistance. Choose low GI options:
• Whole grains instead of refined — brown rice, quinoa, oats, barley over white bread and pasta
• Legumes — lentils, chickpeas, black beans have very low GI and high protein
• Non-starchy vegetables at every meal — broccoli, spinach, capsicum, zucchini
• Fruit in moderation — berries have lowest GI; pair any fruit with protein or fat

Anti-Inflammatory Eating:
PCOS involves chronic low-grade inflammation. Emphasize:
• Fatty fish — salmon, sardines, mackerel twice weekly
• Extra virgin olive oil — use for cooking and dressings
• Turmeric with black pepper — add to meals or golden milk
• Ginger — anti-inflammatory and helps regulate menstrual cycles
• Colorful vegetables and fruits — rich in antioxidants
• Green tea — contains EGCG which improves insulin sensitivity

Protein at Every Meal:
Protein slows digestion, stabilizes blood sugar and reduces hunger. Good sources: eggs, Greek yogurt, legumes, tofu, tempeh, lean poultry, fish and nuts. Aim for 20-30g protein at breakfast specifically, as research shows this significantly improves hormonal profiles in PCOS.

Specific Nutrients for PCOS:
• Inositol (particularly myo-inositol): Research shows it significantly improves insulin sensitivity, ovulation frequency and egg quality in PCOS. Found in whole grains, legumes and fruits, but supplementation at 2-4g daily is often recommended.
• Magnesium: Deficiency common in insulin resistance; supports glucose metabolism. Supplement 300-400mg daily.
• Vitamin D: Deficiency extremely common in PCOS and worsens insulin resistance. Supplement 2000-4000 IU daily based on blood levels.
• Zinc: Reduces acne and excess hair growth by blocking androgen activity. Take 30mg daily.
• Omega-3: Reduces androgens and inflammation. Supplement 2-4g EPA/DHA daily.
• Berberine: A plant compound with research suggesting effectiveness comparable to metformin for insulin sensitization.

FOODS TO AVOID OR MINIMIZE:
• Refined carbohydrates and sugar — white bread, pastries, sugary drinks, sweets
• Dairy in large amounts — some research suggests dairy worsens androgen levels in PCOS
• Processed and fast foods — inflammatory oils and additives worsen insulin resistance
• Alcohol — disrupts hormone balance and adds empty calories
• Excessive caffeine — can worsen anxiety and hormonal imbalance

LIFESTYLE INTERVENTIONS:
Exercise is medicine for PCOS — aim for 150 minutes of moderate aerobic exercise weekly plus 2-3 strength training sessions. Muscle tissue improves insulin sensitivity. Sleep 7-9 hours — sleep deprivation directly worsens insulin resistance. Stress management is critical — cortisol worsens insulin resistance and androgen levels. Practice yoga, meditation or other stress-reducing activities daily.

Working with an endocrinologist, gynecologist and registered dietitian who specialize in PCOS provides the most comprehensive care. Medication like metformin or oral contraceptives may be recommended alongside dietary interventions.`,
  },
  {
    title: "Bone Health for Women: Prevention of Osteoporosis",
    category: "Nutrition",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800",
    content: `Osteoporosis — a condition where bones become weak and brittle — affects 200 million women worldwide. Women are four times more likely than men to develop osteoporosis, primarily because estrogen plays a crucial protective role in maintaining bone density. When estrogen declines at menopause, bone loss accelerates dramatically. However, osteoporosis is largely preventable through lifelong attention to bone-building nutrition and lifestyle.

BUILDING AND MAINTAINING STRONG BONES:

CALCIUM — THE FOUNDATION:
Calcium is the primary mineral in bones. Daily requirements: children 1000-1300mg, adult women 1000mg, women over 50 1200mg, pregnant/breastfeeding 1000mg. Most women consume only 500-700mg daily — a significant gap.

Best calcium sources:
• Plain yogurt (415mg per cup)
• Mozzarella cheese (333mg per 42g)
• Fortified plant milk (300mg per cup)
• Canned sardines with bones (325mg per 85g)
• Firm tofu made with calcium sulfate (253mg per half cup)
• Cooked kale (179mg per cup)
• Chia seeds (179mg per 28g)
• Almonds (76mg per 28g)

VITAMIN D — CALCIUM'S ESSENTIAL PARTNER:
Without Vitamin D, your body can only absorb 10-15% of dietary calcium. With adequate Vitamin D, absorption rises to 30-40%. Requirements: 600 IU for women under 70, 800 IU for women over 70. Many experts recommend 1000-2000 IU daily given widespread deficiency. Sunlight triggers Vitamin D synthesis in skin — 15-20 minutes of midday sun on arms and legs. Food sources are limited: fatty fish, egg yolks, fortified foods. Supplementation is almost always necessary, particularly in countries with limited sunshine.

VITAMIN K2 — THE CALCIUM DIRECTOR:
K2 activates proteins that direct calcium into bones rather than into arteries where it causes calcification. Found in fermented foods (especially natto, a Japanese fermented soybean), hard cheeses, egg yolks and chicken. Supplement with 100-200mcg MK-7 form of K2 daily if dietary intake is low.

MAGNESIUM — BONE MATRIX BUILDER:
40-60% of the body's magnesium is stored in bones. Magnesium is necessary for Vitamin D activation and calcium metabolism. Women who consume more magnesium have significantly higher bone density. Aim for 320mg daily from nuts, seeds, dark leafy greens, legumes and dark chocolate.

WEIGHT-BEARING EXERCISE — THE NON-NEGOTIABLE:
Bone is living tissue that responds to mechanical stress by becoming stronger. Weight-bearing exercise — walking, jogging, dancing, hiking, tennis — and resistance training — weightlifting, yoga, Pilates — are essential for bone health at every age. Even starting in your 60s and 70s shows significant benefits. Aim for 30 minutes of weight-bearing exercise most days plus 2-3 strength training sessions weekly.

KNOW YOUR BONE DENSITY:
A DEXA scan measures bone mineral density and is recommended for all women at 65, or earlier if you have risk factors including: early menopause (before 45), family history of osteoporosis, long-term corticosteroid use, smoking, excessive alcohol, low BMI or history of eating disorders.`,
  },

  // ─────────────────────────────────────────
  //  HYGIENE (7 articles)
  // ─────────────────────────────────────────
  {
    title: "Complete Guide to Menstrual Hygiene Management",
    category: "Hygiene",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800",
    content: `Menstrual hygiene management (MHM) is a fundamental aspect of women's health and dignity. Good menstrual hygiene prevents infections, maintains comfort and allows women to participate fully in daily life during their periods. Yet globally, millions of women and girls lack access to proper menstrual products, sanitation facilities and accurate information.

UNDERSTANDING YOUR MENSTRUAL FLOW:
Average menstrual blood loss is 30-40ml per cycle, though up to 80ml is considered normal. Blood appears bright red to dark brown — darker blood has simply oxidized due to slower flow. The presence of small clots is normal, especially on heavier days. The "blood" is actually a mix of blood, uterine lining tissue, mucus and bacteria. It is not dirty or impure — menstruation is a completely normal and healthy bodily process.

MENSTRUAL PRODUCTS — COMPLETE GUIDE:

Disposable Pads:
The most widely used product globally. Place adhesive side down on underwear, change every 4-6 hours or when saturated. Use overnight pads for sleeping — they are longer and more absorbent. Dispose of properly — wrap in toilet paper or the pad's wrapper and place in the bin. Never flush pads as they block sewage systems. Keep in a dry place as moisture degrades them.

Tampons:
Inserted into the vaginal canal to absorb flow internally. Use the lowest absorbency for your flow. Change every 4-8 hours — never leave in for more than 8 hours due to Toxic Shock Syndrome (TSS) risk. Always remove the last tampon at the end of your period — it's easy to forget. Signs of TSS: sudden high fever, rash, vomiting, dizziness — seek immediate medical care if these occur while using tampons.

Menstrual Cups:
Reusable silicone, rubber or latex cups that collect rather than absorb flow. Insert by folding and positioning correctly so it opens fully and creates a seal. Can be worn for up to 12 hours. Empty, rinse with water and reinsert. Wash thoroughly with mild soap at end of period and boil for 5 minutes to sterilize. With proper care, a cup lasts 5-10 years. Initial learning curve but most women find it comfortable after 2-3 cycles. Cost-effective, environmentally friendly and safe for travel.

Period Underwear:
Underwear with built-in absorbent layers. Worn alone for light days or as backup. Wash in cold water immediately after use, then machine wash. Hang dry to preserve absorbency. Can replace disposables for light days and spotting.

Reusable Cloth Pads:
Traditional in many cultures, now available commercially. Wash in cold water (hot water sets stains), then machine wash. Soak stubborn stains in hydrogen peroxide or baking soda solution. Environmentally and economically sustainable option.

INTIMATE HYGIENE DURING MENSTRUATION:

The vagina is self-cleaning — it produces discharge that maintains a healthy acidic pH (3.8-4.5) that protects against infection. Internal cleaning (douching) disrupts this natural balance and dramatically increases risk of bacterial vaginosis, yeast infections and pelvic inflammatory disease.

Correct external hygiene:
• Wash the external genitalia (vulva) with clean water only, or a very gentle unscented soap designed for intimate use
• Always wipe front to back after using the toilet to prevent introducing bacteria from the anus to the vaginal opening
• Change menstrual products regularly — every 4-6 hours during day, use fresh product before sleep
• Wash hands thoroughly before and after changing menstrual products
• Wear breathable cotton underwear — synthetic fabrics trap heat and moisture, promoting bacterial and fungal growth
• Loose-fitting, comfortable clothing during heavy flow days reduces chafing and discomfort

WHEN TO SEE A DOCTOR:
• Bleeding that soaks through a pad or tampon every hour for several hours
• Periods lasting longer than 7 days
• Severe pain that doesn't respond to over-the-counter pain relief and interferes with daily activities
• Unusual odor (some odor is normal; strong, fishy odor may indicate infection)
• Unusual discharge between periods
• Periods that suddenly stop for more than 3 months without pregnancy

MENSTRUAL HYGIENE IN CHALLENGING CIRCUMSTANCES:
When access to products is limited — cloth can be used in an emergency if washed and dried thoroughly in sunlight. When facilities are unavailable — plan ahead by timing changes, using higher absorbency products and using changing period underwear as backup.

BREAKING THE STIGMA:
Menstruation is a natural biological process that approximately half the world's population experiences. Shame and stigma surrounding menstruation prevent women from managing their hygiene properly and seeking help when needed. Talk openly with daughters, sisters and friends. Education is empowerment.`,
  },
  {
    title: "Intimate Health: Understanding Vaginal Health and pH Balance",
    category: "Hygiene",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
    content: `Vaginal health is an important but often misunderstood aspect of women's overall wellbeing. Many women are unsure what is normal, what requires medical attention and how to properly care for their intimate health. This comprehensive guide provides clear, evidence-based information.

UNDERSTANDING NORMAL VAGINAL ECOLOGY:
The vagina hosts a complex ecosystem of microorganisms — primarily Lactobacillus bacteria — that maintain a healthy acidic environment. This acidity (pH 3.8-4.5) prevents the overgrowth of harmful bacteria and yeast. Disrupting this delicate balance causes the most common vaginal conditions including bacterial vaginosis and yeast infections.

NORMAL VAGINAL DISCHARGE:
Discharge is a healthy, normal sign that the vagina is functioning properly. What is normal varies between women and changes throughout your cycle.

Normal discharge characteristics:
• Color: Clear to white or slightly yellow when dried on underwear
• Texture: Ranges from watery to stretchy (like egg whites around ovulation) to thick and creamy
• Amount: Varies from a teaspoon to a tablespoon daily
• Odor: Mild, slightly acidic or musky — not unpleasant

Changes throughout cycle:
• After period: Little to no discharge
• Mid-cycle (approaching ovulation): Clear, stretchy, abundant — like raw egg white
• After ovulation: Thicker, cloudier, less abundant
• Before period: May increase again slightly

WHEN DISCHARGE INDICATES A PROBLEM:
• Thick, white, cottage cheese-like discharge with itching/burning = likely yeast infection (Candidiasis)
• Gray or white watery discharge with fishy odor, especially after sex = likely bacterial vaginosis (BV)
• Yellow, green or gray discharge with unpleasant odor = possible STI — see doctor immediately
• Pink or brown discharge between periods = possibly cervical irritation, hormonal changes or (rarely) more serious conditions — worth investigating if persistent

COMMON CONDITIONS AND THEIR MANAGEMENT:

Bacterial Vaginosis (BV):
Most common vaginal condition — caused by overgrowth of harmful bacteria when pH rises. Symptoms: gray/white discharge, fishy odor (especially after intercourse), sometimes itching. Treatment: metronidazole or clindamycin antibiotics (prescription required). Prevention: avoid douching, use condoms, avoid scented products.

Yeast Infections (Candidiasis):
Caused by Candida fungus overgrowth. Symptoms: thick white discharge, intense itching, burning with urination, redness and swelling. Treatment: antifungal creams or oral fluconazole. Prevention: wear breathable cotton underwear, change out of wet swimwear promptly, avoid unnecessary antibiotics.

PROPER INTIMATE HYGIENE PRACTICES:
Do: Wash external genitalia with water or gentle unscented soap daily. Wipe front to back. Wear cotton underwear. Change underwear daily. Sleep without underwear occasionally to allow airflow.

Don't: Douche (internal vaginal washing — destroys protective bacteria). Use scented soaps, bubble baths or feminine sprays internally. Wear tight synthetic underwear for extended periods. Use scented tampons or pads. Share towels or washcloths.

MAINTAINING VAGINAL HEALTH THROUGH LIFESTYLE:
• Diet: Probiotic foods support vaginal microbiome — yogurt, kefir, fermented vegetables contain Lactobacillus strains
• Hydration: Adequate water intake supports natural lubrication
• Exercise: Regular exercise supports overall immunity and circulation
• Stress management: Stress disrupts immune function, increasing susceptibility to infections
• Sexual health: Use barrier methods (condoms) to prevent STIs, urinate after intercourse to prevent UTIs

REGULAR GYNAECOLOGICAL CARE:
Annual gynaecological examination is recommended for all sexually active women. Pap smears (cervical screening) detect precancerous cervical changes — frequency depends on age and results. HPV vaccination (ideally before sexual activity begins but beneficial up to age 45) protects against strains causing 70% of cervical cancers. Open, honest communication with your doctor ensures you receive appropriate screening and care.`,
  },
  {
    title: "Skincare for Women: Building a Science-Based Routine",
    category: "Hygiene",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
    content: `Skincare can feel overwhelming with thousands of products and endless conflicting advice. This guide cuts through the noise to provide science-backed fundamentals that genuinely improve skin health for women.

THE FUNDAMENTALS THAT SCIENCE SUPPORTS:

SUN PROTECTION — THE SINGLE MOST IMPORTANT STEP:
UV radiation is responsible for 90% of visible skin aging — wrinkles, dark spots, loss of elasticity — as well as causing skin cancer, the most common cancer worldwide. Daily broad-spectrum SPF 30+ sunscreen (SPF 50+ preferred) applied every morning, regardless of weather or skin tone, is the single most impactful skin investment you can make. Reapply every 2 hours in direct sun. Darker skin tones still need sun protection — melanoma is more deadly and more likely to be diagnosed late in darker skin.

GENTLE CLEANSING:
Over-cleansing strips the skin's protective barrier, causing increased sensitivity, dryness and paradoxically more oil production. Cleanse twice daily — morning to remove sweat and oils from sleep, evening to remove makeup, sunscreen and pollutants. Choose a gentle, pH-balanced cleanser (pH 4.5-6.5). Avoid hot water which strips oils. Pat dry gently rather than rubbing.

MOISTURIZER:
Maintains the skin barrier and prevents transepidermal water loss. All skin types benefit — even oily skin. Look for: hyaluronic acid (attracts water to skin), ceramides (repair and maintain barrier), glycerin (humectant) and niacinamide (anti-inflammatory, pore-minimizing). Apply to slightly damp skin to lock in moisture.

RETINOIDS — THE GOLD STANDARD ANTI-AGING:
Retinoids (retinol, retinaldehyde, tretinoin) are Vitamin A derivatives with decades of research showing they increase cell turnover, stimulate collagen production, unclog pores, reduce hyperpigmentation and improve fine lines. Start with a low percentage retinol (0.025-0.05%) 2-3 nights weekly, gradually increasing frequency as skin adapts. Always use SPF the morning after. Avoid during pregnancy.

HORMONAL INFLUENCES ON SKIN:
Women's skin changes significantly with hormonal fluctuations. During menstruation — increased oil production and breakouts due to rising progesterone. During ovulation — skin at its best; estrogen improves elasticity and glow. Pregnancy — melasma (hyperpigmentation), stretch marks and either improved or worsened acne. Menopause — decreased collagen (1% loss per year after menopause begins), thinning, dryness and increased sensitivity.

ADDRESSING COMMON CONCERNS:
Acne: Benzoyl peroxide (kills bacteria), salicylic acid (unclogs pores), niacinamide (reduces inflammation). See a dermatologist for persistent moderate-severe acne.
Hyperpigmentation: Vitamin C serum, niacinamide, azelaic acid, kojic acid and strict sun protection.
Dryness: Increase moisturizer richness, add facial oil, use humidifier, ensure adequate water intake and omega-3 consumption.

A SIMPLE EFFECTIVE ROUTINE:
Morning: Gentle cleanser → Vitamin C serum (optional) → moisturizer → SPF 30+
Evening: Gentle cleanser → retinoid (2-3x weekly) or moisturizer → eye cream (optional)
Weekly: Gentle exfoliation 1-2x weekly with AHA or BHA

Remember: Consistency with simple basics beats expensive complicated routines every time.`,
  },
  {
    title: "Hand Hygiene and Infection Prevention for Women",
    category: "Hygiene",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=800",
    content: `Proper hand hygiene is the single most effective way to prevent the spread of infectious diseases. The World Health Organization estimates that proper handwashing could prevent 1 million deaths annually from respiratory and diarrheal diseases alone. For women, who often serve as primary caregivers and handle food preparation, hand hygiene is particularly important.

THE SCIENCE OF HANDWASHING:
Our hands contact hundreds of surfaces daily, picking up millions of microorganisms. Most are harmless, but pathogens including bacteria, viruses and parasites can survive on hands and surfaces for hours to days. E. coli (from fecal contamination) can survive 2 hours on hands. Influenza virus survives 24 hours on hard surfaces and up to 15 minutes on hands. Norovirus (stomach flu) can survive on surfaces for weeks.

The mechanical action of rubbing hands together with soap physically removes microorganisms — soap doesn't kill them, it loosens them from skin so they wash away with water.

THE CORRECT HANDWASHING TECHNIQUE:
1. Wet hands with clean running water (temperature doesn't matter — warm water is not more effective)
2. Apply enough soap to cover all hand surfaces
3. Rub hands together vigorously for at least 20 seconds — sing "Happy Birthday" twice as a timer
4. Clean all surfaces: backs of hands, between fingers, under nails, thumbs and wrists
5. Rinse thoroughly under running water
6. Dry with a clean towel or air dry
7. Use the towel to turn off the faucet if in a public bathroom

WHEN TO WASH HANDS:
Before: Preparing or eating food, caring for someone sick, treating wounds, inserting/removing contact lenses or menstrual products
After: Using the toilet, changing diapers or helping a child use the toilet, blowing nose/coughing/sneezing, touching animals, handling garbage, caring for someone sick, handling raw meat, touching public surfaces

HAND SANITIZER — WHEN AND HOW TO USE:
Alcohol-based hand sanitizers (at least 60% alcohol) effectively kill most germs when handwashing isn't possible. They do NOT effectively remove: heavy dirt, grease, pesticides, certain chemicals, Clostridioides difficile (C. diff) spores, norovirus and Cryptosporidium parasites — for these, soap and water is essential.
Correct use: Apply a dime-sized amount to palm, rub all surfaces of both hands together until completely dry (about 30 seconds).

NAIL CARE AND HYGIENE:
The space under nails harbors the greatest concentration of bacteria on hands. Keep nails short and clean — scrub under nails with a nail brush regularly. Long acrylic and gel nails harbor significantly more bacteria and are associated with infection outbreaks in healthcare settings. If wearing nail products, be especially diligent about under-nail cleaning.

PREVENTING URINARY TRACT INFECTIONS (UTIs):
Women are 50 times more likely than men to get UTIs due to shorter urethra and proximity of urethra to anus. Key prevention strategies: always wipe front to back after using the toilet, urinate after sexual intercourse, stay well hydrated, avoid holding urine for extended periods, wear breathable cotton underwear. Cranberry products may provide modest protection by preventing bacterial adhesion to urinary tract walls.`,
  },
  
  {
    title: "Hair Care for Women: Science and Practical Tips",
    category: "Hygiene",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800",
    content: `Hair is one of the most visible aspects of appearance and deeply connected to identity and self-expression for many women. Understanding the science of hair health helps you make informed choices and troubleshoot common problems effectively.

UNDERSTANDING HAIR STRUCTURE:
Each hair strand consists of three layers: the medulla (inner core), the cortex (middle layer containing melanin pigment and determining strength) and the cuticle (protective outer layer of overlapping scales). Healthy cuticles lie flat, creating shiny, smooth hair. Damaged cuticles lift and separate, causing frizz, dullness and breakage.

Hair grows from follicles embedded in the scalp through three phases: anagen (active growth, 2-7 years), catagen (transition, 2-3 weeks) and telogen (resting/shedding, 3 months). Each person loses 50-100 hairs daily as part of normal cycling.

HORMONES AND HAIR:
Women's hair health is profoundly influenced by hormones throughout life. Estrogen prolongs the anagen (growth) phase — this is why hair becomes thicker and lusher during pregnancy. After birth, estrogen plummets, pushing many follicles simultaneously into telogen (shedding) phase — "postpartum hair loss" typically peaks at 3-4 months postpartum and resolves by 12 months.

Androgens (male hormones) miniaturize hair follicles, causing gradual thinning primarily at the crown and part line — "female pattern hair loss" or androgenetic alopecia. Thyroid dysfunction, PCOS, iron deficiency and crash dieting are common causes of excessive hair shedding in women.

WASHING HAIR CORRECTLY:
Frequency depends on hair type, scalp oiliness and activity level — there is no universal rule. Oily, fine or straight hair may need washing daily. Curly, coily, thick or chemically treated hair benefits from less frequent washing (2-3 times weekly or less). Concentrate shampoo on the scalp and roots where oil and product accumulate, not the lengths. Massage gently with fingertips (not nails) to stimulate circulation. Rinse thoroughly — product residue causes buildup and irritation.

Conditioner goes on mid-lengths to ends — the oldest, most damaged parts. Leave on for 2-5 minutes. Use a wide-tooth comb to detangle while conditioner is in. Rinse with cool water to seal the cuticle.

HEAT STYLING AND DAMAGE PREVENTION:
Heat above 150°C (300°F) can permanently alter hair protein structure, causing breakage and loss of elasticity. Always use a heat protectant spray or cream before any heat tool. Use the lowest effective temperature — fine or damaged hair on 120-150°C, medium hair 150-175°C, thick or coily hair 175-230°C maximum. Allow hair to dry at least 80% before using heat tools.

NUTRITION FOR HAIR HEALTH:
Biotin (Vitamin B7) supports keratin protein production — found in eggs, nuts and sweet potato. Iron deficiency is one of the most common causes of excessive hair shedding in women — get blood levels checked if experiencing increased shedding. Zinc deficiency also causes hair loss. Protein is essential — hair is made of keratin protein. Low-calorie diets and crash dieting trigger significant hair loss 2-3 months after the dietary restriction begins.

WHEN HAIR LOSS REQUIRES MEDICAL ATTENTION:
See a dermatologist or trichologist (hair specialist) if: shedding increases suddenly, bald patches appear, your part widens noticeably, you can see scalp through hair or if shedding is accompanied by other symptoms. Many causes of hair loss are treatable when identified early.`,
  },
  {
    title: "Sleep Hygiene for Women: Why Sleep is Non-Negotiable",
    category: "Hygiene",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800",
    content: `Sleep is not a luxury — it is a biological necessity as fundamental as food and water. During sleep, your body repairs cells, consolidates memories, regulates hormones, strengthens the immune system and processes emotions. Women face unique sleep challenges due to hormonal fluctuations, higher rates of anxiety and depression, and social roles that often prioritize others' needs over their own rest.

HOW HORMONES AFFECT WOMEN'S SLEEP:

Menstrual Cycle: Body temperature rises after ovulation due to progesterone, which can disrupt sleep in the luteal phase. PMS symptoms including cramping, bloating and mood changes further impair sleep quality. Some women experience "premenstrual insomnia" in the week before menstruation.

Pregnancy: Nearly all pregnant women experience sleep disruption. First trimester: extreme fatigue and increased sleep need, frequent urination disrupts night sleep. Second trimester: generally the best sleep of pregnancy. Third trimester: physical discomfort, frequent urination, restless legs syndrome, heartburn and fetal movements disrupt sleep significantly.

Perimenopause and Menopause: Hot flashes and night sweats wake approximately 85% of menopausal women multiple times nightly. Declining progesterone (which has sedative properties) reduces sleep quality. Increased rates of sleep apnea after menopause. Anxiety and mood changes associated with hormonal transition affect sleep.

CONSEQUENCES OF INADEQUATE SLEEP:
Hormonal disruption: Sleep deprivation elevates cortisol, disrupts insulin sensitivity, reduces leptin (fullness hormone) and increases ghrelin (hunger hormone) — creating conditions for weight gain and metabolic disruption. Growth hormone, released primarily during deep sleep, is essential for cellular repair and maintenance.

Cognitive effects: Even one night of poor sleep impairs concentration, decision-making, emotional regulation and memory consolidation comparable to legal intoxication.

Immune suppression: People who sleep less than 6 hours are 4 times more likely to catch the common cold when exposed. Chronic sleep deprivation significantly increases cancer risk through immune suppression and inflammatory pathways.

Cardiovascular risk: Women who consistently sleep less than 6 hours have significantly higher rates of hypertension, heart disease and stroke.

BUILDING EXCELLENT SLEEP HYGIENE:

Sleep Schedule: Go to bed and wake at consistent times every day — including weekends. This synchronizes your circadian rhythm, making falling asleep and waking easier. Irregular sleep schedules cause "social jet lag" that impairs health even when total sleep hours are adequate.

Sleep Environment: Keep bedroom cool (18-20°C is optimal), dark (blackout curtains or sleep mask) and quiet (earplugs or white noise if needed). Use your bed only for sleep and sex — this strengthens the mental association between bed and sleep.

Light Management: Avoid bright light and especially blue light from screens for 1-2 hours before bed. Blue light suppresses melatonin production by up to 50%. Use dim, warm lighting in evenings. Get bright morning light exposure within 30 minutes of waking — this sets your circadian clock.

Wind-Down Routine: Signal your brain that sleep is approaching with consistent pre-sleep rituals: warm bath or shower (the subsequent body temperature drop promotes sleep), gentle yoga or stretching, reading physical books, journaling, meditation or relaxation breathing exercises.

Food and Drink: Avoid caffeine after 2pm (caffeine's half-life is 5-6 hours). Avoid alcohol — while sedating initially, alcohol fragments sleep in the second half of the night and reduces sleep quality significantly. A light snack containing tryptophan (turkey, warm milk, banana, oats) before bed may gently support melatonin production.

Exercise: Regular physical exercise significantly improves sleep quality and duration — but avoid vigorous exercise within 2-3 hours of bedtime as it raises body temperature and cortisol.

ADDRESSING CHRONIC INSOMNIA:
Cognitive Behavioral Therapy for Insomnia (CBT-I) is more effective than sleep medications for chronic insomnia and has no side effects. It involves sleep restriction therapy, stimulus control, cognitive restructuring of sleep-related thoughts and relaxation techniques. Ask your doctor for a referral to a CBT-I trained therapist if you struggle with persistent insomnia.`,
  },

  // ─────────────────────────────────────────
  //  LEGAL RIGHTS (7 articles)
  // ─────────────────────────────────────────
  {
    title: "Women's Constitutional Rights in Bangladesh: A Complete Guide",
    category: "Legal Rights",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    content: `The Constitution of Bangladesh, adopted in 1972, enshrines fundamental rights for all citizens regardless of gender. Understanding your constitutional rights is the foundation of legal empowerment. This guide explains the key constitutional provisions protecting women's rights in Bangladesh.

ARTICLE 27 — EQUALITY BEFORE LAW:
"All citizens are equal before law and are entitled to equal protection of law." This foundational principle means no law or government action can treat women differently from men without compelling justification. Any discriminatory government practice can be challenged in the High Court Division of the Supreme Court under this article.

ARTICLE 28 — NON-DISCRIMINATION:
Article 28(1) states: "The State shall not discriminate against any citizen on grounds only of religion, race, caste, sex or place of birth." Article 28(2) extends this: "Women shall have equal rights with men in all spheres of the State and of public life." Article 28(4) allows the State to make special provisions for women, children and disadvantaged groups — creating the constitutional basis for affirmative action programs.

ARTICLE 29 — EQUALITY OF OPPORTUNITY IN PUBLIC EMPLOYMENT:
Guarantees equal opportunity for all citizens in employment by the Republic. No citizen can be discriminated against in government employment based on sex. This protects women's right to join any government service, including police, military and judiciary.

ARTICLE 32 — RIGHT TO LIFE AND PERSONAL LIBERTY:
"No person shall be deprived of life or personal liberty save in accordance with law." Courts have interpreted this broadly to include the right to live with dignity — a basis for challenging domestic violence and other threats to women's safety and wellbeing.

ARTICLE 39 — FREEDOM OF THOUGHT AND EXPRESSION:
Women have equal rights to freedom of thought, conscience and speech. No one can legally silence women's voices or prevent them from expressing opinions, seeking education or accessing information.

ARTICLE 41 — FREEDOM OF RELIGION:
Women have the right to practice any religion freely. However, this right is subject to law, public order and morality — creating complex tensions with discriminatory practices justified on religious grounds in family law matters.

ENFORCEMENT OF CONSTITUTIONAL RIGHTS:
If your constitutional rights are violated, you can file a writ petition under Article 102 directly in the High Court Division without going through lower courts. Legal aid is available through the National Legal Aid Services Organization (NLASO) for those who cannot afford lawyers. You can also contact BLAST (Bangladesh Legal Aid and Services Trust) or ASK (Ain o Salish Kendra) for free legal assistance.

LIMITATIONS AND CHALLENGES:
While constitutional protections are strong on paper, enforcement remains challenging due to: lack of awareness of rights, high costs of legal proceedings, social pressure to accept discrimination, delays in the judicial system and discriminatory attitudes among some officials. This is why organizations like Ain o Salish Kendra, BNWLA and BRAC work to bridge the gap between legal rights and lived reality.

KNOWING IS THE FIRST STEP:
Understanding your constitutional rights is the essential foundation. When you know your rights, you can recognize when they are being violated, seek appropriate help, hold institutions accountable and contribute to the collective movement for women's equality. Keep a copy of the constitutional articles that apply to your situation. Share this knowledge with other women in your community.`,
  },
  {
    title: "Protection Against Domestic Violence: Know Your Legal Options",
    category: "Legal Rights",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    content: `Domestic violence is a pervasive human rights violation affecting women of all backgrounds, religions, educational levels and economic status. In Bangladesh, the Domestic Violence (Prevention and Protection) Act 2010 provides legal mechanisms for protection. Understanding this law could save your life or the life of someone you know.

WHAT CONSTITUTES DOMESTIC VIOLENCE UNDER THE 2010 ACT:
The law defines domestic violence broadly to include:

Physical violence: Any act causing bodily harm including hitting, kicking, burning, restraining or using weapons. Even a single incident of physical violence constitutes domestic violence under the law.

Psychological violence: Threats, harassment, intimidation, stalking, humiliation, verbal abuse, isolation from family and friends, controlling behavior and emotional manipulation that cause mental suffering.

Sexual violence: Any non-consensual sexual act within marriage or partnership, including marital rape. This is a particularly significant provision as marital rape was not previously recognized as a crime.

Economic violence: Withholding money for basic necessities, preventing a woman from working, controlling all financial resources, destroying property or forcing someone to leave their home.

YOUR LEGAL PROTECTIONS AND REMEDIES:

Protection Orders: A magistrate can issue a protection order prohibiting the abuser from committing further violence, contacting the victim, entering the shared home or approaching the victim's workplace or children's school. Violation of a protection order is a criminal offense.

Residence Orders: Even if you are not the legal owner, a court can order that you have the right to remain in the family home and that the abuser must leave. This prevents the common situation of women being forced to leave their homes.

Custody and Maintenance: During domestic violence proceedings, courts can make interim orders regarding child custody and financial support to ensure women and children are not financially coerced into staying in dangerous situations.

Compensation: Courts can order abusers to pay compensation for physical injuries, medical expenses and financial losses caused by domestic violence.

HOW TO FILE A COMPLAINT:

Step 1: Report to local police station. You can file a General Diary (GD) or a First Information Report (FIR). Police are legally required to assist domestic violence victims. If police refuse or are unresponsive, contact the Superintendent of Police or use the women and children special police units that exist in most districts.

Step 2: Contact a Magistrate Court. You can apply directly to a magistrate for a protection order without filing a police report first. A magistrate can issue emergency protection orders the same day.

Step 3: Seek legal aid. If you cannot afford a lawyer, contact NLASO (National Legal Aid Services Organization) by calling their hotline, or approach BLAST, ASK or BRAC legal services.

IMPORTANT HELPLINES AND RESOURCES:
• National Helpline: 10921 (24 hours, toll-free)
• Women and Children Repression Prevention Directorate: 16105
• Bangladesh National Woman Lawyers' Association (BNWLA): 02-8113180
• Ain o Salish Kendra (ASK): 02-9359588
• One-Stop Crisis Centers (OCCs): Located in medical college hospitals across Bangladesh — provide medical care, legal advice, counseling and shelter

SAFETY PLANNING:
If you are in an abusive relationship, having a safety plan is critical. Identify a safe place you can go. Keep important documents (national ID, birth certificates, children's documents, financial records) in a safe location outside the home. Save emergency numbers in your phone under inconspicuous names. Tell at least one trusted person about your situation. Know your nearest One-Stop Crisis Center location.

SUPPORTING A FRIEND OR FAMILY MEMBER:
If you suspect someone you know is experiencing domestic violence: believe her, listen without judgment, help her understand her options without pressuring her into decisions, offer practical support (accompanying to police or court), provide information about resources and maintain contact so she knows she is not alone. Leaving is often the most dangerous time — support her process at her pace.`,
  },
  {
    title: "Workplace Rights for Women in Bangladesh",
    category: "Legal Rights",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800",
    content: `Women constitute an increasingly significant portion of Bangladesh's workforce, particularly in the garment industry, education, healthcare and government sectors. Understanding your workplace rights protects your dignity, income and career. This comprehensive guide covers the key legal protections for working women in Bangladesh.

THE BANGLADESH LABOUR ACT 2006 AND WOMEN:

Maternity Benefits:
The Labour Act provides 16 weeks of maternity leave — 8 weeks before delivery and 8 weeks after — for women who have worked for at least six months. During maternity leave, you receive full wages. Employers cannot terminate pregnant employees or those on maternity leave. This applies to establishments employing 10 or more workers. Domestic workers have more limited protections under the Domestic Workers Protection and Welfare Policy 2015.

Equal Pay:
The Labour Act prohibits wage discrimination based on sex for equal work. If you are doing the same work as a male colleague but receiving lower pay, this is illegal. Document the discrepancy and raise it with your employer in writing. If unresolved, you can file a complaint with the Department of Inspection for Factories and Establishments.

Working Hours and Overtime:
Standard working hours are 8 hours per day and 48 hours per week. Overtime is limited to 2 hours per day and must be paid at double the regular rate. Women should not be required to work night shifts (10pm-6am) in most industries without proper safety provisions.

Safe Working Environment:
Employers are legally required to provide safe working conditions free from hazards. This includes sexual harassment prevention, proper sanitation facilities (separate toilets for women), adequate lighting and ventilation, and protection from occupational health hazards.

SEXUAL HARASSMENT IN THE WORKPLACE:

The High Court of Bangladesh issued landmark guidelines in 2009 for preventing sexual harassment at workplaces and educational institutions. These guidelines, while not statute law, have binding effect through court order.

Definition of sexual harassment: Unwelcome sexual advances, requests for sexual favors, sexually explicit comments or jokes, touching or physical contact of a sexual nature, displaying pornographic material, creating a hostile work environment through sexual conduct.

Employer obligations under the 2009 guidelines:
• Form an Anti-Sexual Harassment Committee with at least 5 members, majority women
• Prominently display the committee's contact information
• Investigate all complaints within 60 days
• Take disciplinary action against harassers
• Provide a safe environment for complainants without retaliation

What to do if harassed:
1. Document every incident — date, time, what happened, witnesses
2. Report to your workplace's Anti-Sexual Harassment Committee
3. If your workplace has no committee or doesn't act, file a complaint with the Labour Court
4. Contact women's rights organizations for legal support
5. You can also file a criminal complaint under Section 10 of the Nari O Shishu Nirjatan Daman Ain 2000 for physical sexual harassment

GARMENT INDUSTRY WORKERS:
Bangladesh's garment industry employs approximately 4 million workers, over 80% of whom are women. Specific rights: right to join trade unions, collective bargaining rights, protection from arbitrary dismissal, fire safety standards (following Rana Plaza 2013), worker welfare funds and factory clinic requirements in larger factories.

DOMESTIC WORKERS:
Domestic workers — predominantly women — are among the most vulnerable. The Domestic Workers Protection and Welfare Policy 2015 provides: right to weekly day off, protection from physical and sexual abuse, written work agreement and recourse mechanisms. However, enforcement remains weak. If you are a domestic worker experiencing abuse, contact BRAC, Karmojibi Nari or BNWLA for support.

REPORTING WORKPLACE VIOLATIONS:
Department of Inspection for Factories and Establishments: Handles Labour Act violations
Labour Courts: For employment disputes and wage claims
Bangladesh National Women Lawyers' Association (BNWLA): Free legal assistance
Bangladesh Legal Aid and Services Trust (BLAST): Pro bono legal services`,
  },
  {
    title: "Marriage, Divorce and Property Rights for Women",
    category: "Legal Rights",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
    content: `Family law in Bangladesh governs marriage, divorce, child custody and inheritance. For Muslim women (majority population), these are primarily governed by Muslim Personal Law as modified by legislation. For Hindu and Christian women, different personal laws apply. Understanding your rights in these intimate areas of life is essential for protection and planning.

MARRIAGE RIGHTS:

Legal Age of Marriage:
The Child Marriage Restraint Act 2017 sets the minimum age at 18 for women and 21 for men. However, a controversial provision allows exceptions for girls below 18 in "special circumstances" with judicial approval — a provision widely criticized by women's rights advocates. Child marriage remains illegal even with parental consent except under this exception clause.

Registration of Marriage:
Muslim marriages must be registered with a government-licensed Kazi (marriage registrar) under the Muslim Marriages and Divorces (Registration) Act 1974. Registration is legally mandatory, though many rural marriages go unregistered. An unregistered marriage is still legally valid under Muslim personal law but creates significant practical difficulties — proving the marriage occurred, accessing legal protections and registering children's births. Always ensure your marriage is formally registered and keep the Kabin-nama (marriage contract) safely.

The Kabin-nama (Marriage Contract):
This critical document records: dower (mehr) amount and type (prompt or deferred), wife's right to divorce (talaq-e-tawfiz), conditions of marriage. Negotiate favorable terms before marriage — you can stipulate your right to work, study, live separately from in-laws and initiate divorce. Once signed, these terms are legally binding and enforceable in court.

Dower (Mehr):
Mehr is a mandatory financial gift from husband to wife — an Islamic legal right, not a gift. It can be prompt (paid immediately at marriage) or deferred (paid upon divorce or death). Even if not specified, the court will determine a "proper dower" based on family status. Mehr belongs entirely to the wife and cannot be claimed by in-laws.

DIVORCE RIGHTS:

Muslim women have three routes to divorce:

1. Talaq-e-tawfiz (Delegated Divorce):
If this right was stipulated in your Kabin-nama, you can divorce yourself without your husband's cooperation. Send written notice to the local Arbitration Council and your husband. The divorce becomes effective after 90 days (to allow for reconciliation) unless you are pregnant, in which case it takes effect after delivery.

2. Khula (Divorce by Mutual Agreement with Compensation):
A wife can seek divorce by returning the mehr or other agreed compensation. This requires the husband's agreement or court order. Court-ordered khula is available when the marriage has completely broken down.

3. Judicial Dissolution (Faskh):
A wife can petition Family Court to dissolve the marriage without her husband's agreement on grounds including: failure to pay maintenance for 2+ years, imprisonment of husband for 7+ years, impotence, insanity, cruelty (physical or emotional), desertion for 4+ years, and additional grounds. This process takes longer but is available to all women regardless of Kabin-nama provisions.

MAINTENANCE RIGHTS:
A husband is legally obligated to provide maintenance (nafaqa) to his wife during marriage and during the waiting period (iddat — 3 months) after divorce. The amount should reflect the husband's financial means and the family's standard of living. Apply to Family Court for maintenance orders if your husband refuses to pay. The court can order deduction from salary if necessary.

CHILD CUSTODY:
Under Muslim personal law, mothers have right of custody (hizanat) of daughters until puberty and sons until age 7 (though courts often extend this based on children's welfare). Fathers are natural guardians and responsible for financial support regardless of custody arrangements. Courts make custody decisions based primarily on the best interests of the child. Mothers do not lose custody rights due to remarriage in most cases.

INHERITANCE RIGHTS:
Under Muslim personal law, daughters inherit half the share of sons from parents' estate. Wives receive 1/8 of husband's estate if there are children, 1/4 if no children. Sisters receive half the share of brothers. While the quantum differs from male relatives, inheritance rights are absolute — in-laws cannot legally deny a woman her inheritance. If denied your inheritance, you can file a claim in civil court.`,
  },
  {
    title: "Protection Against Sexual Harassment and Violence",
    category: "Legal Rights",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800",
    content: `Sexual harassment and violence are serious crimes in Bangladesh, punishable by severe penalties under multiple laws. Knowing the legal framework empowers women to recognize violations, seek justice and protect themselves and others.

THE NARI O SHISHU NIRJATAN DAMAN AIN 2000 (Women and Children Repression Prevention Act):
This is the primary legislation protecting women and children from violence and sexual crimes in Bangladesh. Key provisions:

Rape: Punishable by death or life imprisonment. Any non-consensual sexual penetration constitutes rape. Marital rape is now recognized as sexual violence in some circumstances. Medical examination (rape kit) should be done within 72 hours for best evidence preservation — One-Stop Crisis Centers at medical college hospitals provide this service confidentially.

Sexual Assault (other than rape): Imprisonment of 3-10 years. Includes unwanted touching of sexual body parts, forced kissing and other non-penetrative sexual assault.

Acid Violence: A devastating crime predominantly affecting women. Punishable by death or life imprisonment for causing grievous hurt, and rigorous imprisonment for lesser injuries. The Acid Control Act 2002 restricts acid sale and requires registration.

Kidnapping and Trafficking: Kidnapping for marriage, prostitution or other purposes carries severe penalties. Human trafficking provisions under the Human Trafficking Deterrence and Suppression Act 2012 additionally protect against trafficking.

Eve Teasing (Street Harassment): While "eve teasing" (sexual harassment in public spaces) has historically been minimized, it constitutes criminal harassment under Section 10 of the Act. Penalties include imprisonment and fines. The Mobile Court Act allows immediate action against harassers in public spaces.

FILING A COMPLAINT FOR SEXUAL VIOLENCE:

Immediately after an assault:
1. Get to safety
2. Do not shower, change clothes or wash — this preserves critical forensic evidence
3. Go to the nearest One-Stop Crisis Center (OCC) at a medical college hospital or police station
4. Medical examination provides forensic evidence AND medical care simultaneously at OCCs
5. A female police officer should conduct or be present for any interview

At the police station:
Request a female officer if possible. File an FIR (First Information Report) — police are legally required to register it. Get a copy of the FIR. If police refuse to register your complaint, go to the Senior Superintendent of Police, Women and Children Affairs Directorate or directly to a magistrate.

ONE-STOP CRISIS CENTERS (OCCs):
Located in medical college hospitals across Bangladesh — Dhaka Medical College Hospital, Chittagong Medical College Hospital and others. Provide under one roof: medical care and forensic examination, legal assistance and statement recording, psychological counseling and safe shelter. Services are free, confidential and available 24 hours.

PROTECTION OF WITNESSES AND COMPLAINANTS:
Victims and witnesses in sexual violence cases have legal protections against retaliation. Courts can conduct proceedings in camera (private) to protect victims' identity. Victim's identity cannot be published in media without consent. Courts can issue protection orders if you face threats for reporting.

EMOTIONAL AND PSYCHOLOGICAL SUPPORT:
Reporting sexual violence requires immense courage. Psychological trauma is a normal response to assault. Counseling services are available at OCCs, BNWLA and through NGOs like Nagorik Uddyog. You are not alone, and what happened is not your fault. Seeking help — medical, legal and psychological — is an act of strength.

SUPPORTING A SURVIVOR:
If someone discloses sexual violence to you: believe her, listen without questioning her choices, offer to accompany her to seek help, maintain confidentiality as she requests and continue to be present without pressure. Your support can make the difference in whether she seeks help.`,
  },
  {
    title: "Property and Inheritance Rights for Women",
    category: "Legal Rights",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=800",
    content: `Property ownership and inheritance rights are fundamental to women's economic security and independence. In Bangladesh, these rights are governed by a complex combination of personal religious laws and statutory legislation. Understanding and asserting these rights is essential for financial autonomy.

INHERITANCE UNDER MUSLIM PERSONAL LAW:

The Muslim personal law of inheritance (based on Quranic principles) applies to Muslims in Bangladesh. While it provides women with specific inheritance shares, these are often denied in practice due to family pressure and lack of legal awareness.

Daughters inherit from parents: A daughter receives half the share of a son. If there are no sons, daughters together receive 2/3 of the estate; a single daughter receives 1/2. Daughters cannot be disinherited by parents.

Widows inherit from husbands: 1/8 if there are children; 1/4 if no children. This is in addition to her dower (mehr) which must be paid before estate distribution.

Sisters inherit from brothers: Full sisters receive 2/3 together (or 1/2 if alone) if there are no children or parents of the deceased. Half sisters receive lesser shares.

Mothers inherit from children: 1/6 if there are children of the deceased; 1/3 if no children.

ENFORCING INHERITANCE RIGHTS:
If family members refuse to acknowledge your inheritance:
1. Request an amicable family settlement first — engage respected family elders if helpful
2. Hire a lawyer to send a formal demand letter
3. File a case in the Civil Court (District Judge's Court) for partition of inherited property
4. Land inheritance disputes may need to go to the Land Appellate Tribunal
5. Free legal aid available through NLASO for those who cannot afford lawyers

PROPERTY RIGHTS DURING MARRIAGE:
Under both Muslim personal law and Bangladesh statutory law, a wife's property remains her own during marriage. A husband has no automatic right to his wife's earnings, savings or inherited property. Property owned before marriage remains separate. Property purchased with joint funds during marriage may be claimed as shared in divorce proceedings.

WOMEN'S LAND RIGHTS:
Bangladesh has progressive policies to promote women's land ownership. The Khas Land Distribution Policy requires 40% of agricultural khas (government) land distributed to landless people must go to women. Titles should be in both husband's and wife's names. Many women qualify for land under programs like ASA's women's economic empowerment initiatives.

PRACTICAL STEPS TO SECURE YOUR PROPERTY RIGHTS:
• Ensure all property purchased is registered in your name or jointly — insist on this
• Keep all property documents safely — sale deeds, mutation records, tax receipts
• Know the mutation (name change in land records) process — visit your local Union Land Office
• Pay land taxes under your own name annually to establish continuous ownership
• Make a will to specify how your property should be distributed — women can write wills under Bangladeshi law

FINANCIAL INDEPENDENCE AS PROTECTION:
Property and financial independence provide protection beyond economics. Women who own property have greater negotiating power in marriage, stronger leverage to leave abusive situations, greater respect within family and community, and better outcomes for their children's education and health. Prioritize registering assets in your name and building independent financial security.`,
  },
  {
    title: "Digital Rights and Online Safety for Women",
    category: "Legal Rights",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800",
    content: `As women's lives move increasingly online — for work, education, social connection and civic participation — digital rights and online safety have become critical feminist issues. Cyberviolence against women — including harassment, stalking, non-consensual image sharing and threats — is widespread and has real-world consequences on women's safety, mental health and participation in public life.

DIGITAL RIGHTS AS HUMAN RIGHTS:
Women have the same rights online as offline. The right to privacy, free expression, access to information and protection from violence applies equally in digital spaces. Governments and technology companies have obligations to protect these rights.

CYBERCRIMES AGAINST WOMEN IN BANGLADESH:

The Digital Security Act 2018 (now being replaced by the Cyber Security Act 2023) criminalizes:
• Publishing obscene or sexually harassing content online — imprisonment up to 10 years
• Hacking and unauthorized access to personal accounts
• Spreading false information with intent to harm reputation
• Non-consensual publication of private images or videos ("revenge porn") — this is a serious crime

Additionally, the Pornography Control Act 2012 prohibits production and distribution of pornographic content including non-consensual intimate images.

ONLINE HARASSMENT — RECOGNIZING AND RESPONDING:

Forms of online harassment women face:
• Cyberstalking — monitoring online activity, sending threatening messages, tracking location through digital means
• Doxxing — publishing private information (home address, phone number, workplace) to facilitate offline harm
• Non-consensual intimate image sharing (NCII/revenge porn) — distributing private sexual images without consent
• Coordinated harassment campaigns — organized groups targeting women with floods of abusive messages
• Impersonation — creating fake accounts to harass or damage reputation
• Sextortion — threatening to share intimate images unless demands are met

IMMEDIATE RESPONSE TO ONLINE HARASSMENT:

1. Document everything before taking action: screenshot messages, posts and profiles with timestamps. These are your evidence.
2. Report to the platform: Most platforms have reporting mechanisms for harassment. Report the content and the account. Request content removal.
3. Adjust privacy settings: Review and tighten privacy settings across all platforms immediately.
4. Block the harasser: On all platforms simultaneously.
5. Report to police: File a complaint at Cyber Crime Unit of Bangladesh Police or Cybercrime Investigation Division (CCID). Bring screenshots as evidence.
6. Seek support: Online harassment causes real psychological harm. Talk to trusted people and consider professional support.

PROTECTING YOURSELF ONLINE:

Account Security:
• Use unique, strong passwords for every account — use a password manager
• Enable two-factor authentication (2FA) on all accounts, especially email, banking and social media
• Regularly review which apps have access to your accounts and revoke unnecessary permissions
• Be careful about logging into accounts on shared or public computers
• Enable login notifications so you know when and where your accounts are accessed

Privacy Protection:
• Review privacy settings on all social media regularly — defaults are usually minimal privacy
• Be careful about sharing location information — disable location from photos (EXIF data) before sharing
• Be thoughtful about what personal information you share publicly — home address, workplace, daily routines, children's school
• Use a VPN when using public WiFi networks
• Check your name regularly in search engines to see what personal information is publicly visible

If Intimate Images Are Shared Without Consent:
This is a crime. You are not at fault. Document the incident. Report to the platform immediately — most platforms have specific processes for NCII removal (Facebook, Instagram, Twitter/X all have these). File a police complaint. Contact StopNCII.org — a global tool that helps prevent images from spreading. Seek support from organizations like Naripokkho or BNWLA.

DIGITAL LITERACY AS SAFETY:
Teaching girls and women digital literacy — how the internet works, how to protect privacy, how to recognize and respond to online manipulation — is essential safety education. Share this knowledge with younger women and girls in your life.`,
  },

  // ─────────────────────────────────────────
  //  SAFETY (7 articles)
  // ─────────────────────────────────────────
  {
    title: "Personal Safety Guide for Women: Comprehensive Strategies",
    category: "Safety",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800",
    content: `Personal safety is every woman's right. While the responsibility for women's safety lies with society, institutions and perpetrators — not women themselves — practical safety knowledge is empowering. These strategies help women navigate the world with greater confidence and awareness.

SITUATIONAL AWARENESS — YOUR MOST POWERFUL TOOL:
Situational awareness is simply paying attention to your surroundings with an understanding of what is normal and what is not. Most people move through the world distracted by phones, music and their own thoughts. Maintaining awareness allows you to recognize potential risks early and respond before a situation escalates.

The OODA loop (Observe, Orient, Decide, Act) is a useful framework. Observe your environment continuously. Orient — understand what you're seeing in context. Decide on your course of action. Act — implement your decision confidently and promptly.

Practical awareness habits:
• Look up from your phone when walking in public
• Remove headphones or use only one earbud in unfamiliar environments
• Sit with your back to walls in restaurants and public spaces — this reduces your vulnerability and increases your visual field
• Note exit locations when entering buildings
• Trust your intuition — if something feels wrong, it probably is. Gut feelings are your brain processing information before conscious awareness catches up.
• Be aware of who is around you and whether anyone seems to be following or watching you

TRAVEL SAFETY:

Planning:
• Research your destination before traveling — areas to avoid, local laws, emergency numbers
• Share your itinerary with a trusted person — where you're going, when you expect to arrive and return
• Keep your phone charged and have a backup charger
• Carry copies of important documents separately from originals
• Know the local emergency number before arriving anywhere new

Public transportation:
• Sit near the driver or in well-occupied carriages
• Stay awake on overnight journeys
• Keep bags on your lap or between your feet — not in overhead compartments for short trips
• Trust your instincts about which compartment or seat to choose

Accommodation:
• Research accommodation security before booking
• Upon arrival, locate fire exits and test that door locks work
• Use the door chain/lock even when inside
• If concerned about room security, use a portable door wedge alarm
• Don't open the door to unexpected visitors — call reception to verify

SELF-DEFENSE BASICS:
Self-defense is about creating opportunities to escape, not winning a fight. The goal is always to get away safely.

Prevention is the first line of defense — awareness and avoidance prevent most assaults. De-escalation — calm, confident communication can defuse many confrontational situations. Targeted strikes — if physical defense is necessary, the most effective targets are eyes, throat and groin (highly sensitive, likely to create escape opportunity). Voice — shouting "FIRE" or "CALL THE POLICE" is more likely to attract help than "help" alone in some situations. Run — once you create any opening, run toward safety and other people.

Consider taking a self-defense class — even a single-day workshop provides valuable practical training and confidence. Look for women-only classes taught by qualified instructors.

SAFETY TOOLS:
Personal alarm: A small device that emits a loud sound when activated. Legal everywhere, easy to use, effective at attracting attention and deterring attackers. Attach to keychain for quick access.

Reflective gear: For walking or cycling at night, makes you visible to drivers.

Emergency apps: Multiple apps allow you to send your location to trusted contacts with a single button press, or automatically if you don't check in.

Phone: Keep it charged, keep emergency numbers readily accessible, know how to quickly call emergency services.

DIGITAL SAFETY WHILE TRAVELING:
Turn off automatic WiFi connection — unknown networks can compromise your security. Use a VPN on public networks. Be careful what you share on social media while traveling — announcing your location in real time reveals that your home is unoccupied. Share travel photos after returning.

HOME SAFETY:
Know your neighbors — community connections are a safety resource. Ensure your home has adequate lighting at entry points. Consider a door alarm or security camera if you live alone. Don't announce on social media when you will be away. Have emergency contact information easily accessible.`,
  },
  {
    title: "Emergency Preparedness for Women and Families",
    category: "Safety",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
    content: `Bangladesh is one of the world's most disaster-prone countries — facing cyclones, floods, earthquakes and other emergencies regularly. Women and girls face disproportionate risks during disasters due to caregiving responsibilities, restricted mobility, lack of access to information and vulnerability to gender-based violence in displacement settings. Emergency preparedness is both a practical necessity and a form of self-care and family protection.

UNDERSTANDING BANGLADESH'S HAZARD LANDSCAPE:

Cyclones: Bangladesh's coastal areas face regular cyclonic storms, particularly during pre-monsoon (April-May) and post-monsoon (October-November) seasons. Since the devastating 1991 cyclone that killed 138,000 people, Bangladesh has built impressive cyclone shelter networks and early warning systems, saving hundreds of thousands of lives.

Floods: 20-25% of Bangladesh floods annually; in severe flood years up to 70% of the country can be inundated. Flash floods in haor areas are particularly rapid. River erosion permanently displaces communities.

Earthquakes: Bangladesh sits near active fault lines. Dhaka is considered one of the world's most earthquake-vulnerable megacities due to rapid urbanization, building quality concerns and population density.

Urban fires: Densely packed informal settlements and garment factories face significant fire risk.

BUILDING YOUR EMERGENCY KIT:
The Bangladesh Disaster Management Authority recommends preparing for at least 72 hours of self-sufficiency. Your emergency kit should contain:

Water: 3 liters per person per day minimum. Store in clean, sealed containers. Rotate every 6 months.
Food: Non-perishable items requiring minimal preparation — rice, lentils, canned fish, biscuits, dried fruits, nuts, oral rehydration salts.
Documents: Waterproof bag containing national IDs, birth certificates, land documents, insurance papers, medical records, recent photographs of family members.
First aid kit: Bandages, antiseptic, pain relievers, any prescription medications (3+ week supply), sanitary pads, oral rehydration salts, thermometer.
Tools and supplies: Flashlight and extra batteries, battery-powered or hand-crank radio, whistle to signal for help, dust masks, plastic sheeting, duct tape, local maps.
Phone charger: Portable battery pack, keep charged.
Cash: ATMs may not function during emergencies.
Baby supplies: Formula, diapers, medications if applicable.
Special needs: Medications, glasses, hearing aids for family members.

FAMILY EMERGENCY PLAN:
• Discuss emergency plans with all family members including children
• Establish two meeting points — one near your home, one further away in case you cannot return home
• Designate an out-of-area contact person — it is often easier to make long-distance calls than local calls during disasters
• Ensure all family members know how to call emergency services and what to say
• Practice evacuation routes from your home, including nighttime drills
• Know your nearest cyclone shelter location and route to get there

WOMEN-SPECIFIC EMERGENCY CONSIDERATIONS:

Menstrual supplies: Include a 2-month supply of pads or menstrual cups in emergency kits — these are consistently overlooked in generic emergency preparedness advice.

Safe spaces: During evacuation and in shelters, women and girls face elevated risks of gender-based violence. Stay with trusted family or community members. Know your rights in shelter settings. Report any harassment or violence to shelter managers or authorities.

Pregnant women: Have a birth plan for emergency situations — know the location of the nearest functioning hospital, have transportation arranged, have support person identified. Include extra nutrition, vitamins and medical records in emergency kit.

Infant feeding: Breastfeeding mothers should continue breastfeeding — breast milk is safe even during disasters. If formula feeding, ensure adequate clean water for preparation.

CYCLONE PREPAREDNESS CHECKLIST:
When a cyclone warning is issued:
□ Listen to CPP (Cyclone Preparedness Programme) volunteers and Bangladesh Meteorological Department warnings
□ Know the signal number — Signal 1-4 require preparation; Signal 7-10 require evacuation of coastal areas
□ Secure or store items that could become projectiles
□ Fill water containers — tap water may be disrupted
□ Charge all devices
□ Prepare emergency kit
□ Move to cyclone shelter at Signal 7+ if in coastal zone — do not delay evacuation
□ Keep family together

FLOOD PREPAREDNESS:
• Know your flood risk — whether you live in high or low-risk area
• Store important belongings and documents at height within your home
• Know your evacuation route to high ground
• Do not attempt to walk or drive through flooded areas — even 15cm of fast-moving water can knock down an adult
• Follow official guidance through radio, CPP volunteers and local authorities`,
  },
  {
    title: "Mental Health Safety: Recognizing and Preventing Crisis",
    category: "Safety",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    content: `Mental health is health. Women face significantly higher rates of depression, anxiety, PTSD and eating disorders than men, driven by a complex interplay of biological, psychological and social factors including gender-based violence, caregiver burden, economic inequality and social expectations. Recognizing mental health crises — in yourself and others — and knowing how to respond is life-saving knowledge.

UNDERSTANDING WOMEN'S MENTAL HEALTH VULNERABILITIES:

Biological factors: Hormonal fluctuations across the menstrual cycle, during pregnancy and postpartum, and through perimenopause create windows of increased vulnerability to mood disorders. Premenstrual Dysphoric Disorder (PMDD) — a severe form of PMS — is a recognized clinical condition affecting 3-8% of women. Postpartum depression affects 10-15% of women and, left untreated, has serious consequences for mothers and infants.

Social factors: Women disproportionately experience poverty, violence, discrimination and caregiving burden — all major risk factors for mental health conditions. The "emotional labor" of managing relationships and others' feelings is predominantly borne by women and is exhausting and underrecognized.

Trauma: Women are disproportionately affected by intimate partner violence, sexual assault and childhood abuse — all major causes of PTSD, depression and anxiety. Trauma is not weakness; it is a normal response to abnormal events.

RECOGNIZING A MENTAL HEALTH CRISIS:

In yourself — warning signs that you need immediate support:
• Thoughts of harming yourself or ending your life
• Feeling completely hopeless — that nothing will ever get better
• Being unable to care for yourself or your dependents (not eating, not sleeping for days)
• Losing touch with reality — hearing or seeing things others don't
• Extreme changes in behavior that are out of character
• Overwhelming panic that doesn't subside
• Feeling that you are a burden and others would be better off without you

In others — warning signs:
• Talking about wanting to die, being a burden or having no reason to live
• Giving away important possessions
• Sudden calmness after a period of severe depression (may indicate a decision has been made)
• Social withdrawal and isolation
• Increased substance use
• Dramatic mood changes
• Reckless behavior

IMMEDIATE CRISIS SUPPORT IN BANGLADESH:
• Kaan Pete Roi (listening ear): +8801779-554391 — emotional support helpline
• National Mental Health Helpline: 16789
• Dhaka Community Hospital: 02-8833173
• One-Stop Crisis Centers at medical college hospitals also provide psychological support

HOW TO SUPPORT SOMEONE IN CRISIS:
Stay with them — do not leave someone who is at immediate risk alone. Listen without judgment — don't try to argue them out of their feelings or minimize their pain. Ask directly: "Are you thinking about suicide?" — asking does not plant the idea; it opens a conversation that can save lives. Remove access to means if possible — in an acute crisis, removing access to medications, sharp objects and other means reduces risk. Connect them with professional help — accompany them to a hospital or help them call a helpline. Follow up after the immediate crisis — continued support matters.

BUILDING MENTAL HEALTH RESILIENCE:
Prevention is more effective than treatment. Protective factors for women's mental health:
• Strong social connections — loneliness is as harmful as smoking 15 cigarettes daily
• Physical exercise — as effective as medication for mild-moderate depression
• Adequate sleep
• Sense of purpose and meaning
• Ability to set boundaries and say no
• Financial security and independence
• Access to professional mental health care

BREAKING THE STIGMA:
Mental health conditions are medical conditions. Seeking help is strength, not weakness. The stigma surrounding mental health in Bangladesh causes immense unnecessary suffering by preventing people from seeking treatment. Talk openly about mental health with your family and community. Model help-seeking behavior. Challenge stigmatizing language and attitudes when you encounter them.`,
  },
  {
    title: "Road Safety for Women in Bangladesh",
    category: "Safety",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800",
    content: `Bangladesh has one of the world's highest road accident rates — over 7,000 people die in road accidents annually, with thousands more injured. Women face road safety risks both as pedestrians and passengers, and as drivers. Additionally, women using public transportation face risks of harassment. This guide addresses both physical road safety and the particular challenges women face in navigating Bangladesh's transportation systems.

PEDESTRIAN SAFETY:
Pedestrians are the most vulnerable road users and account for a significant proportion of road fatalities in Bangladesh.

Essential pedestrian safety practices:
• Use pedestrian crossings and footbridges wherever available
• Make eye contact with drivers before crossing — don't assume you've been seen
• Never assume a vehicle has stopped for you — verify before stepping in front
• Be especially cautious when crossing from behind stationary vehicles
• Wear bright or reflective clothing when walking at night or in low-visibility conditions
• Avoid using your phone while crossing roads
• Be aware of vehicles entering from driveways and side streets
• Walk facing traffic on roads without footpaths so you can see approaching vehicles

Particular hazards to watch for:
• CNG auto-rickshaws and rickshaws that move unpredictably
• Buses that stop suddenly or pull out without signaling
• Vehicles traveling on the wrong side of the road
• Flooded roads during monsoon — depth is deceiving and currents are dangerous

PASSENGER SAFETY:

Choosing transportation:
• Use registered, metered taxis or ride-sharing apps (Pathao, Shohoz, Uber) — these maintain driver records and provide accountability
• Avoid unmarked taxis — particularly at night
• Prefer vehicles with multiple passengers over solo travel in unknown vehicles
• Sit in the middle of the back seat in taxis — not behind the driver
• Share your ride details (driver name, license plate, estimated arrival time) with a trusted contact

During the journey:
• Verify the vehicle license plate matches the app booking before entering
• Trust your instincts — if something feels wrong, exit immediately in a safe location
• Keep your phone accessible and charged
• Stay alert — avoid sleeping on unfamiliar routes
• Note your route on your phone to ensure you're going in the right direction

HARASSMENT ON PUBLIC TRANSPORTATION:
Sexual harassment on buses, trains and other public transportation is unfortunately common. You have the right not to be harassed.

Immediate responses to harassment:
• Speak up loudly and clearly — name the behavior: "Stop touching me" or "Do not harass me"
• Make a scene if necessary — harassers rely on silence and shame
• Engage bystanders — ask for help directly: "This man is harassing me, please help"
• Move to a different location if possible — near the driver or conductor
• Report to transport staff
• Document the incident and report to police

Women-only spaces: Some buses and trains have designated women-only sections — use them when available. Advocate for more such provisions.

IF YOU ARE IN A ROAD ACCIDENT:
1. Ensure your own safety first — move away from traffic if possible
2. Call emergency services: 999 (police), 199 (fire and ambulance)
3. Document the scene if safely possible — photographs
4. Get names and contact information of witnesses
5. Seek medical attention even if injuries seem minor — some injuries manifest later
6. Report the accident to police and obtain a GD (General Diary) number for insurance and legal purposes
7. Contact your insurance company

ADVOCATING FOR SAFER TRANSPORTATION:
Individual safety measures are important but insufficient. Systemic change requires advocacy. Support organizations working on road safety. Report hazardous conditions (broken sidewalks, poor lighting, uncontrolled crossings) to local authorities. Demand enforcement of traffic laws. Advocate for better public transportation and women-specific safety provisions.`,
  },
  {
    title: "Fire Safety at Home and Workplace",
    category: "Safety",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    content: `Fire is one of the leading causes of preventable death and injury in Bangladesh. Devastating fires in garment factories, densely packed residential areas and markets have killed thousands of people, with women disproportionately affected. Knowledge of fire prevention and emergency response can save your life and the lives of people around you.

UNDERSTANDING FIRE: THE FIRE TRIANGLE:
Fire requires three elements: fuel (anything combustible), oxygen (air) and heat (ignition source). Remove any one element and fire cannot start or sustain. This principle guides fire prevention and suppression strategies.

HOME FIRE PREVENTION:

Kitchen safety (most common fire origin):
• Never leave cooking unattended — especially with oil, which can ignite suddenly
• Keep flammable materials (towels, curtains, plastic bags) away from stoves
• Turn pot handles inward to prevent accidental spilling
• Check stove knobs are fully off before leaving the kitchen
• Keep a lid nearby while cooking oil — sliding a lid over a flaming pan smothers the fire
• Clean stove regularly — grease buildup is a fire accelerant
• Never use water on a grease fire — this causes violent spattering and spreads flames

Electrical safety:
• Don't overload electrical sockets — use power strips with circuit breakers, not cheap adapters
• Unplug appliances not in use, especially overnight
• Never run electrical cords under rugs (traps heat) or pinched under furniture
• Check electrical cords regularly for damage — fraying, cracking or sparking
• Have electrical work done by qualified electricians only
• If a socket sparks, trips repeatedly or feels hot, have it inspected immediately

Candles and open flames:
• Never leave candles unattended or near flammable materials
• Keep candles away from curtains, bedding and paper
• Place candles in sturdy holders on stable surfaces
• Extinguish candles before sleeping or leaving a room

Gas safety:
• Check gas connections regularly for leaks — smell of gas (sulfur-like odor added for detection), dying plants near pipes
• If you smell gas: do not turn any switches on or off (sparks can ignite gas), open windows, leave the building and call the gas company from outside
• Never use gas appliances in enclosed spaces without ventilation

WORKPLACE FIRE SAFETY (ESPECIALLY GARMENT WORKERS):
Since the Rana Plaza collapse in 2013 and multiple garment factory fires, fire safety standards have improved but remain critical issues.

Know your rights:
• All factories must have a fire safety plan and conduct regular drills
• Emergency exits must be clearly marked, unobstructed and unlocked during working hours
• Fire extinguishers must be present and staff trained to use them
• Sprinkler systems required in larger factories

Your responsibilities:
• Participate in all fire drills — don't dismiss them as inconveniences
• Know where all emergency exits are on your floor
• Keep your work area clear of unnecessary combustibles
• Report fire hazards to supervisors — and if ignored, to Bangladesh Fire Service and Civil Defence
• Never prop open fire doors or block emergency exits

IF A FIRE OCCURS:

First 30 seconds are critical:
• Alert others immediately — shout "FIRE" and activate the fire alarm
• Call 999 (fire service)

Evacuation:
• Don't waste time gathering belongings
• Feel doors before opening — if hot, don't open (fire is on the other side)
• Stay low where smoke is less dense — smoke inhalation kills faster than flames
• Use stairs, never elevators
• Close doors behind you — this slows fire spread significantly
• Once out, do not re-enter

If trapped:
• Signal from windows
• Seal gaps under doors with clothing
• Stay near the window for fresh air and to signal rescuers
• Do not jump from above second floor unless fire is immediately life-threatening

Using a fire extinguisher (PASS technique):
• P — Pull the pin
• A — Aim at the base of the fire
• S — Squeeze the handle
• S — Sweep side to side
• Only use extinguisher on small, contained fires — if the fire is spreading, evacuate immediately

FIRE PREPAREDNESS:
Install smoke alarms — battery-powered alarms save lives. Test monthly, replace batteries annually. Have a household fire drill — practice at night since most fatal home fires occur when people are sleeping. Keep a fire extinguisher in kitchen area. Know two exit routes from every room. Establish a family meeting point outside.`,
  },
  
  {
    title: "Financial Safety and Fraud Prevention for Women",
    category: "Safety",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
    content: `Financial safety encompasses protecting your money from fraud and scams, building financial security that enables independence, and understanding your rights in financial transactions. Women face particular vulnerabilities in financial safety — lower financial literacy rates in some populations, greater susceptibility to certain scams targeting homemakers, and financial abuse as a form of domestic violence.

COMMON FINANCIAL SCAMS TARGETING WOMEN IN BANGLADESH:

Mobile Financial Services (MFS) Scams:
With bKash, Nagad and Rocket now used by millions, MFS fraud has grown significantly.

Common MFS scam types:
• "Wrong number send" scam: You receive an "accidental" payment, then the sender calls asking you to return it. They later reverse their original payment, so you have sent money for nothing.
• Never return payments to someone claiming to have sent money by mistake without verifying through the official bKash/Nagad helpline.
• Lottery scams: "You've won! Send a processing fee to claim your prize." No legitimate lottery requires advance payment.
• "bKash agent" calls: Fraudsters claim to be bKash agents needing your PIN to "verify" your account. bKash, Nagad and Rocket will NEVER ask for your PIN.
• Job offer scams: Promising high-paying jobs abroad, asking for registration fees. Always verify companies independently.

Protection measures:
• Never share your PIN, OTP (one-time password) or account credentials with anyone — not even "official" callers
• Set a PIN that is not your birth date or any guessable number
• Enable SMS notifications for all transactions
• Regularly check your account balance and transaction history
• Report suspicious activity immediately to the MFS provider and police

Investment Scams:
• Multi-level marketing (MLM) schemes disguised as investment opportunities — promise unrealistic returns, require recruiting others
• Ponzi schemes — early investors paid with new investors' money until the scheme collapses
• Rule of thumb: any investment promising guaranteed returns of more than 8-10% annually is almost certainly a scam

Loan Shark and Microfinance Exploitation:
• Informal money lenders charge exploitative interest rates
• Use formal microfinance institutions (Grameen Bank, BRAC, ASA) that have regulated interest rates and ethical practices
• Read and understand all loan documents before signing — ask for explanation of any unclear terms

FINANCIAL ABUSE IN RELATIONSHIPS:
Financial abuse is a form of domestic violence and a common tool of coercive control. Signs include:
• Partner controls all money and gives you an "allowance"
• Partner demands to see all receipts and accounts for all spending
• Partner prevents you from working or having your own bank account
• Partner has taken loans or credit cards in your name without consent
• Partner steals money from you or your children

Financial independence is a crucial protective factor against domestic violence. Strategies:
• Maintain your own bank account in your name alone
• Keep copies of important financial documents (bank statements, property documents) in a safe location outside the home
• Build savings independently if possible
• Know your family's financial situation — what assets and debts exist
• If you suspect financial abuse, contact BNWLA, BLAST or ASK for confidential advice

BUILDING FINANCIAL SECURITY:

Emergency fund: Aim to save 3-6 months of expenses in a liquid, accessible account. This provides a financial safety net against job loss, medical emergencies or relationship breakdown.

Insurance: Health insurance protects against catastrophic medical costs. Life insurance protects dependents if you die. Consider microinsurance products available through NGOs for low-income women.

Banking: All adult women should have their own bank account. Government initiatives like the 10 Taka Account for rural women at agricultural banks provide accessible banking. Mobile banking (bKash, Nagad) provides financial services where banks are unavailable.

Savings: Regular small savings build significant wealth over time through compound growth. Post office savings schemes and Sanchayapatra (savings certificates) from the government offer safe, government-backed returns.

Financial literacy: Knowledge is protection. Learn basic financial concepts — interest rates, compound growth, insurance, budget management. Attend financial literacy workshops offered by NGOs, microfinance institutions and banks. Teach your daughters about money management from a young age.`,
  },

  // ─────────────────────────────────────────
  //  EDUCATION (7 articles)
  // ─────────────────────────────────────────
  {
    title: "Girls' Education in Bangladesh: Progress, Challenges and Opportunities",
    category: "Education",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800",
    content: `Bangladesh has achieved remarkable progress in girls' education over the past three decades — a story often described as one of the world's great development success stories. Yet significant challenges remain, particularly at secondary and tertiary levels, in remote areas and for girls with disabilities, from ethnic minorities or in extreme poverty. Understanding both achievements and remaining gaps empowers advocacy and action.

BANGLADESH'S EDUCATIONAL ACHIEVEMENTS:

Gender parity in primary education: Bangladesh achieved gender parity in primary school enrollment — actually achieving higher female than male enrollment at primary level. This is a historic achievement considering that in the 1970s, barely 20% of girls attended school.

Secondary school gender parity: Through the Female Secondary School Assistance Programme (FSSAP) — providing stipends and tuition subsidies for girls from grade 6-12 — Bangladesh achieved and exceeded gender parity at secondary level. Girls now constitute 53% of secondary school students. This program is studied globally as a model for girls' education promotion.

Literacy: Female literacy has risen from approximately 25% in 1991 to over 72% today — remarkable progress though still below the male rate of approximately 79%.

Higher education participation: Women's participation in higher education has grown significantly. Female students now constitute 36% of university students, up from less than 10% three decades ago.

REMAINING CHALLENGES:

Early marriage: Despite the Child Marriage Restraint Act, Bangladesh has one of the world's highest rates of child marriage. Approximately 59% of Bangladeshi women were married before age 18. Early marriage is the primary reason girls drop out of secondary school. Economic pressure on families, insecurity about unmarried daughters' safety and lack of economic return for girls' education in some communities continue to drive early marriage.

Distance and transportation: Secondary schools and universities are often far from rural communities. Without safe, affordable transportation, many families are reluctant to send girls long distances. Boys typically have greater freedom to travel independently.

Safety concerns: Harassment on the way to school, at school and in transportation is a significant barrier for girls. Fear of harassment — and shame and family restriction following incidents — causes many girls to drop out.

Economic barriers despite stipends: While stipends cover fees and provide allowances, indirect costs — books, uniforms, private tutoring, examination fees — remain burdens for the poorest families.

Quality disparities: Urban-rural disparities in teacher quality, infrastructure and resources mean that girls in rural and remote areas receive lower quality education despite similar enrollment rates.

Disability: Girls with disabilities face double discrimination — disability-related barriers and gender discrimination. Special education is underdeveloped and mainstream schools are rarely accessible.

WHAT FAMILIES AND COMMUNITIES CAN DO:
• Keep girls in school as long as possible — each additional year of girls' secondary education increases her future earnings by 10-20% and reduces maternal mortality and child mortality rates significantly
• Delay marriage until at least 18 — ideally later
• Support girls' participation in extracurricular activities that build confidence and skills
• Address safety concerns by accompanying girls when necessary and advocating for safer schools and transportation
• Encourage girls' aspirations — expose them to women in diverse careers and leadership roles
• Challenge the cultural norms that value boys' education over girls'

SCHOLARSHIPS AND EDUCATIONAL SUPPORT:
Multiple scholarship programs are available for talented girls and women:
• Government Female Secondary School Assistance Programme (FSSAP)
• Prime Minister's Education Assistance Trust
• Bangladesh National Commission for UNESCO scholarships
• Various NGO scholarships through BRAC, Save the Children, Room to Read
• University merit scholarships — many universities have specific quotas for women
• Technical and vocational training scholarships through BTEB

HIGHER EDUCATION AND CAREER PATHWAYS:
Women in Bangladesh are increasingly entering fields previously dominated by men — engineering, medicine, law, civil service and military. The civil service gender quota (10% of positions reserved for women, with plans to increase) has created pathways to government careers. Medical and engineering universities show increasing female enrollment. Women's leadership in the garment industry, NGO sector and increasingly in corporate sector provides role models.

Every educated woman who uses her education and skills contributes to her family, community and country. Education is the most reliable path out of poverty and the strongest foundation for women's autonomy and rights.`,
  },
  {
    title: "Vocational Training and Skills Development for Women",
    category: "Education",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
    content: `Vocational and technical education provides practical skills that translate directly into employment and income. For women who may not have access to formal university education, vocational training offers a powerful pathway to economic independence. Bangladesh has a growing ecosystem of vocational training opportunities specifically designed for women.

WHY VOCATIONAL TRAINING MATTERS FOR WOMEN:
Economic independence is one of the strongest protective factors against poverty, domestic violence and restriction of women's rights. Research consistently shows that women who earn independent income have greater decision-making power within families, better health and educational outcomes for their children, stronger negotiating position in marriages and communities, and greater self-confidence and agency.

Vocational training is often shorter, more affordable and more practically applicable than formal university education — making it accessible to women who need to earn quickly, cannot relocate for education or who have family responsibilities that limit time.

KEY VOCATIONAL FIELDS WITH STRONG EMPLOYMENT PROSPECTS FOR WOMEN:

Technology and IT:
The technology sector is growing rapidly in Bangladesh and offers significant opportunities for women. Key skills in demand:
• Web development (HTML, CSS, JavaScript) — 3-6 months to basic employable level
• Graphic design — 3-6 months for foundational skills using Adobe tools or Canva
• Data entry and processing — 1-3 months to professional standard
• Mobile app development — 6-12 months to entry level
• Digital marketing — 3-6 months for social media management, SEO basics
• Content creation and management
• Customer support via online platforms (requires English proficiency)

Freelancing platforms like Upwork, Fiverr and local platforms provide income opportunities that can be accessed from home — particularly valuable for women with family responsibilities or in areas with limited local employment.

Where to train: BASIS (Bangladesh Association of Software and Information Services) Institute, Sheikh Hasina Software Technology Park training programs, LICT (Learning and Earning Development Project), Bangladesh Computer Council, numerous private IT institutes.

Healthcare:
• Community health worker — short government-sponsored courses
• Medical transcription — 3-6 months
• Healthcare assistant and nursing aide — 6-12 months
• Pharmacy technician — 6-12 months
• Laboratory technician — 12-18 months
• Physiotherapy assistant — 12-18 months

Where to train: Directorate General of Health Services training programs, NGO training programs (BRAC Health, CARE Bangladesh), private paramedical institutes.

Garment and Textile:
While basic garment work is widely available, specialized skills command higher wages:
• Industrial sewing machine operation — 1-3 months
• Pattern making and cutting — 3-6 months
• Quality control — 3-6 months with garment sector experience
• Fashion design — 12-24 months for full program
• Textile dyeing and finishing — 3-6 months

Where to train: BGMEA (Bangladesh Garment Manufacturers and Exporters Association) training institutes, BKMEA training, National Institute of Fashion Design.

Beauty and Personal Care:
Growing middle class creates demand for beauty services:
• Hair cutting, styling and coloring — 3-6 months
• Skincare and facial treatments — 3-6 months
• Bridal makeup — 3-6 months specialized
• Nail art and manicure/pedicure — 1-3 months
• Running a home-based salon (minimal startup costs)

Food Processing and Catering:
• Commercial cooking and catering — 3-6 months
• Food processing and preservation — 1-3 months
• Bakery and confectionery — 3-6 months
• Home-based food business — food processing training from BSCIC

ACCESSING VOCATIONAL TRAINING:

Government programs:
• Technical Education Board (BTEB) regulates vocational qualifications
• National Skills Development Authority (NSDA) coordinates training
• Bangladesh Technical Education Board institutes across country
• Skills for Employment Investment Program (SEIP) — subsidized training with employment linkages

NGO programs:
• BRAC skills training programs — tailored for women, multiple locations
• CARE Bangladesh livelihood programs
• Grameen Bank microenterprise training
• Proshika vocational training centers
• World Vision skills programs in their operational areas

International programs:
• ILO (International Labour Organization) skills programs
• IOM (International Organization for Migration) skills training for returnees
• USAID-funded programs through implementing partners

MICROENTERPRISE AND SELF-EMPLOYMENT:
Vocational skills combined with microfinance create opportunities for self-employment. Grameen Bank, BRAC, ASA and other MFIs provide small loans to women to start or expand small businesses. Government Cottage Industries Corporation (BSCIC) provides training, certification and market linkages for home-based enterprises.

Business skills — basic bookkeeping, marketing, customer service — are as important as technical skills for self-employment success. Many training programs now integrate business skills training.`,
  },
  {
    title: "Digital Literacy for Women: Navigating the Online World",
    category: "Education",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
    content: `Digital literacy — the ability to use digital technologies effectively, safely and critically — has become as fundamental as reading and writing in the 21st century. For women in Bangladesh, digital literacy opens access to information, economic opportunities, government services, social connection and civic participation. Yet significant gender gaps in digital access and skills persist, creating a digital divide that widens existing inequalities.

THE GENDER DIGITAL DIVIDE IN BANGLADESH:
Women are 33% less likely to own a mobile phone than men in Bangladesh, and significantly less likely to use internet and mobile financial services. This gap is driven by: cost barriers (many women don't control family finances), literacy barriers (digital interfaces often require reading ability), safety concerns (families may restrict women's phone use), social norms discouraging women from technology use, and lack of relevant local content and services.

Closing this gap is critical for women's economic empowerment, access to health information, safety and full citizenship in increasingly digital society.

FOUNDATIONAL DIGITAL LITERACY SKILLS:

Basic device operation:
• How smartphones and computers work — operating systems, apps, files
• Typing skills — essential for professional use; practice daily
• Internet browsing — searching effectively, evaluating reliability of sources
• Email — creating professional emails, attachments, organization
• Video calls — Zoom, Google Meet, WhatsApp Video for remote communication and learning

Mobile Financial Services:
• bKash, Nagad, Rocket account setup and operation
• Sending and receiving money safely
• Bill payment services
• Mobile banking and savings products
• Fraud recognition and prevention (critical safety skill)

Social Media:
• Facebook, which has the most Bangladeshi users — profile privacy settings, groups for community and business
• WhatsApp for personal and professional communication
• YouTube for learning — vast free educational content available
• Instagram for creative and business applications
• Understanding that what you post online is often permanently accessible and potentially public

Information Literacy:
• How to search effectively — using specific search terms, quotation marks for exact phrases
• Evaluating reliability of online information — identifying credible vs. unreliable sources
• Recognizing misinformation and false news
• Finding official government information online
• Accessing telemedicine and health information

ONLINE LEARNING AND EDUCATION:

Free online learning platforms accessible in Bangladesh:
• YouTube: Millions of free tutorials and courses in Bengali and English
• Khan Academy: Free comprehensive courses from primary level through university in multiple subjects — now available in Bengali
• Coursera and edX: Free courses from global universities (paid certificate option)
• Google Digital Garage: Free digital marketing and IT skills courses with certificates
• Facebook Blueprint: Free digital marketing certification
• LinkedIn Learning: Some free courses; professional networking platform
• 10 Minute School (Bangladesh): Free video lessons from primary to university level — excellent Bengali content
• Shikho: Bangladesh-focused learning app

Government e-Services:
• Birth and death registration online
• Land records access through DOLR (Department of Land Records and Survey)
• Tax filing
• Scholarship applications
• Job applications to government positions
• Information about government programs and benefits
• Complaint filing

STARTING YOUR DIGITAL JOURNEY:

If you are beginning with basic literacy: Start with basic smartphone skills — calling, messaging, camera. Many NGOs and Union Digital Centers provide basic digital literacy training.

If you have basic smartphone skills: Learn mobile financial services, basic internet use and one social media platform.

If you are digitally comfortable: Explore online learning, e-commerce opportunities, government e-services and professional networking.

WHERE TO LEARN DIGITAL SKILLS:
• Union Digital Centers (UDC): Available in every union parishad — provide basic computer and internet training, often with women-specific programs
• Bangladesh Computer Council: National training programs
• BRAC: Digital literacy integrated into multiple women's programs
• a2i (Access to Information) program: Government initiative improving digital access
• Grameen Phone Community Information Centers
• Private computer training institutes in urban areas`,
  },
  {
    title: "Scholarships and Funding for Women's Higher Education",
    category: "Education",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800",
    content: `Financial barriers are among the primary obstacles preventing talented women from accessing higher education in Bangladesh. However, a growing landscape of scholarships, stipends and funding programs specifically for women makes higher education more accessible than ever before. This comprehensive guide helps you navigate available opportunities.

GOVERNMENT SCHOLARSHIPS AND STIPENDS:

Female Secondary School Assistance Programme (FSSAP):
Covers female students in grades 6-12 in designated schools. Provides tuition waiver and monthly stipend (amount varies by grade). Requires maintaining minimum attendance (75%) and passing grades. Application through school administration — no separate application needed at most schools. Approximately 5 million girls benefit annually.

Prime Minister's Education Assistance Trust:
Merit-based scholarships for outstanding students at all levels. Particularly targets students from low-income families who demonstrate high academic achievement. Application through District Education Office or directly online at scholarships.pmeat.gov.bd.

National Merit Scholarship:
Awarded based on JSC, SSC and HSC examination results. Covers education expenses through the year of award. Apply through your educational institution following Board examinations.

Technical and Vocational Scholarship:
Available for women enrolled in BTEB-approved vocational training. Particularly supports women from low-income backgrounds learning market-relevant skills. Apply through your training institution.

UNIVERSITY-SPECIFIC OPPORTUNITIES:

Public Universities:
Dhaka University, BUET, Rajshahi University and others offer:
• Departmental scholarships for meritorious students
• Financial hardship grants for students demonstrating need
• Stipends for postgraduate research students
• Part-time work opportunities on campus

Private Universities:
Many private universities offer significant fee waivers for meritorious students, particularly for top HSC performers. Specifically ask about women's scholarships when applying — many have specific allocations.

Medical and Dental Colleges:
Government medical and dental colleges are heavily subsidized. BCS (Bangladesh Civil Service) health cadre provides employment post-graduation with loan forgiveness provisions. Various organizations including Rotary International and Lions Club provide medical education support.

INTERNATIONAL SCHOLARSHIPS FOR BANGLADESHI WOMEN:

Commonwealth Scholarships:
The UK Commonwealth Scholarship Commission offers postgraduate and PhD scholarships to candidates from Commonwealth countries including Bangladesh. Highly competitive but accessible to outstanding candidates. Apply at cscuk.fcdo.gov.uk.

Fulbright Program (USA):
Graduate study and research opportunities in the United States. Bangladeshi candidates apply through US Embassy in Dhaka. Multiple categories including full master's and PhD funding. Strong community development focus — applications highlighting plans to contribute to Bangladesh upon return are competitive.

Chevening Scholarships (UK):
UK Foreign Office scholarship for one-year master's programs in the UK. Applicants should demonstrate leadership potential. Apply at chevening.org.

Australian Awards:
Australian Government scholarships for postgraduate study in Australia. Development-focused; strong opportunities for women in STEM, health, agriculture and governance fields.

MEXT Scholarship (Japan):
Japanese Government scholarship for undergraduate, research and vocational students. Apply through Japanese Embassy in Dhaka. Full funding including tuition, stipend and travel.

Korean Government Scholarship Program (KGSP):
Full funding for undergraduate and postgraduate study in South Korea. Apply through Korean Embassy.

Aga Khan Development Network:
Multiple scholarship programs specifically targeting students from low-income backgrounds in South and Central Asia including Bangladesh. Focuses on professional graduate studies.

NGO AND FOUNDATION SCHOLARSHIPS:

Room to Read Girls' Education Program:
Provides scholarships and life skills training to girls through secondary education. Works through partner schools — contact Room to Read Bangladesh office.

BRAC Scholarships:
Multiple scholarship programs for students from BRAC schools and broader community. Particularly supports talented students from disadvantaged backgrounds.

Manusher Jonno Foundation:
Provides support for women from marginalized communities to access education and vocational training.

Abed Foundation:
Named after BRAC founder Sir Fazle Hasan Abed; supports exceptional students in higher education.

HOW TO MAXIMIZE SCHOLARSHIP APPLICATIONS:
• Start researching and preparing application materials early — deadlines are strict
• Maintain excellent academic records consistently — scholarship selection is often GPA-based
• Develop your English language skills — many scholarship applications and programs are in English
• Build extracurricular leadership experience — scholarship selection committees look for well-rounded candidates
• Write compelling personal statements — clearly articulate your goals, challenges overcome and planned contribution
• Get strong recommendation letters from teachers or mentors who know you well
• Apply to multiple scholarships simultaneously — it is appropriate and expected
• Contact scholarship offices with specific questions — many appreciate proactive applicants`,
  },
  {
    title: "Teaching Your Daughters: Raising Empowered Girls",
    category: "Education",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1543269664-7eef42226a21?w=800",
    content: `The messages we send girls about their capabilities, worth and place in the world shape the adults they become. Research in developmental psychology, education and gender studies consistently shows that girls who grow up believing in their abilities, knowing their rights and having confident identities achieve better educational, economic and health outcomes. Here is a research-based guide to raising empowered daughters.

BUILDING CONFIDENT SELF-IMAGE:

Praise effort, not intelligence: Research by Carol Dweck shows that praising children for being "smart" creates a fixed mindset — fear of challenges that might reveal they're not smart after all. Praising effort — "You worked so hard on that" — creates growth mindset — the belief that abilities develop through effort. Girls particularly benefit from growth mindset messages as they face social pressure to "be naturally good" rather than to try hard.

Challenge gender stereotypes in daily language: Notice and challenge statements like "girls aren't good at math" or "boys are better at sports." These statements become self-fulfilling prophecies. Research shows simply telling girls that stereotypes about girls and math are false significantly improves their mathematical performance.

Celebrate diverse strengths: Help girls identify and celebrate their particular strengths — whether academic, athletic, artistic, social, leadership or others. All strengths are valuable. Avoid comparing daughters to other children or siblings.

Model confident behavior: Girls learn from watching the women in their lives. How do you handle challenges, mistakes and criticism? Do you advocate for yourself? Do you pursue your own interests and goals? Modeling these behaviors is the most powerful teaching.

EDUCATION AND INTELLECTUAL DEVELOPMENT:

Read together: Girls who are read to from infancy develop significantly stronger literacy, vocabulary and academic skills. Continue reading together even as girls become independent readers — discuss stories, ask questions, share opinions.

Encourage STEM curiosity: Science, technology, engineering and mathematics gaps emerge early when girls receive fewer opportunities and encouragement. Provide science kits, building toys and technology access. Note and praise girls' mathematical and scientific thinking.

Don't rescue immediately: Allow girls to struggle with problems before intervening. This builds persistence, problem-solving confidence and tolerance for frustration — critical skills for academic and life success.

Discuss current events and issues: Including girls in family conversations about news, community issues and social questions develops critical thinking, civic engagement and confidence in sharing opinions.

Encourage questions: Curiosity is the engine of learning. Welcome all questions, model looking up answers you don't know and explore topics of interest together. A curious girl becomes a lifelong learner.

TEACHING RIGHTS AND SAFETY:

Body autonomy from early childhood: Teach girls from the earliest age that their bodies belong to them. They do not have to hug, kiss or be touched by anyone — even family members — if they don't want to. This is not rudeness; it is a foundational safety teaching. Forced affection teaches girls their bodily autonomy is less important than adults' feelings.

Correct anatomical language: Using correct names for body parts (vulva, vagina, penis) rather than childish euphemisms is associated with reduced abuse risk — children can accurately describe abuse, abusers are less likely to target children who speak comfortably about bodies, and it reduces shame.

Safety conversations: Age-appropriately discuss: the difference between safe and unsafe secrets (safe secrets = surprises that will be revealed; unsafe secrets = things that make you feel bad and you're told never to tell), who her "safety network" of trusted adults are, what to do if she feels unsafe, that she will never be in trouble for telling about unsafe situations.

Rights and civic education: Teach daughters about their constitutional rights, women's rights history and the women who fought for the rights they now have. Understanding that rights were won through struggle motivates appreciation and continued advocacy.

PREPARING FOR ADOLESCENCE:

Menstruation: Provide accurate, positive menstruation education before it happens — ideally around age 9-10. Frame menstruation as a healthy, normal process — not a curse, secret or source of shame. Ensure she has access to hygiene products and knows how to use them.

Puberty changes: Discuss all physical changes of puberty openly — breast development, body hair, body shape changes, skin changes. Normalize the changes while acknowledging they can feel overwhelming.

Social media and digital safety: Discuss social media use before it begins. Establish family agreements about privacy, appropriate sharing and what to do if something concerning happens online.

Relationships and boundaries: Teach healthy relationship qualities — mutual respect, honest communication, personal space, support for individual goals. Teach that "no" is a complete sentence that deserves respect and that anyone who doesn't respect "no" is not a safe relationship.

Mental health: Normalize discussions about feelings, challenges and mental health. Ensure she knows that asking for help is strength, not weakness. Know the warning signs of depression and anxiety in adolescence.

COMMUNITY AND LEADERSHIP:

Encourage girls to participate in leadership roles — class officer, sports captain, community groups. Leadership experience builds confidence, public speaking skills and understanding of how change happens.

Connect girls with mentors — women in careers and roles that interest them. Mentorship significantly affects girls' aspirations and beliefs about what is possible.

Support girls' extracurricular interests — sports particularly are associated with higher confidence, teamwork skills and understanding of healthy competition in girls who participate.`,
  },
  {
    title: "Career Guidance for Women in Bangladesh",
    category: "Education",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    content: `Career planning is a skill that is rarely explicitly taught, yet it profoundly shapes professional outcomes. Women in Bangladesh navigate additional challenges in career development — gender bias in hiring and promotion, family expectations around marriage and caregiving, limited networks in male-dominated fields and lack of female role models in senior positions. This guide provides practical career development strategies for Bangladeshi women at every career stage.

SELF-ASSESSMENT — KNOWING YOURSELF:
Before planning a career, understand yourself clearly.

Strengths inventory: What skills come naturally to you? What do others consistently compliment you on? What tasks energize rather than drain you?

Values clarification: What matters most to you in work? Consider: meaningful contribution to society, financial compensation, flexibility/work-life balance, status and recognition, creativity, helping others, intellectual challenge, stability, leadership and advancement.

Interests: What subjects or activities absorb you so completely that you lose track of time? What problems would you love to solve? What industry or sector do you find genuinely interesting?

Practical constraints: What are your financial needs? Geographic flexibility? Family responsibilities? Educational qualifications currently and potential to develop them?

RESEARCHING CAREERS AND OPPORTUNITIES:

Growing sectors in Bangladesh with strong opportunities for women:
• Technology and IT: Bangladesh's tech sector grows 40% annually. Women in tech earn comparable salaries to men and face less gender discrimination than some traditional sectors.
• Healthcare: Doctor, nursing, pharmacy, allied health — all growing with government investment in health infrastructure.
• Education: Teaching, administration, educational technology — large sector with government employment stability.
• Finance and banking: Bangladesh Bank, commercial banks, MFIs — increasingly welcoming of women; leadership roles growing.
• Development sector (NGOs): BRAC, BRAC Bank, Care, Save the Children — significant female employment and leadership.
• Garment industry management: Supply chain, compliance, HR management — growing professional roles alongside production roles.
• Journalism and media: Growing opportunities, particularly in digital media.
• Entrepreneurship: Growing ecosystem of support for women entrepreneurs.

Information gathering: Conduct informational interviews — ask people in careers you're interested in about their work, how they entered the field and what they recommend. Most people are glad to share experience. Join professional associations. Follow industry news. Attend career fairs and networking events.

EDUCATION AND QUALIFICATION PLANNING:

Identify qualification requirements for target careers and make realistic plans to acquire them. Consider: Is your current degree/qualification sufficient? Is additional formal education needed (master's, professional certification, technical training)? Can you gain relevant experience alongside current education or work?

Professional certifications that add value in Bangladesh:
• CPA (Certified Public Accountant) for finance/accounting
• CFA (Chartered Financial Analyst) for investment finance
• CIMA (Chartered Institute of Management Accountants)
• PMP (Project Management Professional)
• Google, Facebook, HubSpot digital marketing certifications (free)
• Microsoft, Cisco, CompTIA certifications for IT
• Various healthcare certifications through Bangladesh Medical and Dental Council

BUILDING YOUR PROFESSIONAL NETWORK:

In Bangladesh's relationship-based professional culture, who you know matters enormously. Building genuine professional relationships opens opportunities that never appear in job advertisements.

Networking strategies:
• LinkedIn profile: Increasingly important for professional visibility. Create a complete, professional profile with photo, accurate work history and engaging summary. Connect with classmates, professors, colleagues and professionals in your field.
• Professional associations: Join relevant professional bodies — Bangladesh Medical Association, Bangladesh Bar Council, Institution of Engineers Bangladesh, Bangladesh Computer Society, etc.
• Alumni networks: Your university alumni network is a warm community for professional networking.
• Industry events: Conferences, seminars and workshops provide networking opportunities while building knowledge.
• Mentorship: Actively seek mentors — senior professionals who can provide guidance, introductions and advocacy. Be specific about what you're seeking from a mentoring relationship.

JOB SEARCH STRATEGIES:

Online platforms: Bdjobs.com is Bangladesh's largest job portal. Also check LinkedIn jobs, Prothomalo Chokri, BDTask and international job boards for global organizations.

Company research: Identify organizations you want to work for and follow them proactively — their website, social media, news. Many positions are filled through direct applications before being advertised.

Application materials: Tailor your CV and cover letter to each specific application — highlight relevant skills and experience for that particular role. Have your materials reviewed by career advisors or mentors.

Interview preparation: Research the organization thoroughly. Prepare specific examples of achievements using the STAR format (Situation, Task, Action, Result). Practice answers to common questions. Prepare thoughtful questions to ask interviewers.

NAVIGATING GENDER BIAS:

Gender bias in hiring and promotion is real and documented. Strategies to navigate it:
• Document your achievements systematically — concrete numbers and outcomes
• Negotiate compensation — women who negotiate earn significantly more over careers
• Build allies and advocates, both women and men, in positions of influence
• Choose organizations with demonstrated commitment to gender equity — look at leadership diversity
• Know your legal rights regarding discriminatory hiring practices
• Support other women in their career development — create the culture you want to work in

ENTREPRENEURSHIP:
For women who want to create their own opportunities, entrepreneurship offers paths to both income and impact.

Key resources:
• SME Foundation: Provides training, loans and market access for small businesses
• BRAC Enterprise: Business development services for women entrepreneurs
• Bangladesh Bank: Women entrepreneur loan schemes with favorable terms
• Startup Bangladesh: Government support for technology startups
• Women Chamber of Commerce and Industry: Networking and advocacy for women business owners
• Young Entrepreneurs Society (YES): Peer learning and networking for young entrepreneurs`,
  },
  {
    title: "Financial Education for Women: Taking Control of Your Money",
    category: "Education",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
    content: `Financial literacy — the ability to understand and effectively manage personal finances — is one of the most important life skills for women's independence and security. In Bangladesh, where women have historically had limited control over family finances, building financial knowledge and independent financial management skills is both empowering and protective.

WHY FINANCIAL LITERACY MATTERS PARTICULARLY FOR WOMEN:
Women who control their own finances have more bargaining power in relationships, better outcomes for their children's health and education, more options when facing domestic difficulties, greater ability to pursue their own goals and aspirations, and stronger economic security in old age and widowhood. Yet women globally and in Bangladesh score significantly lower than men on financial literacy assessments — not because of innate capability differences but because of historical exclusion from financial decision-making and education.

FOUNDATIONAL FINANCIAL CONCEPTS:

INCOME AND BUDGETING:
Income is money coming in — salary, business profit, rent, remittances, government benefits. Track every source of income.

A budget is a plan for how to allocate your income. The 50/30/20 rule is a useful starting framework:
• 50% of income for needs — rent, food, utilities, transportation, essential clothing, children's education
• 30% for wants — entertainment, eating out, non-essential purchases
• 20% for savings and debt repayment — this is your financial future

For lower-income households, the proportions may need adjustment — more to needs, less to wants. The principle of saving something — even 5-10% — before spending remains important at all income levels.

Zero-based budgeting: Assign every taka of income a purpose so income minus expenses equals zero. This ensures intentional allocation rather than wondering where money went.

SAVINGS AND EMERGENCY FUND:
The most important first financial goal is building an emergency fund — typically 3-6 months of essential expenses in a liquid, accessible savings account. This fund prevents a medical emergency, job loss or unexpected expense from creating debt spiral.

Saving strategies that work:
• Pay yourself first: Transfer your savings allocation immediately when income arrives — before spending
• Automate savings: Set up automatic transfers to savings accounts on payday
• Create visual savings goals: Seeing progress toward a specific goal motivates continued saving
• Use savings accounts that create friction for withdrawal — separate institution or account requiring notice

Savings vehicles in Bangladesh:
• Post Office Savings: Safe, government-backed, multiple products
• Sanchayapatra: Government savings certificates with competitive interest rates — available in 3-month, 5-year and family savings categories
• Bank fixed deposits: Higher interest than regular savings accounts; locked for the term
• MFS savings: bKash savings accounts, Nagad savings — convenient but lower interest than formal banking
• DPS (Deposit Pension Scheme): Monthly deposit plans at banks — good discipline tool

DEBT MANAGEMENT:
Not all debt is bad — education loans and business loans can be investments. Consumer debt (credit cards, loans for consumer goods) should be minimized and paid off as quickly as possible.

If managing debt: List all debts with interest rates and minimum payments. Two common payoff strategies:
• Debt avalanche: Pay minimums on all debts, put extra money toward highest interest rate debt — mathematically optimal
• Debt snowball: Pay minimums on all debts, put extra money toward smallest balance — psychologically motivating

Microfinance loans: If using MFI loans for business, ensure your expected income from the business-funded activity clearly exceeds loan repayment costs. Avoid taking loans for consumption — this creates a cycle of debt.

UNDERSTANDING INTEREST:
Compound interest is the most important financial concept — money grows exponentially when interest earns interest. Starting to save early is far more powerful than saving more later. A woman who saves 1000 taka monthly from age 25 will have dramatically more at age 60 than one who starts at 35 — even if the later saver contributes more per month.

Conversely, compound interest works against borrowers. High-interest loans grow rapidly — always understand the total cost of borrowing, not just monthly payments.

INVESTMENT BASICS:
Once emergency fund is established, consider investments that grow wealth beyond savings interest rates.

Bangladesh Government Savings Instruments:
• Sanchayapatra (National Savings Certificates): Safest investment with guaranteed returns of 11-12% — highest risk-free return available in Bangladesh
• Limited to certain amount per person — check current limits

Bangladesh Securities and Exchange Commission (BSEC) regulated investments:
• Mutual funds: Professional management of diversified portfolios — various risk levels available
• Direct stock market: Higher risk but potential for higher returns — requires knowledge and research
• Bangladesh government treasury bonds and bills

Property: Real estate in Bangladesh has historically provided strong returns but requires significant capital and has lower liquidity.

BUILDING LONG-TERM FINANCIAL SECURITY:
Start retirement planning as early as possible. Even small contributions to pension or savings plans compound significantly over decades. Know your rights to survivor benefits if a spouse dies. Maintain your own bank accounts and financial records throughout your life. Make a will to ensure your assets are distributed according to your wishes. Consider insurance — health, life and property — as protection against financial shocks.

FREE FINANCIAL EDUCATION RESOURCES:
• Bangladesh Bank financial literacy programs
• MFI financial literacy training (BRAC, ASA, Grameen Bank)
• 10 Minute School financial education videos (Bengali)
• Various YouTube channels covering personal finance in Bengali
• Union Digital Center financial services orientation programs`,
  },

  // ─────────────────────────────────────────
  //  MENTAL HEALTH (8 articles)
  // ─────────────────────────────────────────
  {
    title: "Understanding Depression in Women: Causes, Symptoms and Treatment",
    category: "Mental Health",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800",
    content: `Depression is one of the most common health conditions affecting women worldwide. Women are approximately twice as likely as men to be diagnosed with depression, and this is not merely because women are more willing to seek help. Real biological, psychological and social factors create genuine differences in depression rates and presentations between men and women.

UNDERSTANDING DEPRESSION — WHAT IT IS AND ISN'T:
Depression is not sadness, weakness or a choice. It is a medical condition involving significant changes in brain chemistry, neural circuitry and body physiology. Just as diabetes involves disrupted insulin regulation, depression involves disrupted serotonin, dopamine and norepinephrine neurotransmitter systems.

Major Depressive Disorder (MDD) is diagnosed when a person experiences 5 or more of the following symptoms for at least 2 weeks, nearly every day, causing significant impairment:
• Depressed mood most of the day
• Markedly diminished interest or pleasure in all or almost all activities (anhedonia)
• Significant weight change (gain or loss) or appetite disturbance
• Sleep disturbance — insomnia or hypersomnia
• Psychomotor agitation or slowing (observable by others)
• Fatigue or loss of energy
• Feelings of worthlessness or excessive or inappropriate guilt
• Difficulty thinking, concentrating or making decisions
• Recurrent thoughts of death, suicidal ideation or suicide attempt

WHY WOMEN ARE MORE VULNERABLE:

Hormonal factors: Estrogen and progesterone influence serotonin, dopamine and other neurotransmitter systems involved in mood regulation. Dramatic hormonal shifts — during premenstrual phase, postpartum period, perimenopause — create windows of biological vulnerability to depression.

Premenstrual Dysphoric Disorder (PMDD): A severe form of PMS affecting 3-8% of women, characterized by significant depression, anxiety, irritability and physical symptoms in the 1-2 weeks before menstruation. A recognized medical condition distinct from ordinary PMS, treatable with SSRIs, hormonal contraceptives or lifestyle interventions.

Postpartum Depression (PPD): Affects 10-15% of mothers, typically beginning within 4 weeks of birth and persisting without treatment. Distinguished from the "baby blues" (mild, transient mood disturbance in first 2 weeks) by severity and duration. Risk factors include previous depression, lack of social support, complicated delivery, infant health problems and relationship difficulties. Highly treatable — delay in treatment affects maternal wellbeing and infant development.

Perimenopausal Depression: The transition to menopause is a significant vulnerability period. Women with no prior depression history may experience first-ever depression during perimenopause. Hormone therapy may be beneficial for perimenopausal depression specifically.

Social and psychological factors: Women experience higher rates of: intimate partner violence, sexual assault and childhood abuse (all major depression risk factors), poverty, role overload from managing multiple responsibilities simultaneously, perfectionist self-standards, and rumination (repetitive negative thinking — more common in women than men and strongly associated with depression).

DEPRESSION IN BANGLADESHI CONTEXT:
Research indicates high rates of depression among Bangladeshi women, particularly in rural areas, among garment workers, among women who have experienced domestic violence and among mothers. Access to mental health services is severely limited — Bangladesh has approximately 250 psychiatrists for 170 million people. Cultural factors including stigma, attribution of mental health conditions to spiritual causes and expectation that women prioritize others' wellbeing over their own further reduce treatment-seeking.

EFFECTIVE TREATMENTS FOR DEPRESSION:

Psychotherapy:
Cognitive Behavioral Therapy (CBT) — the most extensively researched psychological treatment. Helps identify and change negative thought patterns and behaviors that maintain depression. Typically 12-20 sessions. Available from psychologists, trained counselors and increasingly through digital platforms.

Interpersonal Therapy (IPT) — focuses on relationship difficulties and life transitions associated with depression. Particularly effective for postpartum depression.

Antidepressant Medications:
SSRIs (Selective Serotonin Reuptake Inhibitors) — first-line medication treatment. Examples: sertraline, fluoxetine, escitalopram. Take 4-6 weeks for full effect. Do not discontinue abruptly. Safe during breastfeeding (some are safer than others — discuss with doctor).

Lifestyle interventions with robust evidence:
• Exercise: Meta-analyses show aerobic exercise as effective as antidepressants for mild-moderate depression. 30 minutes of moderate exercise 3-5 times weekly.
• Sleep: Treating sleep problems often partially treats depression — these are bidirectionally linked.
• Social connection: Loneliness dramatically worsens depression; social connection is protective.
• Nutrition: Anti-inflammatory diet supports better mental health outcomes.
• Light therapy: Particularly effective for seasonal depression; also beneficial in non-seasonal depression.

SEEKING HELP IN BANGLADESH:
National Institute of Mental Health (NIMH), Dhaka — specialized inpatient and outpatient care. Department of Psychiatry at medical college hospitals. Kaan Pete Roi listening helpline: 01779-554391. Government-employed upazila health and family planning officers can make mental health referrals. BRAC mental health community health workers. Online counseling services increasingly available.`,
  },
  {
    title: "Anxiety and Stress Management for Women",
    category: "Mental Health",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    content: `Anxiety is the most common mental health condition worldwide, and women are diagnosed with anxiety disorders at roughly twice the rate of men. While some stress and anxiety is a normal, adaptive human experience, anxiety disorders cause significant suffering and impairment when they become chronic and disproportionate. Understanding anxiety — what it is, why women are particularly affected, and what actually helps — is essential knowledge.

UNDERSTANDING THE ANXIETY RESPONSE:
Anxiety is your brain and body's response to perceived threat. When you sense danger, your amygdala (the brain's alarm center) triggers the stress response: adrenaline and cortisol flood your system, heart rate and breathing increase, muscles tense, blood diverts to large muscles for fight or flight. This system evolved for genuine physical threats — a predator, an attacker — and is lifesaving in those situations.

The problem occurs when this system activates in response to perceived (but not actual) threats — a presentation at work, a conflict in a relationship, uncertainty about the future — and does so chronically. Chronic activation of the stress response causes physical damage (cardiovascular, immune, hormonal systems) and psychological suffering.

ANXIETY DISORDERS — TYPES AND SYMPTOMS:

Generalized Anxiety Disorder (GAD):
Excessive, difficult-to-control worry about multiple areas of life (work, health, finances, relationships) for 6+ months. Accompanied by: restlessness, fatigue, difficulty concentrating, irritability, muscle tension, sleep disturbance. Most common anxiety disorder in women.

Panic Disorder:
Recurrent unexpected panic attacks — sudden surge of intense fear with physical symptoms (racing heart, shortness of breath, chest pain, dizziness, tingling, feeling of unreality, fear of losing control or dying). Following attacks, persistent worry about future attacks and changes in behavior to avoid situations associated with attacks.

Social Anxiety Disorder:
Intense fear of social situations where one might be negatively evaluated, leading to avoidance. More than shyness — causes significant impairment in work, relationships and daily functioning.

Post-Traumatic Stress Disorder (PTSD):
Develops following exposure to traumatic events. Women are twice as likely to develop PTSD following trauma, partly because they experience more interpersonal trauma (sexual assault, domestic violence). Symptoms: intrusive memories and flashbacks, nightmares, hypervigilance, emotional numbing, avoidance of trauma reminders.

WHY WOMEN EXPERIENCE MORE ANXIETY:

Biological: Estrogen influences serotonin and amygdala reactivity. Women show stronger amygdala responses to emotional stimuli. Hormonal fluctuations across menstrual cycle significantly affect anxiety — many women report anxiety worsening premenstrually.

Psychological: Women tend to ruminate more (repetitive negative thinking) and engage in more self-criticism. Women are socialized to be attuned to others' emotional states — this interpersonal sensitivity increases anxiety vulnerability. Perfectionism — particularly common in high-achieving women — maintains anxiety.

Social: Women face genuine stressors that create anxiety: gender-based violence, economic insecurity, role overload, discrimination and social expectations of appearance and behavior.

EVIDENCE-BASED STRATEGIES FOR MANAGING ANXIETY:

Cognitive techniques from CBT:
• Thought challenging: Identify anxious thoughts and evaluate them for accuracy. Most anxious predictions do not come true. Ask: What is the evidence for and against this thought? What is the most realistic outcome?
• Decatastrophizing: When anxiety spirals to worst-case scenarios, reality-check by asking: If the worst happened, could I cope? (Usually yes.)
• Scheduling worry time: Rather than fighting intrusive anxious thoughts all day, designate 20 minutes daily as "worry time." When anxious thoughts arise at other times, write them down for the scheduled worry time. This creates cognitive distance from anxiety.

Physiological regulation:
• Diaphragmatic breathing: Slow, deep breathing activates the parasympathetic (rest and digest) nervous system. Breathe in for 4 counts, hold for 4, out for 6-8. Practice daily to build the skill.
• Progressive muscle relaxation: Systematically tense and release muscle groups throughout body — reduces physical anxiety symptoms.
• Cold water: Splashing cold water on face activates the dive reflex, reducing heart rate rapidly — useful during acute anxiety.
• Grounding techniques: 5-4-3-2-1 (name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste) — anchors anxious mind in present moment.

Lifestyle foundations:
• Exercise: Single most effective non-pharmacological intervention for anxiety. Even one exercise session reduces anxiety temporarily; regular exercise reduces baseline anxiety significantly.
• Sleep: Sleep deprivation dramatically worsens anxiety. Prioritize 7-9 hours.
• Caffeine reduction: Caffeine directly increases anxiety — reduce or eliminate coffee, tea and energy drinks.
• Alcohol: Short-term anxiety reduction followed by rebound anxiety — net effect worsens anxiety disorder.
• Mindfulness meditation: Regular practice changes amygdala reactivity and builds ability to observe anxious thoughts without being controlled by them. Start with 10 minutes daily using an app like Insight Timer (free).

WHEN TO SEEK PROFESSIONAL HELP:
Anxiety disorder treatment significantly improves quality of life. Seek help when anxiety: interferes with daily functioning, causes significant distress, leads you to avoid important activities or opportunities, or is accompanied by depression. Cognitive Behavioral Therapy (CBT) is the most effective psychological treatment — shown to be as effective as medication with more lasting effects. SSRIs and SNRIs are effective medications for anxiety disorders. Combination of therapy and medication is most effective for moderate-severe anxiety.`,
  },
  {
    title: "Healing from Trauma: A Guide for Survivors",
    category: "Mental Health",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800",
    content: `Trauma is one of the most profound and complex human experiences. Women experience disproportionately high rates of traumatic events, particularly interpersonal trauma — intimate partner violence, sexual assault, childhood abuse, trafficking. Understanding trauma responses as normal reactions to abnormal events — rather than weakness or pathology — is the foundation of healing.

WHAT IS TRAUMA?
Trauma is an emotional response to an overwhelming event or series of events that exceeds a person's capacity to cope. What constitutes trauma is subjective — the same event may be traumatic for one person and not another depending on prior experiences, available support, meaning-making and biological differences.

Trauma can result from: single incidents (accident, assault, natural disaster, medical crisis) or repeated experiences (ongoing domestic violence, childhood abuse, workplace harassment). Both can cause lasting psychological effects.

HOW TRAUMA AFFECTS THE BRAIN AND BODY:
When trauma occurs, the brain's fear circuit — amygdala, hippocampus and prefrontal cortex — becomes dysregulated. The hippocampus (which processes memories and context) may not properly encode the traumatic memory, leading to fragmented, intrusive recollections rather than a coherent narrative memory. The prefrontal cortex (rational thinking) becomes less able to regulate the amygdala's alarm responses. This explains why trauma survivors can feel in danger even in safe environments, and why traumatic memories feel present rather than past.

The body keeps score (to use Bessel van der Kolk's phrase) — trauma is stored not just psychologically but physically. Trauma survivors often experience: chronic pain, autoimmune conditions, gastrointestinal problems, sexual dysfunction, sleep disturbance and other physical symptoms that reflect the body's unresolved trauma responses.

TRAUMA RESPONSES — UNDERSTANDING YOUR REACTIONS:
Following trauma, people commonly experience:

Intrusion symptoms: Flashbacks (experiencing fragments of the trauma as if happening now), nightmares, distressing memories that arise involuntarily, intense psychological or physical distress when reminded of the trauma.

Avoidance: Avoiding thoughts, feelings, people, places, conversations or activities that remind you of the trauma. While protective short-term, avoidance maintains PTSD long-term by preventing natural processing.

Negative changes in cognition and mood: Inability to remember aspects of the trauma, persistent negative beliefs about self ("I am broken"), others ("No one can be trusted") or the world ("Nowhere is safe"), distorted blame of self, persistent negative emotions, diminished interest, feeling detached from others, inability to experience positive emotions.

Hyperarousal and reactivity: Irritability, angry outbursts, reckless or self-destructive behavior, hypervigilance, exaggerated startle response, concentration difficulties, sleep disturbance.

These responses are NOT signs of weakness. They are the brain and body trying to protect you from perceived ongoing threat — a reasonable response to an unreasonable experience.

PATHS TO HEALING:

Safety first: Healing cannot occur while the traumatic situation is ongoing. If you are currently in an unsafe relationship or situation, safety planning and access to support is the first priority.

Connection: Healing from trauma occurs in relationship. Social support from trusted people who listen without judgment, believe the survivor's experience and maintain consistent presence is one of the strongest predictors of recovery.

Understanding your trauma responses: Psychoeducation — learning about trauma's effects on brain and body — reduces shame and self-blame. When you understand that your symptoms are normal responses, you can relate to them with compassion rather than judgment.

Evidence-based trauma treatments:

Trauma-Focused Cognitive Behavioral Therapy (TF-CBT): Specifically designed for PTSD. Combines trauma processing, cognitive restructuring and behavioral approaches. Highly effective for PTSD.

EMDR (Eye Movement Desensitization and Reprocessing): Processes traumatic memories through bilateral stimulation while focusing on trauma memories. Robust evidence base; often produces faster results than traditional CBT for PTSD.

Somatic approaches: Body-based therapies including somatic experiencing and sensorimotor psychotherapy address the physical dimension of trauma storage. Yoga and other mindful movement practices are beneficial adjuncts.

WHAT DOESN'T HELP:
Avoiding trauma reminders indefinitely — while this reduces immediate distress, it prevents healing and maintains PTSD. Substance use — alcohol and drugs provide temporary relief but worsen PTSD over time and add additional problems. Isolating — while isolation protects from perceived threat, it removes the relational healing that is necessary for recovery.

SUPPORTING A TRAUMA SURVIVOR:
Believe her. Listen without judgment or questioning. Do not pressure her to talk in more detail than she wants to. Respect her boundaries and decisions about how and when to seek help. Maintain consistent, caring presence without taking over. Educate yourself about trauma to understand her responses. Take care of yourself — supporting trauma survivors can be emotionally demanding.

In Bangladesh, seek trauma-specialized support from: National Institute of Mental Health, One-Stop Crisis Centers, BNWLA, Naripokkho, or therapists trained in trauma-focused approaches.`,
  },
  {
    title: "Mindfulness and Meditation for Women's Mental Health",
    category: "Mental Health",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
    content: `Mindfulness — the practice of paying deliberate, non-judgmental attention to present-moment experience — has accumulated one of the strongest evidence bases in psychology for improving mental and physical health. Originally derived from Buddhist meditation traditions, mindfulness has been adapted into secular clinical programs with rigorous research demonstrating benefits for depression, anxiety, chronic pain, stress, emotional regulation and overall wellbeing.

WHAT MINDFULNESS IS AND ISN'T:
Mindfulness is NOT: Emptying your mind (thoughts are normal and continue; you simply relate to them differently), relaxation (though relaxation may be a byproduct), religious practice (though it has contemplative roots), stopping thinking.

Mindfulness IS: Intentional attention to present-moment experience (sensations, thoughts, emotions) with an attitude of curiosity and non-judgment; noticing when attention wanders and gently returning it to the present; relating to experience differently — with acceptance rather than resistance or avoidance.

THE SCIENCE OF MINDFULNESS:
Neuroscience research shows that regular mindfulness practice produces measurable changes in brain structure and function:
• Reduced amygdala reactivity — the brain's alarm center becomes less reactive to perceived threats
• Increased prefrontal cortex activity — improved regulation of emotional responses
• Increased gray matter density in areas associated with self-awareness, compassion and introspection
• Reduced activity in the default mode network — the "mind-wandering" network associated with rumination and depression
• Reduced cortisol (stress hormone) levels

These brain changes translate into: reduced anxiety and depression, improved emotional regulation, greater resilience to stress, enhanced focus and concentration, improved sleep quality and better relationship quality.

MINDFULNESS-BASED PROGRAMS:

MBSR (Mindfulness-Based Stress Reduction): 8-week program developed by Jon Kabat-Zinn at University of Massachusetts Medical School. The original clinical mindfulness program with the most research support. Involves formal practices (body scan, sitting meditation, mindful movement) and informal practices integrated into daily life.

MBCT (Mindfulness-Based Cognitive Therapy): Combines MBSR with cognitive therapy elements. Specifically designed to prevent depression relapse — as effective as antidepressants for preventing recurrence in people with three or more prior episodes.

CORE MINDFULNESS PRACTICES:

Breathing Meditation:
Sit comfortably with eyes closed or soft gaze downward. Bring attention to the physical sensations of breathing — the rise and fall of the chest or belly, the sensation of air entering and leaving nostrils. When the mind wanders (it will — this is normal), simply notice without judgment and gently return attention to the breath. Start with 5-10 minutes daily. Even this brief practice consistently produces benefits over 8 weeks.

Body Scan:
Lie down comfortably. Systematically move attention through the body from feet to head, spending time with each area, simply noticing sensations — warmth, tingling, tension, pressure — without trying to change them. Develops awareness of how emotions manifest physically and reduces the disconnection from body that is common in stress and trauma.

Mindful Movement:
Yoga, tai chi and mindful walking bring meditative awareness to movement. Particularly beneficial for trauma survivors as it reconnects body and mind in a safe, self-directed way.

RAIN Practice (for difficult emotions):
Recognize — what emotion or experience is present?
Allow — let it be here rather than trying to push it away
Investigate — what does it feel like in the body? What does this emotion believe?
Nurture — offer yourself the same compassion you would offer a struggling friend

Loving-Kindness Meditation (Metta):
Systematically cultivates compassion toward self and others through silent phrases: "May I be happy, may I be healthy, may I be safe, may I live with ease." Extends this to loved ones, neutral people, difficult people and all beings. Particularly beneficial for self-criticism, interpersonal difficulties and depression.

STARTING A MINDFULNESS PRACTICE:

Guidance for beginners:
• Start with just 5-10 minutes daily — consistency matters more than duration
• Use a guided meditation app: Insight Timer (free), Headspace, Calm, 10% Happier
• 10 Minute School and YouTube have some Bengali-language guided meditations
• Choose a consistent time — morning practice before daily demands is ideal for many
• Create a dedicated space — a corner with a cushion signals "this is practice time"
• Be patient and compassionate with yourself — the mind wandering is not failure; noticing and returning is the practice

INTEGRATING MINDFULNESS INTO DAILY LIFE:
Formal sitting practice is valuable, but mindfulness becomes most powerful when woven into everyday activities. Mindful eating — actually tasting your food, eating without screens. Mindful walking — feeling your feet on the ground, noticing your surroundings. Mindful listening — giving full attention to conversations. These informal practices cultivate present-moment awareness throughout the day.`,
  },
  {
    title: "Building Healthy Relationships and Setting Boundaries",
    category: "Mental Health",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800",
    content: `The quality of your relationships profoundly affects your mental health, physical health and life satisfaction. Research consistently shows that social connection is among the most powerful predictors of wellbeing — loneliness is as harmful to health as smoking 15 cigarettes daily. Yet many women struggle with identifying unhealthy relationship patterns, setting appropriate boundaries and building the kind of relationships that genuinely support their wellbeing.

CHARACTERISTICS OF HEALTHY RELATIONSHIPS:

Mutual respect: Each person's thoughts, feelings, boundaries and autonomy are respected. Neither person is belittled, dismissed or controlled.

Trust and honesty: Truthfulness, reliability and consistency. Both people do what they say they will do. Concerns can be raised without fear of overreaction.

Support and reciprocity: Both people give and receive emotional support, encouragement and practical help. Support is not one-directional.

Individual space and shared connection: Healthy relationships include both togetherness and individual autonomy. Both people maintain their own friendships, interests and activities.

Healthy conflict resolution: Disagreements occur in all relationships. In healthy relationships, conflicts are addressed through communication, compromise and problem-solving — not through contempt, stonewalling, criticism or defensiveness.

Safety: Physical, emotional and sexual safety. The relationship is free from violence, threats, coercion and manipulation.

RECOGNIZING UNHEALTHY RELATIONSHIP PATTERNS:

Control and possessiveness: Controlling who you see, where you go, what you wear, how you spend money. Jealousy framed as love. Checking your phone. Isolating you from family and friends.

Disrespect and belittling: Regular criticism, contempt, humiliation (privately or publicly), dismissal of your opinions and experiences, name-calling.

Manipulation: Gaslighting — making you doubt your perceptions and memory. Guilt-tripping. Emotional blackmail ("If you loved me, you would..."). Making you responsible for their emotions.

Hot and cold cycles: Alternating between intense affection (love-bombing) and withdrawal, criticism or coldness. This unpredictability creates anxiety and excessive focus on the relationship.

UNDERSTANDING BOUNDARIES:
A boundary is a limit that defines the edge of where you end and another person begins — what you will and won't accept in interactions. Healthy boundaries protect your wellbeing, values and sense of self.

Types of boundaries:
• Physical: Personal space, physical touch, privacy
• Emotional: How others speak to you, what emotional labor you are willing to do
• Time: How you spend your time, what demands you accommodate
• Energy: What you can commit to without depleting yourself
• Sexual: What sexual contact you consent to and in what circumstances
• Values: Behavior you are and aren't willing to engage in or witness

Common boundary difficulties for women:
Women are often socialized to prioritize relationships and others' needs over their own, to avoid conflict, to be accommodating and to define worth through care for others. These socializations make boundary-setting feel selfish, dangerous or impossible. In reality, clear boundaries improve relationships by creating clarity and preventing resentment.

HOW TO SET BOUNDARIES:

Step 1: Identify your limits. Notice when you feel resentful, taken advantage of, drained, uncomfortable or violated. These feelings signal a boundary is needed.

Step 2: Communicate clearly and directly. Be specific: "I'm not able to lend money" rather than vague hinting. Use "I" statements: "I need..." rather than "You always..."

Step 3: Be consistent. Boundaries only work when consistently maintained. If you set a boundary and then frequently make exceptions when pressured, the person learns that pressure works.

Step 4: Accept discomfort. Setting boundaries — especially with people who are used to you not having them — often creates conflict and guilt initially. This discomfort is normal and does not mean you're doing something wrong.

Step 5: Enforce consequences. If someone repeatedly violates a boundary despite clear communication, there must be a consequence — reduced contact, ending the interaction, leaving the relationship.

COMMUNICATION SKILLS FOR HEALTHIER RELATIONSHIPS:

Active listening: Give full attention, reflect back what you hear, ask clarifying questions, validate feelings even when you disagree with conclusions.

Assertive communication (not aggressive, not passive): Express your needs, opinions and feelings clearly and respectfully. "I feel... when... I need..."

Repair attempts: In all relationships, conflicts and misunderstandings occur. The ability to make and accept repair attempts — "I'm sorry, let me start over" — is one of the strongest predictors of relationship success.

WHEN TO SEEK SUPPORT:
Relationship difficulties — whether romantic, family or friendship — are a common reason people seek counseling. Individual therapy helps you understand patterns from earlier relationships that affect current ones. Couples therapy, when both partners are genuinely willing to change, can significantly improve relationship quality. If you are in a relationship involving violence or control, individual safety planning and support takes priority over couples therapy.`,
  },
  {
    title: "Self-Care for Women: Beyond Bubble Baths",
    category: "Mental Health",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800",
    content: `"Self-care" has become a cultural buzzword often trivialized as spa days and bubble baths — marketed primarily at women who already have time and money. Real self-care is something more fundamental, more challenging and more important: it is the ongoing practice of meeting your own physical, emotional, psychological and spiritual needs so that you have the capacity to live fully and, if you choose, to care for others.

WHY SELF-CARE IS PARTICULARLY CHALLENGING FOR WOMEN:
Women in Bangladesh and globally are socialized to put others' needs before their own — children, husbands, parents, in-laws, colleagues. Prioritizing your own needs can feel selfish, indulgent or even dangerous (in contexts where this contradicts social expectations). The result is that many women live in states of chronic depletion — running on empty, unable to be fully present for their own lives or the people they care about.

The oxygen mask principle applies: you cannot sustain care for others from a position of chronic self-neglect. Self-care is not selfish — it is the maintenance required to function well over time.

THE FOUNDATIONS OF GENUINE SELF-CARE:

PHYSICAL SELF-CARE:
Sleep: Most adults need 7-9 hours. Chronic sleep deprivation impairs every aspect of physical and mental functioning. Prioritizing sleep is one of the highest-leverage self-care acts.

Movement: Find forms of movement you genuinely enjoy — dance, walking, yoga, swimming, sports — rather than treating exercise as punishment. Regular enjoyable movement dramatically improves mood, energy, cognitive function and physical health.

Nutrition: Eat foods that genuinely nourish your body most of the time. This doesn't require perfectionism — it means paying attention to how food makes you feel and generally choosing foods that give you energy and vitality.

Medical care: Regular health check-ups, attending to health problems rather than ignoring them, taking prescribed medications — these are forms of self-care that women often deprioritize for others.

EMOTIONAL SELF-CARE:
Acknowledging feelings: Emotional self-care begins with noticing your feelings rather than suppressing or ignoring them. Unfelt feelings don't disappear — they surface as irritability, physical symptoms, sudden emotional overwhelm or behavioral problems.

Processing emotions: Journaling, talking with trusted friends or therapists, creative expression, movement — finding healthy outlets for emotional processing.

Compassionate self-talk: Many women relate to themselves with harshness they would never direct at a loved one. Notice your internal dialogue. Practice responding to your own struggles with the same kindness and understanding you would offer a friend.

Setting limits on emotional labor: Women often absorb others' emotional distress as if it were their own. You can care about someone without taking responsibility for managing their emotions.

PSYCHOLOGICAL SELF-CARE:
Mental stimulation: Reading, learning, creative engagement, problem-solving — activities that engage your mind promote psychological wellbeing and protect against cognitive decline.

Rest for your mind: Not all rest is sleep. Quiet time without demands — sitting in nature, gentle hobbies that absorb without stress, meditation — allows mental recovery.

Privacy and space: Having time and space that is fully your own — to think, feel, be without performing for anyone.

Sense of purpose and meaning: Engaging with activities and relationships aligned with your values and that contribute to something beyond yourself.

SOCIAL SELF-CARE:
Nurturing supportive relationships: Social connection is a biological need. Investing time and energy in relationships that genuinely support you — where you can be honest, be yourself and receive as well as give — is essential self-care.

Limiting draining relationships: You cannot completely avoid all difficult relationships, but you can be intentional about limiting time with people who consistently drain rather than support you.

Community: Belonging to a community — religious, neighborhood, professional, interest-based — provides a sense of connection and shared identity that supports wellbeing.

SPIRITUAL SELF-CARE (BROADLY DEFINED):
Spiritual self-care doesn't require religious practice — it refers to attention to meaning, purpose, values and connection to something larger than oneself. For many women, this includes religious practice. For others, it includes time in nature, creative practice, community service or contemplative practice.

PRACTICAL SELF-CARE WHEN TIME AND RESOURCES ARE LIMITED:
Many women genuinely have very limited time and money. Self-care doesn't require expensive products or extended leisure time. Micro self-care practices: 5 minutes of mindful breathing, a brief walk in sunlight, drinking a glass of water intentionally, one kind statement to yourself, stepping outside for fresh air, a moment of gratitude. These small acts, consistently practiced, build a foundation of self-care even in demanding circumstances.

Asking for help is self-care: Women often experience difficulty asking for help as a form of self-reliance but it is actually intelligent resource management. Allowing others to support you serves everyone.

OVERCOMING SELF-CARE BARRIERS:
"I don't have time." Self-care often creates time by improving energy, focus and efficiency. Start with 5-10 minutes daily. Examine whether time really isn't available or whether it's not being prioritized.

"It feels selfish." Replace "selfish" with "necessary maintenance." You are not a limitless resource. You require inputs to sustain outputs.

"I feel guilty." Guilt about meeting your own needs often comes from internalized messages that your needs matter less than others'. This is a socialized belief, not a fact. Challenge it.

Sustainable self-care is not a reward for completing everything else — it is integrated into the daily rhythm of your life as a non-negotiable foundation.`,
  },
  {
    title: "Postpartum Mental Health: Supporting New Mothers",
    category: "Mental Health",
    authorName: "SheVerse Team",
    image: "https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?w=800",
    content: `The postpartum period — the weeks and months following childbirth — is one of the most significant transitions in a woman's life. While often idealized, this period involves profound physical, hormonal, psychological and social changes that create significant mental health vulnerability. Postpartum mental health conditions are common, serious and treatable — yet stigma and lack of awareness prevent many women from receiving the help they need.

THE POSTPARTUM MENTAL HEALTH SPECTRUM:

Baby Blues (Postpartum Mood Disturbance):
Affects approximately 80% of new mothers. Begins within first few days after birth and resolves spontaneously within 2 weeks. Symptoms: tearfulness, mood swings, anxiety, irritability, sleep difficulty and feeling overwhelmed. Caused by dramatic drop in estrogen and progesterone following delivery. Requires support and rest, not medical treatment, unless symptoms persist beyond 2 weeks or become severe.

Postpartum Depression (PPD):
Affects 10-15% of new mothers worldwide; rates may be higher in Bangladesh due to additional stressors including domestic violence, poverty and lack of social support. Begins within the first 4 weeks but can develop up to 12 months postpartum. Symptoms mirror major depression: persistent sadness or emptiness, loss of interest in baby and other activities, sleep disturbance beyond what newborn care requires, appetite changes, feeling like a bad mother, withdrawal from family and friends, difficulty bonding with baby, thoughts of harming self or baby (requires immediate professional help). PPD is not a character flaw or indicator of bad motherhood. It is a medical condition requiring treatment.

Postpartum Anxiety:
Often overlooked but as common as PPD. Symptoms: constant worry about baby's health and safety, racing thoughts, physical tension, restlessness, difficulty sleeping even when baby sleeps. Can occur alongside depression or independently.

Postpartum PTSD:
Develops following traumatic birth experiences. Intrusive memories of the birth, nightmares, avoidance of reminders, hyperarousal. Women who experienced previous trauma, emergency procedures or felt out of control during labor are at higher risk.

Postpartum Psychosis:
Rare but a psychiatric emergency affecting 1-2 per 1000 new mothers. Rapid onset (usually within 2 weeks of birth). Symptoms: hallucinations (hearing or seeing things that aren't there), delusions, severe confusion, extreme mood swings, bizarre behavior. Requires immediate hospitalization. With appropriate treatment, most women recover fully.

RISK FACTORS FOR POSTPARTUM MENTAL HEALTH CONDITIONS:

Biological: History of depression or anxiety before or during pregnancy, previous postpartum mental health issues, thyroid dysfunction, hormonal sensitivity.

Psychological: Perfectionist personality, history of trauma, unrealistic expectations of motherhood.

Social: Lack of practical and emotional support, partner relationship difficulties, domestic violence, financial stress, social isolation, unwanted pregnancy, infant health problems, multiple births.

In Bangladeshi context: Early marriage and childbearing before readiness, poverty, domestic violence (which increases dramatically postpartum), mother-in-law conflicts, gender preference for male children affecting mother's experience, lack of mental health awareness.

IDENTIFYING AND RESPONDING TO POSTPARTUM MENTAL HEALTH CONDITIONS:

For mothers: Be honest with your doctor or midwife about how you are feeling. Use the Edinburgh Postnatal Depression Scale (EPDS) — a validated screening tool available online. If you are having thoughts of harming yourself or your baby, seek help immediately. Do not try to "push through" — PPD worsens without treatment.

For family members: Learn to recognize PPD symptoms. Validate the mother's experience without dismissing or minimizing. Provide practical support: cooking, household tasks, looking after older children so mother can rest. Ensure she has time to sleep. Accompany her to healthcare appointments. Watch for warning signs of postpartum psychosis — if present, seek emergency care immediately.

TREATMENT FOR PPD:

Psychotherapy: Cognitive Behavioral Therapy (CBT) and Interpersonal Therapy (IPT) are both highly effective for PPD. IPT particularly addresses the relational transitions of new motherhood.

Antidepressant medication: Safe and effective. Some SSRIs are considered safe during breastfeeding — sertraline and paroxetine are most studied. Discuss specific medications and risks with your doctor.

Social support: Robust evidence that social support — from partner, family, community and peer support groups — is both protective and therapeutic. Mother's groups (in-person or online) reduce isolation.

Practical support: Sleep is critical — family members helping with nighttime infant care even for a few nights can make a significant difference.

CULTURAL CONSIDERATIONS IN BANGLADESHI CONTEXT:
Traditional practices including the 40-day "shutikal" (confinement period following birth) with its emphasis on rest and family support actually align with evidence-based postpartum care recommendations, though practices vary enormously by family and region. Cultural attribution of PPD to supernatural causes or moral failing prevents help-seeking. Healthcare providers and community health workers need training to identify and respond to PPD. Increasing mental health literacy at community level normalizes seeking help.

PREVENTING AND SUPPORTING POSTPARTUM WELLBEING:
Antenatal: Identify risk factors during pregnancy and plan support. Screen for depression and anxiety during pregnancy — treat or monitor. Build support networks before birth.

Immediate postpartum: Maximize sleep whenever possible. Accept all offers of practical help. Lower expectations of productivity and housekeeping. Focus on basic self-care. Maintain connection with support people.

Ongoing: Regular check-ins with healthcare provider. Honest communication with partner about needs and challenges. Join mother's groups. Return to enjoyable activities gradually as capacity increases.

Every mother deserves support. Asking for help when struggling is not weakness — it is the most loving thing you can do for yourself and your baby.`,
  },
];
