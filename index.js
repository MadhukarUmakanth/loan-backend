const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "addusers.db");
let db;

// Initialize Database
const initializeDB = () => {
    try {
        db = new Database(dbPath); // Correct initialization for better-sqlite3
        console.log("Connected to the SQLite database.");
    } catch (error) {
        console.error(`DB Error: ${error.message}`);
        process.exit(1);
    }
};

initializeDB();

// Use PORT environment variable, default to 5001 if not set
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});

// Signup Route
app.post("/signup", (req, res) => {
    try {
        const { username, email, password } = req.body;

        const selectUserQuery = `SELECT * FROM users WHERE username = ?;`;
        const dbUser = db.prepare(selectUserQuery).get(username);

        if (!dbUser) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            const addUserQuery = `
                INSERT INTO users (username, password, email)
                VALUES (?, ?, ?);`;
            db.prepare(addUserQuery).run(username, hashedPassword, email); // Running the prepared statement
            res.status(201).send("User added successfully");
        } else {
            res.status(400).send("User already exists");
        }
    } catch (error) {
        console.error("Error during signup:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Login Route
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    try {
        const selectUserQuery = `SELECT * FROM users WHERE username = ?;`;
        const dbUser = db.prepare(selectUserQuery).get(username);

        if (!dbUser) {
            return res.status(400).json({ message: "Invalid User!" });
        }

        const isPasswordMatched = bcrypt.compareSync(password, dbUser.password);

        if (isPasswordMatched) {
            return res.status(200).json({ message: "Login Successful!" });
        } else {
            return res.status(400).json({ message: "Invalid Password!" });
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Loan Request Route
app.post('/loans', (req, res) => {
    const { amount, weeks } = req.body;

    // Assume the user ID is fetched from an authenticated session or token
    const user_id = 1;  // Set a default user ID, or dynamically fetch from a session/token

    // Check that all fields are provided
    if (user_id === undefined || amount === undefined || weeks === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Ensure data is in the correct format
    const parsedUserId = Number(user_id);
    const parsedAmount = Number(amount);
    const parsedWeeks = Number(weeks);

    if (isNaN(parsedUserId) || isNaN(parsedAmount) || isNaN(parsedWeeks)) {
        return res.status(400).json({ message: 'Invalid data types provided' });
    }

    // Use db.prepare() to prepare the query and db.run() to execute it
    const insertLoanQuery = `
        INSERT INTO loanlist (user_id, amount, weeks, state)
        VALUES (?, ?, ?, ?);
    `;

    const stmt = db.prepare(insertLoanQuery);

    try {
        stmt.run(parsedUserId, parsedAmount, parsedWeeks, 'PENDING');
        
        // Correctly access the last inserted ID
        res.status(201).json({
            message: 'Loan request created successfully',
            loan_id: stmt.lastInsertRowid,  // Correctly use lastInsertRowid
        });
    } catch (err) {
        console.error('Error inserting loan request:', err.message);
        return res.status(500).json({ message: 'Error creating loan request', error: err.message });
    }
});
