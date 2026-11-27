"use client";

// Admin list of promotions (stockists only). Same pattern as
// partner-announcement-table.tsx: the server page passes `items`, and after
// any action the server calls revalidatePath so new props arrive.
//
// Phase = Draft -> Scheduled -> Live -> Ended -> Rewarded.
// Only draft / published / rewarded are stored. Scheduled / Live / Ended come
// from the dates, so they are worked out here after mount (the server has
// neither the current time nor the viewer's timezone).

import { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
  type TableProps,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  deletePromotion,
  setPromotionStatus,
} from "@/lib/admin/promotion-actions";
import type {
  PromotionItem,
  PromotionOfferType,
} from "@/lib/admin/promotion-queries";
import { PromotionForm } from "./promotion-form";

const DATE_FORMAT = "DD MMM YYYY, HH:mm";

const OFFER_LABEL: Record<PromotionOfferType, string> = {
  free_tour: "Free tour",
  cash_prize: "Cash prize",
  bonus: "Bonus",
  discount: "Discount",
  other: "Other",
};

type Phase = "draft" | "scheduled" | "live" | "ended" | "rewarded";

const PHASE_TAG: Record<Phase, { label: string; color: string }> = {
  draft: { label: "Draft", color: "default" },
  scheduled: { label: "Scheduled", color: "blue" },
  live: { label: "Live", color: "green" },
  ended: { label: "Ended", color: "orange" },
  rewarded: { label: "Rewarded", color: "gold" },
};

function getPhase(item: PromotionItem, now: number): Phase {
  if (item.status === "draft") return "draft";
  if (item.status === "rewarded") return "rewarded";
  if (item.startsAt && Date.parse(item.startsAt) > now) return "scheduled";
  if (item.endsAt && Date.parse(item.endsAt) <= now) return "ended";
  return "live";
}

export function PromotionTable({ items }: { items: PromotionItem[] }) {
  const [msg, msgContext] = message.useMessage();
  const [modal, modalContext] = Modal.useModal();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionItem | null>(null);

  // Render phase and dates only after mount to avoid a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), [items]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: PromotionItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function confirmStatus(
    item: PromotionItem,
    status: "draft" | "published" | "rewarded",
    title: string,
    content: string,
    okText: string,
  ) {
    // Quick browser check. The server and the database check it again.
    if (status === "published" && (!item.startsAt || !item.endsAt)) {
      msg.error("Set start and end dates first (use Edit).");
      return;
    }

    modal.confirm({
      title,
      content,
      okText,
      onOk: async () => {
        setBusyId(item.id);
        const res = await setPromotionStatus(item.id, status);
        if (!res.success) msg.error(res.error);
        else msg.success("Promotion updated");
        setBusyId(null);
      },
    });
  }

  function confirmDelete(item: PromotionItem) {
    modal.confirm({
      title: "Delete this promotion?",
      content:
        "It disappears for all stockists and its banner is removed. This cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        setBusyId(item.id);
        const res = await deletePromotion(item.id);
        if (res.success) msg.success("Promotion deleted");
        else msg.error(res.error);
        setBusyId(null);
      },
    });
  }

  function renderStatusButton(item: PromotionItem, phase: Phase) {
    const loading = busyId === item.id;

    if (phase === "draft") {
      return (
        <Button
          size="small"
          type="primary"
          loading={loading}
          onClick={() =>
            confirmStatus(
              item,
              "published",
              "Publish this promotion?",
              "Stockists will see it from its start date.",
              "Publish",
            )
          }
        >
          Publish
        </Button>
      );
    }

    if (phase === "scheduled" || phase === "live") {
      return (
        <Button
          size="small"
          loading={loading}
          onClick={() =>
            confirmStatus(
              item,
              "draft",
              "Unpublish this promotion?",
              "It goes back to draft and stockists stop seeing it.",
              "Unpublish",
            )
          }
        >
          Unpublish
        </Button>
      );
    }

    if (phase === "ended") {
      return (
        <Button
          size="small"
          type="primary"
          loading={loading}
          onClick={() =>
            confirmStatus(
              item,
              "rewarded",
              "Mark as rewarded?",
              "Use this after the winners have received their reward. Stockists will see it as Rewarded.",
              "Mark rewarded",
            )
          }
        >
          Mark rewarded
        </Button>
      );
    }

    return null; // rewarded: nothing more to do
  }

  const columns: TableProps<PromotionItem>["columns"] = [
    {
      title: "Promotion",
      key: "promotion",
      width: 320,
      render: (_, item) => (
        <div className="flex items-center gap-3">
          {item.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.bannerUrl}
              alt=""
              className="h-10 w-16 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-10 w-16 shrink-0 rounded bg-neutral-200/60" />
          )}
          <div className="min-w-0">
            <Typography.Text strong>{item.title}</Typography.Text>
            {item.rewardDetails && (
              <div>
                <Typography.Text
                  type="secondary"
                  className="text-xs"
                  ellipsis={{ tooltip: item.rewardDetails }}
                  style={{ maxWidth: 220, display: "block" }}
                >
                  {item.rewardDetails}
                </Typography.Text>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Offer",
      dataIndex: "offerType",
      key: "offerType",
      width: 120,
      render: (t: PromotionOfferType) => <Tag>{OFFER_LABEL[t]}</Tag>,
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, item) => {
        if (now === null) return null;
        const t = PHASE_TAG[getPhase(item, now)];
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    {
      title: "Schedule",
      key: "schedule",
      width: 220,
      render: (_, item) => {
        if (now === null) return null;
        if (!item.startsAt && !item.endsAt) {
          return (
            <Typography.Text type="secondary" className="text-xs">
              Dates not set
            </Typography.Text>
          );
        }
        return (
          <div className="text-xs leading-5">
            <div>
              From:{" "}
              {item.startsAt ? dayjs(item.startsAt).format(DATE_FORMAT) : "-"}
            </div>
            <div>
              Until:{" "}
              {item.endsAt ? dayjs(item.endsAt).format(DATE_FORMAT) : "-"}
            </div>
          </div>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_, item) => (
        <Space size={4}>
          {now !== null && renderStatusButton(item, getPhase(item, now))}
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(item)}
            aria-label="Edit promotion"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="Delete promotion"
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
          <h2 className="text-xl font-semibold">Promotions</h2>
          <p className="text-sm opacity-70">
            Offers and rewards shown to stockists only.
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          New promotion
        </Button>
      </div>

      <Table<PromotionItem>
        rowKey="id"
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        scroll={{ x: 900 }}
        locale={{ emptyText: "No promotions yet" }}
      />

      <PromotionForm
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
      />
    </>
  );
}