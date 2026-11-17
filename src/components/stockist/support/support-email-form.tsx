"use client";

// Save as: components/stockist/support/support-email-form.tsx

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import {
  submitSupportRequest,
  type SupportState,
} from "@/lib/stockist/support-actions";
import { SUPPORT_TEXT } from "@/lib/stockist/support-copy";

const initial: SupportState = { ok: false };
const TEXT = SUPPORT_TEXT.form;

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 2000;

const fieldClass =
  "w-full rounded-xl border border-aff-border bg-aff-ivory/60 px-3.5 py-3 text-start font-sans text-[16px] text-aff-green-900 shadow-[inset_0_1px_2px_rgba(3,24,7,0.04)] outline-none transition-colors duration-200 placeholder:text-aff-muted/60 hover:border-aff-gold-500 focus:border-aff-gold-600 focus:bg-white focus:ring-4 focus:ring-aff-gold-400/20 disabled:cursor-not-allowed disabled:bg-aff-ivory disabled:text-aff-muted aria-[invalid=true]:border-[#A3342B] aria-[invalid=true]:ring-[rgba(190,60,50,0.15)] sm:text-[14px]";

function Counter({ value, max }: { value: number; max: number }) {
  const nearLimit = value >= max * 0.9;
  return (
    <span
      aria-hidden="true"
      className={`font-sans text-[11px] tabular-nums ${
        nearLimit ? "font-semibold text-[#A3342B]" : "text-aff-muted"
      }`}
    >
      {value}/{max}
    </span>
  );
}

export function SupportEmailForm({ replyTo }: { replyTo: string }) {
  const [state, formAction, isPending] = useActionState(
    submitSupportRequest,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const [subjectLen, setSubjectLen] = useState(
    state.values?.subject?.length ?? 0,
  );
  const [messageLen, setMessageLen] = useState(
    state.values?.message?.length ?? 0,
  );

  // Success banner hides as soon as the user starts typing again.
  const [dismissed, setDismissed] = useState<SupportState | null>(null);
  const showSuccess = state.ok && dismissed !== state;

  // After a failed send, move focus to the first field with an error.
  useEffect(() => {
    if (!state.fieldErrors) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state.fieldErrors]);

  // After a successful send the form is cleared, so reset the counters.
  useEffect(() => {
    if (state.ok) {
      setSubjectLen(0);
      setMessageLen(0);
    }
  }, [state.ok]);

  function pickTopic(subject: string) {
    const el = subjectRef.current;
    if (!el) return;
    el.value = subject;
    setSubjectLen(subject.length);
    if (state.ok) setDismissed(state);
    el.focus();
  }

  const subjectError = state.fieldErrors?.subject;
  const messageError = state.fieldErrors?.message;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4"
      noValidate
      aria-busy={isPending}
      onInput={() => {
        if (state.ok) setDismissed(state);
      }}
    >
      {showSuccess && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-[rgba(47,158,107,0.3)] bg-[rgba(47,158,107,0.1)] px-4 py-3 font-sans text-[13px] text-[#1F7A52]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {TEXT.sent} <bdi>{replyTo}</bdi>.
          </span>
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-[rgba(190,60,50,0.3)] bg-[rgba(190,60,50,0.06)] px-4 py-3 font-sans text-[13px] font-medium text-[#A3342B]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{state.error}</span>
        </div>
      )}

      {/* Quick topics: fill the subject so the stockist types less. */}
      <div
        role="group"
        aria-label={TEXT.topics}
        className="flex flex-wrap items-center gap-2"
      >
        {SUPPORT_TEXT.topicChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            disabled={isPending}
            onClick={() => pickTopic(chip.subject)}
            className="touch-manipulation rounded-full border border-aff-border bg-aff-ivory/60 px-3.5 py-1.5 font-sans text-[12px] font-medium text-aff-green-900 transition-colors duration-200 hover:border-aff-gold-500 hover:bg-aff-gold-400/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aff-gold-400/30 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label
            htmlFor="support-subject"
            className="font-sans text-[13px] font-medium text-aff-green-900"
          >
            {TEXT.subject}
          </label>
          <Counter value={subjectLen} max={SUBJECT_MAX} />
        </div>
        <input
          ref={subjectRef}
          id="support-subject"
          name="subject"
          dir="auto"
          autoComplete="off"
          maxLength={SUBJECT_MAX}
          defaultValue={state.values?.subject}
          onChange={(e) => setSubjectLen(e.target.value.length)}
          placeholder={TEXT.subjectPlaceholder}
          className={fieldClass}
          disabled={isPending}
          aria-invalid={subjectError ? true : undefined}
          aria-describedby={subjectError ? "support-subject-error" : undefined}
        />
        {subjectError && (
          <p
            id="support-subject-error"
            className="mt-1 font-sans text-[12px] text-[#A3342B]"
          >
            {subjectError}
          </p>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label
            htmlFor="support-message"
            className="font-sans text-[13px] font-medium text-aff-green-900"
          >
            {TEXT.message}
          </label>
          <Counter value={messageLen} max={MESSAGE_MAX} />
        </div>
        <textarea
          id="support-message"
          name="message"
          dir="auto"
          rows={8}
          maxLength={MESSAGE_MAX}
          defaultValue={state.values?.message}
          onChange={(e) => setMessageLen(e.target.value.length)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          placeholder={TEXT.messagePlaceholder}
          className={`${fieldClass} min-h-[180px] resize-y`}
          disabled={isPending}
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? "support-message-error" : undefined}
        />
        {messageError && (
          <p
            id="support-message-error"
            className="mt-1 font-sans text-[12px] text-[#A3342B]"
          >
            {messageError}
          </p>
        )}
      </div>

      {/* Honeypot: real users never see or fill this. Bots do. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="flex flex-col gap-3 border-t border-aff-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-words font-sans text-[12px] text-aff-muted">
            {TEXT.repliesGoTo}{" "}
            <bdi className="font-medium text-aff-green-900">{replyTo}</bdi>
          </p>
          <p className="mt-0.5 hidden font-sans text-[11px] text-aff-muted/80 sm:block">
            {TEXT.shortcut}
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 px-6 font-sans text-[14px] font-semibold text-aff-green-950 shadow-[0_10px_26px_-14px_rgba(172,131,78,0.8)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aff-gold-400/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:w-auto sm:min-w-[170px] [@media(hover:hover)]:hover:brightness-105"
        >
          {isPending ? (
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {isPending ? TEXT.sending : TEXT.send}
        </button>
      </div>
    </form>
  );
}