# Juniper Air Service

A bush-flying game in one static folder. You fly the Juniper J-4 Wren, a
high-wing taildragger, out of a grass-country airfield and work four jobs:

1. **Ridge Ring Circuit** — eight rings around the ridge, the last one on the
   glide path, then land on the numbers.
2. **Saltmarsh Mail Run** — three parcel drops that only count below 90 kt, on
   a tank that will not quite reach: fly lean or stop at Cedar Gap for fuel.
3. **Fire on Tamarack Ridge** — skim the bay to fill the water tank, douse four
   fires in two trips, and stay out of the heat that cooks the airframe.
4. **Last Light Slalom** — ten small gates up the valley at dusk and a landing
   on the lit runway before the field closes.

Every job ends with a landing that is measured (sink rate, distance off the
centreline) and graded; hard arrivals damage the airframe, harder ones end the
flight with the cause written on the report.

## Play

Open `game/index.html` in desktop Chrome. No build step, no network, no
libraries: a hand-written canvas renderer, flight model and WebAudio sound.

| Key | Action |
| --- | --- |
| Arrows / WASD (or drag the mouse) | pitch and bank (Down / S pulls the nose up) |
| Shift / Ctrl (or E / Q, mouse wheel) | throttle up / down |
| F | flaps |
| B | wheel brakes |
| Space | release water |
| C | chase / cockpit view |
| P, R, Esc, M | pause, restart, job board, mute |

## Layout

- `game/src/` — small ES modules, one job each (flight model, terrain height,
  mission rules, renderers, instruments, HUD, audio, autopilot, screens).
- `screenshots/` — four unedited 1280x720 renders of the game, taken from its
  `?shot=<name>&seed=1` staging mode in headless Chromium.
- `main.ts` — copies `game/` and `screenshots/` to the output directory and
  writes `dossier.json` with the kit helper in `vendor/`.

`?autoplay=<missionId>` hands the aircraft to the demonstration autopilot that
also flies the title screen.
