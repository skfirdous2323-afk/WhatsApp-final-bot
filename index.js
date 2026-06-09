require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const cron = require("node-cron")
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// Supabase connect
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── Static Data ───────────────────────────


app.post("/webhook", async (req,res)=>{


console.log("BODY RECEIVED:");
console.log(JSON.stringify(req.body,null,2));

try{

const body=req.body;

if(body.object){

const message=
body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

if(message){

const from=message.from;

const text=message.text?.body;

console.log("Message:",text);

await axios.post(
`https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
{
messaging_product:"whatsapp",
to:from,
text:{
body:"Hello 👋 Thanks for your message"
}
},
{
headers:{
Authorization:`Bearer ${process.env.WHATSAPP_TOKEN}`,
"Content-Type":"application/json"
}
}
);

}

}

res.sendStatus(200);

}catch(err){

console.log(err.response?.data||err.message);

res.sendStatus(500);

}

});



const doctors = [
  { id: 1, name: 'Dr. Priya Sharma', speciality: 'Orthodontist', rating: 4.9 },
  { id: 2, name: 'Dr. Rahul Mehta', speciality: 'Endodontist', rating: 4.8 },
  { id: 3, name: 'Dr. Ananya Roy', speciality: 'Periodontist', rating: 4.7 },
  { id: 4, name: 'Dr. Vikram Das', speciality: 'Oral Surgeon', rating: 4.9 },
];

const services = [
  { id: 1, name: 'Dental Checkup', price: '₹500', duration: '30 min' },
  { id: 2, name: 'Teeth Cleaning', price: '₹1,200', duration: '45 min' },
  { id: 3, name: 'Root Canal', price: '₹4,500', duration: '90 min' },
  { id: 4, name: 'Teeth Whitening', price: '₹3,000', duration: '60 min' },
  { id: 5, name: 'Dental Implant', price: '₹18,000', duration: '120 min' },
];

const ALL_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','16:00',
];

// ── Helper ───────────────────────────────

function makeRef() {
  return 'SC-' + Math.floor(100000 + Math.random() * 900000);
}

// ── Routes ───────────────────────────────

// Home
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SmileCare API chal raha hai'
  });
});

// Doctors list
app.get('/api/doctors', (req, res) => {
  res.json({
    success: true,
    data: doctors
  });
});

// Services list
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    data: services
  });
});


// NEW: Frontend ko booked slots dene ke liye
app.get('/api/booked-slots', async (req, res) => {

  const { date, doctor_id } = req.query;

  if (!date || !doctor_id) {
    return res.status(400).json({
      success: false,
      message: 'date aur doctor_id chahiye'
    });
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('slot_time')
    .eq('slot_date', date)
    .eq('doctor_id', doctor_id)
    .neq('status', 'cancelled');

  if (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }

  res.json({
    success: true,
    data
  });
});


// Available slots
app.get('/api/slots', async (req, res) => {

  const { doctor_id, date } = req.query;

  if (!doctor_id || !date) {
    return res.status(400).json({
      success: false,
      message: 'doctor_id aur date dono chahiye'
    });
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('slot_time')
    .eq('doctor_id', doctor_id)
    .eq('slot_date', date)
    .neq('status', 'cancelled');

  if (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }

  const booked = data.map(r => r.slot_time);

const slots = ALL_SLOTS.map(t => ({
time: t,
status: booked.includes(t)
? "❌ Booked"
: "✅ Available",

available: !booked.includes(t)
}));




  res.json({
    success: true,
    data: {
      date,
      slots
    }
  });

});


// Appointment booking
app.post('/api/appointments', async (req, res) => {

  const {
    doctor_id,
    service_id,
    slot_date,
    slot_time,
    patient_name,
    patient_phone,
    patient_email,
    notes
  } = req.body;


  if (
    !doctor_id ||
    !service_id ||
    !slot_date ||
    !slot_time ||
    !patient_name ||
    !patient_phone ||
    !patient_email
  ) {
    return res.status(400).json({
      success: false,
      message: 'Sab fields bharna zaroori hai'
    });
  }


  const doctor = doctors.find(d => d.id == doctor_id);
  const service = services.find(s => s.id == service_id);

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor nahi mila'
    });
  }

  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service nahi mili'
    });
  }


  // UPDATED: single → maybeSingle
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctor_id)
    .eq('slot_date', slot_date)
    .eq('slot_time', slot_time)
    .neq('status', 'cancelled')
    .maybeSingle();


  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Ye slot already booked hai'
    });
  }


  const { data: saved, error } = await supabase
    .from('appointments')
    .insert([{
      booking_ref: makeRef(),
      doctor_id: Number(doctor_id),
      service_id: Number(service_id),
      doctor_name: doctor.name,
      service_name: service.name,
      price: service.price,
      patient_name,
      patient_phone,
      patient_email,
      notes: notes || '',
      slot_date,
      slot_time,
      status: 'confirmed'
    }])
    .select()
    .single();


  if (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }


  res.status(201).json({
    success: true,
    message: 'Appointment book ho gaya',
    data: saved
  });

});


// Booking details
app.get('/api/appointments/:ref', async (req, res) => {

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('booking_ref', req.params.ref.toUpperCase())
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      message: 'Booking nahi mili'
    });
  }

  res.json({
    success: true,
    data
  });

});


// Cancel appointment
app.patch('/api/appointments/:ref/cancel', async (req, res) => {

  const { data, error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled'
    })
    .eq('booking_ref', req.params.ref.toUpperCase())
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      message: 'Booking nahi mili'
    });
  }

  res.json({
    success: true,
    message: 'Appointment cancel ho gaya'
  });

});

// Common patient questions auto reply

app.post('/api/faq', (req, res) => {

  const { message } = req.body;

  if (!message) {
    return res.json({
      success: false,
      message: 'Question bhejo'
    });
  }

  const text = message.toLowerCase();

  let reply = "Maaf kijiye, mujhe samajh nahi aaya.";

  // Fees
  if (
    text.includes('fees') ||
    text.includes('price') ||
    text.includes('kitna')
  ) {
    reply =
      'Dental Checkup: ₹500\nTeeth Cleaning: ₹1200\nRoot Canal: ₹4500';
  }

  // Location
  else if (
    text.includes('location') ||
    text.includes('address') ||
    text.includes('kaha')
  ) {
    reply =
      'SmileCare Clinic, Bolpur, Birbhum, West Bengal';
  }

  // Timing
  else if (
    text.includes('timing') ||
    text.includes('time') ||
    text.includes('kab')
  ) {
    reply =
      'Clinic timing: 9:00 AM - 6:00 PM';
  }

  // Test required
  else if (
    text.includes('test') ||
    text.includes('report')
  ) {
    reply =
      'Doctor symptoms dekhkar batayenge agar koi test zaroori ho.';
  }

  res.json({
    success: true,
    reply
  });

});

// Reminder system




cron.schedule('*/59 * * * *', async () => {



  const today = new Date();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');

  const currentDate = `${yyyy}-${mm}-${dd}`;

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('slot_date', currentDate)
    .eq('status', 'confirmed');

  if (error) {
    console.log(error.message);
    return;
  }

  data.forEach(patient => {

    console.log(
      `Reminder:
Patient: ${patient.patient_name}
Phone: ${patient.patient_phone}
Time: ${patient.slot_time}`
    );

    // Yaha WhatsApp / SMS API add kar sakte ho
  });

});

// Emergency / urgent patient handler

app.post('/api/emergency', (req, res) => {

  const { message } = req.body;

  if (!message) {
    return res.json({
      success: false,
      message: 'Message chahiye'
    });
  }

  const text = message.toLowerCase();

  let reply =
    'Aapka message receive ho gaya. Clinic team jaldi contact karegi.';

  if (
    text.includes('pain') ||
    text.includes('emergency') ||
    text.includes('blood') ||
    text.includes('urgent') ||
    text.includes('bahut dard')
  ) {

    reply =
      'Aapka message urgent mark kiya gaya hai. Agar dard zyada hai ya bleeding ho rahi hai to nearest emergency care visit karein. Clinic khulte hi team contact karegi.';
  }

  res.json({
    success: true,
    urgent: true,
    reply
  });

});


// Main Menu API

app.get("/api/menu", (req, res) => {

res.json({
success: true,

data: [
{
id:1,
title:"📅 Book Appointment"
},
{
id:2,
title:"👨‍⚕️ Doctor Information"
},
{
id:3,
title:"❓ FAQ"
},
{
id:4,
title:"🚨 Emergency Help"
},
{
id:5,
title:"🕒 Clinic Timing"
},
{
id:6,
title:"📍 Location"
},
{
id:7,
title:"📋 My Appointments"
}
]

})

})

// Doctor list API

app.get("/api/select-doctor", (req,res)=>{

res.json({
success:true,
data:doctors.map(d=>({
id:d.id,
name:d.name,
speciality:d.speciality,
rating:d.rating
}))
})

})


// Service list API

app.get("/api/select-service", (req,res)=>{

res.json({
success:true,
data:services.map(s=>({
id:s.id,
name:s.name,
price:s.price,
duration:s.duration
}))
})

})

// Select Date API

app.get("/api/select-date", (req,res)=>{

const today = new Date()

const dates = []

for(let i=0;i<7;i++){

const d = new Date()

d.setDate(today.getDate()+i)

const yyyy = d.getFullYear()
const mm = String(d.getMonth()+1).padStart(2,"0")
const dd = String(d.getDate()).padStart(2,"0")

dates.push({
id:i+1,
label:i===0 ? "Today" : i===1 ? "Tomorrow" : d.toDateString(),
date:`${yyyy}-${mm}-${dd}`
})

}

res.json({
success:true,
data:dates
})

})



app.get("/webhook", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verify_token) {
    console.log("WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});







// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `SmileCare API chal raha hai → http://localhost:${PORT}`
  );
});
