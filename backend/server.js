// backend/server.js
const express = require("express");
const cors = require("cors");
const db = require("./db"); // your MySQL connection
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 5000;

app.use(cors({ origin: "*" })); // allow all origins (Docker friendly)
app.use(express.json());

// Serve tickets folder
app.use("/tickets", express.static(path.join(__dirname, "tickets")));

// Root
app.get("/", (req, res) => {
  res.send("Flight Booking Backend Running");
});

// =======================
// 1️⃣ Authentication
// =======================

// Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  try {
    const hashed = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed],
      (err, result) => {
        if (err) return res.status(400).json({ error: "Email already exists" });

        const user_id = result.insertId;

        // Initialize wallet
        db.query(
          "INSERT INTO wallet (user_id, balance) VALUES (?, ?)",
          [user_id, 50000],
          (err2) => {
            if (err2) console.error("Wallet init error:", err2.message);
            res.json({
              message: "User registered successfully",
              user: { id: user_id, name, email },
            });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "All fields required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ error: "User not found" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

    res.json({ message: "Login successful", user: { id: user.id, name: user.name, email: user.email } });
  });
});

// =======================
// 2️⃣ Flights
// =======================
app.get("/flights", (req, res) => {
  let { departure_city, arrival_city, sort_by, order } = req.query;
  let query = "SELECT * FROM flights WHERE 1=1";
  const params = [];

  if (departure_city) {
    departure_city = `%${departure_city}%`;
    query += " AND LOWER(departure_city) LIKE LOWER(?)";
    params.push(departure_city);
  }
  if (arrival_city) {
    arrival_city = `%${arrival_city}%`;
    query += " AND LOWER(arrival_city) LIKE LOWER(?)";
    params.push(arrival_city);
  }

  const sortableFields = ["current_price", "departure_time", "arrival_time", "airline"];
  if (sort_by && sortableFields.includes(sort_by)) {
    order = order && order.toLowerCase() === "desc" ? "DESC" : "ASC";
    query += ` ORDER BY ${sort_by} ${order}`;
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// =======================
// 3️⃣ Wallet
// =======================
app.get("/wallet", (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: "User ID required" });

  db.query("SELECT * FROM wallet WHERE user_id = ?", [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Wallet not found" });
    res.json(results[0]);
  });
});

app.post("/wallet/deduct", (req, res) => {
  const { user_id, amount } = req.body;
  if (!user_id || !amount || amount <= 0) return res.status(400).json({ error: "Invalid data" });

  db.query("SELECT * FROM wallet WHERE user_id = ?", [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const wallet = results[0];
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    if (wallet.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    const newBalance = wallet.balance - amount;
    db.query("UPDATE wallet SET balance = ? WHERE user_id = ?", [newBalance, user_id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ balance: newBalance });
    });
  });
});

