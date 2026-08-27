const mongoose = require('mongoose');

const coordinatesSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined,
    },
    radiusMeters: {
      type: Number,
      default: 500,
    },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const itemPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['LOST', 'FOUND'],
      required: [true, 'Post type (LOST or FOUND) is required'],
      index: true,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [200, 'Item name cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: [
        'Electronics',
        'Documents',
        'Wallet',
        'Keys',
        'Bags',
        'Jewelry',
        'Clothing',
        'Pets',
        'Other',
      ],
      required: [true, 'Category is required'],
      index: true,
    },
    publicDescription: {
      type: String,
      required: [true, 'Public description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // PRIVATE — never returned in public API responses
    privateIdentifyingDetails: {
      type: String,
      trim: true,
      maxlength: [2000, 'Private details cannot exceed 2000 characters'],
      select: false,
    },
    color: {
      type: String,
      trim: true,
      maxlength: [100, 'Color cannot exceed 100 characters'],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand cannot exceed 100 characters'],
    },
    publicCharacteristics: {
      type: [String],
      default: [],
    },
    // PRIVATE — never returned in public API responses
    privateCharacteristics: {
      type: [String],
      default: [],
      select: false,
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    lostOrFoundDate: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    lostOrFoundTime: {
      type: String, // "HH:MM" format
      trim: true,
    },
    locationName: {
      type: String,
      trim: true,
      maxlength: [500, 'Location name cannot exceed 500 characters'],
    },
    city: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    // Approximate only — never exact public coordinates
    approximateCoordinates: coordinatesSchema,

    status: {
      type: String,
      enum: [
        'ACTIVE',
        'MATCHED',
        'CLAIMED',
        'VERIFIED',
        'RETURNED',
        'EXPIRED',
        'CANCELLED',
        'REMOVED',
        'DISPUTED',
      ],
      default: 'ACTIVE',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'ORGANIZATION_ONLY', 'PRIVATE'],
      default: 'PUBLIC',
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    renewedCount: {
      type: Number,
      default: 0,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'HIDDEN', 'REMOVED'],
      default: 'APPROVED',
    },
    moderationNote: {
      type: String,
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Strip private fields from public responses
        delete ret.privateIdentifyingDetails;
        delete ret.privateCharacteristics;
        return ret;
      },
    },
  }
);

// Full-text search index
itemPostSchema.index(
  {
    itemName: 'text',
    publicDescription: 'text',
    brand: 'text',
    color: 'text',
    locationName: 'text',
  },
  {
    weights: {
      itemName: 10,
      brand: 5,
      color: 5,
      publicDescription: 3,
      locationName: 2,
    },
    name: 'item_text_index',
  }
);

// Geospatial index for nearby search
itemPostSchema.index({ 'approximateCoordinates': '2dsphere' });

// Compound indexes for common queries
itemPostSchema.index({ type: 1, category: 1, city: 1, status: 1, lostOrFoundDate: -1 });
itemPostSchema.index({ userId: 1, status: 1, createdAt: -1 });
itemPostSchema.index({ status: 1, expiresAt: 1 });

const ItemPost = mongoose.model('ItemPost', itemPostSchema);
module.exports = ItemPost;
