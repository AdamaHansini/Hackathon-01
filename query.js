const mongoose = require('mongoose');
const ItemPost = require('./backend/src/models/ItemPost');
const Claim = require('./backend/src/models/Claim');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/lostlink');
  const post = await ItemPost.findOne({ itemName: /Mac Charger/i });
  console.log('Post:', post);
  if (post) {
    const claims = await Claim.find({ $or: [{ foundPostId: post._id }, { relatedLostPostId: post._id }] });
    console.log('Claims:', claims);
  }
  mongoose.disconnect();
}
run();