// =======================
// 4️⃣ Bookings (normal, no 10% increase)
// =======================
app.post("/book", (req, res) => {
  const { passenger_name, flight_id, dob, user_id } = req.body;
  if (!user_id) return res.status(401).json({ error: "Login required" });
  if (!passenger_name || !flight_id || !dob) return res.status(400).json({ error: "Passenger info required" });

  const dobDate = new Date(dob);
  const today = new Date();
  if (dobDate > today) return res.status(400).json({ error: "DOB cannot be in future" });

  db.query("SELECT * FROM flights WHERE flight_id = ?", [flight_id], (err, flights) => {
    if (err) return res.status(500).json({ error: err.message });
    if (flights.length === 0) return res.status(404).json({ error: "Flight not found" });

    const flight = flights[0];
    const price = Number(flight.current_price); // ✅ normal price

    db.query("SELECT * FROM wallet WHERE user_id = ?", [user_id], (err, wallets) => {
      if (err) return res.status(500).json({ error: err.message });
      const wallet = wallets[0];
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });

      const walletBalance = Number(wallet.balance);
      if (walletBalance < price) return res.status(400).json({ error: "Insufficient balance" });

      const newBalance = walletBalance - price;
      db.query("UPDATE wallet SET balance = ? WHERE user_id = ?", [newBalance, user_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const pnr = crypto.randomBytes(3).toString("hex").toUpperCase();
        const insertBookingQuery = `
          INSERT INTO bookings (passenger_name, flight_id, amount_paid, booking_time, pnr, user_id)
          VALUES (?, ?, ?, NOW(), ?, ?)
        `;
        db.query(insertBookingQuery, [passenger_name, flight_id, price, pnr, user_id], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // PDF generation
          if (!fs.existsSync("tickets")) fs.mkdirSync("tickets", { recursive: true });
          const pdfPath = path.join(__dirname, "tickets", `Ticket_${pnr}.pdf`);
          const doc = new PDFDocument();
          const writeStream = fs.createWriteStream(pdfPath);
          doc.pipe(writeStream);

          doc.fontSize(22).fillColor("#003366").text("WELCOME TO AIRLINES", { align: "center" });
          doc.moveDown(0.5).fontSize(12).fillColor("black").text("Your official electronic flight ticket.", { align: "center" });
          doc.moveDown(); doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); doc.moveDown();

          doc.fontSize(14).text("Passenger Details", { underline: true }); doc.moveDown(0.5); doc.fontSize(12);
          doc.text(`Passenger Name : ${passenger_name}`);
          doc.text(`Date of Birth  : ${dobDate.toLocaleDateString()}`);
          doc.text(`PNR            : ${pnr}`);
          doc.moveDown();

          doc.fontSize(14).text("Flight Details", { underline: true }); doc.moveDown(0.5); doc.fontSize(12);
          doc.text(`Airline        : ${flight.airline}`);
          doc.text(`Flight Number  : ${flight.flight_id}`);
          doc.text(`From           : ${flight.departure_city}`);
          doc.text(`To             : ${flight.arrival_city}`);
          doc.text(`Departure Time : ${flight.departure_time}`);
          doc.text(`Arrival Time   : ${flight.arrival_time}`);
          doc.moveDown();

          doc.fontSize(14).text("Payment Summary", { underline: true }); doc.moveDown(0.5); doc.fontSize(12);
          doc.text(`Ticket Fare    : ₹${price}`);
          doc.text(`Payment Status : CONFIRMED`);
          doc.moveDown(2);

          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); doc.moveDown();
          doc.fontSize(10).list([
            "Carry a valid government-issued ID.",
            "Arrive at the airport at least 2 hours before departure.",
            "Boarding gates close 30 minutes prior to departure.",
            "Ticket is non-transferable.",
            "Baggage allowance as per airline policy.",
            "Changes or cancellations follow airline terms and conditions.",
            "Follow all airport security and safety instructions.",
            "Keep this ticket handy for verification during boarding."
          ], { bulletIndent: 20 });

          doc.moveDown(1);
          doc.fontSize(10).fillColor("gray").text("Thank you for choosing Airlines. Have a pleasant journey!", { align: "center" });
          doc.end();

          writeStream.on("finish", () => {
            res.json({
              message: "Booking successful",
              pnr,
              flight_id,
              passenger_name,
              dob: dobDate.toLocaleDateString(),
              amount_paid: price,
              remaining_balance: newBalance,
              ticket_url: `http://192.168.13.77:${PORT}/tickets/Ticket_${pnr}.pdf`
            });
          });

          writeStream.on("error", (err) => {
            res.status(500).json({ error: "PDF generation failed" });
          });
        });
      });
    });
  });
});

// =======================
// 5️⃣ View Bookings per user
// =======================
app.get("/bookings/:user_id", (req, res) => {
  const user_id = req.params.user_id;
  const query = `
    SELECT b.booking_id AS id, b.passenger_name, b.flight_id, f.airline, f.departure_city, f.arrival_city, b.amount_paid, b.booking_time, b.pnr
    FROM bookings b
    JOIN flights f ON b.flight_id = f.flight_id
    WHERE b.user_id = ?
    ORDER BY b.booking_time DESC
  `;
  db.query(query, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// =======================
// Start Server
// =======================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
