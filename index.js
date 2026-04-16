import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const userSessions = new Map();

const gymData = {
  name: "Birbhum Gym 💪",
  welcome: "Namaste bhai 💪\nWelcome to Birbhum Gym 🏋️‍♂️\n\nKya janna chahte ho?\n1️⃣ Fees\n2️⃣ Trial\n3️⃣ Timing\n4️⃣ Weight Loss Plan\n5️⃣ Join Now",
  fees: {
    monthly: 699,
    threeMonths: 1799,
    sixMonths: 2999,
    personalTraining: 2000
  },
  timing: {
    morning: "5 AM – 10 AM",
    evening: "4 PM – 10 PM",
    sunday: "Closed"
  },
  location: {
    address: "Birbhum Gym, Ilambazar"
  },
  trainers: [
    { name: "Raj Kumar", specialty: "Weight Loss & Cardio" },
    { name: "Samanta", specialty: "Muscle Gain & Strength" }
  ]
};

// Gemini 2.5 Flash Intent Detection
async function getGymIntent(userMessage) {
  try {
    // Using Gemini 2.5 Flash (available in your API)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 50,
      }
    });
    
    const prompt = `You are a smart gym support bot for Birbhum Gym. Only answer gym related questions. 
    Allowed intents: fees, trial, timing, weightloss, join, location, trainer, offer, diet, greeting
    If unrelated return: not_gym
    Return only one word.
    
    Message: ${userMessage}`;

    const result = await model.generateContent(prompt);
    const intent = result.response.text().trim().toLowerCase();
    console.log(`🤖 Gemini 2.5 Flash Intent: ${intent}`);
    return intent;
    
  } catch (error) {
    console.log("⚠️ Gemini 2.5 Flash error:", error.message);
    
    // Fallback to keyword matching if Gemini fails
    return getFallbackIntent(userMessage);
  }
}

// Fallback intent detection (keyword based)
function getFallbackIntent(userMessage) {
  const msg = userMessage.toLowerCase();
  
  if (msg.match(/fee|price|cost|kitna|rate|member|payment|₹|\b699\b|\b1799\b|\b2999\b/)) return "fees";
  if (msg.match(/trial|free|demo|try|test|sample/)) return "trial";
  if (msg.match(/timing|time|hour|open|close|morning|evening|schedule/)) return "timing";
  if (msg.match(/weight|loss|fat|reduce|slim|cardio|body|shape|fit/)) return "weightloss";
  if (msg.match(/join|register|sign|enroll|member|admission|new/)) return "join";
  if (msg.match(/location|address|where|place|area|ilambazar|birbhum/)) return "location";
  if (msg.match(/trainer|coach|expert|instructor|guide|raj|samanta/)) return "trainer";
  if (msg.match(/diet|food|meal|eat|breakfast|lunch|dinner|protein/)) return "diet";
  if (msg.match(/offer|discount|deal|special|sale|promo/)) return "offer";
  if (msg.match(/hi|hello|hey|namaste|greeting|good|morning/)) return "greeting";
  
  return "not_gym";
}

function sendFees() {
  return `💰 Birbhum Gym Fees\n\n━━━━━━━━━━━━━━━━━\n📌 Monthly: ₹${gymData.fees.monthly}\n📌 3 Months: ₹${gymData.fees.threeMonths}\n📌 6 Months: ₹${gymData.fees.sixMonths}\n━━━━━━━━━━━━━━━━━\n💪 Personal Training: ₹${gymData.fees.personalTraining}/month`;
}

function sendTiming() {
  return `⏰ Gym Timing\n\n━━━━━━━━━━━━━━━━━\n🌅 Morning: ${gymData.timing.morning}\n🌙 Evening: ${gymData.timing.evening}\n📅 Sunday: ${gymData.timing.sunday}\n━━━━━━━━━━━━━━━━━`;
}

function sendLocation() {
  return `📍 Location\n\n━━━━━━━━━━━━━━━━━\n${gymData.location.address}\n━━━━━━━━━━━━━━━━━`;
}

