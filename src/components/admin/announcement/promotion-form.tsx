"use client";

// Create / edit a promotion (stockists only) in an Ant Design Modal.
// Same pattern as partner-announcement-form.tsx.
//
// Flow: save the text first, then upload the banner in a separate call, so a
// failed upload never loses the promotion text. If the banner fails, the
// modal stays open; the saved id is remembered so a retry UPDATES the
// promotion instead of creating a duplicate.
// Browser checks (type, size) are for convenience only. The server action
// and the database check them again.

import { useState, useTransition } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Upload,
  message,
  type UploadFile,
} from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  createPromotion,
  updatePromotion,
  uploadPromotionBanner,
  removePromotionBanner,
  type PromotionInput,
} from "@/lib/admin/promotion-actions";
import type {
  PromotionItem,
  PromotionOfferType,
  PromotionTargetUnit,
} from "@/lib/admin/promotion-queries";

type FormValues = {
  title: string;
  offerType: PromotionOfferType;
  description: string;
  rewardDetails: string;
  targetValue: number | null;
  targetUnit: PromotionTargetUnit;
  terms: string;
  startsAt?: Dayjs | null;
  endsAt?: Dayjs | null;
};

type Props = {
  open: boolean;
  editing: PromotionItem | null;
  onClose: () => void;
};

