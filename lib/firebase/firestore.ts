import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import { CATEGORIES_BY_GROUP, DEFAULT_GROUPS } from "../seed/defaults";
import type { Expense, ExpenseGroup, Category, Goal, Household, User, CategoryMemory, SettlementEvent } from "@/types";
import { nanoid } from "nanoid";

// ─── Users ───────────────────────────────────────────────────────────────────

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as User) : null;
};

export const updateUserHousehold = async (
  uid: string,
  householdId: string
): Promise<void> => {
  await updateDoc(doc(db, "users", uid), { household_id: householdId });
};

// ─── Households ──────────────────────────────────────────────────────────────

// Module-level lock to prevent duplicate concurrent household creations
const _householdCreationLock = new Map<string, Promise<string>>();

export const createHousehold = async (uid: string): Promise<string> => {
  // Dedup: if a creation is already in progress for this user, return that promise
  const existing = _householdCreationLock.get(uid);
  if (existing) return existing;

  const promise = _createHouseholdImpl(uid);
  _householdCreationLock.set(uid, promise);
  try {
    return await promise;
  } finally {
    _householdCreationLock.delete(uid);
  }
};

const _createHouseholdImpl = async (uid: string): Promise<string> => {
  // Idempotency: if user already has a household, return it
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists() && userSnap.data()?.household_id) {
      return userSnap.data()!.household_id as string;
    }
  } catch {
    // If profile check fails, proceed with creation anyway
  }

  const inviteCode = nanoid(10);
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 48 * 60 * 60 * 1000)
  );

  const householdRef = doc(collection(db, "households"));

  // Step 1: Create the household document first (standalone write).
  // This is intentionally separate from the subcollection seed writes below.
  // Reason: Firestore security rules for subcollections (groups/categories)
  // check `isMember(householdId)` which does a `get()` on the household doc.
  // In a single batch, the parent doc being created and subcollection docs being
  // written are evaluated simultaneously — the `get()` returns "not found" for
  // the parent, so all subcollection creates are denied.
  // By committing the household doc first it exists in Firestore before the
  // subcollection batch runs, so `isMember()` resolves correctly.
  await setDoc(householdRef, {
    currency: "INR",
    created_at: serverTimestamp(),
    members: [uid],
    invite_code: inviteCode,
    invite_expires_at: expiresAt,
  });

  // Write invite code lookup document so non-members can find this household
  try {
    await setDoc(doc(db, "invite_codes", inviteCode), {
      household_id: householdRef.id,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error("[createHousehold] Failed to write invite_codes doc (non-fatal):", err);
  }

  // Step 2: Update user's household_id IMMEDIATELY after household doc is created.
  // This ensures the user always has a household_id even if seeding defaults fails.
  await updateDoc(doc(db, "users", uid), {
    household_id: householdRef.id,
    household_ids: arrayUnion(householdRef.id),
  });

  // Step 3: Seed default groups and per-group categories in a batch (household doc now exists).
  // Non-blocking: if seeding fails (e.g. Firestore rules), the household still exists
  // and the user can add groups/categories manually later.
  try {
    const seedBatch = writeBatch(db);

    // Create groups and map each group name → generated ID for category seeding
    const groupIdByName: Record<string, string> = {};
    for (const group of DEFAULT_GROUPS) {
      const groupRef = doc(collection(db, "households", householdRef.id, "groups"));
      seedBatch.set(groupRef, group);
      groupIdByName[group.name] = groupRef.id;
    }

    // Seed per-group categories: each group gets categories relevant to its theme
    for (const [groupName, groupId] of Object.entries(groupIdByName)) {
      const categories = CATEGORIES_BY_GROUP[groupName] ?? [];
      for (const cat of categories) {
        const catRef = doc(collection(db, "households", householdRef.id, "categories"));
        seedBatch.set(catRef, { ...cat, group_id: groupId });
      }
    }

    await seedBatch.commit();
  } catch (err) {
    console.error("[createHousehold] Failed to seed defaults (non-fatal):", err);
  }

  return householdRef.id;
};

export const getHousehold = async (householdId: string): Promise<Household | null> => {
  const snap = await getDoc(doc(db, "households", householdId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Household;
};

export const getHouseholdByInviteCode = async (
  code: string
): Promise<{ id: string; expires_at?: Timestamp } | null> => {
  const trimmedCode = code.trim();
  console.log("[InviteDebug] getHouseholdByInviteCode called", {
    rawCode: JSON.stringify(code),
    trimmedCode: JSON.stringify(trimmedCode),
    codeLength: trimmedCode.length,
  });
  if (!trimmedCode) {
    console.log("[InviteDebug] Code is empty after trim, returning null");
    return null;
  }

  // Look up invite code via the invite_codes collection (document ID = code).
  // This is publicly readable so non-members can validate invite links.
  try {
    const inviteSnap = await getDoc(doc(db, "invite_codes", trimmedCode));
    console.log("[InviteDebug] invite_codes lookup", {
      exists: inviteSnap.exists(),
      data: inviteSnap.exists() ? inviteSnap.data() : null,
    });
    if (inviteSnap.exists()) {
      const data = inviteSnap.data();
      const householdId = data?.household_id;
      if (householdId) {
        console.log("[InviteDebug] Found household via invite_codes:", householdId);
        return { id: householdId, expires_at: data?.expires_at };
      }
    }
  } catch (err) {
    console.error("[InviteDebug] invite_codes lookup failed:", err);
  }

  return null;
};

export const joinHousehold = async (
  householdId: string,
  uid: string,
  inviteExpiresAt?: Timestamp
): Promise<"success" | "full" | "expired"> => {
  console.log("[InviteDebug] joinHousehold called", { householdId, uid });

  // Check expiry using data from invite_codes (avoids reading household doc,
  // which non-members don't have permission to read).
  if (inviteExpiresAt) {
    const now = Timestamp.now();
    console.log("[InviteDebug] joinHousehold expiry check", {
      expires_at: inviteExpiresAt.toDate().toISOString(),
      now: now.toDate().toISOString(),
      isExpired: inviteExpiresAt.toMillis() < now.toMillis(),
    });
    if (inviteExpiresAt.toMillis() < now.toMillis()) return "expired";
  }

  // Capture old household before joining so we can clean it up afterward
  let oldHouseholdId: string | null = null;
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (userSnap.exists()) {
      oldHouseholdId = userSnap.data()?.household_id ?? null;
    }
  } catch {
    // Non-fatal: cleanup will just be skipped
  }

  // Try to add user to household members. Firestore security rules enforce
  // that only non-members can join and only if the household has < 2 members.
  try {
    await updateDoc(doc(db, "households", householdId), {
      members: arrayUnion(uid),
    });
  } catch (err) {
    console.error("[InviteDebug] joinHousehold update failed:", err);
    // Permission denied likely means household is full (rules enforce < 2 members)
    return "full";
  }

  // Update both household_id (active) and household_ids (all)
  await updateDoc(doc(db, "users", uid), {
    household_id: householdId,
    household_ids: arrayUnion(householdId),
  });

  // Clean up old auto-created household (fire-and-forget).
  // When a user signs up, useAuth self-heal creates a solo household for them.
  // If they then join another household via invite, the old one becomes orphaned.
  if (oldHouseholdId && oldHouseholdId !== householdId) {
    void _cleanupOldHousehold(oldHouseholdId, uid).catch((err) => {
      console.warn("[joinHousehold] Old household cleanup failed (non-fatal):", err);
    });
  }

  console.log("[InviteDebug] joinHousehold SUCCESS");
  return "success";
};

/** Remove user from their old household after joining a new one via invite. */
const _cleanupOldHousehold = async (
  oldHouseholdId: string,
  uid: string
): Promise<void> => {
  const oldHousehold = await getHousehold(oldHouseholdId);
  if (!oldHousehold) return;

  if (oldHousehold.members.length <= 1) {
    // Sole member — delete the entire household and its subcollections
    await deleteHouseholdCompletely(oldHouseholdId);

    // Clean up the invite code lookup doc
    if (oldHousehold.invite_code) {
      try {
        await deleteDoc(doc(db, "invite_codes", oldHousehold.invite_code));
      } catch {
        // Non-fatal
      }
    }
  } else {
    // Other members exist — just remove this user
    await updateDoc(doc(db, "households", oldHouseholdId), {
      members: arrayRemove(uid),
    });
  }

  // Remove old household from user's household_ids list
  await updateDoc(doc(db, "users", uid), {
    household_ids: arrayRemove(oldHouseholdId),
  });
};

export const refreshInviteCode = async (householdId: string): Promise<string> => {
  const newCode = nanoid(10);
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 48 * 60 * 60 * 1000)
  );
  console.log("[InviteDebug] refreshInviteCode", {
    householdId,
    newCode,
    expiresAt: expiresAt.toDate().toISOString(),
  });

  // Delete old invite_code document if it exists
  const householdSnap = await getDoc(doc(db, "households", householdId));
  const oldCode = householdSnap.exists() ? householdSnap.data()?.invite_code : null;

  await updateDoc(doc(db, "households", householdId), {
    invite_code: newCode,
    invite_expires_at: expiresAt,
  });

  // Write the invite code lookup document (ID = code, data = household_id)
  // This allows non-members to look up the household by invite code
  try {
    if (oldCode) {
      await deleteDoc(doc(db, "invite_codes", oldCode));
    }
    await setDoc(doc(db, "invite_codes", newCode), {
      household_id: householdId,
      expires_at: expiresAt,
    });
    console.log("[InviteDebug] refreshInviteCode SUCCESS — saved to both households and invite_codes");
  } catch (err) {
    console.error("[InviteDebug] Failed to write invite_codes doc (non-fatal):", err);
  }

  return newCode;
};

