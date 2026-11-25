// "use client";

// import { useState, useTransition } from "react";
// import { useRouter } from "next/navigation";
// import { Alert, Button, Card, Col, Form, Input, Row, message } from "antd";
// import { Mail, ShieldCheck, UserRound } from "lucide-react";
// import { saveMyStockistProfile } from "@/lib/stockist/settings-actions";
// import { PhoneInput, phoneRule } from "@/components/ui/phone-input";
// import {
//   COUNTRIES,
//   CountrySelect,
//   countryName,
// } from "@/components/ui/country-select";
// import type { StockistProfile } from "@/lib/stockist/settings-queries";

// // Profile card on the stockist Settings page. Same look as the affiliate
// // profile card. The stockist fills in the details the admin left empty:
// // phone, country and region (and may correct the business name).
// //
// // Email is the login identity, so it is shown but locked. The discount rate
// // is set by the admin and shown read-only. Status, notes and the login link
// // never appear here, and the save action cannot change them anyway.

// type FormValues = {
//   name: string;
//   email: string;
//   phone: string;
//   countryCode: string;
//   region: string;
  
// };

// const FORM_FIELDS: (keyof FormValues)[] = [
//   "name",
//   "phone",
//   "countryCode",
//   "region",
// ];

// // The database stores the country NAME (the admin pages show names), the
// // picker works with the ISO code. Convert once for the starting value.
// function codeFromName(name: string | null): string {
//   if (!name) return "";
//   const wanted = name.trim().toLowerCase();
//   return COUNTRIES.find((c) => c.name.toLowerCase() === wanted)?.code ?? "";
// }

// export function StockistProfileForm({ profile }: { profile: StockistProfile }) {
//   const router = useRouter();
//   const [form] = Form.useForm<FormValues>();
//   const [isPending, startTransition] = useTransition();
//   const [formError, setFormError] = useState<string | null>(null);

//   const incomplete = !profile.phone || !profile.country;
// const verified = !incomplete;
//   const initialValues: FormValues = {
//     name: profile.name,
//     email: profile.email,
//     phone: profile.phone ?? "",
//     countryCode: codeFromName(profile.country),
//     region: profile.region ?? "",
   
//   };

//   function handleFinish(values: FormValues) {
//     setFormError(null);

//     startTransition(async () => {
//       const result = await saveMyStockistProfile({
//         name: values.name,
//         phone: values.phone?.trim() || null,
//         country: values.countryCode ? countryName(values.countryCode) : null,
//         region: values.region?.trim() || null,
//       });

//       if (result.success) {
//         message.success("Profile saved");
//         router.refresh();
//         return;
//       }

//       setFormError(result.error);

//       // Show server-side field errors inline under the matching field.
//       // The action calls the country "country"; the form calls it
//       // "countryCode".
//       const mapped = Object.entries(result.fieldErrors ?? {})
//         .map(([key, messages]) => ({
//           name: (key === "country" ? "countryCode" : key) as keyof FormValues,
//           errors: messages,
//         }))
//         .filter((f) => FORM_FIELDS.includes(f.name));
//       if (mapped.length > 0) form.setFields(mapped);
//     });
//   }

