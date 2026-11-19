"use client";

// Admin list of partner announcements (for affiliates and/or stockists).
// Same pattern as announcement-table.tsx: the server page passes `items`,
// and after any action the server calls revalidatePath so new props arrive.

import { useEffect, useState, useTransition } from "react";
import {
  Button,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  type TableProps,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  deletePartnerAnnouncement,
  setPartnerAnnouncementActive,
} from "@/lib/admin/partner-announcement-actions";
import type {
  PartnerAnnouncementItem,
  PartnerAudience,
} from "@/lib/admin/partner-announcement-queries";
import { PartnerAnnouncementForm } from "./partner-announcement-form";

const DATE_FORMAT = "DD MMM YYYY, HH:mm";

const AUDIENCE_LABEL: Record<PartnerAudience, string> = {
  both: "Affiliates + Stockists",
  affiliates: "Affiliates",
  stockists: "Stockists",
};

function getStatus(item: PartnerAnnouncementItem, now: number) {
  if (!item.isActive) return { label: "Off", color: "default" };
  if (item.endsAt && Date.parse(item.endsAt) <= now)
    return { label: "Expired", color: "red" };
  if (item.startsAt && Date.parse(item.startsAt) > now)
    return { label: "Scheduled", color: "blue" };
  return { label: "Live", color: "green" };
}

export function PartnerAnnouncementTable({
  items,
}: {
  items: PartnerAnnouncementItem[];
}) {
  const [msg, msgContext] = message.useMessage();
  const [modal, modalContext] = Modal.useModal();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerAnnouncementItem | null>(null);

  // Status and dates depend on the current time and the viewer's timezone.
  // Render them only after mount to avoid a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), [items]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: PartnerAnnouncementItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function handleToggle(item: PartnerAnnouncementItem, checked: boolean) {
    setBusyId(item.id);
    startTransition(async () => {
      const res = await setPartnerAnnouncementActive(item.id, checked);
      if (!res.success) msg.error(res.error);
      setBusyId(null);
    });
  }

  function confirmDelete(item: PartnerAnnouncementItem) {
    modal.confirm({
      title: "Delete this announcement?",
      content:
        "It disappears for all affiliates and stockists, and its files are removed. This cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        setBusyId(item.id);
        const res = await deletePartnerAnnouncement(item.id);
        if (res.success) msg.success("Announcement deleted");
        else msg.error(res.error);
        setBusyId(null);
      },
    });
  }

  const columns: TableProps<PartnerAnnouncementItem>["columns"] = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 280,
      render: (text: string, item) => (
        <div>
          <Typography.Text strong>{text}</Typography.Text>
          {item.body && (
            <div>
              <Typography.Text
                type="secondary"
                className="text-xs"
                ellipsis={{ tooltip: item.body }}
                style={{ maxWidth: 260, display: "block" }}
              >
                {item.body}
              </Typography.Text>
            </div>
          )}
          {item.files.length > 0 && (
            <div className="text-xs text-neutral-500">
              <PaperClipOutlined /> {item.files.length} file
              {item.files.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Audience",
      dataIndex: "audience",
      key: "audience",
      width: 170,
      render: (a: PartnerAudience) => <Tag>{AUDIENCE_LABEL[a]}</Tag>,
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, item) => {
        if (now === null) return null;
        const s = getStatus(item, now);
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: "Schedule",
      key: "schedule",
      width: 220,
      render: (_, item) => {
        if (now === null) return null;
        if (!item.startsAt && !item.endsAt) return "Always on";
        return (
          <div className="text-xs leading-5">
            <div>
              From:{" "}
              {item.startsAt ? dayjs(item.startsAt).format(DATE_FORMAT) : "Now"}
            </div>
            <div>
              Until:{" "}
              {item.endsAt ? dayjs(item.endsAt).format(DATE_FORMAT) : "No end"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Active",
      key: "active",
      width: 80,
      render: (_, item) => (
        <Switch
          checked={item.isActive}
          loading={pending && busyId === item.id}
          onChange={(checked) => handleToggle(item, checked)}
          aria-label={`Toggle announcement: ${item.title}`}
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, item) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(item)}
            aria-label="Edit announcement"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="Delete announcement"
            onClick={() => confirmDelete(item)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      {msgContext}
      {modalContext}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Partner announcements</h2>
          <p className="text-sm opacity-70">
            Messages and files shown in the Announcements section of your
            affiliates and stockists.
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New partner announcement
        </Button>
      </div>

      <Table<PartnerAnnouncementItem>
        rowKey="id"
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        scroll={{ x: 860 }}
        locale={{ emptyText: "No partner announcements yet" }}
      />

      <PartnerAnnouncementForm
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}