// ─── Multi-Household Support ─────────────────────────────────────────────────

/**
 * Switch the user's active household_id.
 * Validates that the target is in the user's household_ids array.
 */
export const switchActiveHousehold = async (
  uid: string,
  householdId: string
): Promise<void> => {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) throw new Error("User not found");
  const userData = userSnap.data() as { household_ids?: string[] };
  if (!userData.household_ids?.includes(householdId)) {
    throw new Error("User is not a member of this household");
  }
  await updateDoc(doc(db, "users", uid), { household_id: householdId });
};

/**
 * Fetch multiple household docs by ID.
 */
export const getUserHouseholds = async (
  householdIds: string[]
): Promise<Household[]> => {
  if (householdIds.length === 0) return [];
  const results: Household[] = [];
  // Firestore 'in' query is limited to 30 items
  for (const id of householdIds) {
    const snap = await getDoc(doc(db, "households", id));
    if (snap.exists()) {
      results.push({ id: snap.id, ...snap.data() } as Household);
    }
  }
  return results;
};

// ─── Groups ──────────────────────────────────────────────────────────────────

export const getGroups = async (householdId: string): Promise<ExpenseGroup[]> => {
  const snap = await getDocs(collection(db, "households", householdId, "groups"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExpenseGroup));
};

export const addGroup = async (
  householdId: string,
  name: string
): Promise<string> => {
  const ref = await addDoc(
    collection(db, "households", householdId, "groups"),
    { name: name.trim().slice(0, 30), is_default: false }
  );
  return ref.id;
};

