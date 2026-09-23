const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 120
    },

    category: {
      type: String,
      enum: [
        'Books',
        'Stationery',
        'Lab Gear',
        'Electronics',
        'Other'
      ]
    },

    condition: {
      type: String,
      enum: [
        'New',
        'Good',
        'Used'
      ]
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000
    },

    photos: {
      type: [String],
      default: []
    },

    price: {
      type: Number,
      min: 0,
      default: 0
    },

    isFree: {
      type: Boolean,
      default: false
    },

    openToTrades: {
      type: Boolean,
      default: false
    },

    pickupLocation: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },

    detailedLocation: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    // Map coordinates are optional.
    pickupCoordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
        default: null
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        default: null
      }
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    university: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },

    status: {
      type: String,
      enum: [
        'pending',
        'available',
        'reserved',
        'lent',
        'draft',
        'removed',
        'rejected'
      ],
      default: 'pending'
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Mongoose 9-compatible save middleware.
// No next() callback is used.
itemSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model(
  'Item',
  itemSchema
);