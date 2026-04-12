import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// 🔥 MAIN WEBHOOK (Twilio ke liye)
app.post("/webhook", (req, res) => {
  const msg = (req.body.Body || "").toLowerCase();

  let reply = "Samajh nahi aaya 😅";

  if (msg.includes("hi")) {
    reply = "Namaste bhai! 💪 Gym join karna hai kya?";
  } 
  else if (msg.includes("yes")) {
    reply = "Great! 😊 Aapka naam kya hai?";
  } 
  else if (msg.includes("fees")) {
    reply = "Gym fees ₹500/month hai 💰";
  } 
  else if (msg.includes("timing")) {
    reply = "Morning: 6AM - 10AM\nEvening: 5PM - 10PM 🕒";
  }

  // Twilio format (IMPORTANT)
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${reply}</Message>
    </Response>
  `);
});

// 🔹 Home route (check server)
app.get("/", (req, res) => {
  res.send("Bot is live 🚀");
});

// 🔹 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
dotenv.config();
app.use(cors());
app.use(express.json());


// ============================================
// USER SESSIONS STORE (Har user ka data)
// ============================================
const userSessions = new Map();

// ============================================
// GYM DATA - Aapke diye gaye rates ke hisaab se
// ============================================
const gymData = {
    name: "Birbhum Gym 💪",
    welcome: "Namaste bhai 💪\nWelcome to Birbhum Gym 🏋️‍♂️\n\nKya janna chahte ho?\n1️⃣ Fees\n2️⃣ Trial\n3️⃣ Timing\n4️⃣ Weight Loss Plan\n5️⃣ Join Now",
    
    fees: {
        monthly: 699,
        threeMonths: 1799,
        sixMonths: 2999,
        personalTraining: 2000,
        offer: "🔥 First 10 members ke liye special discount!"
    },
    
    timing: {
        morning: "5 AM – 10 AM",
        evening: "4 PM – 10 PM",
        sunday: "Closed"
    },
    
    trial: {
        available: true,
        message: "🎯 Free Trial Available!\n\nAap 1 din free try kar sakte ho 💪\n\nTrial book karna hai?\nApna naam aur number bhejo 📱"
    },
    
    weightLossPlan: {
        price: 2000,
        features: [
            "✔️ Personal training",
            "✔️ Diet guidance",
            "✔️ Weekly progress check"
        ],
        message: "🔥 Weight Loss Plan Available!\n\n✔️ Personal training\n✔️ Diet guidance\n✔️ Weekly progress check\n\nPrice: ₹2000/month\n\nInterested ho?\n\"YES\" likho 💪"
    },
    
    trainers: [
        { name: "Raj Kumar", specialty: "Weight Loss & Cardio" },
        { name: "Samanta", specialty: "Muscle Gain & Strength" }
    ],
    
    location: {
        address: "Birbhum Gym, Ilambazar",
        mapLink: "https://maps.google.com/?q=Birbhum+Gym+Ilambazar"
    },
    
    offers: {
        first10Members: "First 10 member = lifetime discount",
        launchOffer: "Monthly: ₹499 – ₹799\n3 months: ₹1499\nPersonal training: ₹1500–₹3000/month"
    }
};

// ============================================
// MAIN SMART ROUTER FOR GYM
// ============================================
app.post("/gym", async (req, res) => {
    let userMessage = req.body.message || "";
    let userId = req.body.userId || "anonymous";
    
    console.log(`📩 [${userId}]: ${userMessage}`);
    
    // Get or create user session
    let session = userSessions.get(userId);
    if (!session) {
        session = {
            step: "main",
            data: {
                name: null,
                phone: null,
                interestedIn: null,
                trialBooked: false,
                joined: false
            }
        };
        userSessions.set(userId, session);
    }
    
    const msg = userMessage.toLowerCase().trim();
    
    // Check if user is in multi-step conversation
    if (session.step !== "main") {
        return await handleGymSteps(userId, msg, session, res);
    }
    
    // ============================================
    // INTENT DETECTION (Bina API Ke)
    // ============================================
    let intent = detectGymIntent(msg);
    console.log(`🎯 Intent: ${intent}`);
    
    // ============================================
    // RESPONSE BASED ON INTENT
    // ============================================
    
    // 1️⃣ FEES / PRICE
    if (intent === "fees" || intent === "price" || msg.includes("1") || msg.includes("fee")) {
        return res.json({
            reply: `💰 **Birbhum Gym Fees:**

Monthly: ₹${gymData.fees.monthly}
3 Months: ₹${gymData.fees.threeMonths}
6 Months: ₹${gymData.fees.sixMonths}

💪 Personal Training: ₹${gymData.fees.personalTraining}/month

${gymData.fees.offer}

Join karna hai kya? (Yes/No)`
        });
    }
    
    // 2️⃣ TRIAL
    else if (intent === "trial" || msg.includes("2") || msg.includes("trial")) {
        session.step = "collecting_trial_info";
        return res.json({
            reply: gymData.trial.message
        });
    }
    
    // 3️⃣ TIMING
    else if (intent === "timing" || msg.includes("3") || msg.includes("time")) {
        return res.json({
            reply: `⏰ **Gym Timing:**

Morning: ${gymData.timing.morning}
Evening: ${gymData.timing.evening}
Sunday: ${gymData.timing.sunday}

Aur kuch puchna hai?`
        });
    }
    
    // 4️⃣ WEIGHT LOSS PLAN
    else if (intent === "weightloss" || msg.includes("4") || msg.includes("weight") || msg.includes("loss")) {
        session.step = "waiting_for_yes_no";
        session.data.interestedIn = "weightloss";
        return res.json({
            reply: gymData.weightLossPlan.message
        });
    }
    
    // 5️⃣ JOIN NOW
    else if (intent === "join" || msg.includes("5") || msg.includes("join")) {
        session.step = "collecting_join_details";
        return res.json({
            reply: `Great bhai 💪

Apna details bhejo:
👤 Naam:
📱 Phone Number:

Hamari team aapse contact karegi 😊`
        });
    }
    
    // LOCATION
    else if (intent === "location" || msg.includes("location") || msg.includes("address") || msg.includes("kahan")) {
        return res.json({
            reply: `📍 **Location:**

${gymData.location.address}

Google Map link:
${gymData.location.mapLink}

Aaj hi visit karo 💪`
        });
    }
    
    // TRAINER INFO
    else if (intent === "trainer" || msg.includes("trainer") || msg.includes("coach")) {
        return res.json({
            reply: `💪 **Our Certified Trainers:**

👨‍🏫 **Raj Kumar** - ${gymData.trainers[0].specialty}
👩‍🏫 **Samanta** - ${gymData.trainers[1].specialty}

✔️ Muscle gain
✔️ Weight loss

Join karoge?`
        });
    }
    
    // OFFERS / DISCOUNT
    else if (intent === "offer" || msg.includes("offer") || msg.includes("discount")) {
        return res.json({
            reply: `🔥 **Special Offers:**

${gymData.offers.launchOffer}

${gymData.offers.first10Members}

Interested ho? Type "join" to get started! 💪`
        });
    }
    
    // DIET CHART
    else if (intent === "diet" || msg.includes("diet") || msg.includes("food") || msg.includes("khana")) {
        return res.json({
            reply: `🥗 **Sample Diet Chart:**

Morning: 4 soaked almonds + green tea
Breakfast: 2 egg whites + 1 brown bread
Lunch: 2 roti + 1 bowl dal + salad
Evening: 1 fruit + protein shake
Dinner: Grilled chicken/Paneer + vegetables

Want detailed diet plan? Type "YES" 💪`
        });
    }
    
    // YES / NO HANDLING
    else if (msg === "yes" || msg === "haan" || msg === "ha" || msg === "y") {
        if (session.data.interestedIn === "weightloss") {
            session.step = "collecting_weightloss_details";
            return res.json({
                reply: `Great bhai 💪

Apna details bhejo:
👤 Naam:
📱 Phone Number:

Hamari team aapse contact karegi weight loss plan ke liye 😊`
            });
        } else {
            session.step = "collecting_join_details";
            return res.json({
                reply: `Great bhai 💪

Apna details bhejo:
👤 Naam:
📱 Phone Number:

Hamari team aapse contact karegi 😊`
            });
        }
    }
    
    else if (msg === "no" || msg === "nahi" || msg === "n") {
        session.data.interestedIn = null;
        return res.json({
            reply: `Koi baat nahi bhai 💪

Aap kabhi bhi aa sakte ho. Koi aur help chahiye?

Type:
• fees - Membership price
• trial - Free trial book
• timing - Gym hours
• weightloss - Weight loss plan
• join - Join gym
• location - Our address`
        });
    }
    
    // GREETING / HI / HELP
    else if (intent === "greeting" || msg.includes("hi") || msg.includes("hello") || msg.includes("namaste")) {
        return res.json({
            reply: gymData.welcome
        });
    }
    
    // REMINDER / FOLLOW UP (For existing members)
    else if (intent === "reminder" || msg.includes("reminder") || msg.includes("payment")) {
        return res.json({
            reply: `💳 **Payment Link:**

Your membership payment link has been sent to your registered number.

📱 Need help? Call us at +91 98765 43210

💰 Reminder: Your membership will expire soon. Renew now for special discount!`
        });
    }
    
    // DEFAULT - Help Menu
    else {
        return res.json({
            reply: `❓ Bhai, main samjha nahi.

💪 **Type any of these:**

1️⃣ fees / price - Membership rates
2️⃣ trial - Free trial book
3️⃣ timing - Gym hours
4️⃣ weightloss - Weight loss plan
5️⃣ join - Join membership
📍 location - Our address
👨‍🏫 trainer - About trainers
🎁 offer - Current discounts
🥗 diet - Diet chart

Kya janna chahte ho?`
        });
    }
});

// ============================================
// MULTI-STEP CONVERSATION HANDLER
// ============================================
async function handleGymSteps(userId, msg, session, res) {
    
    // COLLECTING TRIAL INFO
    if (session.step === "collecting_trial_info") {
        // Check if user sent name and phone
        const hasName = msg.length > 2;
        const hasPhone = msg.match(/\d{10}/);
        
        if (!session.data.name && hasName && !hasPhone) {
            session.data.name = msg;
            return res.json({
                reply: `📱 Ab apna phone number bhejo (10 digits):
Example: 9876543210`
            });
        }
        
        if (!session.data.phone && hasPhone) {
            session.data.phone = msg.match(/\d{10}/)[0];
            session.trialBooked = true;
            session.step = "main";
            
            return res.json({
                reply: `✅ **Trial Booked Successfully!** ✅

👤 Name: ${session.data.name || "Guest"}
📱 Phone: ${session.data.phone}
⏰ Timing: ${gymData.timing.morning} or ${gymData.timing.evening}

📍 Location: ${gymData.location.address}

💪 Aap kab aana chahenge? Hamari team aapse call karegi.

Welcome to Birbhum Gym! 🏋️‍♂️`
            });
        }
        
        return res.json({
            reply: `Please send:
👤 Your Name
📱 10-digit Phone Number

Example: Raj Sharma, 9876543210`
        });
    }
    
    // COLLECTING JOIN DETAILS
    else if (session.step === "collecting_join_details") {
        // Parse name and phone from message
        const phoneMatch = msg.match(/\d{10}/);
        const nameMatch = msg.replace(/\d/g, "").trim();
        
        if (!session.data.name && nameMatch && nameMatch.length > 2) {
            session.data.name = nameMatch;
            if (phoneMatch) {
                session.data.phone = phoneMatch[0];
                session.joined = true;
                session.step = "main";
                
                return res.json({
                    reply: `✅ **Welcome to Birbhum Gym Family!** ✅

👤 Name: ${session.data.name}
📱 Phone: ${session.data.phone}

💰 **Membership Options:**
Monthly: ₹${gymData.fees.monthly}
3 Months: ₹${gymData.fees.threeMonths}
6 Months: ₹${gymData.fees.sixMonths}

💪 Personal Training: ₹${gymData.fees.personalTraining}/month

${gymData.fees.offer}

🎯 Payment link will be sent to your WhatsApp.

Aaj hi aake form fill karo! 📝

📍 Location: ${gymData.location.address}`
                });
            }
            return res.json({
                reply: `📱 Ab apna phone number bhejo (10 digits):
Example: 9876543210`
            });
        }
        
        if (!session.data.phone && phoneMatch) {
            session.data.phone = phoneMatch[0];
            session.joined = true;
            session.step = "main";
            
            return res.json({
                reply: `✅ **Thank you for joining!** ✅

👤 Name: ${session.data.name || "Guest"}
📱 Phone: ${session.data.phone}

💰 Membership: ₹${gymData.fees.monthly}/month

💪 Payment link and membership card details will be sent to your number.

📍 Visit us at: ${gymData.location.address}

Welcome bhai! 🏋️‍♂️`
            });
        }
        
        return res.json({
            reply: `Please send:
👤 Your Full Name
📱 10-digit Phone Number

Example: Raj Sharma, 9876543210`
        });
    }
    
    // COLLECTING WEIGHT LOSS DETAILS
    else if (session.step === "collecting_weightloss_details") {
        const phoneMatch = msg.match(/\d{10}/);
        const nameMatch = msg.replace(/\d/g, "").trim();
        
        if (!session.data.name && nameMatch && nameMatch.length > 2) {
            session.data.name = nameMatch;
            if (phoneMatch) {
                session.data.phone = phoneMatch[0];
                session.step = "main";
                
                return res.json({
                    reply: `✅ **Weight Loss Plan Enrolled!** ✅

👤 Name: ${session.data.name}
📱 Phone: ${session.data.phone}

🔥 **Your Weight Loss Package:**
• Personal training with ${gymData.trainers[0].name}
• Custom diet chart (will be sent on WhatsApp)
• Weekly progress check

💰 Price: ₹${gymData.weightLossPlan.price}/month

💪 Let's start your transformation journey!

📍 Report at: ${gymData.location.address}`
                });
            }
            return res.json({
                reply: `📱 Ab apna phone number bhejo (10 digits):`
            });
        }
        
        if (!session.data.phone && phoneMatch) {
            session.data.phone = phoneMatch[0];
            session.step = "main";
            
            return res.json({
                reply: `✅ **Weight Loss Plan Confirmed!** ✅

👤 Name: ${session.data.name || "Guest"}
📱 Phone: ${session.data.phone}

🥗 Diet chart will be sent to your WhatsApp.

💪 Personal trainer ${gymData.trainers[0].name} will guide you.

Let's crush your fitness goals! 🔥`
            });
        }
        
        return res.json({
            reply: `Please send:
👤 Your Full Name
📱 10-digit Phone Number

To start your weight loss journey! 💪`
        });
    }
    
    return res.json({
        reply: `❌ Something went wrong. Type "hi" to start over.`
    });
}