//   return (
//     <Card
//     className="aff-card aff-antd-card overflow-hidden"
// bordered={false}
// title={
//   <div className="flex items-center gap-3">
//     <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950">
//       <UserRound className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
//     </span>
//     <div className="min-w-0 whitespace-normal leading-tight">
//       <div className="font-display text-[18px] font-semibold text-aff-green-900">
//         Profile
//       </div>
//       <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-aff-gold-600">
//         Finasto™ · Stockist
//       </div>
//     </div>
//   </div>
// }
// extra={
//   verified ? (
//     <span className="inline-flex items-center gap-1.5 rounded-full border border-aff-gold-500/50 bg-aff-ivory px-3 py-1 font-sans text-[12px] text-aff-green-900">
//       <ShieldCheck className="h-3.5 w-3.5 text-aff-gold-600" strokeWidth={1.8} aria-hidden="true" />
//       Verified profile
//     </span>
//   ) : (
//     <span className="font-sans text-[12px] text-aff-muted sm:text-[13px]">
//       Your contact details
//     </span>
//   )
// }
//     >
//       <Form<FormValues>
//         form={form}
//         layout="vertical"
//         // requiredMark="optional"
//         initialValues={initialValues}
//         onFinish={handleFinish}
//         scrollToFirstError={{ behavior: "smooth", block: "center" }}
//         disabled={isPending}
//       >
//         {incomplete && (
//           <Alert
//             type="warning"
//             showIcon
//             message="Complete your profile"
//             description="Add your phone number and country so the Finasto team can reach you."
//             className="mb-4"
//           />
//         )}

//         {formError && (
//           <Alert
//             type="error"
//             showIcon
//             closable
//             message={formError}
//             onClose={() => setFormError(null)}
//             className="mb-4"
//           />
//         )}

//         <Row gutter={[16, 8]}>
//           {/* Row 1: Name + Email */}
//           <Col xs={24} md={12}>
//             <Form.Item label="Name" name="name">
//               <Input disabled size="middle" />
//             </Form.Item>
//           </Col>

//           <Col xs={24} md={12}>
//             <Form.Item label="Email" name="email">
//               <Input
//                 prefix={<Mail className="h-4 w-4 text-warm-gray" />}
//                 disabled
//                 size="middle"
//               />
//             </Form.Item>
//           </Col>

//           {/* Row 2: Phone + Country */}
//           <Col xs={24} md={12}>
//             <Form.Item
//               label="Phone"
//               name="phone"
//               rules={[
//                 { required: true, message: "Enter your phone number" },
//                 phoneRule,
//               ]}
//             >
//               <PhoneInput />
//             </Form.Item>
//           </Col>

//           <Col xs={24} md={12}>
//             <Form.Item
//               label="Country"
//               name="countryCode"
//               rules={[{ required: true, message: "Select your country" }]}
//             >
//               <CountrySelect />
//             </Form.Item>
//           </Col>

//           {/* Row 3: Region / City */}
//           <Col xs={24}>
//             <Form.Item
//               label="Region / City"
//               name="region"
//               rules={[{ max: 60, message: "Max 60 characters" }]}
//             >
//               <Input placeholder="e.g. Punjab, Lahore" size="middle" />
//             </Form.Item>
//           </Col>
//         </Row>

//         {/* Bottom-right button */}
//         <div className="flex justify-end mt-4">
//           <Button
//             type="primary"
//             htmlType="submit"
//             loading={isPending}
//             size="large"
//           >
//             Save profile
//           </Button>
//         </div>
//       </Form>
//     </Card>
//   );
// }
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Col, Form, Input, Row, message } from "antd";
import { Camera, Loader2, Mail, ShieldCheck, Trash2, UserRound } from "lucide-react";
import {
  removeMyStockistAvatar,
  saveMyStockistProfile,
  uploadMyStockistAvatar,
} from "@/lib/stockist/settings-actions";
import { PhoneInput, phoneRule } from "@/components/ui/phone-input";
import {
  COUNTRIES,
  CountrySelect,
  countryName,
} from "@/components/ui/country-select";
import type { StockistProfile } from "@/lib/stockist/settings-queries";

// Profile card on the stockist Settings page. Same look as the affiliate
// profile card. The stockist fills in the details the admin left empty:
// phone, country and region (and may correct the business name).
//
// Email is the login identity, so it is shown but locked. The discount rate
// is set by the admin and shown read-only. Status, notes and the login link
// never appear here, and the save action cannot change them anyway.

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

// The database stores the country NAME (the admin pages show names), the
// picker works with the ISO code. Convert once for the starting value.
function codeFromName(name: string | null): string {
  if (!name) return "";
  const wanted = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === wanted)?.code ?? "";
}

