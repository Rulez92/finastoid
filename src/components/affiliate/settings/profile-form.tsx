"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Col, Form, Input, Row, message } from "antd";
import { Camera, Loader2, Lock, Mail, ShieldCheck, Trash2, UserRound } from "lucide-react";
import {
  completeMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  removeMyAvatar,
} from "@/lib/affiliate/settings-actions";
import { PhoneInput, phoneRule } from "@/components/ui/phone-input";
import { CountrySelect, countryName } from "@/components/ui/country-select";
import { countryToCurrency } from "@/lib/currency";
import type { MySettings } from "@/lib/affiliate/settings-queries";

// Profile card on the affiliate Settings page. The affiliate fills in the
// details the admin deliberately left empty: phone, country and region.
// Email is the login identity, so it is shown but locked. Commission,
// status and stockist are admin-only and do not appear here at all.

type FormValues = {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  region: string;
};

const FORM_FIELDS: (keyof FormValues)[] = [
  "name",
  "phone",
  "countryCode",
  "region",
];

export function ProfileForm({
  settings,
}: {
  settings: Pick<
    MySettings,
    | "name"
    | "email"
    | "phone"
    | "countryCode"
    | "displayCurrency"
    | "profileLocked"
    | "region"
    | "avatarUrl"
  >;
}) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const locked = settings.profileLocked;

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;

    // Browser checks are for convenience only. The server checks again.
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      message.error("Only PNG, JPG or WebP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error("The image must be 2 MB or smaller.");
      return;
    }

    setAvatarBusy(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await uploadMyAvatar(fd);
    setAvatarBusy(false);

    if (res.success) {
      message.success("Photo updated");
      router.refresh();
    } else {
      message.error(res.error);
    }
  }

  async function handleAvatarRemove() {
    setAvatarBusy(true);
    const res = await removeMyAvatar();
    setAvatarBusy(false);

    if (res.success) {
      message.success("Photo removed");
      router.refresh();
    } else {
      message.error(res.error);
    }
  }

  const initialValues: FormValues = {
    name: settings.name ?? "",
    email: settings.email,
    phone: settings.phone ?? "",
    countryCode: settings.countryCode ?? "",
    region: settings.region ?? "",
  };

  // Preview only. The database sets the real currency from the country.
  const watchedCountry = Form.useWatch("countryCode", form);
  const previewCurrency = countryToCurrency(watchedCountry);

  function handleFinish(values: FormValues) {
    setFormError(null);

    startTransition(async () => {
      // First save: username, phone and country go through one locked,
      // one-time action. After that only name and region can change.
      const first = locked
        ? null
        : await completeMyProfile({
            name: values.name,
            phone: values.phone,
            countryCode: values.countryCode,
            countryName: countryName(values.countryCode),
          });
      if (first?.success) router.refresh();

      const result =
        first && !first.success
          ? first
          : await updateMyProfile({
              region: values.region ?? "",
            });

      if (result.success) {
        message.success("Profile saved");
        router.refresh();
        return;
      }

      setFormError(result.error);

      // Show server-side field errors inline under the matching field.
      const mapped = Object.entries(result.fieldErrors ?? {})
        .filter(([key]) => (FORM_FIELDS as string[]).includes(key))
        .map(([key, messages]) => ({
          name: key as keyof FormValues,
          errors: messages,
        }));
      if (mapped.length > 0) form.setFields(mapped);
    });
  }

  return (
        <Card
      className="aff-card aff-antd-card overflow-hidden"
      bordered={false}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950">
            <UserRound className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-tight">
            <div>Profile</div>
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-aff-gold-600">
              Finasto™ · Brand Affiliate
            </div>
          </div>
        </div>
      }
      extra={
        locked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-aff-gold-500/50 bg-aff-ivory px-3 py-1 font-sans text-[12px] text-aff-green-900">
            <ShieldCheck className="h-3.5 w-3.5 text-aff-gold-600" strokeWidth={1.8} aria-hidden="true" />
            Verified profile
          </span>
        ) : (
          <span className="font-sans text-[12px] text-aff-muted sm:text-[13px]">
            Your contact details
          </span>
        )
      }
    >
      {/* Identity strip */}
      <div className="relative mb-5 flex items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
        />
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarBusy}
            aria-label="Change profile photo"
            className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-aff-ivory font-sans text-[16px] font-semibold text-aff-green-900 ring-2 ring-aff-gold-500/70 transition-shadow hover:ring-aff-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aff-gold-300 disabled:cursor-wait"
          >
            {settings.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.avatarUrl}
                alt="Your profile photo"
                className="h-full w-full object-cover"
              />
            ) : (
              (settings.name || settings.email || "A")
                .trim()
                .slice(0, 2)
                .toUpperCase()
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-aff-green-950/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {avatarBusy ? (
                <Loader2 className="h-5 w-5 animate-spin text-aff-gold-300" />
              ) : (
                <Camera className="h-5 w-5 text-aff-gold-300" strokeWidth={1.8} />
              )}
            </span>
          </button>

          {settings.avatarUrl && !avatarBusy && (
            <button
              type="button"
              onClick={handleAvatarRemove}
              aria-label="Remove profile photo"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-aff-gold-500/60 bg-aff-green-950 text-aff-gold-300 transition-colors hover:bg-aff-gold-300 hover:text-aff-green-950"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.8} />
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarPick}
            className="hidden"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[18px] leading-tight text-aff-gold-300">
            {settings.name || "Brand Promoter"}
          </p>
          <p className="truncate font-sans text-[12px] text-aff-cream-50/75">
            {settings.email}
          </p>
        </div>
      </div>
      <Form<FormValues>
        form={form}
        layout="vertical"
       
        initialValues={initialValues}
        onFinish={handleFinish}
        scrollToFirstError={{ behavior: "smooth", block: "center" }}
        disabled={isPending}
      >
        {!locked && (
          <Alert
            type="warning"
            showIcon
            message="Complete your profile"
            description="Choose your username, phone number and country carefully. They can only be set once. Your country also decides the currency your prices are shown in."
            className="mb-4"
          />
        )}

        {formError && (
          <Alert
            type="error"
            showIcon
            closable
            message={formError}
            onClose={() => setFormError(null)}
            className="mb-4"
          />
        )}

        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: !locked, message: "Choose a name" }]}
          extra={
            locked
              ? ""
              : "Letters, numbers and underscore. Cannot be changed later."
          }
        >
          <Input
            disabled={locked}
            maxLength={30}
            placeholder="e.g. ali_sales"
          />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          extra="Your email is your login and can't be changed here."
        >
          <Input
            prefix={
              <Mail
                className="h-4 w-4 text-aff-muted"
                strokeWidth={1.6}
                aria-hidden="true"
              />
            }
            disabled
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Phone"
              name="phone"
             rules={[{ required: !locked, message: "Enter your phone number" }, phoneRule]}
              
            >
              <PhoneInput disabled={locked} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Country"
              name="countryCode"
              rules={[{ required: !locked, message: "Select your country" }]}
             
            >
              <CountrySelect disabled={locked} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          
          label="Region / City"
          name="region"
          rules={[{ required: !locked, max: 60, message: "Max 60 characters" }]}
        >
          <Input disabled={locked} placeholder="e.g. Punjab, Lahore" />
        </Form.Item>

                <div className="flex justify-end border-t border-aff-border pt-4">
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            size="large"
            className="w-full sm:w-auto sm:min-w-[160px]"
          >
            Save profile
          </Button>
        </div>
      </Form>
    </Card>
  );
}
