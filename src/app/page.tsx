import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <>
      <h1>Uma base para aproximar clubes e torcedores.</h1>
      <p>
        O ProClub está em desenvolvimento. Estamos preparando a plataforma para
        receber os clubes, suas comunidades e programas de associação.
      </p>
      <Button asChild>
        <Link href="/login">Acessar minha conta</Link>
      </Button>
    </>
  );
}
