import {registerRoute as workbox_routing_registerRoute} from '/Users/jack/Code/monkeytype/node_modules/.pnpm/workbox-routing@7.1.0/node_modules/workbox-routing/registerRoute.mjs';
import {NetworkFirst as workbox_strategies_NetworkFirst} from '/Users/jack/Code/monkeytype/node_modules/.pnpm/workbox-strategies@7.1.0/node_modules/workbox-strategies/NetworkFirst.mjs';
import {NetworkOnly as workbox_strategies_NetworkOnly} from '/Users/jack/Code/monkeytype/node_modules/.pnpm/workbox-strategies@7.1.0/node_modules/workbox-strategies/NetworkOnly.mjs';
import {clientsClaim as workbox_core_clientsClaim} from '/Users/jack/Code/monkeytype/node_modules/.pnpm/workbox-core@7.1.0/node_modules/workbox-core/clientsClaim.mjs';
import {precacheAndRoute as workbox_precaching_precacheAndRoute} from '/Users/jack/Code/monkeytype/node_modules/.pnpm/workbox-precaching@7.1.0/node_modules/workbox-precaching/precacheAndRoute.mjs';
import {cleanupOutdatedCaches as workbox_precaching_cleanupOutdatedCaches} from '/Users/jack/Code/monkeytype/node_modules/.pnpm/workbox-precaching@7.1.0/node_modules/workbox-precaching/cleanupOutdatedCaches.mjs';/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */








self.skipWaiting();

workbox_core_clientsClaim();


/**
 * The precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
workbox_precaching_precacheAndRoute([
  {
    "url": "images/icons/general_icon_x512.png",
    "revision": "e3fffbf68be67df2ffafd99b7d83ac1d"
  },
  {
    "url": "images/icons/maskable_icon_x512.png",
    "revision": "f977b14ce6e08bf606650a76bdd0a4fd"
  },
  {
    "url": "manifest.json",
    "revision": "2d1196ac900d026f01f17094485b81d7"
  }
], {});
workbox_precaching_cleanupOutdatedCaches();



workbox_routing_registerRoute((options) => {
						const isApi = options.url.hostname === "api.monkeytype.com";
						return options.sameOrigin && !isApi;
					}, new workbox_strategies_NetworkFirst(), 'GET');
workbox_routing_registerRoute((options) => {
						return options.url.pathname === "/version.json";
					}, new workbox_strategies_NetworkOnly(), 'GET');




