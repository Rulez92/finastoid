"use client";

// Confirmation step: the stockist checks the total and the bank details,
// then sends the request. Sending calls the server action
// requestStockistPayout(), which sends only the order ids. The database
// recalculates the real total.

import { useState } from "react";
import { Alert, Descriptions, Modal, Typography, message } from "antd";
import { requestStockistPayout } from "@/lib/stockist/stockist-payout-actions";
import type { BankSummary } from "@/lib/stockist/stockist-payout-queries";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void; // clears the ticked orders in the parent
  orderIds: string[];
  itemsTotalUsd: number;
  adjustmentsUsd: number; // zero or negative
  totalUsd: number;
  bank: BankSummary;
};

export default function RequestPayoutDialog({
  open,
  onClose,
  onSuccess,
  orderIds,
  itemsTotalUsd,
  adjustmentsUsd,
  totalUsd,
  bank,
}: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (submitting) return; // never close while the request is in flight
    setError(null);
    onClose();
  };

  const handleSend = async () => {
    if (submitting) return; // blocks a double click
    setSubmitting(true);
    setError(null);

    try {
      const result = await requestStockistPayout(orderIds);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      messageApi.success(
        result.requestNumber
          ? `Payout request ${result.requestNumber} sent.`
          : "Payout request sent.",
      );
      onSuccess();
      onClose();
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="Confirm payout request"
        rootClassName="aff-dialog"
        open={open}
        onCancel={handleClose}
        onOk={handleSend}
        okText="Send request"
        cancelText="Cancel"
        confirmLoading={submitting}
        cancelButtonProps={{ disabled: submitting }}
        maskClosable={false}
        keyboard={!submitting}
        closable={!submitting}
        width="min(520px, calc(100vw - 32px))"
        destroyOnClose
      >
        <Descriptions
          column={1}
          size="small"
          bordered
          styles={{ label: { width: "45%" } }}
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="Orders">
            {orderIds.length}
          </Descriptions.Item>
          <Descriptions.Item label="Commission">
            {usd(itemsTotalUsd)}
          </Descriptions.Item>
          {adjustmentsUsd < 0 && (
            <Descriptions.Item label="Refund adjustments">
              {usd(adjustmentsUsd)}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Total">
            <span className="font-display text-[18px] font-semibold text-aff-green-900">
              {usd(totalUsd)}
            </span>
          </Descriptions.Item>
        </Descriptions>

        <p className="font-sans text-[13px] font-semibold text-aff-green-900">
          Payment will be sent to
        </p>
        <Descriptions
          column={1}
          size="small"
          bordered
          styles={{ label: { width: "45%" } }}
          style={{ marginTop: 8, marginBottom: 16 }}
        >
          <Descriptions.Item label="Account holder">
            {bank.accountHolderName}
          </Descriptions.Item>
          <Descriptions.Item label="Bank">
            {bank.bankName} ({bank.bankCountry})
          </Descriptions.Item>
          <Descriptions.Item label="Account">
            {bank.accountMasked}
          </Descriptions.Item>
          <Descriptions.Item label="Payout currency">
            {bank.payoutCurrency}
          </Descriptions.Item>
        </Descriptions>

        <Typography.Paragraph
          className="text-aff-muted"
          style={{ marginBottom: 0 }}
        >
          The amount is calculated in USD. Your bank details are saved with this
          request, so changing them later will not affect it.
        </Typography.Paragraph>

        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginTop: 16 }}
            message={error}
          />
        )}
      </Modal>
    </>
  );
}