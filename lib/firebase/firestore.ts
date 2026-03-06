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
import { DEFAULT_CATEGORIES, DEFAULT_GROUPS } from "../seed/defaults";
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

  // Step 3: Seed default groups and categories in a batch (household doc now exists).
  // Non-blocking: if seeding fails (e.g. Firestore rules), the household still exists
  // and the user can add groups/categories manually later.
  try {
    const seedBatch = writeBatch(db);

    // Create groups and capture the default group's ID for category seeding (F-09)
    let defaultGroupId: string | null = null;
    for (const group of DEFAULT_GROUPS) {
      const groupRef = doc(collection(db, "households", householdRef.id, "groups"));
      seedBatch.set(groupRef, group);
      if (group.is_default) {
        defaultGroupId = groupRef.id;
      }
    }

    // Seed categories with group_id pointing to the default group (F-09)
    for (const cat of DEFAULT_CATEGORIES) {
      const catRef = doc(collection(db, "households", householdRef.id, "categories"));
      seedBatch.set(catRef, {
        ...cat,
        ...(defaultGroupId ? { group_id: defaultGroupId } : {}),
      });
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
): Promise<{ id: string } | null> => {
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

  // Strategy: Look up invite code via the invite_codes collection (document ID = code).
  // This avoids a collection query on households which gets blocked by security rules
  // when the user isn't a member of any household.
  try {
    const inviteSnap = await getDoc(doc(db, "invite_codes", trimmedCode));
    console.log("[InviteDebug] invite_codes lookup", {
      exists: inviteSnap.exists(),
      data: inviteSnap.exists() ? inviteSnap.data() : null,
    });
    if (inviteSnap.exists()) {
      const householdId = inviteSnap.data()?.household_id;
      if (householdId) {
        console.log("[InviteDebug] Found household via invite_codes:", householdId);
        return { id: householdId };
      }
    }
  } catch (err) {
    console.error("[InviteDebug] invite_codes lookup failed:", err);
  }

  // Fallback: try the old collection query (works if user has permission)
  try {
    const q = query(
      collection(db, "households"),
      where("invite_code", "==", trimmedCode)
    );
    const snap = await getDocs(q);
    console.log("[InviteDebug] Fallback query result", {
      empty: snap.empty,
      size: snap.size,
    });
    if (snap.empty) return null;
    const result = { id: snap.docs[0].id, ...snap.docs[0].data() } as { id: string };
    console.log("[InviteDebug] Found household via fallback:", snap.docs[0].id);
    return result;
  } catch (err) {
    console.error("[InviteDebug] Fallback query also FAILED:", err);
    return null;
  }
};

export const joinHousehold = async (
  householdId: string,
  uid: string
): Promise<"success" | "full" | "expired"> => {
  console.log("[InviteDebug] joinHousehold called", { householdId, uid });
  const snap = await getDoc(doc(db, "households", householdId));
  if (!snap.exists()) {
    console.log("[InviteDebug] Household does not exist:", householdId);
    return "expired";
  }

  const data = snap.data();
  if (!data) {
    console.log("[InviteDebug] Household data is null");
    return "expired";
  }
  const now = Timestamp.now();

  console.log("[InviteDebug] joinHousehold validation", {
    invite_expires_at: data.invite_expires_at?.toDate?.()?.toISOString(),
    now: now.toDate().toISOString(),
    isExpired: !data.invite_expires_at || data.invite_expires_at.toMillis() < now.toMillis(),
    members: data.members,
    memberCount: data.members?.length,
    isFull: !data.members || data.members.length >= 2,
  });

  if (!data.invite_expires_at || data.invite_expires_at.toMillis() < now.toMillis()) return "expired";
  if (!data.members || data.members.length >= 2) return "full";

  await updateDoc(doc(db, "households", householdId), {
    members: arrayUnion(uid),
  });
  // Update both household_id (active) and household_ids (all)
  await updateDoc(doc(db, "users", uid), {
    household_id: householdId,
    household_ids: arrayUnion(householdId),
  });

  console.log("[InviteDebug] joinHousehold SUCCESS");
  return "success";
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
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) users.push(snap.data() as User);
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