export const archiveGroup = async (
  householdId: string,
  groupId: string,
  archived: boolean = true
): Promise<void> => {
  await updateDoc(
    doc(db, "households", householdId, "groups", groupId),
    { is_archived: archived }
  );
};

// ─── Categories ──────────────────────────────────────────────────────────────

export const getCategories = async (householdId: string): Promise<Category[]> => {
  const snap = await getDocs(
    collection(db, "households", householdId, "categories")
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
};

export const learnKeyword = async (
  householdId: string,
  categoryId: string,
  keyword: string
): Promise<void> => {
  await updateDoc(
    doc(db, "households", householdId, "categories", categoryId),
    { keywords: arrayUnion(keyword.toLowerCase().trim()) }
  );
};

// ─── Category Memory ─────────────────────────────────────────────────────────

export const getCategoryMemory = async (
  householdId: string
): Promise<CategoryMemory[]> => {
  try {
    const snap = await getDocs(
      collection(db, "households", householdId, "category_memory")
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CategoryMemory));
  } catch {
    // Collection may not exist yet or security rules may not allow access
    return [];
  }
};

export const saveCategoryMemory = async (
  householdId: string,
  description: string,
  categoryId: string
): Promise<void> => {
  try {
    const normalized = description.toLowerCase().trim();
    if (!normalized) return;

    // Check if a memory doc already exists for this description
    const q = query(
      collection(db, "households", householdId, "category_memory"),
      where("description", "==", normalized)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Create new memory entry
      await addDoc(collection(db, "households", householdId, "category_memory"), {
        description: normalized,
        category_id: categoryId,
        updated_at: serverTimestamp(),
      });
    } else {
      // Update existing entry
      const existingDoc = snap.docs[0];
      await updateDoc(
        doc(db, "households", householdId, "category_memory", existingDoc.id),
        { category_id: categoryId, updated_at: serverTimestamp() }
      );
    }
  } catch {
    // Silently fail — category memory is a non-critical feature
    console.warn("Failed to save category memory");
  }
};

