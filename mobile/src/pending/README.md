# Parked until the v2 server has it

**push/** — Firebase push notifications, lifted from the v1 app and working there. It needs a
`notificationsApi` with `registerDevice` / `forgetDevice`, which the v2 API does not have yet
(MyDiary-V2/Backend writes notifications to its own table only; nothing is pushed to a phone).

To turn it back on: add those two endpoints to the v2 API, write
`src/store/api/notificationsApi.ts` exporting `notificationsApi` and the `NoticeLink` type, move
this folder back to `src/push`, then put `<PushListener />` and `navigationRef` back into
`src/navigation/index.tsx` the way the v1 app has them.

The Firebase configuration files are already in place and unchanged from the live app
(`android/app/google-services.json`, `ios/MyDiary/GoogleService-Info.plist`), so nothing needs
setting up on the Firebase side.
