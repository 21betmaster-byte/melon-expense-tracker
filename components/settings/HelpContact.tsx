"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { submitContactMessage } from "@/lib/firebase/contact";
import type { ContactSubject } from "@/types";

const SUBJECTS: { value: ContactSubject; label: string }[] = [
  { value: "Bug Report", label: "Bug Report" },
  { value: "Feature Request", label: "Feature Request" },
  { value: "General", label: "General" },
  { value: "Other", label: "Other" },
];

const MAX_LENGTH = 1000;

export const HelpContact = () => {
  const { user } = useAppStore();
  const [subject, setSubject] = useState<ContactSubject>("General");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user || !message.trim()) return;
    setSending(true);
    try {
      await submitContactMessage({
        user_id: user.uid,
        user_email: user.email,
        household_id: user.household_id ?? "",
        subject,
        message: message.trim().slice(0, MAX_LENGTH),
      });
      toast.success("Message sent! We'll get back to you soon.");
      setMessage("");
      setSubject("General");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800" data-testid="help-contact-card">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
          <HelpCircle className="w-4 h-4 text-yellow-400" />
          Help & Contact
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          Send us a message and we&apos;ll get back to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* User email (read-only) */}
        <p
          className="text-xs text-slate-500"
          data-testid="help-user-email"
        >
          From: {user?.email}
        </p>

        {/* Subject */}
        <Select
          value={subject}
          onValueChange={(v) => setSubject(v as ContactSubject)}
        >
          <SelectTrigger
            className="bg-slate-800 border-slate-700"
            data-testid="help-subject-select"
          >
            <SelectValue placeholder="Select a topic" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Message */}
        <div className="space-y-1">
          <Textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value.slice(0, MAX_LENGTH))
            }
            placeholder="Describe your issue or suggestion…"
            className="bg-slate-800 border-slate-700 min-h-[100px]"
            data-testid="help-message-input"
          />
          <p
            className="text-xs text-slate-600 text-right"
            data-testid="help-char-count"
          >
            {message.length} / {MAX_LENGTH}
          </p>
        </div>

        {/* Send */}
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="w-full gap-1.5"
          data-testid="help-send-btn"
        >
          {sending ? (
            "Sending…"
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Send Message
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