export function StockistProfileForm({ profile }: { profile: StockistProfile }) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const incomplete = !profile.phone || !profile.country;
  const verified = !incomplete;

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
    const res = await uploadMyStockistAvatar(fd);
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
    const res = await removeMyStockistAvatar();
    setAvatarBusy(false);

    if (res.success) {
      message.success("Photo removed");
      router.refresh();
    } else {
      message.error(res.error);
    }
  }

  const initialValues: FormValues = {
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? "",
    countryCode: codeFromName(profile.country),
    region: profile.region ?? "",
  };

  function handleFinish(values: FormValues) {
    setFormError(null);

    startTransition(async () => {
      const result = await saveMyStockistProfile({
        name: values.name,
        phone: values.phone?.trim() || null,
        country: values.countryCode ? countryName(values.countryCode) : null,
        region: values.region?.trim() || null,
      });

      if (result.success) {
        message.success("Profile saved");
        router.refresh();
        return;
      }

      setFormError(result.error);

      // Show server-side field errors inline under the matching field.
      // The action calls the country "country"; the form calls it
      // "countryCode".
      const mapped = Object.entries(result.fieldErrors ?? {})
        .map(([key, messages]) => ({
          name: (key === "country" ? "countryCode" : key) as keyof FormValues,
          errors: messages,
        }))
        .filter((f) => FORM_FIELDS.includes(f.name));
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
          <div className="min-w-0 whitespace-normal leading-tight">
            <div className="font-display text-[18px] font-semibold text-aff-green-900">
              Profile
            </div>
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-aff-gold-600">
              Finasto™ · Stockist
            </div>
          </div>
        </div>
      }
      extra={
        verified ? (
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
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt="Your profile photo"
                className="h-full w-full object-cover"
              />
            ) : (
              (profile.name || profile.email || "S")
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

          {profile.avatarUrl && !avatarBusy && (
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
            {profile.name || "Stockist"}
          </p>
          <p className="truncate font-sans text-[12px] text-aff-cream-50/75">
            {profile.email}
          </p>
          <p className="mt-1 font-sans text-[11px] text-aff-cream-50/60">
            PNG, JPG or WebP, up to 2 MB
          </p>
        </div>
      </div>

      <Form<FormValues>
        form={form}
        layout="vertical"
        // requiredMark="optional"
        initialValues={initialValues}
        onFinish={handleFinish}
        scrollToFirstError={{ behavior: "smooth", block: "center" }}
        disabled={isPending}
      >
        {incomplete && (
          <Alert
            type="warning"
            showIcon
            message="Complete your profile"
            description="Add your phone number and country so the Finasto team can reach you."
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

        <Row gutter={[16, 8]}>
          {/* Row 1: Name + Email */}
          <Col xs={24} md={12}>
            <Form.Item label="Name" name="name">
              <Input disabled size="middle" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="Email" name="email">
              <Input
                prefix={<Mail className="h-4 w-4 text-aff-muted" />}
                disabled
                size="middle"
              />
            </Form.Item>
          </Col>

          {/* Row 2: Phone + Country */}
          <Col xs={24} md={12}>
            <Form.Item
              label="Phone"
              name="phone"
              rules={[
                { required: true, message: "Enter your phone number" },
                phoneRule,
              ]}
            >
              <PhoneInput />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Country"
              name="countryCode"
              rules={[{ required: true, message: "Select your country" }]}
            >
              <CountrySelect />
            </Form.Item>
          </Col>

          {/* Row 3: Region / City */}
          <Col xs={24}>
            <Form.Item
              label="Region / City"
              name="region"
              rules={[{ max: 60, message: "Max 60 characters" }]}
            >
              <Input placeholder="e.g. Punjab, Lahore" size="middle" />
            </Form.Item>
          </Col>
        </Row>

        {/* Bottom-right button */}
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