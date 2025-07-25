const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  quantity: Number,
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
