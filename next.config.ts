import { withSentryConfig } from "@sentry/nextjs";
/** @type {import('next').NextConfig} */

const cspHeader = `
                    default-src 'self';
                    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.googletagmanager.com https://tagmanager.google.com https://www.google-analytics.com;
                    style-src 'self' 'unsafe-inline' https://tagmanager.google.com https://fonts.googleapis.com;
                    img-src 'self' data: blob: https://explorer-api.walletconnect.com https://www.google-analytics.com https://www.googletagmanager.com https://stats.g.doubleclick.net;
                    font-src 'self' https://fonts.gstatic.com;
                    object-src 'none';
                    base-uri 'self';
                    form-action 'self';
                    frame-ancestors 'none';
                    child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org;
                    frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://www.googletagmanager.com https://explorer-api.walletconnect.com;
                    connect-src 'self' https://rpc.buildbear.io/ https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://explorer-api.walletconnect.com;
                    worker-src 'self';
                    manifest-src 'self'
                  `;
export default withSentryConfig(
  {
    images: { unoptimized: true },
    pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
    reactStrictMode: false,
    trailingSlash: false,
    // output: "standalone",
    // target: "serverless",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webpack: (config: any, { isServer, webpack }: { isServer: boolean; webpack: any }) => {
      const envs: { [key: string]: string } = {};
      Object.keys(process.env).forEach((env) => {
        if (env.startsWith("NEXT_PUBLIC_")) {
          envs[env] = process.env[env] as string;
        }
      });

      if (!isServer) {
        config.plugins.push(
          new webpack.DefinePlugin({
            "process.env": JSON.stringify(envs),
            "import.meta.webpackHot": "module.hot",
          })
        );
      }

      // Fixes npm packages that depend on `fs` module
      if (!isServer) {
        // config.node = { fs: 'empty' };
        config.resolve.fallback.fs = false;
        config.resolve.fallback.electron = false;
      }
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^electron$/,
        })
      );

      if (config.cache && !isServer) {
        config.cache = Object.freeze({
          type: "memory",
        });
      }

      return config;
    },
  },
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "peeramid-labs",
    project: "javascript-nextjs-0f",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
