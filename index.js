import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";
import { MongoClient } from "mongodb";

dotenv.config();


const mongoClient = new MongoClient(process.env.MONGO_URI);

async function initMongo() {
  try {
    await mongoClient.connect();
    console.log("✅ MongoDB Connected");
    const db = mongoClient.db("chatbot");
    const conversations = db.collection("conversations");
    return conversations;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

const conversations = await initMongo();


// 🌍 Improved Translation Function with Fallback
async function translateText(text, targetLang = "en") {
  const urls = [
    "https://translate.astian.org/translate",
    "https://libretranslate.com/translate",
    "https://libretranslate.de/translate"
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "auto",
          target: targetLang,
          format: "text",
        }),
      });

      const data = await res.json();
      if (data.translatedText) return data.translatedText;
      throw new Error("Invalid response");
    } catch (err) {
      console.error(`⚠️ ${url} failed:`, err.message);
    }
  }

  console.error("❌ All translation APIs failed. Returning original text.");
  return text; // fallback to original
}


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });



// ✅ Test Route
app.get("/api/info", (req, res) => {
  res.json({
    success: true,
    message: "✅ Shopify Backend is Live!",
    time: new Date().toLocaleString(),
  });
});





// ✅ Orders Route
app.get("/orders", async (req, res) => {
  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE_URL}/admin/api/2025-01/orders.json`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});





app.post("/product", async (req, res) => {
  try {
    const userMessage = req.body.message?.toLowerCase() || "";

    // 🧠 Detect user intent
    const isBestProductQuery =
      userMessage.includes("best") ||
      userMessage.includes("top") ||
      userMessage.includes("popular") ||
      userMessage.includes("trending");

    const isLowToHigh = userMessage.includes("low to high");
    const isHighToLow = userMessage.includes("high to low");
    const isDiscount = userMessage.includes("discount") || userMessage.includes("offer");
    const isGift = userMessage.includes("gift");
    const isRandom = userMessage.includes("random") || userMessage.includes("surprise");

    // Extract price number if mentioned
    const priceMatch = userMessage.match(/\d+/);
    const priceLimit = priceMatch ? parseInt(priceMatch[0]) : null;

    // Detect category (e.g., kitchen, decor, etc.)
    const categoryKeywords = ["kitchen", "decor", "cleaner", "home", "office"];
    const detectedCategory = categoryKeywords.find((c) => userMessage.includes(c));

    // 🛍️ Fetch all products from Shopify
    const shopifyRes = await fetch(`${process.env.SHOPIFY_API_URL}/products.json`, {
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });

    const data = await shopifyRes.json();
    if (!data.products) return res.json({ reply: "❌ No products found." });

    let products = data.products.map((p) => {
      const variant = p.variants[0];
      return {
        title: p.title,
        price: parseFloat(variant.price),
        image: p.images?.[0]?.src || "",
        link: `https://${process.env.SHOPIFY_STORE_URL}/products/${p.handle}`,
        available: variant.available,
        updated_at: p.updated_at,
        tags: p.tags?.toLowerCase() || "",
      };
    });

    // ✅ Apply filters
    if (priceLimit) {
      products = products.filter((p) => p.price <= priceLimit);
    }

    if (detectedCategory) {
      products = products.filter((p) =>
        p.tags.includes(detectedCategory) || p.title.toLowerCase().includes(detectedCategory)
      );
    }

    if (isDiscount) {
      products = products.filter((p) => p.tags.includes("discount") || p.tags.includes("offer"));
    }

    if (isBestProductQuery) {
      products.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    if (isLowToHigh) {
      products.sort((a, b) => a.price - b.price);
    } else if (isHighToLow) {
      products.sort((a, b) => b.price - a.price);
    }

    // Show only first 5 for clean output (pagination base)
    products = products.slice(0, 5);

    // Random suggestion
    if (isRandom && products.length > 0) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      products = [randomProduct];
    }

    // If no products
    if (products.length === 0) {
      return res.json({
        reply:
          "😔 Sorry, no matching products found.\nTry another keyword or check our best deals 🔥",
      });
    }

// 🖼️ Create formatted reply
let replyText = "";

