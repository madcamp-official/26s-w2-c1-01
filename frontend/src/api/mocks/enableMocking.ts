// 실제 백엔드가 준비되면 .env에서 VITE_ENABLE_MOCKS=false 로 끌 수 있습니다.
export async function enableMocking() {
  if (!import.meta.env.DEV) return;
  if (import.meta.env.VITE_ENABLE_MOCKS === "false") return;

  const { worker } = await import("./browser");
  await worker.start({
    onUnhandledRequest: "bypass",
  });
}
