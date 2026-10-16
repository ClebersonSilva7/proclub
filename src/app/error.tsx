"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <><h1>Não foi possível carregar esta página</h1><p>Tente novamente para continuar.</p><button onClick={reset}>Tentar novamente</button></>; }