function sendTrainerInfo() {
  return `💪 Our Expert Trainers\n\n━━━━━━━━━━━━━━━━━\n1️⃣ ${gymData.trainers[0].name}\n   🎯 ${gymData.trainers[0].specialty}\n\n2️⃣ ${gymData.trainers[1].name}\n   🎯 ${gymData.trainers[1].specialty}\n━━━━━━━━━━━━━━━━━`;
}

function sendDiet() {
  return `🥗 Sample Diet Plan\n\n━━━━━━━━━━━━━━━━━\n🌅 Morning: Almond + Green tea\n☀️ Lunch: Roti + Dal + Salad\n🌙 Dinner: Paneer/Chicken + Vegetables\n━━━━━━━━━━━━━━━━━`;
}

function sendTrial() {
  return `🎯 FREE TRIAL OFFER!\n\n━━━━━━━━━━━━━━━━━\n✅ 1 din free trial available\n✅ Expert trainer guidance\n✅ All equipment access\n━━━━━━━━━━━━━━━━━\n\n📝 Apna naam aur number bhejo:\nExample: Raj 9876543210`;
}

function sendWeightLoss() {
  return `🔥 WEIGHT LOSS PLAN\n\n━━━━━━━━━━━━━━━━━\n💰 Price: ₹2000/month\n✅ Diet Plan Included\n✅ Personal Training Included\n✅ Cardio + Weight Training\n━━━━━━━━━━━━━━━━━`;
}

function sendOffer() {
  return `🎉 SPECIAL OFFER!\n\n━━━━━━━━━━━━━━━━━\n✨ Join for 6 months\n✨ Get 1 month FREE!\n✨ Save ₹${gymData.fees.sixMonths}\n━━━━━━━━━━━━━━━━━\n\n🏃‍♂️ Limited period offer!`;
}

function sendGreeting() {
  return gymData.welcome;
}

function sendNotGym() {
  return `❌ Sirf gym related questions ka answer milega bhai!\n\n${gymData.welcome}`;
}

async function handleGymSteps(userId, msg, session, res) {
  const phoneMatch = msg.match(/\d{10}/);
  const cleanName = msg.replace(/\d/g, "").trim();

  if (session.step === "collecting_join_details") {
    if (!session.data.name && cleanName.length > 2) {
      session.data.name = cleanName;
    }

    if (phoneMatch) {
      session.data.phone = phoneMatch[0];
      session.step = "main";

      return res.json({
        reply: `✅ WELCOME TO BIRBHUM GYM FAMILY! 🎉\n\n━━━━━━━━━━━━━━━━━\n👤 Name: ${session.data.name || "Guest"}\n📱 Phone: ${session.data.phone}\n━━━━━━━━━━━━━━━━━\n\n💪 Aapka registration complete ho gaya!\n📍 Aajao gym, pehla day free!\n\nKoi aur sawaal? 😊`
      });
    }

    return res.json({
      reply: "📝 Please send your details:\n━━━━━━━━━━━━━━━━━\n👤 Your Name\n📱 10 Digit Mobile Number\n━━━━━━━━━━━━━━━━━\n\nExample: Raj 9876543210"
    });
  }

  if (session.step === "collecting_trial_details") {
    if (!session.data.name && cleanName.length > 2) {
      session.data.name = cleanName;
    }

    if (phoneMatch) {
      session.data.phone = phoneMatch[0];
      session.step = "main";

      return res.json({
        reply: `🎯 FREE TRIAL CONFIRMED! 🎉\n\n━━━━━━━━━━━━━━━━━\n👤 ${session.data.name || "Guest"}\n📱 ${session.data.phone}\n━━━━━━━━━━━━━━━━━\n\n⏰ Timing: ${gymData.timing.morning}\n        or ${gymData.timing.evening}\n━━━━━━━━━━━━━━━━━\n\n🏃‍♂️ Kab aana chaoge? Aajao bhai!\n📍 ${gymData.location.address}`
      });
    }

    return res.json({
      reply: "🎯 FREE TRIAL ke liye:\n━━━━━━━━━━━━━━━━━\n👤 Apna naam\n📱 10 digit number\n━━━━━━━━━━━━━━━━━\n\nExample: Raj 9876543210"
    });
  }

  return res.json({
    reply: sendGreeting()
  });
}

