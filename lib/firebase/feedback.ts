import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

interface SubmitFeedbackData {
  user_id: string;
  user_email: string;
  household_id: string;
  rating: number;
  comment?: string;
  trigger: string;
}

export const submitFeedback = async (
  data: SubmitFeedbackData
): Promise<string> => {
  const ref = await addDoc(collection(db, "feedback"), {
    ...data,
    created_at: serverTimestamp(),
  });
  return ref.id;
};
