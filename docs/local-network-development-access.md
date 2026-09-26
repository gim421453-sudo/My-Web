# Local Network Development Access

The normal local development address remains `http://127.0.0.1:5173/`.
Use the LAN server only when another device on the same private network needs
to test the development build.

1. Start it with `npm.cmd run dev:lan`.
2. Run `ipconfig` and identify this PC's active IPv4 address yourself.
3. On another device on the same LAN, open `http://PC_IPV4:5173/`.
4. If Windows Defender Firewall prompts, allow the development server only for
   the intended private network. Do not create firewall rules automatically.
5. Stop the server with `Ctrl+C` when the test is finished.

This does not publish the application to the internet or Firebase Hosting.
Avoid public, school, or shared Wi-Fi: client-to-client traffic may be blocked
and the device is not an appropriate place for operational testing. Firebase
Authentication can also require an authorized domain for a device address;
check that configuration manually before sign-in testing. If an old page is
shown, clear the browser's service-worker/cache state before retesting.

`npm run dev` intentionally keeps its existing local-only default. No fixed
LAN IP, port-forwarding, router, or firewall configuration is included here.