// ─── Goals ───────────────────────────────────────────────────────────────────

export const getGoals = async (householdId: string): Promise<Goal[]> => {
  const snap = await getDocs(collection(db, "households", householdId, "goals"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
};

export const addGoal = async (
  householdId: string,
  goal: Omit<Goal, "id">
): Promise<string> => {
  const ref = await addDoc(
    collection(db, "households", householdId, "goals"),
    goal
  );
  return ref.id;
};

// ─── Household settings ───────────────────────────────────────────────────────

export const updateHouseholdCurrency = async (
  householdId: string,
  currency: string
): Promise<void> => {
  await updateDoc(doc(db, "households", householdId), { currency });
};

export const addCategory = async (
  householdId: string,
  name: string,
  groupId?: string
): Promise<string> => {
  const ref = await addDoc(
    collection(db, "households", householdId, "categories"),
    {
      name: name.trim().slice(0, 30),
      keywords: [],
      is_default: false,
      ...(groupId ? { group_id: groupId } : {}),
    }
  );
  return ref.id;
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const addExpense = async (
  householdId: string,
  expense: Omit<Expense, "id" | "_pending" | "_local_id">
): Promise<string> => {
  const ref = await addDoc(
    collection(db, "households", householdId, "expenses"),
    expense
  );
  return ref.id;
};

export const updateExpense = async (
  householdId: string,
  expenseId: string,
  data: Partial<Omit<Expense, "id" | "_pending" | "_local_id">>
): Promise<void> => {
  await updateDoc(
    doc(db, "households", householdId, "expenses", expenseId),
    data
  );
};

export const deleteExpense = async (
  householdId: string,
  expenseId: string
): Promise<void> => {
  await deleteDoc(
    doc(db, "households", householdId, "expenses", expenseId)
  );
};

export const subscribeToExpenses = (
  householdId: string,
  groupId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, "households", householdId, "expenses"),
    where("group_id", "==", groupId),
    orderBy("date", "desc")
  );

  return onSnapshot(q, (snap) => {
    const expenses = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as Expense));
    callback(expenses);
  });
};

