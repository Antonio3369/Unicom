import { notFound } from "next/navigation";
import {
  NewOrderForm,
  type NewOrderFormInitial,
} from "@/components/orders/NewOrderForm";
import { getSessionUser } from "@/lib/session";
import { getCreateOpenerOptions } from "@/services/scope";
import { getOrderForUser } from "@/services/orders";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ linkedVoidOrderId?: string }>;
}) {
  const user = await getSessionUser();
  const { linkedVoidOrderId } = await searchParams;
  const openerOptions =
    user!.role === "MANAGER" ? await getCreateOpenerOptions(user!) : null;

  let defaultOpenerId: string | undefined;
  let initialForm: Partial<NewOrderFormInitial> | undefined;

  if (linkedVoidOrderId) {
    try {
      const voidOrder = await getOrderForUser(linkedVoidOrderId, user!);
      defaultOpenerId = voidOrder.openerId;
      initialForm = {
        customerSurname: voidOrder.customerSurname,
        phone: voidOrder.phone,
        planType: voidOrder.planType,
        rechargeAmount: String(voidOrder.rechargeAmount),
        carrier: voidOrder.carrier,
      };
    } catch {
      notFound();
    }
  }

  if (openerOptions?.length) {
    const inList = openerOptions.some((o) => o.id === defaultOpenerId);
    defaultOpenerId = inList ? defaultOpenerId : openerOptions[0]?.id;
  }

  return (
    <NewOrderForm
      linkedVoidOrderId={linkedVoidOrderId}
      openerOptions={openerOptions}
      defaultOpenerId={defaultOpenerId}
      initialForm={initialForm}
    />
  );
}
