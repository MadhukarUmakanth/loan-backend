const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();  // Switch to sqlite3 for compatibility
const bcrypt = require('bcryptjs');  // Switch to bcryptjs

const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "addusers.db");

// Initialize Database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("DB Error:", err.message);
        process.exit(1);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// Use PORT environment variable, default to 5001 if not set
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});

// Signup Route
app.post("/signup", (req, res) => {
    const { username, email, password } = req.body;

    const selectUserQuery = `SELECT * FROM users WHERE username = ?;`;
    db.get(selectUserQuery, [username], (err, dbUser) => {
        if (err) {
            console.error("Error selecting user:", err);
            return res.status(500).send("Internal Server Error");
        }

        if (!dbUser) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            const addUserQuery = `
                INSERT INTO users (username, password, email)
                VALUES (?, ?, ?);
            `;
            db.run(addUserQuery, [username, hashedPassword, email], function (err) {
                if (err) {
                    console.error("Error adding user:", err);
                    return res.status(500).send("Internal Server Error");
                }
                res.status(201).send("User added successfully");
            });
        } else {
            res.status(400).send("User already exists");
        }
    });
});

// Login Route
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const selectUserQuery = `SELECT * FROM users WHERE username = ?;`;
    db.get(selectUserQuery, [username], (err, dbUser) => {
        if (err) {
            console.error("Error during login:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        if (!dbUser) {
            return res.status(400).json({ message: "Invalid User!" });
        }

        const isPasswordMatched = bcrypt.compareSync(password, dbUser.password);

        if (isPasswordMatched) {
            return res.status(200).json({ message: "Login Successful!" });
        } else {
            return res.status(400).json({ message: "Invalid Password!" });
        }
    });
});

// Loan Request Route
app.post('/loans', (req, res) => {
    const { amount, weeks } = req.body;

    // Assume the user ID is fetched from an authenticated session or token
    const user_id = 1;  // Set a default user ID, or dynamically fetch from a session/token

    if (user_id === undefined || amount === undefined || weeks === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const parsedUserId = Number(user_id);
    const parsedAmount = Number(amount);
    const parsedWeeks = Number(weeks);

    if (isNaN(parsedUserId) || isNaN(parsedAmount) || isNaN(parsedWeeks)) {
        return res.status(400).json({ message: 'Invalid data types provided' });
    }

    const insertLoanQuery = `
        INSERT INTO loanlist (user_id, amount, weeks, state)
        VALUES (?, ?, ?, ?);
    `;

    db.run(insertLoanQuery, [parsedUserId, parsedAmount, parsedWeeks, 'PENDING'], function (err) {
        if (err) {
            console.error('Error inserting loan request:', err.message);
            return res.status(500).json({ message: 'Error creating loan request', error: err.message });
        }

        // Access last inserted ID using this.lastID with sqlite3
        res.status(201).json({
            message: 'Loan request created successfully',
            loan_id: this.lastID,  // Access the last inserted row ID
        });
    });
});
