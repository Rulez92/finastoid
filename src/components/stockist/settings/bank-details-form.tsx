"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  message,
} from "antd";
import { saveMyStockistBankDetails } from "@/lib/stockist/settings-actions";
import type { StockistProfile } from "@/lib/stockist/settings-queries";
import {
  isValidSwift,
  validateAccountNumber,
} from "@/lib/affiliate/bank-validation";

// Bank details card on the stockist Settings page. Same fields and rules as
// the affiliate form: one field takes an IBAN or a local account number,
// SWIFT/BIC and a local routing code are separate, and the stockist picks
// the currency they want to be paid in.
//
// The validation helpers are pure functions shared with the affiliate flow
// (no server-only imports), and the server action runs the same rules again.

type FormValues = {
  accountHolderName: string;
  bankName: string;
  bankCountry: string;
  accountNumberOrIban: string;
  swiftBic: string;
  routingCode: string;
  payoutCurrency: string;
};

const FORM_FIELDS: (keyof FormValues)[] = [
  "accountHolderName",
  "bankName",
  "bankCountry",
  "accountNumberOrIban",
  "swiftBic",
  "routingCode",
  "payoutCurrency",
];

// Suggestions only. Any valid 3-letter code can still be typed.
const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "PKR",
  "INR",
  "CAD",
  "AUD",
  "CHF",
  "SGD",
  "MYR",
  "IDR",
];

const filterOption = (
  input: string,
  option?: { value?: string | number | null },
) =>
  String(option?.value ?? "")
    .toLowerCase()
    .includes(input.toLowerCase());

export function StockistBankDetailsForm({
  profile,
}: {
  profile: Pick<StockistProfile, "bank" | "countries">;
}) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const bank = profile.bank;

  const initialValues: FormValues = {
    accountHolderName: bank?.accountHolderName ?? "",
    bankName: bank?.bankName ?? "",
    bankCountry: bank?.bankCountry ?? "",
    accountNumberOrIban: bank?.accountNumber ?? "",
    swiftBic: bank?.swiftBic ?? "",
    routingCode: bank?.routingCode ?? "",
    payoutCurrency: bank?.payoutCurrency ?? "",
  };

  function handleFinish(values: FormValues) {
    setFormError(null);

    startTransition(async () => {
      const result = await saveMyStockistBankDetails({
        accountHolderName: values.accountHolderName,
        bankName: values.bankName,
        bankCountry: values.bankCountry ?? "",
        accountNumberOrIban: values.accountNumberOrIban ?? "",
        swiftBic: values.swiftBic ?? "",
        routingCode: values.routingCode ?? "",
        payoutCurrency: values.payoutCurrency ?? "",
      });

      if (result.success) {
        message.success("Bank details saved");
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
      className="aff-card aff-antd-card"
      bordered={false}
      title={
        <div className="whitespace-normal leading-tight">
          <div className="font-display text-[18px] font-semibold text-aff-green-900">
            Bank details
          </div>
          <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-aff-gold-600">
            Finasto™ pays only to your own account
          </div>
        </div>
      }
     
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={initialValues}
        onFinish={handleFinish}
        scrollToFirstError={{ behavior: "smooth", block: "center" }}
        disabled={isPending}
      >
        {!bank && (
          <Alert
            type="info"
            showIcon
            message="Add your bank details so Finasto™ can pay your commissions."
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

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Account holder name"
              name="accountHolderName"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Enter the account holder's name",
                },
                { max: 120, message: "Keep it under 120 characters" },
              ]}
            >
              <Input placeholder="Your own name, as it appears on the account" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Bank name"
              name="bankName"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Enter the bank's name",
                },
                { max: 120, message: "Keep it under 120 characters" },
              ]}
            >
              <Input placeholder="e.g. HBL, Barclays, Chase" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Bank country"
              name="bankCountry"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Enter the bank's country",
                },
                { max: 60, message: "Max 60 characters" },
              ]}
            >
              <AutoComplete
                allowClear
                popupClassName="aff-dropdown"
                options={profile.countries.map((v) => ({ value: v }))}
                placeholder="Pick one or type the country"
                filterOption={filterOption}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Payout currency"
              name="payoutCurrency"
              rules={[
                { required: true, message: "Choose a currency" },
                {
                  pattern: /^[A-Za-z]{3}$/,
                  message: "Use a 3-letter code, e.g. USD",
                },
              ]}
              extra="The currency you want to be paid in."
            >
              <AutoComplete
                allowClear
                popupClassName="aff-dropdown"
                options={COMMON_CURRENCIES.map((v) => ({ value: v }))}
                placeholder="e.g. USD"
                filterOption={filterOption}
                maxLength={3}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Account number or IBAN"
          name="accountNumberOrIban"
          rules={[
            {
              validator: async (_, value?: string) => {
                const v = (value ?? "").trim();
                if (!v) throw new Error("Enter an account number or IBAN");
                const problem = validateAccountNumber(v);
                if (problem) throw new Error(problem);
              },
            },
          ]}
          extra="Use your IBAN if you have one, otherwise your local account number."
        >
          <Input autoComplete="off" placeholder="IBAN or account number" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="SWIFT / BIC"
              name="swiftBic"
              rules={[
                {
                  validator: async (_, value?: string) => {
                    const v = (value ?? "").trim();
                    if (v && !isValidSwift(v)) {
                      throw new Error(
                        "SWIFT/BIC must be 8 or 11 characters, e.g. DEUTDEFF",
                      );
                    }
                  },
                },
              ]}
              extra="Recommended for international transfers."
            >
              <Input placeholder="e.g. DEUTDEFF" maxLength={11} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Routing code"
              name="routingCode"
              rules={[{ max: 30, message: "Max 30 characters" }]}
              extra="Sort code, IFSC, ABA routing number, etc. Optional."
            >
              <Input placeholder="Optional" />
            </Form.Item>
          </Col>
        </Row>

        <p className="mb-4 text-[13px] leading-relaxed text-aff-muted">
          Finasto™ pays commissions only to a bank account held in your own
          name, so the account holder name must match your profile. Your bank
          details are visible only to you and the Finasto™ admin team.
        </p>

        <div className="flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            size="large"
          >
            Save bank details
          </Button>
        </div>
      </Form>
    </Card>
  );
}