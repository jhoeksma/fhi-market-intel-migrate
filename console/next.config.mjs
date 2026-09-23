/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Default Server Action body limit is ~1MB — country payload JSON
    // files (e.g. Poland's census payload) run into several MB, so the
    // in-console Import page (lib/actions.ts importPayload) needs more
    // headroom than the default.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
