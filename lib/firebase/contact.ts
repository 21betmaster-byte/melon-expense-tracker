import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./config";
import type { ContactSubject } from "@/types";

interface SubmitContactMessageData {
  user_id: string;
  user_email: string;
  household_id: string;
  subject: ContactSubject;
  message: string;
}

export const submitContactMessage = async (
  data: SubmitContactMessageData
): Promise<string> => {
  const ref = await addDoc(collection(db, "contact_messages"), {
    ...data,
    created_at: serverTimestamp(),
    status: "unread",
  });
  return ref.id;
};
