export async function register() {
  if (process.env.TRUST_LAYER_URL && process.env.NEXT_RUNTIME === "nodejs") {
    const { getSigningRetryWorker } = await import(
      "./lib/connectors/SigningRetryWorker"
    );
    getSigningRetryWorker().start();
  }
}
