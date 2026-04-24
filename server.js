const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

// --- SERVE FRONTEND ---
app.use(express.static(path.join(__dirname, './'))); 

// Health Check Route for Cron-job (Keeps server awake)
app.get('/ping', (req, res) => res.send('Awake'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const USERS_FILE = '/tmp/users.json'; // Render prefers /tmp for writeable files in free tier

const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(USERS_FILE)); } catch (e) { return []; }
};

// Reset Balances - ONLY run this if you want a clean slate on every manual restart
const resetBalances = () => {
    let users = getUsers();
    if (users.length > 0) {
        users = users.map(u => ({ ...u, balance: 0.00, points: 50.00 }));
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
};
// resetBalances(); // Uncomment if you want to force 0.00 on every restart

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

// RENDER DYNAMIC PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Gashabet Master Live on Port ${PORT}`));