// ============================================
// INTENT DETECTION FUNCTION
// ============================================
function detectGymIntent(message) {
    
    // Fees / Price
    if (message.match(/fees|price|kitna|rate|membership cost|paise|charge|1|one/)) {
        return "fees";
    }
    
    // Trial
    if (message.match(/trial|free trial|try|demo|test|2|two/)) {
        return "trial";
    }
    
    // Timing
    if (message.match(/timing|time|hour|open|close|kab tak|kab se|3|three/)) {
        return "timing";
    }
    
    // Weight Loss
    if (message.match(/weight|loss|fat|reduce|slim|body|4|four/)) {
        return "weightloss";
    }
    
    // Join
    if (message.match(/join|member|admission|enroll|start|5|five/)) {
        return "join";
    }
    
    // Location
    if (message.match(/location|address|kahan|map|direction|ilambazar/)) {
        return "location";
    }
    
    // Trainer
    if (message.match(/trainer|coach|raj|samanta|instructor/)) {
        return "trainer";
    }
    
    // Offer
    if (message.match(/offer|discount|deal|sasta|bachat|first 10/)) {
        return "offer";
    }
    
    // Diet
    if (message.match(/diet|food|khana|meal|protein|chart/)) {
        return "diet";
    }
    
    // Reminder
    if (message.match(/reminder|payment|renew|expire|bill/)) {
        return "reminder";
    }
    
    // Greeting
    if (message.match(/hi|hello|namaste|hey|hola|bhai/)) {
        return "greeting";
    }
    
    return "unknown";
}

