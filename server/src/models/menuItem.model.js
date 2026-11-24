const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, trim: true, default: "Other", maxlength: 50 },
  price: { type: Number, required: true, min: 0, max: 100000 },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
});

const menuItemModel = mongoose.model("MenuItem", menuItemSchema);

// menuItemModel.createIndexes({ restaurant: 1 });

module.exports = menuItemModel;
