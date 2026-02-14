/**
 * Database Validation Script: Validate & Fix collectionFactor values
 *
 * This script scans all GroupMember documents and:
 * 1. Verifies collectionFactor > 0 for all records
 * 2. Verifies collectionPattern is set and valid
 * 3. Recalculates expected collectionFactor from group.frequency + member.collectionPattern
 * 4. Fixes any mismatches by updating collectionFactor to the correct derived value
 * 5. Logs a report of all findings and corrections
 *
 * Usage: node scripts/validate-collection-factors.js [--fix]
 *   Without --fix: dry-run, only reports issues
 *   With --fix: applies corrections to the database
 */

const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://adhil1akbar:BobaMetals123@cluster0.k5mfwdc.mongodb.net/chitwise-appfinity?retryWrites=true&w=majority";

const FIX_MODE = process.argv.includes("--fix");

// Minimal schemas
const ChitGroupSchema = new mongoose.Schema(
  {
    groupName: String,
    frequency: String,
    contributionAmount: Number,
    totalPeriods: Number,
    totalUnits: Number,
    startDate: Date,
    status: String,
    allowCustomCollectionPattern: Boolean,
  },
  { strict: false },
);

const GroupMemberSchema = new mongoose.Schema(
  {
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "ChitGroup" },
    units: Number,
    collectionPattern: String,
    collectionFactor: Number,
    totalDue: Number,
    totalCollected: Number,
    pendingAmount: Number,
    status: String,
  },
  { strict: false },
);

const MemberSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
  },
  { strict: false },
);

function deriveCollectionFactor(groupFrequency, collectionPattern) {
  if (groupFrequency === "MONTHLY") {
    if (collectionPattern === "DAILY") return 30;
    if (collectionPattern === "WEEKLY") return 4;
    return 1; // MONTHLY
  } else if (groupFrequency === "WEEKLY") {
    if (collectionPattern === "DAILY") return 7;
    return 1; // WEEKLY
  }
  return 1; // DAILY group → always 1
}

