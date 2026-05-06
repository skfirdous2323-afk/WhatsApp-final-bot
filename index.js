require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(bodyParser.json());

// ðŸ”‘ Supabase connect
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ“¤ HELPER: Send WhatsApp message
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function sendWhatsApp(to, message) {
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) console.error("WhatsApp send error:", data);
  return data;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ¤– HELPER: Handle incoming WhatsApp messages
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function handleIncomingMessage(from, text) {
  const lower = text.toLowerCase().trim();

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ðŸ“‹ MENU / HELP  (hi, hello, menu, help, à¤®à¥‡à¤¨à¥‚)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (
    lower === "hi" || lower === "hello" || lower === "help" ||
    lower === "menu" || lower === "à¤®à¥‡à¤¨à¥‚" || lower === "à¤®à¤¦à¤¦"
  ) {
    return sendWhatsApp(from,
`ðŸ‹ï¸ *GYM BOT MENU* ðŸ‹ï¸
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
1ï¸âƒ£  *checkin*         â€“ Aaj ki attendance
2ï¸âƒ£  *history*         â€“ Pichle visits ki history
3ï¸âƒ£  *status*          â€“ Apni profile dekho
4ï¸âƒ£  *workout* <day> <exercise> <reps>
       Ex: workout leg squat 3x10
5ï¸âƒ£  *payment*         â€“ Payment status dekho
6ï¸âƒ£  *due*             â€“ Payment due check karo
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ‡®ðŸ‡³ *Hindi mein bhi type kar sakte ho:*
â€¢ *à¤šà¥‡à¤•à¤¿à¤¨*    â€¢ *à¤¹à¤¿à¤¸à¥à¤Ÿà¥à¤°à¥€*
â€¢ *à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸*   â€¢ *à¤ªà¥‡à¤®à¥‡à¤‚à¤Ÿ*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Type any command to start! ðŸ’ª`
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // âœ… CHECK-IN  (checkin / à¤šà¥‡à¤•à¤¿à¤¨)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (lower === "checkin" || lower === "check in" || lower === "à¤šà¥‡à¤•à¤¿à¤¨") {
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("mobile_number", from)
      .eq("visit_date", today);

    if (existing && existing.length > 0) {
      return sendWhatsApp(from,
        "âœ… *Aaj aap check-in kar chuke ho!*\nKeep grinding ðŸ’ª\n_(You already checked in today)_"
      );
    }

    const { error } = await supabase
      .from("attendance")
      .insert([{ mobile_number: from, visit_date: today }]);

    if (error) {
      console.error("Attendance insert error:", error);
      return sendWhatsApp(from, "âŒ Check-in fail hua. Dobara try karo.");
    }

    await supabase
      .from("customers")
      .update({ last_visit_date: today })
      .eq("mobile_number", from);

    // Count visits this month
    const monthStart = today.slice(0, 7) + "-01";
    const { data: monthData } = await supabase
      .from("attendance")
      .select("*")
      .eq("mobile_number", from)
      .gte("visit_date", monthStart);

    const totalThisMonth = monthData ? monthData.length : 1;

    return sendWhatsApp(from,
`ðŸ’ª *Check-in Successful!*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“… Date: ${today}
ðŸ”¥ Is mahine aaye: *${totalThisMonth} din*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Aaj ka workout killer karo! ðŸ‹ï¸`
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ðŸ“… ATTENDANCE HISTORY  (history / à¤¹à¤¿à¤¸à¥à¤Ÿà¥à¤°à¥€)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (lower === "history" || lower === "attendance" || lower === "à¤¹à¤¿à¤¸à¥à¤Ÿà¥à¤°à¥€") {
    const { data: visits, error } = await supabase
      .from("attendance")
      .select("visit_date")
      .eq("mobile_number", from)
      .order("visit_date", { ascending: false })
      .limit(10);

    if (error || !visits || visits.length === 0) {
      return sendWhatsApp(from,
        "ðŸ“­ *Koi attendance record nahi mila.*\nPehle *checkin* type karo! ðŸ’ª"
      );
    }

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthVisits = visits.filter(v => v.visit_date.startsWith(thisMonth));

    const lines = visits
      .map((v, i) => `${i + 1}. ðŸ“… ${v.visit_date}`)
      .join("\n");

    return sendWhatsApp(from,
`ðŸ“Š *Aapki Attendance History*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
${lines}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“† Is mahine total: *${monthVisits.length} din*
Keep it up! ðŸ”¥`
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ðŸ‘¤ STATUS  (status / à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (lower === "status" || lower === "my status" || lower === "à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸") {
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("mobile_number", from)
      .single();

    if (!customer) {
      return sendWhatsApp(from,
        "âŒ *Aap registered nahi ho.*\nGym counter pe jaake register karwa lo."
      );
    }

    const thisMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: monthData } = await supabase
      .from("attendance")
      .select("*")
      .eq("mobile_number", from)
      .gte("visit_date", thisMonth);

    const monthCount = monthData ? monthData.length : 0;

    return sendWhatsApp(from,
`ðŸ‘¤ *Aapki Profile*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ·ï¸  Naam: *${customer.name}*
ðŸŽ‚  Umar: ${customer.age || "N/A"}
ðŸŽ¯  Goal: ${customer.goal || "N/A"}
ðŸ“‹  Plan: ${customer.plan || "N/A"}
ðŸ“…  Join Date: ${customer.join_date}
ðŸ•  Last Visit: ${customer.last_visit_date || "N/A"}
ðŸ”¥  Is mahine aaye: *${monthCount} din*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ’ª Mehnat karte raho!`
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ðŸ’° PAYMENT STATUS  (payment / à¤ªà¥‡à¤®à¥‡à¤‚à¤Ÿ)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (lower === "payment" || lower === "pay" || lower === "à¤ªà¥‡à¤®à¥‡à¤‚à¤Ÿ") {
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("mobile_number", from)
      .order("payment_date", { ascending: false })
      .limit(1)
      .single();

    if (!payment) {
      return sendWhatsApp(from,
        "ðŸ’³ *Koi payment record nahi mila.*\nGym counter pe contact karo."
      );
    }

    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    let statusMsg = "";
    if (daysLeft < 0) {
      statusMsg = `âš ï¸ *Payment ${Math.abs(daysLeft)} din se OVERDUE hai!*`;
    } else if (daysLeft <= 5) {
      statusMsg = `ðŸ”” *Sirf ${daysLeft} din baaki! Jaldi renew karo.*`;
    } else {
      statusMsg = `âœ… *Plan active hai. ${daysLeft} din baaki hain.*`;
    }

    return sendWhatsApp(from,
`ðŸ’° *Payment Status*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“‹  Plan: ${payment.plan || "N/A"}
ðŸ’µ  Amount: â‚¹${payment.amount || "N/A"}
ðŸ“…  Last Payment: ${payment.payment_date}
ðŸ“†  Due Date: ${payment.due_date}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
${statusMsg}`
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ðŸ’¸ DUE CHECK  (due / à¤¬à¤•à¤¾à¤¯à¤¾)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (lower === "due" || lower === "due kitna" || lower === "à¤¬à¤•à¤¾à¤¯à¤¾") {
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("mobile_number", from)
      .order("payment_date", { ascending: false })
      .limit(1)
      .single();

    if (!payment) {
      return sendWhatsApp(from,
        "ðŸ’³ *Koi payment record nahi mila.*\nGym counter pe contact karo."
      );
    }

    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft >= 0) {
      return sendWhatsApp(from,
        `âœ… *Koi due nahi hai!*\nAapka plan ${daysLeft} din aur valid hai. ðŸŽ‰`
      );
    }

    return sendWhatsApp(from,
`âš ï¸ *PAYMENT DUE!*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ“†  Due Date thi: ${payment.due_date}
âŒ  Aap *${Math.abs(daysLeft)} din* late ho
ðŸ’µ  Amount: â‚¹${payment.amount || "N/A"}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Jaldi gym counter pe payment karo! ðŸ™`
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ðŸ‹ï¸ WORKOUT LOG  (workout leg squat 3x10)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (lower.startsWith("workout")) {
    const parts = text.trim().split(/\s+/);
    if (parts.length < 4) {
      return sendWhatsApp(from,
`ðŸ“‹ *Workout format sahi nahi hai.*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
âœ… Sahi format:
*workout <day> <exercise> <reps>*

ðŸ“Œ Examples:
â€¢ workout leg squat 3x10
â€¢ workout chest benchpress 4x8
â€¢ workout back pullup 3x12`
      );
    }

    const [, day, exercise, reps] = parts;
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("workouts")
      .insert([{ mobile_number: from, day, exercise, reps, workout_date: today }]);

    if (error) {
      console.error("Workout insert error:", error);
      return sendWhatsApp(from, "âŒ Workout save nahi hua. Dobara try karo.");
    }

    return sendWhatsApp(from,
`âœ… *Workout Saved!*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ—“ï¸  Day: ${day}
ðŸ‹ï¸  Exercise: ${exercise}
ðŸ”  Reps: ${reps}
ðŸ“…  Date: ${today}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Shabash! Beast mode ON ðŸ”¥`
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â“ DEFAULT â€” unknown command
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return sendWhatsApp(from,
    `â“ *Samajh nahi aaya.*\n*menu* ya *help* type karo to sab commands dekho! ðŸ’ª`
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”” PAYMENT REMINDER CRON JOB
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function sendPaymentReminders() {
  console.log("ðŸ”” Running payment reminders...");

  const today = new Date();

  const { data: payments, error } = await supabase
    .from("payments")
    .select("mobile_number, plan, amount, due_date");

  if (error || !payments) {
    console.error("Reminder fetch error:", error);
    return;
  }

  let sent = 0;
  for (const p of payments) {
    const dueDate = new Date(p.due_date);
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Remind at 3 days, 1 day before, and overdue (up to 7 days)
    if (daysLeft === 3 || daysLeft === 1 || (daysLeft < 0 && daysLeft >= -7)) {
      let msg = "";

      if (daysLeft === 3) {
        msg =
`ðŸ”” *Payment Reminder!*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Aapka gym plan *3 din mein expire* hoga!
ðŸ“‹ Plan: ${p.plan}
ðŸ’µ Amount: â‚¹${p.amount}
ðŸ“† Due: ${p.due_date}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Jaldi renew karo! ðŸ™`;
      } else if (daysLeft === 1) {
        msg =
`âš ï¸ *Kal Payment Due Hai!*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Aapka plan *kal expire* ho raha hai!
ðŸ’µ Amount: â‚¹${p.amount}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Aaj hi counter pe aa jaao! ðŸƒ`;
      } else {
        msg =
`ðŸš¨ *Payment OVERDUE!*
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Aapka payment *${Math.abs(daysLeft)} din* se due hai!
ðŸ’µ Amount: â‚¹${p.amount}
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Turant gym counter pe payment karo! ðŸ™`;
      }

      await sendWhatsApp(p.mobile_number, msg);
      sent++;
    }
  }

  console.log(`âœ… Reminders sent: ${sent}`);
}

// Run reminders every 24 hours
setInterval(sendPaymentReminders, 86400000);
// Run once on startup after 5 seconds
setTimeout(sendPaymentReminders, 5000);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REST API ROUTES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

app.get("/", (req, res) => res.send("ðŸ‹ï¸ Gym Bot Server Running ðŸ’ª"));

// ðŸ“¥ GET all customers
app.get("/customers", async (req, res) => {
  const { data, error } = await supabase.from("customers").select("*");
  if (error) return res.json({ error });
  res.json(data);
});

// âž• ADD customer
app.post("/customers", async (req, res) => {
  try {
    const { mobile, name, age, goal, plan } = req.body;
    if (!mobile) return res.json({ error: "Mobile required" });

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase.from("customers").insert([
      { mobile_number: mobile, name, age, goal, plan, join_date: today },
    ]);

    if (error) return res.json({ error });
    res.json({ message: "Customer added âœ…", data });
  } catch (err) {
    console.error(err);
    res.json({ error: "Server error" });
  }
});

// ðŸ“… Manual check-in (REST)
app.post("/checkin", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.json({ error: "Mobile required" });

    const today = new Date().toISOString().split("T")[0];

    const { data: existing, error: checkError } = await supabase
      .from("attendance")
      .select("*")
      .eq("mobile_number", mobile)
      .eq("visit_date", today);

    if (checkError) return res.json({ error: "DB check error" });
    if (existing && existing.length > 0)
      return res.json({ message: "Already checked-in today âœ…" });

    const { error: insertError } = await supabase
      .from("attendance")
      .insert([{ mobile_number: mobile, visit_date: today }]);

    if (insertError) return res.json({ error: "Insert failed" });

    await supabase
      .from("customers")
      .update({ last_visit_date: today })
      .eq("mobile_number", mobile);

    res.json({ message: "Check-in successful ðŸ’ª" });
  } catch (err) {
    console.error(err);
    res.json({ error: "Server error" });
  }
});

// ðŸ‹ï¸ ADD workout (REST)
app.post("/workout", async (req, res) => {
  try {
    const { mobile, day, exercise, reps } = req.body;
    if (!mobile) return res.json({ error: "Mobile required" });

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("workouts")
      .insert([{ mobile_number: mobile, day, exercise, reps, workout_date: today }]);

    if (error) return res.json({ error: "Insert failed" });
    res.json({ message: "Workout added ðŸ’ª" });
  } catch (err) {
    console.error(err);
    res.json({ error: "Server error" });
  }
});

// ðŸ’° ADD payment record (admin use)
app.post("/payment", async (req, res) => {
  try {
    const { mobile, plan, amount, due_date } = req.body;
    if (!mobile || !due_date) return res.json({ error: "Mobile and due_date required" });

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("payments").insert([
      { mobile_number: mobile, plan, amount, payment_date: today, due_date },
    ]);

    if (error) return res.json({ error });
    res.json({ message: "Payment recorded âœ…" });
  } catch (err) {
    console.error(err);
    res.json({ error: "Server error" });
  }
});

// ðŸ“Š GET attendance history (REST)
app.get("/attendance/:mobile", async (req, res) => {
  const { mobile } = req.params;
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("mobile_number", mobile)
    .order("visit_date", { ascending: false });

  if (error) return res.json({ error });
  res.json(data);
});

// ðŸ”” Manually trigger reminders (admin)
app.post("/send-reminders", async (req, res) => {
  await sendPaymentReminders();
  res.json({ message: "Reminders sent âœ…" });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ”¥ WHATSAPP WEBHOOK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "12345";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("âœ… Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.log("âŒ Webhook verification failed");
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return res.sendStatus(404);

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return res.sendStatus(200);

    const msg = messages[0];
    const from = msg.from;
    const text = msg.text?.body;

    if (!text) return res.sendStatus(200);

    console.log(`ðŸ“¨ Message from ${from}: ${text}`);
    await handleIncomingMessage(from, text);

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸš€ START SERVER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app.listen(3000, () => console.log("ðŸš€ Gym Bot running on port 3000"));




