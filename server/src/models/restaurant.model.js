const mongoose = require("mongoose");

// GeoJSON point. Coordinates are [longitude, latitude] (longitude first!).
const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value) => value.length === 2,
        message: "coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false }
);

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    area: { type: String, trim: true, maxlength: 100 },
    cuisines: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: [],
      validate: { validator: (list) => list.length <= 10, message: "At most 10 cuisines" },
    },
    location: { type: pointSchema, required: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
