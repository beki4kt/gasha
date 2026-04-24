const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

// Serve static files (index.html, images, etc.)
app.use(express.static(path.join(__dirname, './'))); 

const USERS_FILE = './users.json';

const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(USERS_FILE)); } catch (e) { return []; }
};

app.post('/register', (req, res) => {
    const { phone, password } = req.body;
    let users = getUsers();
    if (users.find(u => u.phone === phone)) return res.status(400).json({ message: "Already registered!" });
    const newUser = { phone, password, balance: 0.00, points: 50.00 };
    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.status(201).json({ message: "Success", user: newUser });
});

app.post('/login', (req, res) => {
    const { phone, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.phone === phone && u.password === password);
    if (user) res.json({ message: "Login successful!", user });
    else res.status(401).json({ message: "Invalid credentials" });
});

app.post('/transaction', (req, res) => {
    const { phone, amount, type, accountNumber } = req.body;
    let users = getUsers();
    const userIndex = users.findIndex(u => u.phone === phone);
    if (userIndex !== -1) {
        const amt = parseFloat(amount);
        if (type === 'withdraw' && users[userIndex].balance < amt) return res.status(400).json({ message: "Insufficient balance!" });
        users[userIndex].balance += (type === 'deposit' ? amt : -amt);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({ message: "Success!", newBalance: users[userIndex].balance });
    } else res.status(404).json({ message: "User not found" });
});

// CRITICAL RENDER PORT FIX
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gashabet Master Live on Port ${PORT}`);
});