// ============================================
// GET USER SESSION (For debugging)
// ============================================
app.get("/session/:userId", (req, res) => {
    const userId = req.params.userId;
    const session = userSessions.get(userId);
    res.json({ session: session || null });
});

// ============================================
// GET ALL SESSIONS (Admin only - for testing)
// ============================================
app.get("/sessions", (req, res) => {
    const sessions = [];
    for (const [userId, session] of userSessions) {
        sessions.push({
            userId,
            step: session.step,
            data: session.data,
            trialBooked: session.trialBooked,
            joined: session.joined
        });
    }
    res.json({ sessions, count: sessions.length });
});

// ============================================
// RESET USER SESSION
// ============================================
app.post("/reset/:userId", (req, res) => {
    const userId = req.params.userId;
    userSessions.delete(userId);
    res.json({ success: true, message: `Session reset for ${userId}` });
});

// ============================================
// HEALTH CHECK ROUTE
// ============================================
app.get("/api/info", (req, res) => {
    res.json({
        success: true,
        message: "💪 Birbhum Gym Backend is Live!",
        time: new Date().toLocaleString(),
        gym: gymData.name
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`✅ Birbhum Gym Server running on port ${PORT}`);
    console.log(`💪 ${gymData.name}`);
    console.log(`📍 ${gymData.location.address}`);
});