const DATE_FORMAT = "DD MMM YYYY, HH:mm";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export function PromotionForm({ open, editing, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [msg, msgContext] = message.useMessage();
  const [pending, startTransition] = useTransition();

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  // Set once the text is saved, so a banner retry updates instead of creating.
  const [savedId, setSavedId] = useState<string | null>(null);
  // Banner removed in this session (props are stale until refresh).
  const [bannerRemoved, setBannerRemoved] = useState(false);
  const [removingBanner, setRemovingBanner] = useState(false);

  const existingBannerUrl =
    editing?.bannerUrl && !bannerRemoved ? editing.bannerUrl : null;

  const initialValues: FormValues = editing
    ? {
        title: editing.title,
        offerType: editing.offerType,
        description: editing.description,
        rewardDetails: editing.rewardDetails,
        targetValue: editing.targetValue,
        targetUnit: editing.targetUnit,
        terms: editing.terms,
        startsAt: editing.startsAt ? dayjs(editing.startsAt) : null,
        endsAt: editing.endsAt ? dayjs(editing.endsAt) : null,
      }
    : {
        title: "",
        offerType: "free_tour",
        description: "",
        rewardDetails: "",
        targetValue: null,
        targetUnit: "units",
        terms: "",
        startsAt: null,
        endsAt: null,
      };

  async function handleRemoveBanner() {
    if (!editing) return;
    setRemovingBanner(true);
    const res = await removePromotionBanner(editing.id);
    setRemovingBanner(false);
    if (!res.success) {
      msg.error(res.error);
      return;
    }
    setBannerRemoved(true);
  }

  function handleFinish(values: FormValues) {
    const payload: PromotionInput = {
      title: values.title,
      offerType: values.offerType,
      description: values.description ?? "",
      rewardDetails: values.rewardDetails ?? "",
      targetValue: values.targetValue ?? null,
      targetUnit: values.targetUnit,
      terms: values.terms ?? "",
      // toISOString() = UTC, correct whatever timezone the admin picked.
      startsAt: values.startsAt ? values.startsAt.toISOString() : null,
      endsAt: values.endsAt ? values.endsAt.toISOString() : null,
    };

    startTransition(async () => {
      const existingId = editing?.id ?? savedId;

      const res = existingId
        ? await updatePromotion(existingId, payload)
        : await createPromotion(payload);

      if (!res.success) {
        if (res.fieldErrors) {
          form.setFields(
            Object.entries(res.fieldErrors).map(([name, errors]) => ({
              name: name as keyof FormValues,
              errors,
            })),
          );
        }
        msg.error(res.error);
        return;
      }

      const promotionId = res.promotionId ?? existingId;
      if (promotionId) setSavedId(promotionId);

      const banner = fileList[0]?.originFileObj;
      if (banner && promotionId) {
        const fd = new FormData();
        fd.append("banner", banner);
        const up = await uploadPromotionBanner(promotionId, fd);

        if (!up.success) {
          // Text is already saved. Keep the modal open so the admin can retry.
          msg.warning(`Promotion saved, but the banner failed: ${up.error}`, 6);
          return;
        }
      }

      msg.success(editing ? "Promotion updated" : "Promotion created (draft)");
      onClose();
    });
  }

  return (
    <>
      {msgContext}
      <Modal
        open={open}
        title={editing ? "Edit promotion" : "New promotion"}
        onCancel={onClose}
        footer={null}
        destroyOnHidden
        afterClose={() => {
          setFileList([]);
          setSavedId(null);
          setBannerRemoved(false);
        }}
        maskClosable={!pending}
        width="min(600px, calc(100vw - 32px))"
        style={{ top: 16 }}
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleFinish}
          disabled={pending}
          requiredMark={false}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[
              { required: true, whitespace: true, message: "Title is required" },
              { max: 150, message: "Maximum 150 characters" },
            ]}
          >
            <Input
              maxLength={150}
              showCount
              placeholder="e.g. Sell 500 units, win a free Bali tour"
            />
          </Form.Item>

          <Form.Item
            name="offerType"
            label="Offer type"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "free_tour", label: "Free tour" },
                { value: "cash_prize", label: "Cash prize" },
                { value: "bonus", label: "Bonus" },
                { value: "discount", label: "Discount" },
                { value: "other", label: "Other" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="rewardDetails"
            label="Reward (optional)"
            rules={[{ max: 1000, message: "Maximum 1000 characters" }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              maxLength={1000}
              showCount
              placeholder="e.g. 5-day Bali tour for 2, flights and hotel included"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Details (optional)"
            rules={[{ max: 5000, message: "Maximum 5000 characters" }]}
          >
            <Input.TextArea
              rows={4}
              maxLength={5000}
              showCount
              placeholder="Explain the promotion. Plain text only."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* Target is shown to stockists as text. Nothing is tracked yet. */}
          <Form.Item label="Target (optional)">
            <div className="flex gap-2">
              <Form.Item name="targetValue" noStyle>
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  placeholder="e.g. 500"
                />
              </Form.Item>
              <Form.Item name="targetUnit" noStyle>
                <Select
                  style={{ width: 130 }}
                  options={[
                    { value: "units", label: "Units" },
                    { value: "amount", label: "Amount" },
                  ]}
                />
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item
            name="terms"
            label="Terms (optional)"
            rules={[{ max: 5000, message: "Maximum 5000 characters" }]}
          >
            <Input.TextArea
              rows={3}
              maxLength={5000}
              showCount
              placeholder="Conditions, eligibility, how winners are chosen"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* Banner already saved (edit mode) */}
          {existingBannerUrl && (
            <div className="mb-4">
              <div className="mb-1 text-[14px]">Current banner</div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingBannerUrl}
                  alt="Current promotion banner"
                  className="h-16 w-auto max-w-[70%] rounded object-cover"
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={removingBanner}
                  onClick={handleRemoveBanner}
                  aria-label="Remove banner"
                />
              </div>
            </div>
          )}

          <Form.Item
            label={`${existingBannerUrl ? "Replace banner" : "Banner image"} (PNG, JPG, WebP · 5 MB)`}
          >
            <Upload
              maxCount={1}
              listType="picture"
              fileList={fileList}
              accept=".png,.jpg,.jpeg,.webp"
              beforeUpload={(file) => {
                if (!ALLOWED.includes(file.type)) {
                  msg.error(`${file.name}: only PNG, JPG or WebP.`);
                  return Upload.LIST_IGNORE;
                }
                if (file.size > MAX_BYTES) {
                  msg.error(`${file.name} is larger than 5 MB.`);
                  return Upload.LIST_IGNORE;
                }
                return false; // do not auto-upload; we send on save
              }}
              onChange={({ fileList: next }) => setFileList(next.slice(-1))}
            >
              <Button icon={<UploadOutlined />} disabled={pending}>
                Choose image
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item name="startsAt" label="Starts (needed to publish)">
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format={DATE_FORMAT}
              needConfirm={false}
              style={{ width: "100%" }}
              placeholder="Pick start date"
            />
          </Form.Item>

          <Form.Item
            name="endsAt"
            label="Ends (needed to publish)"
            dependencies={["startsAt"]}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value?: Dayjs | null) => {
                  const start = getFieldValue("startsAt") as
                    | Dayjs
                    | null
                    | undefined;
                  if (!value || !start || value.isAfter(start)) {
                    return Promise.resolve();
                  }
                  return Promise.reject("End must be after start");
                },
              }),
            ]}
          >
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format={DATE_FORMAT}
              needConfirm={false}
              style={{ width: "100%" }}
              placeholder="Pick end date"
            />
          </Form.Item>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={pending}>
              {editing ? "Save changes" : "Save as draft"}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}