if (isGift) {
  replyText += "🎁 Here are some products perfect for gifting:\n\n";
} else if (isBestProductQuery) {
  replyText += "🌟 Our most popular & trending picks:\n\n";
} else if (isDiscount) {
  replyText += "💸 Products currently on discount:\n\n";
} else {
  replyText += "🛍️ Check out our top products below 👇\n\n";
}

// 💬 Create formatted text message
for (const p of products) {
  replyText += `✨ *${p.title}*\n💰 Price: ₹${p.price}\n🔗 ${p.link}\n`;
  if (!p.available) replyText += `⚠️ Currently Out of Stock\n`;
  replyText += `\n`;
}

res.json({
  reply: "🛍️ Check out our top products below 👇",
  products: products.map((p) => ({
    title: p.title,
    price: `₹${p.price}`,
    link: p.link,
    image: p.image,
    available: p.available ? "In Stock ✅" : "Out of Stock ❌",
    shortDescription: p.tags
      ? `Tags: ${p.tags.split(",").slice(0, 3).join(", ")}`
      : "Popular product",
  })),
  footer: "✨ More deals available on our store homepage!"
});



  } catch (err) {
    console.error("🧨 Product search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});





// ✅ Order Tracking Route (Enhanced)
app.post("/track", async (req, res) => {
  const mobile = req.body.mobile?.trim();

  if (!mobile) {
    return res.status(400).json({ error: "❌ Type only mobile number" });
  }

  try {
    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2025-01/orders.json?status=any`,
      {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    const orders = data.orders || [];

    // ✅ Allow partial match of mobile number (e.g., last 4 digits)
    const matchedOrders = orders.filter(
      (o) =>
        o.phone?.includes(mobile) ||
        o.shipping_address?.phone?.includes(mobile) ||
        o.note?.includes(mobile)
    );

    if (matchedOrders.length === 0) {
      return res.json({ message: "❌ No order found for this mobile number" });
    }

    // 🧠 Prepare AI-style reply for all matching orders
    let reply = `📱 Found ${matchedOrders.length} order(s) linked to this mobile:\n\n`;

    for (const order of matchedOrders) {
      let status = "Processing ⏳";
      if (order.fulfillment_status === "fulfilled") status = "Delivered ✅";
      else if (order.fulfillment_status === "partial") status = "Partially Shipped 📦";
      else if (order.fulfillment_status === "restocked") status = "Returned 🔁";
      else if (order.fulfillment_status === "pending") status = "Pending 🚀";

      // 🗓️ Calculate estimated delivery (3–5 days after created_at)
      const created = new Date(order.created_at);
      const deliveryDate = new Date(created);
      deliveryDate.setDate(created.getDate() + 4);
      const estDelivery = deliveryDate.toLocaleDateString("en-IN");

      reply += `🆔 Order #${order.id}\n👤 ${
        order.shipping_address?.name || "Customer"
      }\n💰 Total: ₹${order.total_price}\n📦 Status: ${status}\n🚚 Est. Delivery: ${estDelivery}\n🔗 Track: ${
        order.order_status_url || "Not available"
      }\n\n`;
    }

    // ✅ Return combined friendly reply
    res.json({ message: reply });
  } catch (error) {
    console.error("Error tracking order:", error);
    res.status(500).json({ error: "Failed to track order" });
  }
});



// ✅ FAQ / Return Policy Route
app.post("/faq", async (req, res) => {
  const userMessage = req.body.message?.toLowerCase() || "";
  let reply = "❓ Sorry, I didn’t understand your question.";

  if (userMessage.includes("return")) {
    reply = "🔁 You can request a return within 7 days of delivery. Click here: https://www.xefere.store/pages/return-policy";
  } else if (userMessage.includes("refund")) {
    reply = "💸 Refunds are processed within 3–5 business days after we receive your returned product.";
  } else if (userMessage.includes("cancel")) {
    reply = "🛑 You can cancel your order before it is shipped. Once shipped, cancellation isn’t possible.";
  } else if (userMessage.includes("track")) {
    reply = "🚚 To track your order, please provide your mobile number (e.g., Track 9876543210)";
  } else if (userMessage.includes("exchange")) {
    reply = "🔄 Exchange is available for damaged or defective products only within 7 days of delivery.";
  } else if (userMessage.includes("policy") || userMessage.includes("rules")) {
    reply = "📜 You can check our full return & refund policy here: https://www.xefere.store/pages/return-policy";
  } else if (userMessage.includes("help") || userMessage.includes("support")) {
    reply = "💬 Our support team is here to help! Email us at support@xefere.store or chat with us on WhatsApp.";
  }

  res.json({ reply });
});


// ✅ Super-Smart Router for Xefere Store
// SMART ROUTER
app.post("/smart", async (req, res) => {
  let userMessage = req.body.message || "";

  try {
    // Translate to English (fallback to original)
    try {
      userMessage = await translateText(userMessage, "en");
    } catch (err) {
      console.error("❌ Translation failed:", err);
    }

    // 🔍 Intent Detection
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `You are an intent classifier for Xefere Store. ` +
            `Reply EXACTLY one word: track, return, product, faq, chat.\n\n` +
            `Rules:\n` +
            `- "not received", "order not delivered", "missing", "kaha hai order" → track\n` +
            `- "return", "refund", "exchange" → return\n` +
            `- "price", "show items", "products", "list", "buy" → product\n` +
            `- "delivery time", "how many days", "shipping", "policy" → faq\n` +
            `- Name, greeting, personal chat → chat\n` +
            `- If user sends phone number → track`
        },
        { role: "user", content: userMessage }
      ]
    });

    const intent =
      completion.choices?.[0]?.message?.content?.trim().toLowerCase() ||
      "chat";

    console.log("🧭 Detected Intent:", intent);

    let finalReply = "";

    // 📦 TRACK
    if (intent === "track") {
      const mobile = userMessage.replace(/\D/g, "");

      if (!mobile) {
        return res.json({
          reply: "📱 Please enter your mobile number to track order."
        });
      }

      const trackRes = await fetch(`${process.env.BASE_URL}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile })
      });

      const data = await trackRes.json();
      return res.json({
        reply: data.message || data.error || "No tracking info found."
      });
    }

    // 🔁 RETURN REQUEST
    else if (intent === "return") {
      return res.json({
        reply:
          "🔁 To return your order, please share the mobile number used during purchase."
      });
    }

    // 🛍️ PRODUCT SEARCH
    else if (intent === "product") {
      const productRes = await fetch(`${process.env.BASE_URL}/product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await productRes.json();

      if (data.products && data.products.length > 0) {
        const replyText =
          "🛍️ Here are the best products based on your search:\n\n" +
          data.products
            .map(
              (p) =>
                `✨ *${p.title}*\n💰 Price: ₹${p.price}\n🔗 ${p.link}\n${
                  p.available ? "" : "⚠️ Out of Stock"
                }\n`
            )
            .join("\n");

        return res.json({
          reply: replyText,
          products: data.products
        });
      }

      return res.json({
        reply: data.reply || "No matching products found."
      });
    }

    // ❓ FAQ
    else if (intent === "faq") {
      const faqRes = await fetch(`${process.env.BASE_URL}/faq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await faqRes.json();
      return res.json({
        reply: data.reply || "No FAQ found for this question."
      });
    }

    // 💬 GENERAL CHAT
    else {
      const chatRes = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              `You are Xefere Store Assistant.\n` +
              `- Answer greetings and personal questions politely.\n` +
              `- For order/return/tracking questions, guide the user.\n` +
              `- Keep messages short, friendly, and emoji-rich.\n` +
              `- Do NOT show products unless requested.`
          },
          { role: "user", content: userMessage }
        ]
      });

      finalReply =
        chatRes.choices?.[0]?.message?.content ||
        "😊 How can I assist you today?";
    }
await conversations.insertOne({
  userMessage: userMessage,
  botReply: finalReply,
  intent: intent,
  timestamp: new Date()
});
    return res.json({ reply: finalReply });



  } catch (err) {

    console.error("🔥 Smart Router Error:", err);
    res.status(500).json({
      error: "Smart router failed. Try again later."
    });
  }
});




 // ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});








