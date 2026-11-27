// import type { Metadata } from "next";
// import { requireRole } from "@/lib/auth/server";
// import { getMyRequests } from "@/lib/stockist/stockist-requests-queries";
// import { RequestForm } from "@/components/stockist/requests/request-form";
// import { RequestsList } from "@/components/stockist/requests/requests-list";

// // Stockist Requests page: ask Finasto to assign an affiliate to me by typing
// // the affiliate's name, email and a description, and follow the status of the
// // requests I have sent. A server component: it checks the role, loads my
// // requests, and hands plain data to the two components.

// export const metadata: Metadata = {
//   title: "Requests",
// };

// export default async function StockistRequestsPage() {
//   await requireRole("stockist");

//   const requests = await getMyRequests();
//   const pendingCount = requests.filter((r) => r.status === "pending").length;

//   return (
//     <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
//       <header className="mb-6">
//         <h1 className="font-display text-[26px] leading-tight text-espresso sm:text-[30px]">
//           Ask Finasto to assign an affiliate to you.
//           {pendingCount > 0
//             ? ` You have ${pendingCount} pending ${
//                 pendingCount === 1 ? "request" : "requests"
//               }.`
//             : ""}
//         </h1>
//       </header>

//       <section className="mb-8">
//         <RequestForm />
//       </section>

//       <section>
//         <h2 className="mb-3 font-display text-[20px] leading-tight text-espresso">
//           My requests
//         </h2>
//         <RequestsList requests={requests} />
//       </section>
//     </div>
//   );
// }
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/server";
import { getMyRequests } from "@/lib/stockist/stockist-requests-queries";
import { RequestForm } from "@/components/stockist/requests/request-form";
import { RequestsList } from "@/components/stockist/requests/requests-list";
import { Reveal } from "@/components/affiliate/dashboard/reveal";

// Stockist Requests page: ask Finasto to assign an affiliate to me by typing
// the affiliate's name, email and a description, and follow the status of the
// requests I have sent. A server component: it checks the role, loads my
// requests, and hands plain data to the two components.

export const metadata: Metadata = {
  title: "Requests",
};

export default async function StockistRequestsPage() {
  await requireRole("stockist");

  const requests = await getMyRequests();
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
      <Reveal>
        <header className="rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_18px_44px_-20px_rgba(172,131,78,0.55)]">
          <div className="relative isolate overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 -z-10 h-48 w-48 rounded-full bg-aff-gold-400/15 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
            />
            <div className="relative z-10 flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
              <div className="min-w-0">
                <h1 className="break-words font-display text-[24px] font-semibold leading-tight text-aff-cream-50 sm:text-[30px]">
                  Affiliate{" "}
                  <span className="bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text text-transparent">
                    Requests
                  </span>
                </h1>
                <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-relaxed text-aff-cream-50/75 sm:text-[14px]">
                  Ask Finasto™ to assign an affiliate to you, and follow the
                  status of every request you send.
                </p>
              </div>

              {pendingCount > 0 && (
                <p className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-aff-gold-400/40 bg-aff-green-950/60 px-3.5 py-1.5 font-sans text-[12px] font-medium text-aff-gold-300">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-aff-gold-300 shadow-[0_0_8px_2px_rgba(241,204,156,0.6)]"
                  />
                  <span className="truncate">
                    {pendingCount} pending{" "}
                    {pendingCount === 1 ? "request" : "requests"}
                  </span>
                </p>
              )}
            </div>
          </div>
        </header>
      </Reveal>

      <section>
        <RequestForm />
      </section>

      <section>
        <h2 className="mb-3 font-display text-[20px] font-semibold leading-tight text-aff-green-900">
          My requests
        </h2>
        <RequestsList requests={requests} />
      </section>
    </div>
  );
}