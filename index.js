const express = require("express");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/webhook", (req, res) => {
  const welcomeMenu = `💪 *Welcome back!*

1️⃣ Check-in
2️⃣ My Details
3️⃣ Due Date
4️⃣ Workout Plan
5️⃣ Diet Plan

✍️ Reply with the option number.`;

  res.set("Content-Type", "text/xml");
  res.send(`
<Response>
  <Message>${welcomeMenu}</Message>
</Response>
`);
});

app.listen(5000, () => {
  console.log("🚀 Gym Bot running on port 5000");
});
