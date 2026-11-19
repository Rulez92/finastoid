"use client";

// Create / edit a partner announcement (for affiliates and/or stockists)
// in an Ant Design Modal. Same pattern as announcement-form.tsx.
//
// Flow: save the text first, then upload files ONE PER CALL. One file per
// call keeps every request under the 11 MB Server Action limit, and a failed
// upload never loses the announcement text.
// Browser checks (type, size) are for convenience only. The server action
// and the database check them again.

import { useState, useTransition } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Button,
  Upload,
  message,
  type UploadFile,
} from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  createPartnerAnnouncement,
  updatePartnerAnnouncement,
  uploadPartnerAnnouncementFiles,
  removePartnerAnnouncementFile,
  type PartnerAnnouncementInput,
} from "@/lib/admin/partner-announcement-actions";
import type {
  PartnerAnnouncementItem,
  PartnerAudience,
} from "@/lib/admin/partner-announcement-queries";

type FormValues = {
  title: string;
  body: string;
  audience: PartnerAudience;
  isActive: boolean;
  startsAt?: Dayjs | null;
  endsAt?: Dayjs | null;
};

type Props = {
  open: boolean;
  editing: PartnerAnnouncementItem | null;
  onClose: () => void;
};

const DATE_FORMAT = "DD MMM YYYY, HH:mm";
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const formatSize = (b: number) =>
  b >= 1024 * 1024
    ? `${(b / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

export function PartnerAnnouncementForm({ open, editing, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [msg, msgContext] = message.useMessage();
  const [pending, startTransition] = useTransition();

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  // Files the admin removed in this session (props are stale until refresh).
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const existingFiles = (editing?.files ?? []).filter(
    (f) => !removedIds.includes(f.id),
  );
  const slotsLeft = Math.max(0, MAX_FILES - existingFiles.length);

  const initialValues: FormValues = editing
    ? {
        title: editing.title,
        body: editing.body,
        audience: editing.audience,
        isActive: editing.isActive,
        startsAt: editing.startsAt ? dayjs(editing.startsAt) : null,
        endsAt: editing.endsAt ? dayjs(editing.endsAt) : null,
      }
    : {
        title: "",
        body: "",
        audience: "both",
        isActive: true,
        startsAt: null,
        endsAt: null,
      };

  async function handleRemoveExisting(fileId: string) {
    setRemovingId(fileId);
    const res = await removePartnerAnnouncementFile(fileId);
    setRemovingId(null);
    if (!res.success) {
      msg.error(res.error);
      return;
    }
    setRemovedIds((prev) => [...prev, fileId]);
  }

  function handleFinish(values: FormValues) {
    const payload: PartnerAnnouncementInput = {
      title: values.title,
      body: values.body ?? "",
      audience: values.audience,
      isActive: values.isActive,
      // toISOString() = UTC, correct whatever timezone the admin picked.
      startsAt: values.startsAt ? values.startsAt.toISOString() : null,
      endsAt: values.endsAt ? values.endsAt.toISOString() : null,
    };

    startTransition(async () => {
      const res = editing
        ? await updatePartnerAnnouncement(editing.id, payload)
        : await createPartnerAnnouncement(payload);

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

      const announcementId = res.announcementId ?? editing?.id;
      const toUpload = fileList
        .map((f) => f.originFileObj)
        .filter((f): f is NonNullable<typeof f> => !!f);

      // Upload one file per call (keeps each request small).
      let failed: string | null = null;
      if (announcementId) {
        for (const file of toUpload) {
          const fd = new FormData();
          fd.append("files", file);
          const up = await uploadPartnerAnnouncementFiles(announcementId, fd);
          if (!up.success) {
            failed = up.error;
            break;
          }
        }
      }

      if (failed) {
        // Text is already saved. Keep the modal open so the admin can retry.
        msg.warning(`Announcement saved, but a file failed: ${failed}`, 6);
        return;
      }

      msg.success(editing ? "Announcement updated" : "Announcement created");
      onClose();
    });
  }

  return (
    <>
      {msgContext}
      <Modal
        open={open}
        title={editing ? "Edit partner announcement" : "New partner announcement"}
        onCancel={onClose}
        footer={null}
        destroyOnHidden
        afterClose={() => {
          setFileList([]);
          setRemovedIds([]);
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
            name="audience"
            label="Send to"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "both", label: "Affiliates and stockists" },
                { value: "affiliates", label: "Affiliates only" },
                { value: "stockists", label: "Stockists only" },
              ]}
            />
          </Form.Item>

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
              placeholder="e.g. New commission tiers from December"
            />
          </Form.Item>

          <Form.Item
            name="body"
            label="Message (optional)"
            rules={[{ max: 5000, message: "Maximum 5000 characters" }]}
          >
            <Input.TextArea
              rows={5}
              maxLength={5000}
              showCount
              placeholder="Write the announcement. Plain text only."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* Files already saved (edit mode) */}
          {existingFiles.length > 0 && (
            <div className="mb-4">
              <div className="mb-1 text-[14px]">Attached files</div>
              <ul className="flex flex-col gap-1">
                {existingFiles.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-[13px]"
                  >
                    <span className="min-w-0 truncate">
                      {f.fileName}{" "}
                      <span className="text-neutral-500">
                        ({formatSize(f.sizeBytes)})
                      </span>
                    </span>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={removingId === f.id}
                      onClick={() => handleRemoveExisting(f.id)}
                      aria-label={`Remove ${f.fileName}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Form.Item
            label={`Add files (PDF, PNG, JPG, WebP · 10 MB each · ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left)`}
          >
            <Upload
              multiple
              fileList={fileList}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              beforeUpload={(file, list) => {
                if (!ALLOWED.includes(file.type)) {
                  msg.error(`${file.name}: only PDF, PNG, JPG or WebP.`);
                  return Upload.LIST_IGNORE;
                }
                if (file.size > MAX_BYTES) {
                  msg.error(`${file.name} is larger than 10 MB.`);
                  return Upload.LIST_IGNORE;
                }
                if (fileList.length + list.indexOf(file) + 1 > slotsLeft) {
                  msg.error(`You can attach ${MAX_FILES} files in total.`);
                  return Upload.LIST_IGNORE;
                }
                return false; // do not auto-upload; we send on save
              }}
              onChange={({ fileList: next }) => setFileList(next)}
            >
              <Button
                icon={<UploadOutlined />}
                disabled={pending || fileList.length >= slotsLeft}
              >
                Choose files
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item name="startsAt" label="Starts (optional)">
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format={DATE_FORMAT}
              needConfirm={false}
              style={{ width: "100%" }}
              placeholder="Show immediately"
            />
          </Form.Item>

          <Form.Item
            name="endsAt"
            label="Ends (optional)"
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
              placeholder="Never expires"
            />
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={pending}>
              {editing ? "Save changes" : "Publish"}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}