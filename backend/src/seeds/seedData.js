/**
 * LostLink Seed Data
 * Run: npm run seed
 * Clear & reseed: npm run seed:clear
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { hashPassword, hashAnswer } = require('../utils/password');

// Models
const User = require('../models/User');
const ItemPost = require('../models/ItemPost');
const VerificationQuestion = require('../models/VerificationQuestion');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const Category = require('../models/Category');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lostlink';

const clearFlag = process.argv.includes('--clear');

const categories = [
  { name: 'Electronics', icon: 'Smartphone', description: 'Phones, laptops, tablets, accessories', sortOrder: 1 },
  { name: 'Documents', icon: 'FileText', description: 'IDs, passports, certificates, cards', sortOrder: 2 },
  { name: 'Wallet', icon: 'Wallet', description: 'Wallets, purses, card holders', sortOrder: 3 },
  { name: 'Keys', icon: 'Key', description: 'House keys, car keys, office keys', sortOrder: 4 },
  { name: 'Bags', icon: 'ShoppingBag', description: 'Backpacks, handbags, luggage', sortOrder: 5 },
  { name: 'Jewelry', icon: 'Gem', description: 'Rings, necklaces, bracelets, watches', sortOrder: 6 },
  { name: 'Clothing', icon: 'Shirt', description: 'Jackets, scarves, hats, shoes', sortOrder: 7 },
  { name: 'Pets', icon: 'PawPrint', description: 'Dogs, cats, birds, other pets', sortOrder: 8 },
  { name: 'Other', icon: 'Package', description: 'Items not fitting other categories', sortOrder: 9 },
];

const seed = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  if (clearFlag) {
    console.log('🗑️  Clearing existing seed data...');
    await Promise.all([
      User.deleteMany({ email: { $in: ['alex@example.com', 'priya@example.com', 'moderator@lostlink.app', 'admin@lostlink.app'] } }),
      Category.deleteMany({}),
    ]);
    console.log('✅ Cleared existing data.');
  }

  // ─── Seed Categories ──────────────────────────────────────────────────────
  console.log('🏷️  Seeding categories...');
  const seededCategories = await Promise.all(
    categories.map((cat) =>
      Category.findOneAndUpdate(
        { name: cat.name },
        cat,
        { upsert: true, new: true }
      )
    )
  );
  console.log(`✅ Seeded ${seededCategories.length} categories.`);

  // ─── Seed Users ────────────────────────────────────────────────────────────
  console.log('👥 Seeding users...');

  const adminHash = await hashPassword('Admin@LostLink2024!');
  const moderatorHash = await hashPassword('Moderator@LostLink2024!');
  const alexHash = await hashPassword('Alex@LostLink2024!');
  const priyaHash = await hashPassword('Priya@LostLink2024!');

  const [admin, moderator, alex, priya] = await Promise.all([
    User.findOneAndUpdate(
      { email: 'admin@lostlink.app' },
      {
        name: 'LostLink Admin',
        email: 'admin@lostlink.app',
        passwordHash: adminHash,
        role: 'ADMIN',
        city: 'hyderabad',
        emailVerified: true,
        trustScore: 100,
        accountStatus: 'ACTIVE',
      },
      { upsert: true, new: true }
    ),
    User.findOneAndUpdate(
      { email: 'moderator@lostlink.app' },
      {
        name: 'LostLink Moderator',
        email: 'moderator@lostlink.app',
        passwordHash: moderatorHash,
        role: 'MODERATOR',
        city: 'hyderabad',
        emailVerified: true,
        trustScore: 90,
        accountStatus: 'ACTIVE',
      },
      { upsert: true, new: true }
    ),
    User.findOneAndUpdate(
      { email: 'alex@example.com' },
      {
        name: 'Alex Kumar',
        email: 'alex@example.com',
        passwordHash: alexHash,
        role: 'USER',
        city: 'hyderabad',
        emailVerified: true,
        trustScore: 72,
        successfulReturnsCount: 2,
        recoveredItemsCount: 1,
        accountStatus: 'ACTIVE',
      },
      { upsert: true, new: true }
    ),
    User.findOneAndUpdate(
      { email: 'priya@example.com' },
      {
        name: 'Priya Sharma',
        email: 'priya@example.com',
        passwordHash: priyaHash,
        role: 'USER',
        city: 'hyderabad',
        emailVerified: true,
        trustScore: 85,
        successfulReturnsCount: 4,
        recoveredItemsCount: 0,
        accountStatus: 'ACTIVE',
      },
      { upsert: true, new: true }
    ),
  ]);

  console.log(`✅ Seeded users: Admin, Moderator, Alex, Priya`);

  // ─── Seed Posts ────────────────────────────────────────────────────────────
  console.log('📋 Seeding demo posts (Alex lost wallet, Priya found wallet)...');

  const postDate = new Date('2026-08-25');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 28);

  const lostPost = await ItemPost.findOneAndUpdate(
    { userId: alex._id, itemName: 'Black leather wallet', type: 'LOST' },
    {
      userId: alex._id,
      type: 'LOST',
      itemName: 'Black leather wallet',
      category: 'Wallet',
      publicDescription:
        'I lost my black leather wallet near the Central Library, Hyderabad. It possibly contains my debit cards and some cash. Lost on the afternoon of August 25th.',
      privateIdentifyingDetails:
        'There is a small red sticker inside the coin pocket. Also has a photo of my dog in the ID slot.',
      color: 'Black',
      brand: 'Hidesign',
      publicCharacteristics: ['Leather', 'Bifold', 'Black', 'Medium size'],
      privateCharacteristics: ['Red sticker inside', 'Dog photo in ID slot'],
      lostOrFoundDate: postDate,
      lostOrFoundTime: '14:30',
      locationName: 'Near Central Library, Nampally',
      city: 'hyderabad',
      approximateCoordinates: {
        type: 'Point',
        coordinates: [78.4744, 17.3850],
        radiusMeters: 300,
      },
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
      expiresAt,
    },
    { upsert: true, new: true }
  );

  const foundPost = await ItemPost.findOneAndUpdate(
    { userId: priya._id, itemName: 'Black wallet', type: 'FOUND' },
    {
      userId: priya._id,
      type: 'FOUND',
      itemName: 'Black wallet',
      category: 'Wallet',
      publicDescription:
        'Found a black leather wallet near the library entrance at Central Library, Hyderabad. Found it on August 25th around 3 PM. Please contact me if it belongs to you.',
      privateIdentifyingDetails:
        'Contains Hidesign branding inside. There are some cards and what appears to be a pet photo.',
      color: 'Black',
      brand: 'Hidesign',
      publicCharacteristics: ['Leather', 'Black', 'Contains cards'],
      lostOrFoundDate: postDate,
      lostOrFoundTime: '15:00',
      locationName: 'Central Library entrance, Nampally, Hyderabad',
      city: 'hyderabad',
      approximateCoordinates: {
        type: 'Point',
        coordinates: [78.4748, 17.3852],
        radiusMeters: 200,
      },
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
      expiresAt,
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Seeded: Lost post (Alex) and Found post (Priya)`);

  // ─── Seed Verification Questions ──────────────────────────────────────────
  console.log('🔐 Seeding verification questions for Alex\'s lost wallet...');

  const q1Hash = await hashAnswer('red sticker');
  const q2Hash = await hashAnswer('dog');
  const q3Hash = await hashAnswer('hidesign');

  const questions = [
    {
      lostPostId: lostPost._id,
      createdBy: alex._id,
      question: 'What is inside the coin pocket of the wallet?',
      answerHash: q1Hash,
      order: 0,
    },
    {
      lostPostId: lostPost._id,
      createdBy: alex._id,
      question: 'What is in the ID slot of the wallet?',
      answerHash: q2Hash,
      order: 1,
    },
    {
      lostPostId: lostPost._id,
      createdBy: alex._id,
      question: 'What is the brand of the wallet?',
      answerHash: q3Hash,
      order: 2,
    },
  ];

  for (const q of questions) {
    await VerificationQuestion.findOneAndUpdate(
      { lostPostId: q.lostPostId, question: q.question },
      q,
      { upsert: true, new: true }
    );
  }

  console.log(`✅ Seeded 3 verification questions`);

  // ─── Seed Pre-computed Match ───────────────────────────────────────────────
  console.log('🎯 Seeding Smart Match record (expected ≥85% score)...');

  const match = await Match.findOneAndUpdate(
    { lostPostId: lostPost._id, foundPostId: foundPost._id },
    {
      lostPostId: lostPost._id,
      foundPostId: foundPost._id,
      score: 91,
      categoryScore: 100,
      descriptionScore: 78,
      locationScore: 95,
      dateScore: 100,
      colorBrandScore: 90,
      otherDetailsScore: 70,
      matchReasons: [
        'Same category',
        'Similar description',
        'Nearby approximate location',
        'Close date/time',
        'Similar color/brand',
      ],
      confidenceLevel: 'HIGH',
      status: 'SUGGESTED',
      notifiedLostUser: false,
      notifiedFoundUser: false,
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Seeded Match record with score: ${match.score}% (${match.confidenceLevel})`);

  // ─── Update Post Statuses to MATCHED ──────────────────────────────────────
  await ItemPost.updateOne({ _id: lostPost._id }, { status: 'MATCHED' });
  await ItemPost.updateOne({ _id: foundPost._id }, { status: 'MATCHED' });

  // ─── Seed Notifications ───────────────────────────────────────────────────
  console.log('🔔 Seeding notifications...');

  await Notification.findOneAndUpdate(
    { recipientId: alex._id, type: 'MATCH_FOUND', relatedMatchId: match._id },
    {
      recipientId: alex._id,
      type: 'MATCH_FOUND',
      title: '🟢 91% Smart Match Found!',
      message:
        'Possible match found for your lost Black leather wallet. Reason: Same category, Similar description, Nearby approximate location.',
      relatedPostId: lostPost._id,
      relatedMatchId: match._id,
      isRead: false,
      metadata: { score: 91, confidenceLevel: 'HIGH' },
    },
    { upsert: true, new: true }
  );

  await Notification.findOneAndUpdate(
    { recipientId: priya._id, type: 'MATCH_FOUND', relatedMatchId: match._id },
    {
      recipientId: priya._id,
      type: 'MATCH_FOUND',
      title: '🟢 91% Smart Match Found!',
      message:
        'Your found Black wallet may match a lost item report. Reason: Same category, Similar description, Nearby approximate location.',
      relatedPostId: foundPost._id,
      relatedMatchId: match._id,
      isRead: false,
      metadata: { score: 91, confidenceLevel: 'HIGH' },
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Seeded match notifications for Alex and Priya`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('   Admin:     admin@lostlink.app     / Admin@LostLink2024!');
  console.log('   Moderator: moderator@lostlink.app / Moderator@LostLink2024!');
  console.log('   Alex:      alex@example.com       / Alex@LostLink2024!');
  console.log('   Priya:     priya@example.com      / Priya@LostLink2024!');
  console.log('\n   Smart Match: Alex lost wallet ↔ Priya found wallet = 91% HIGH confidence\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