// Main endpoint
app.post("/gym", async (req, res) => {
  try {
    const userMessage = req.body.message || "";
    const userId = req.body.userId || "anonymous";

    console.log(`\n📩 [${userId}]: ${userMessage}`);

    let session = userSessions.get(userId);

    if (!session) {
      session = { step: "main", data: {} };
      userSessions.set(userId, session);
    }

    if (session.step !== "main") {
      return handleGymSteps(userId, userMessage, session, res);
    }

    const intent = await getGymIntent(userMessage);
    console.log(`🎯 Intent: ${intent}`);

    switch (intent) {
      case "fees":
        return res.json({ reply: sendFees() });
      case "trial":
        session.step = "collecting_trial_details";
        return res.json({ reply: sendTrial() });
      case "timing":
        return res.json({ reply: sendTiming() });
      case "weightloss":
        return res.json({ reply: sendWeightLoss() });
      case "join":
        session.step = "collecting_join_details";
        return res.json({ reply: "🎉 Great choice bhai!\n\nApna naam aur number bhejo:\n\nExample: Raj 9876543210" });
      case "location":
        return res.json({ reply: sendLocation() });
      case "trainer":
        return res.json({ reply: sendTrainerInfo() });
      case "diet":
        return res.json({ reply: sendDiet() });
      case "offer":
        return res.json({ reply: sendOffer() });
      case "greeting":
        return res.json({ reply: sendGreeting() });
      default:
        return res.json({ reply: sendNotGym() });
    }

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ reply: "Server error! Please try again 💪" });
  }
});

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    let userMessage = "";
    let userId = "anonymous";
    
    if (req.body.entry?.[0]?.changes?.[0]?.value?.messages) {
      const message = req.body.entry[0].changes[0].value.messages[0];
      userMessage = message.text?.body || "";
      userId = message.from || "anonymous";
    } else if (req.body.message) {
      userMessage = req.body.message;
      userId = req.body.userId || "anonymous";
    }
    
    if (!userMessage) {
      return res.json({ reply: "Kuch likho bhai 💪" });
    }
    
    let session = userSessions.get(userId);
    
    if (!session) {
      session = { step: "main", data: {} };
      userSessions.set(userId, session);
    }
    
    if (session.step !== "main") {
      return handleGymSteps(userId, userMessage, session, res);
    }
    
    const intent = await getGymIntent(userMessage);
    let reply;
    
    switch (intent) {
      case "fees": reply = sendFees(); break;
      case "trial": session.step = "collecting_trial_details"; reply = sendTrial(); break;
      case "timing": reply = sendTiming(); break;
      case "weightloss": reply = sendWeightLoss(); break;
      case "join": session.step = "collecting_join_details"; reply = "🎉 Great choice! Send name and number:\nExample: Raj 9876543210"; break;
      case "location": reply = sendLocation(); break;
      case "trainer": reply = sendTrainerInfo(); break;
      case "diet": reply = sendDiet(); break;
      case "offer": reply = sendOffer(); break;
      case "greeting": reply = sendGreeting(); break;
      default: reply = sendNotGym();
    }
    
    return res.json({ reply });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ reply: "Server error!" });
  }
});

// Health check
app.get("/webhook", (req, res) => {
  res.json({ 
    success: true, 
    message: "💪 Birbhum Gym API is Live!",
    model: "Gemini 2.5 Flash",
    version: "2.0"
  });
});

app.get("/api/info", (req, res) => {
  res.json({ 
    success: true, 
    message: "💪 Birbhum Gym Backend is Live!", 
    gym: gymData.name,
    model: "Gemini 2.5 Flash",
    status: "Active"
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on ${PORT}`);
  console.log(`🤖 Using Gemini 2.5 Flash Model`);
  console.log(`📍 Endpoints:`);
  console.log(`   - POST http://localhost:${PORT}/gym`);
  console.log(`   - POST http://localhost:${PORT}/webhook`);
  console.log(`   - GET  http://localhost:${PORT}/api/info`);
  console.log(`\n💪 Birbhum Gym Bot with Gemini 2.5 Flash is Ready!\n`);
});
