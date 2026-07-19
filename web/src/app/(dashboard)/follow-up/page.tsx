import { redirect } from "next/navigation";

/** 旧「待跟进」入口并入今日待办 */
export default function FollowUpRedirect() {
  redirect("/");
}
