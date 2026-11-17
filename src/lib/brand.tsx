// import { Fragment, type ReactNode } from "react";

// const BRAND = "Finasto";

// export function withTM(text: string): ReactNode {
//   return text.split(BRAND).flatMap((part, i, arr) =>
//     i < arr.length - 1
//       ? [
//           <Fragment key={i}>{part}{BRAND}<sup className="ml-0.5 text-[0.4em] font-normal align-super">™</sup></Fragment>,
//         ]
//       : [<Fragment key={i}>{part}</Fragment>]
//   );
// }
import { Fragment, type ReactNode } from "react";

const BRAND_RE = /(finasto)/gi; // capture group → matches land on odd indexes

export function withTM(text: string, supClass = "-ml-[0.1em]"): ReactNode {
  return text.split(BRAND_RE).map((part, i) =>
    i % 2 === 1 ? (
      <Fragment key={i}>
        {part}
        <sup
          className={`relative -top-[1em] align-baseline text-[0.4em] font-medium leading-none tracking-normal ${supClass}`}
        >
          TM
        </sup>
      </Fragment>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}