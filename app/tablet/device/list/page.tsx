import { redirect } from "next/navigation";

// Redirect old path to new inventory page
export default function DeviceListRedirect() {
  redirect("/tablet/inventory");
}
