require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bookstore');

const User = require('./models/User');
const Book = require('./models/Book');
const Order = require('./models/Order');

const { auth, admin, SECRET } = require('./middleware');
const rateLimiter = require('./rateLimiter');
const errorHandler = require('./errorHandler');
// Test route
app.get('/', (req, res) => res.send('Welcome to Bookstore API'));

// Register
app.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hash, role });
    await user.save();
    res.json({ message: 'User registered' });
  } catch (err) { next(err); }
});
// Test route
app.get('/', (req, res) => res.send('Bookstore API is running'));

// Login
app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) { next(err); }
});

// Get books (all users)
app.get('/books', auth, rateLimiter, async (req, res, next) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) { next(err); }
});

// Add book (admin)
app.post('/books', auth, admin, rateLimiter, async (req, res, next) => {
  try {
    const { title, author, price, stock } = req.body;
    const book = new Book({ title, author, price, stock });
    await book.save();
    res.json(book);
  } catch (err) { next(err); }
});

// Update book (admin)
app.put('/books/:id', auth, admin, rateLimiter, async (req, res, next) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) { next(err); }
});

// Delete book (admin)
app.delete('/books/:id', auth, admin, rateLimiter, async (req, res, next) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({ message: 'Book deleted' });
  } catch (err) { next(err); }
});

// Place order (user)
app.post('/orders', auth, rateLimiter, async (req, res, next) => {
  try {
    const { bookId, quantity } = req.body;
    const book = await Book.findById(bookId);
    if (!book || book.stock < quantity) return res.status(400).json({ error: 'Not enough stock' });
    book.stock -= quantity;
    await book.save();
    const order = new Order({ userId: req.user.id, bookId, quantity });
    await order.save();
    res.json(order);
  } catch (err) { next(err); }
});

// Get orders (user)
app.get('/orders', auth, rateLimiter, async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).populate('bookId');
    res.json(orders);
  } catch (err) { next(err); }
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(process.env.PORT || 3000, () => console.log(`Server running on port ${process.env.PORT || 3000}`));

module.exports = { app, User, Book, Order };
