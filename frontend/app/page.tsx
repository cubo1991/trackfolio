import { redirect } from "next/navigation";

/** La raíz no tiene contenido propio: el tablero es la app. */
export default function Home() {
  redirect("/board");
}
