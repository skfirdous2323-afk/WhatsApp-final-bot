require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");



const app = express();
app.use(bodyParser.json());

// 🔑 Supabase connect
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ✅ Test API
app.get("/", (req, res) => {
  res.send("Server running 💪");
});

// 📥 GET all customers
app.get("/customers", async (req, res) => {
  const { data, error } = await supabase.from("customers").select("*");

  if (error) return res.json({ error });

  res.json(data);
});

// ➕ ADD customer
app.post("/customers", async (req, res) => {
  try {
    const { mobile, name, age, goal, plan } = req.body;

    if (!mobile) {
      return res.json({ error: "Mobile required" });
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase.from("customers").insert([
      {
        mobile_number: mobile,
        name,
        age,
        goal,
        plan,
        join_date: today
      }
    ]);

    if (error) return res.json({ error });

    res.json({ message: "Customer added ✅", data });

  } catch (err) {
    console.log(err);
    res.json({ error: "Server error" });
  }
});


app.post("/checkin", async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.json({ error: "Mobile required" });
    }

    const today = new Date().toISOString().split("T")[0];

    // 🔍 Check existing
    const { data: existing, error: checkError } = await supabase
      .from("attendance")
      .select("*")
      .eq("mobile_number", mobile)
      .eq("visit_date", today);

    if (checkError) {
      console.log("Check error:", checkError);
      return res.json({ error: "DB check error" });
    }

    // 🛡️ Safe check
    if (existing && existing.length > 0) {
      return res.json({ message: "Already checked-in today ✅" });
    }

    // ➕ Insert attendance
    const { error: insertError } = await supabase
      .from("attendance")
      .insert([{ mobile_number: mobile }]);


if (insertError) {
      console.log("Insert error:", insertError);
    return res.json({ error: "Insert failed" });



    }

    // 🔄 Update last visit
    await supabase
      .from("customers")
      .update({ last_visit_date: today })
      .eq("mobile_number", mobile);

    res.json({ message: "Check-in successful 💪" });

  } catch (err) {
    console.log(err);
    res.json({ error: "Server error" });
  }
});

// 🔥 IMPORTANT (VERIFY ROUTE)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "12345";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("VERIFY HIT"); // 👈 log check

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("SUCCESS");
    res.status(200).send(challenge);
  } else {
    console.log("FAILED");
    res.sendStatus(403);
  }
});

// POST route (baad me use hoga)
app.post("/webhook", (req, res) => {
  console.log("MSG:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(3000, () => console.log("RUNNING"));

// ➕ ADD workout
app.post("/workout", async (req, res) => {
  try {
    const { mobile, day, exercise, reps } = req.body;

    if (!mobile) {
      return res.json({ error: "Mobile required" });
    }

    // ✅ Direct insert (NO customer check)
    const { error } = await supabase
      .from("workouts")
      .insert([
        {
          mobile_number: mobile,
          day,
          exercise,
          reps
        }
      ]);

    if (error) {
      console.log(error);
      return res.json({ error: "Insert failed" });
    }

    res.json({ message: "Workout added 💪" });

  } catch (err) {
    console.log(err);
    res.json({ error: "Server error" });
  }
});







app.get("/workout/:mobile/:day", async (req, res) => {
  try {
    const { mobile, day } = req.params;

    console.log("API HIT:", mobile, day);

    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("mobile_number", mobile)
      .eq("day", day);

    if (error) {
      console.log("DB ERROR:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!data || data.length === 0) {
      return res.json({ message: "No workout found ❌" });
    }

    return res.json(data);

  } catch (err) {
    console.log("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});










// 🚀 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
