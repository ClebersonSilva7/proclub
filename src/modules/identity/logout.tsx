import { Button } from "@/components/ui/button";
export function Logout() {
  return (
    <form method="post" action="/auth/logout">
      <Button type="submit" variant="outline">
        Sair da conta
      </Button>
    </form>
  );
}
