/** @type {import('next').NextConfig} */

const cspHeader = `
                    default-src 'self';
                    script-src 'self' dip.box *.dip.box 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.googletagmanager.com https://tagmanager.google.com https://www.google-analytics.com;
                    style-src 'self' dip.box *.dip.box 'unsafe-inline' https://tagmanager.google.com https://fonts.googleapis.com;
                    img-src 'self' dip.box *.dip.box data: blob: https://explorer-api.walletconnect.com https://www.google-analytics.com https://www.googletagmanager.com https://stats.g.doubleclick.net;
                    font-src 'self' dip.box *.dip.box https://fonts.gstatic.com;
                    object-src 'none';
                    base-uri 'self';
                    form-action 'self';
                    frame-ancestors 'none';
                    child-src dip.box *.dip.box https://verify.walletconnect.com https://verify.walletconnect.org;
                    frame-src dip.box *.dip.box https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://www.googletagmanager.com https://explorer-api.walletconnect.com;
                    connect-src 'self' dip.box *.dip.box https://rpc.buildbear.io/ wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://explorer-api.walletconnect.com;
                    worker-src 'self';
                    manifest-src 'self'
                  `;
export default {
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

    // // Help with module resolution
    // config.resolve.alias = {
    //   ...config.resolve.alias,
    //   "@": ".",
    //   "@/components": "./components",
    //   "@/lib": "./lib",
    //   "@/app": "./app",
    //   "@/hooks": "./hooks",
    // };

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
};