async function validate() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  CollectionFactor Validation Script");
  console.log(
    `  Mode: ${FIX_MODE ? "🔧 FIX (will update DB)" : "🔍 DRY-RUN (report only)"}`,
  );
  console.log("═══════════════════════════════════════════════════\n");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const ChitGroup =
      mongoose.models.ChitGroup || mongoose.model("ChitGroup", ChitGroupSchema);
    const GroupMember =
      mongoose.models.GroupMember ||
      mongoose.model("GroupMember", GroupMemberSchema);
    const Member =
      mongoose.models.Member || mongoose.model("Member", MemberSchema);

    const allSubscriptions = await GroupMember.find({})
      .populate(
        "groupId",
        "groupName frequency contributionAmount totalPeriods startDate status allowCustomCollectionPattern",
      )
      .populate("memberId", "name phone");

    console.log(`📋 Total subscriptions found: ${allSubscriptions.length}\n`);

    const issues = {
      missingCollectionPattern: [],
      invalidCollectionPattern: [],
      zeroOrNullCollectionFactor: [],
      mismatchedCollectionFactor: [],
      incorrectTotalDue: [],
      negativePendingAmount: [],
    };

    let fixedCount = 0;

    for (const sub of allSubscriptions) {
      const group = sub.groupId;
      const member = sub.memberId;
      const memberName = member?.name || "Unknown";
      const groupName = group?.groupName || "Unknown";
      const subId = sub._id.toString();

      let needsSave = false;

      // 1. Check collectionPattern
      if (!sub.collectionPattern) {
        issues.missingCollectionPattern.push({
          subId,
          memberName,
          groupName,
          detail: "collectionPattern is missing/null",
        });
        if (FIX_MODE && group) {
          // Default to group frequency
          sub.collectionPattern = group.frequency;
          sub.collectionFactor = 1;
          needsSave = true;
        }
      } else if (
        !["DAILY", "WEEKLY", "MONTHLY"].includes(sub.collectionPattern)
      ) {
        issues.invalidCollectionPattern.push({
          subId,
          memberName,
          groupName,
          detail: `Invalid collectionPattern: "${sub.collectionPattern}"`,
        });
      }

      // 2. Check collectionFactor
      if (!sub.collectionFactor || sub.collectionFactor <= 0) {
        issues.zeroOrNullCollectionFactor.push({
          subId,
          memberName,
          groupName,
          detail: `collectionFactor = ${sub.collectionFactor}`,
        });
        if (FIX_MODE && group && sub.collectionPattern) {
          const correctFactor = deriveCollectionFactor(
            group.frequency,
            sub.collectionPattern,
          );
          sub.collectionFactor = correctFactor;
          needsSave = true;
        }
      }

      // 3. Check collectionFactor matches expected value
      if (group && sub.collectionPattern && sub.collectionFactor > 0) {
        const expectedFactor = deriveCollectionFactor(
          group.frequency,
          sub.collectionPattern,
        );
        if (sub.collectionFactor !== expectedFactor) {
          issues.mismatchedCollectionFactor.push({
            subId,
            memberName,
            groupName,
            detail: `collectionFactor = ${sub.collectionFactor}, expected = ${expectedFactor} (group: ${group.frequency}, pattern: ${sub.collectionPattern})`,
          });
          if (FIX_MODE) {
            sub.collectionFactor = expectedFactor;
            needsSave = true;
          }
        }
      }

      // 4. Verify totalDue
      if (group) {
        const expectedTotalDue =
          group.contributionAmount * group.totalPeriods * sub.units;
        if (Math.abs(sub.totalDue - expectedTotalDue) > 0.01) {
          issues.incorrectTotalDue.push({
            subId,
            memberName,
            groupName,
            detail: `totalDue = ${sub.totalDue}, expected = ${expectedTotalDue} (contribution=${group.contributionAmount} × periods=${group.totalPeriods} × units=${sub.units})`,
          });
          if (FIX_MODE) {
            sub.totalDue = expectedTotalDue;
            sub.pendingAmount = expectedTotalDue - sub.totalCollected;
            needsSave = true;
          }
        }
      }

      // 5. Check for negative pendingAmount
      if (sub.pendingAmount < 0) {
        issues.negativePendingAmount.push({
          subId,
          memberName,
          groupName,
          detail: `pendingAmount = ${sub.pendingAmount} (totalDue=${sub.totalDue}, totalCollected=${sub.totalCollected})`,
        });
        if (FIX_MODE) {
          sub.pendingAmount = Math.max(0, sub.totalDue - sub.totalCollected);
          needsSave = true;
        }
      }

      if (needsSave && FIX_MODE) {
        await sub.save();
        fixedCount++;
      }
    }

    // ─── Report ───────────────────────────────────────
    console.log("╔═══════════════════════════════════════════════╗");
    console.log("║              VALIDATION REPORT                ║");
    console.log("╚═══════════════════════════════════════════════╝\n");

    const categories = [
      ["Missing collectionPattern", issues.missingCollectionPattern],
      ["Invalid collectionPattern", issues.invalidCollectionPattern],
      ["Zero/Null collectionFactor", issues.zeroOrNullCollectionFactor],
      ["Mismatched collectionFactor", issues.mismatchedCollectionFactor],
      ["Incorrect totalDue", issues.incorrectTotalDue],
      ["Negative pendingAmount", issues.negativePendingAmount],
    ];

    let totalIssues = 0;
    for (const [label, items] of categories) {
      if (items.length > 0) {
        console.log(`\n⚠️  ${label}: ${items.length} issue(s)`);
        for (const item of items) {
          console.log(
            `   - [${item.subId}] ${item.memberName} in "${item.groupName}": ${item.detail}`,
          );
        }
        totalIssues += items.length;
      }
    }

    if (totalIssues === 0) {
      console.log("✅ No issues found! All subscriptions have valid data.\n");
    } else {
      console.log(`\n📊 Total issues: ${totalIssues}`);
      if (FIX_MODE) {
        console.log(`🔧 Fixed ${fixedCount} subscription(s)\n`);
      } else {
        console.log(
          `💡 Run with --fix to apply corrections:\n   node scripts/validate-collection-factors.js --fix\n`,
        );
      }
    }
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

validate();
