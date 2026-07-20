import {
  NewOrderForm,
} from "@/components/orders/NewOrderForm";
import { getSessionUser } from "@/lib/session";
import { getCreateOpenerOptions } from "@/services/scope";

export default async function NewOrderPage() {
  const user = await getSessionUser();
  const openerOptions =
    user!.role === "MANAGER" ? await getCreateOpenerOptions(user!) : null;

  const defaultOpenerId =
    user!.role === "MANAGER" || user!.role === "SALES" ? user!.id : undefined;

  return (
    <NewOrderForm
      openerOptions={openerOptions}
      defaultOpenerId={defaultOpenerId}
    />
  );
}