export const getExpensesForAnalytics = async (
  householdId: string,
  groupId: string
): Promise<Expense[]> => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const q = query(
    collection(db, "households", householdId, "expenses"),
    where("group_id", "==", groupId),
    where("date", ">=", Timestamp.fromDate(sixMonthsAgo)),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
};

/** Fetch last 6 months of expenses for ALL groups (used for "Overall" analytics view). */
export const getAllExpensesForAnalytics = async (
  householdId: string
): Promise<Expense[]> => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const q = query(
    collection(db, "households", householdId, "expenses"),
    where("date", ">=", Timestamp.fromDate(sixMonthsAgo)),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
};

export const getHouseholdMembers = async (
  members: string[]
): Promise<User[]> => {
  const users: User[] = [];
  for (const uid of members) {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) users.push(snap.data() as User);
    } catch (err) {
      console.warn(`[getHouseholdMembers] Failed to read profile for ${uid}:`, err);
    }
  }
  return users;
};

// ─── Settlements ─────────────────────────────────────────────────────────────

export const recordSettlement = async (
  householdId: string,
  event: Omit<SettlementEvent, "id">
): Promise<string> => {
  const ref = await addDoc(
    collection(db, "households", householdId, "settlements"),
    event
  );
  return ref.id;
};

export const getSettlements = async (
  householdId: string
): Promise<SettlementEvent[]> => {
  try {
    const q = query(
      collection(db, "households", householdId, "settlements"),
      orderBy("settled_at", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SettlementEvent));
  } catch {
    // Collection may not exist yet or security rules may not allow access
    return [];
  }
};

// ─── Offboarding ─────────────────────────────────────────────────────────────

const HOUSEHOLD_SUBCOLLECTIONS = [
  "groups",
  "categories",
  "expenses",
  "goals",
  "category_memory",
  "settlements",
] as const;

/** Delete a household and ALL its subcollection documents. */
export const deleteHouseholdCompletely = async (
  householdId: string
): Promise<void> => {
  const MAX_BATCH_SIZE = 499;
  let currentBatch = writeBatch(db);
  let opCount = 0;

  const commitIfNeeded = async () => {
    if (opCount >= MAX_BATCH_SIZE) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
      opCount = 0;
    }
  };

  for (const sub of HOUSEHOLD_SUBCOLLECTIONS) {
    const snap = await getDocs(
      collection(db, "households", householdId, sub)
    );
    for (const docSnap of snap.docs) {
      currentBatch.delete(docSnap.ref);
      opCount++;
      await commitIfNeeded();
    }
  }

  // Delete the household document itself
  currentBatch.delete(doc(db, "households", householdId));
  opCount++;

  if (opCount > 0) {
    await currentBatch.commit();
  }
};

/** Remove a user from a household. If they are the last member, delete the household entirely. */
export const leaveHousehold = async (
  householdId: string,
  uid: string
): Promise<void> => {
  const household = await getHousehold(householdId);
  if (!household) throw new Error("Household not found");

  const isLastMember = household.members.length <= 1;

  if (isLastMember) {
    await deleteHouseholdCompletely(householdId);
  } else {
    await updateDoc(doc(db, "households", householdId), {
      members: arrayRemove(uid),
    });
  }

  // Null out the user's household_id
  await updateDoc(doc(db, "users", uid), { household_id: null });
};

/** Delete a user's Firestore profile document. */
export const deleteUserProfile = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, "users", uid));
};

// ─── Settlement subscriptions ────────────────────────────────────────────────

export const subscribeToSettlements = (
  householdId: string,
  callback: (settlements: SettlementEvent[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, "households", householdId, "settlements"),
    orderBy("settled_at", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const settlements = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as SettlementEvent));
      callback(settlements);
    },
    () => {
      // On error (e.g., missing index or permission), return empty array
      callback([]);
    }
  );
};
