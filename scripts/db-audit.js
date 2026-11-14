// mongosh db-audit.js
// Inspect indexes and duplicate key violations in the uddan database.

print("=== users — indexes ===");
printjson(db.users.getIndexes());

print("\n=== users — total documents ===");
print(db.users.countDocuments({}));

print("\n=== users — duplicate emails ===");
printjson(
  db.users
    .aggregate([
      { $group: { _id: "$email", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray()
);

print("\n=== users — duplicate usernames ===");
printjson(
  db.users
    .aggregate([
      { $group: { _id: "$username", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray()
);

print("\n=== campaigns — indexes ===");
printjson(db.campaigns.getIndexes());

print("\n=== campaigns — total documents ===");
print(db.campaigns.countDocuments({}));

print("\n=== campaigns — missing moderationStatus ===");
print(
  db.campaigns.countDocuments({
    moderationStatus: { $in: [null, ""] },
  })
);

print("\n=== payments — indexes ===");
printjson(db.payments.getIndexes());

print("\n=== payments — total documents ===");
print(db.payments.countDocuments({}));

print("\n=== payments — duplicate razorpayPaymentId ===");
printjson(
  db.payments
    .aggregate([
      { $match: { razorpayPaymentId: { $ne: null } } },
      { $group: { _id: "$razorpayPaymentId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray()
);

print("\n=== moderationlogs — indexes ===");
printjson(db.moderationlogs.getIndexes());
