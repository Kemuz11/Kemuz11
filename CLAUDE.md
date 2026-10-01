# CLAUDE.md — FiveM Development Rules

Claude reads this file at the start of every session. Treat every numbered rule as a
hard requirement unless the user explicitly says otherwise. If a rule conflicts with
existing code in the repo, follow the existing code's conventions and point out the
conflict instead of silently rewriting large parts.

This guide has two parts, both always loaded:

1. **Principles** (`P0`–`P16`) — how to think, decide, choose technology, ask
   questions and report. Imported from `docs/claude/principles.md`:

@docs/claude/principles.md

2. **Technical rules** (`1`–`200`) — the concrete FiveM implementation rules below.

Read the principles first; the technical rules are how they are implemented.

---

## 0. Project facts (FILL THESE IN)

- **Framework:** _(Qbox / QBCore / ESX / ox_core / standalone)_
- **Core libraries:** _(ox_lib, oxmysql, ox_target, ox_inventory, pma-voice, ...)_
- **Database:** _(MariaDB + oxmysql)_
- **UI stack:** _(React + Vite + TypeScript / Svelte / vanilla JS)_
- **Player count target:** _(e.g. 64 / 128 / 200+)_
- **OneSync:** _(enabled / infinity)_
- **Resource naming prefix:** _(e.g. `kz_`)_
- **Language:** Reply to the user in Finnish. Code, comments, commit messages and
  identifiers in English. In-game text goes through locale files.

If something is not filled in, detect it from the code (`fxmanifest.lua`,
`package.json`, `exports`/`require` calls, existing SQL) before guessing. Never mix
frameworks: if the server runs Qbox, do not write ESX code.

---

## 1. How Claude must work

1. **Read before writing.** Open the resource's `fxmanifest.lua`, `config.lua` and the
   nearest similar file before adding code. New code must look like the code around it.
2. **Never invent natives, exports or events.** Only use natives that exist on
   https://docs.fivem.net/natives/ with the correct parameter order. Only call exports
   of other resources that you have seen in this repo or that are documented. If unsure,
   say so explicitly instead of guessing.
3. **Client vs server natives are different.** Many natives exist only on the client
   (`PlayerPedId`, `DrawMarker`, `SetNuiFocus`) and some only on the server
   (`GetPlayers`, `DropPlayer`, `SetPlayerRoutingBucket`). Check which side a native
   runs on before using it.
4. **You cannot run the game.** There is no GTA V or FXServer in this environment. Do not
   try to start one, download one, or pretend you tested in-game. Run every check that
   *is* possible (Section 16) and give the user an in-game test list.
5. **Smallest correct change.** Do not add features, libraries, abstraction layers or
   config options that were not asked for. Do not refactor unrelated code.
6. **No placeholders in delivered code.** No `-- TODO: implement`, no fake export names,
   no `print('works')` left behind. If something genuinely cannot be finished, say so.
7. **Preserve compatibility.** Do not rename events, exports, DB columns or config keys
   that other resources may depend on without saying so and grepping the repo for uses.
8. **Explain trade-offs briefly.** When there are two reasonable approaches, pick one,
   say why in one or two sentences, and move on.
9. **Report honestly at the end** using the response format in P15: what changed,
   why, files, what was tested and the exact result, what could not be tested, and
   the in-game checklist.
10. **Ask only when blocked.** If a decision is genuinely the user's (gameplay design,
    economy values), ask. Otherwise use sensible defaults and state them.

---

## 2. Resource structure & fxmanifest

11. Standard layout:
    ```
    kz_resource/
    ├── fxmanifest.lua
    ├── config.lua           # shared config (no secrets, no logic)
    ├── config.server.lua    # server-only config (optional; never sent to clients)
    ├── shared/              # code loaded on both sides
    ├── client/
    ├── server/
    ├── locales/             # en.json, fi.json ...
    ├── sql/                 # install.sql with CREATE TABLE IF NOT EXISTS
    └── web/                 # NUI only if the resource has a UI
        ├── src/
        ├── public/
        ├── dist/            # Vite output — this is what the game loads
        ├── package.json
        └── vite.config.ts
    ```
12. Base manifest:
    ```lua
    fx_version 'cerulean'
    game 'gta5'
    lua54 'yes'
    use_experimental_fxv2_oal 'yes'

    name 'kz_resource'
    author 'Kemuz'
    version '1.0.0'

    dependencies { 'ox_lib', 'oxmysql' }

    shared_scripts { '@ox_lib/init.lua', 'config.lua', 'shared/*.lua' }
    client_scripts { 'client/*.lua' }
    server_scripts { '@oxmysql/lib/MySQL.lua', 'config.server.lua', 'server/*.lua' }

    ui_page 'web/dist/index.html'
    files { 'web/dist/index.html', 'web/dist/assets/*', 'locales/*.json' }
    ```
13. Always `lua54 'yes'` — Lua 5.4 is faster and supports integers, `<const>`, `<close>`.
14. `use_experimental_fxv2_oal 'yes'` makes native calls from Lua cheaper. Keep it on for
    new resources; if a resource shows weird native behavior, test with it off.
15. Remove manifest lines the resource does not need (no `ui_page` without a UI, no
    `@oxmysql` on a resource that never touches the DB).
16. Everything the NUI page loads (JS, CSS, images, fonts, JSON) **must** be in `files`.
    Missing entries = blank UI in-game with no obvious error.
17. Any file listed in `client_scripts`, `shared_scripts` or `files` is downloaded by
    every client and can be read by them. **Secrets only in `server_scripts`.**
18. Use `dependencies {}` so the server refuses to start the resource without its
    requirements, instead of crashing at runtime.
19. Never commit `node_modules/`. Decide per project whether `web/dist/` is committed
    (needed if the server pulls straight from git) — follow what the repo already does.
20. One resource = one responsibility. Do not create a "core" resource that does
    everything; do not split one feature across five resources either.

---

## 3. Choosing the right UI technology

UI = how it looks. UX = how easy and pleasant it is to use. Neither is a technology.
The technologies are:

| Need | Use | Avoid |
|---|---|---|
| Menus, inventory, phone, tablet, HUD, forms | **NUI** (HTML/CSS/JS overlay) | DUI |
| A screen *inside* the world (TV, billboard, laptop, club screen) | **DUI** (browser rendered to a texture) | NUI |
| Notification, progress bar, context menu, input dialog, text UI | **ox_lib** (or framework built-in) | A custom NUI |
| Interacting with peds/objects/zones | **ox_target** or `lib.points` / `lib.zones` | Per-frame distance checks on every entity |
| Markers, simple world indicators | Natives (`DrawMarker`), only while nearby | Drawing everything everywhere each frame |
| Big animated full-screen effect (cutscene-style, shards) | Scaleform | NUI with heavy CSS animation |

21. **Default to existing components.** Before building a custom NUI, check whether
    ox_lib (`lib.notify`, `lib.progressBar`, `lib.registerContext`, `lib.inputDialog`,
    `lib.showTextUI`, `lib.alertDialog`, `lib.skillCheck`) already covers it.
22. **All NUI pages live in one browser.** Every resource's `ui_page` is an iframe inside
    the same root NUI page. A heavy UI in one resource lowers FPS for everything.
23. **NUI pages are loaded when the resource starts and stay loaded** even when hidden.
    Anything running in them (timers, animations, React re-renders) costs FPS the whole
    session. Hidden must mean "nothing renders, nothing runs".
24. **DUI is expensive** — each DUI is an extra browser instance plus a texture upload.
    Use it only for in-world screens, never for normal menus.
25. **Scaleforms and native drawing** must be called every frame to stay visible, which
    means a `Wait(0)` loop. Use them only while actually visible and nearby.
26. **3D text (DrawText3D style) over many points is a classic FPS killer.** Prefer
    ox_target, `lib.showTextUI` on approach, or a single NUI overlay.
27. Pick the lightest frontend that fits: small widget → vanilla JS or Svelte/Preact;
    complex app (phone, MDT, inventory) → React is fine.
28. **One UI framework per project.** Do not ship React in one resource, Vue in another
    and Angular in a third unless they already exist.
29. A HUD should be one resource with one NUI page, not five separate HUD resources.
30. Never use an `<iframe>` of an external website inside NUI for core gameplay — it is
    slow, can break at any time and leaks player IPs to third parties.

---

## 4. NUI ↔ Lua bridge

31. Lua → JS: `SendNUIMessage({ action = 'setVisible', data = true })`. JS receives it
    via `window.addEventListener('message', (e) => e.data)`. Always use an `action`
    field and route by it.
32. JS → Lua: `fetch('https://' + GetParentResourceName() + '/eventName', { method: 'POST', body: JSON.stringify(data) })`
    handled by `RegisterNUICallback('eventName', function(data, cb) ... end)`.
33. **Every `RegisterNUICallback` handler must call `cb(...)` on every code path**,
    including error paths. Otherwise the JS `fetch` hangs forever.
34. Open UI: `SetNuiFocus(true, true)` and `SendNUIMessage` to show. Close UI:
    `SetNuiFocus(false, false)` and `SendNUIMessage` to hide. Wrap both in one
    `openUi()` / `closeUi()` pair; never set focus from random places.
35. **Closing must always be possible**: ESC handled in JS (`keydown` → `fetchNui('close')`),
    a close callback in Lua, and cleanup in `onResourceStop`. A player stuck with a
    mouse cursor is a critical bug.
36. `SetNuiFocusKeepInput(true)` lets the player move while the UI has focus, but you
    then must disable conflicting controls (`DisableControlAction`) every frame. Only
    use it when needed (e.g. phone while walking) and stop the loop when closed.
37. **Send data only when it changes.** Never `SendNUIMessage` inside a `Wait(0)` loop.
    HUD values (health, armor, hunger, speed) → compare with last sent value, send at
    most ~5–10 times/second, send only changed fields.
38. Keep messages small. Send IDs and deltas, not the full inventory on every change.
39. **Do not send Lua tables with holes or mixed keys.** `{ [1]=a, [3]=b }` and
    `{ 1, 2, foo = 3 }` serialize unpredictably. Use pure arrays or pure string-keyed
    maps. Note: an empty Lua table may arrive as `[]` instead of `{}` — handle both.
40. NUI callbacks run on the **client** — anything coming from NUI is player-controlled.
    Forward to the server and validate there (Section 12).
41. Put the bridge helpers in one file (`web/src/utils/fetchNui.ts`,
    `web/src/hooks/useNuiEvent.ts`) and reuse them everywhere:
    ```ts
    export const isEnvBrowser = (): boolean => !(window as any).invokeNative;

    export async function fetchNui<T = unknown>(event: string, data?: unknown, mock?: T): Promise<T> {
      if (isEnvBrowser() && mock !== undefined) return mock;
      const resource = (window as any).GetParentResourceName?.() ?? 'nui-dev';
      const res = await fetch(`https://${resource}/${event}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data ?? {}),
      });
      return res.json();
    }
    ```
42. **Browser dev mode is mandatory for custom UIs.** When `isEnvBrowser()` is true,
    show the UI with mock data so it can be built and tested with `npm run dev` and
    Playwright without the game.
43. Assets from other resources: `nui://ox_inventory/web/images/water.png`.
    Own assets: relative paths (`./assets/x.png`) so they work after build.
44. Pending requests: disable the button while a `fetchNui` call is running to prevent
    double submits (and still guard on the server).
45. Show a loading/disabled state for anything that waits on the server, and an error
    state if the callback returns failure. Never leave the UI frozen with no feedback.

---

## 5. Web performance: React, Vite, bundle

46. Vite config essentials:
    ```ts
    export default defineConfig({
      plugins: [react()],
      base: './',                 // REQUIRED, absolute paths break in-game
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        target: 'es2020',
        assetsInlineLimit: 4096,
      },
    });
    ```
47. `base: './'` is not optional. Without it the built `index.html` points to `/assets/...`
    and the UI is blank in-game.
48. NUI runs on Chromium Embedded Framework, which can lag behind current Chrome. Avoid
    bleeding-edge CSS/JS features (check caniuse for anything newer than ~2022) and
    build to a conservative target.
49. **No source maps, no dev builds** shipped to clients. Always `npm run build`.
50. Keep the bundle small: no full `lodash` (import single functions or write it), no
    `moment` (use `Intl` / `dayjs`), no icon packs imported wholesale (import individual
    icons), no heavy component libraries (MUI, Ant Design) for small UIs.
51. Check bundle size after build. A simple HUD/menu should be well under ~200 KB JS
    gzipped. Investigate anything much larger.
52. **When hidden, render nothing:** `if (!visible) return null;` at the app root.
    Do not hide with `opacity: 0` or `visibility: hidden` — the DOM still exists and
    animations still run.
53. Avoid re-rendering the whole tree on every message. Start with local state (P6.6).
    Only for high-frequency data (HUD speed, status bars) use selector-based
    subscriptions (`useSyncExternalStore`, or the project's existing store) so a speed
    update re-renders only the speedometer. Justify any new store library.
54. Do not put high-frequency values (speed, coordinates, timers) in a top-level React
    Context — every consumer re-renders on each update.
55. Use `React.memo`, `useMemo`, `useCallback` where they prevent real re-renders of
    expensive subtrees. Do not sprinkle them everywhere blindly.
56. Long lists (inventory with hundreds of slots, logs, contacts) → virtualize or
    paginate. Never render 1000 DOM nodes at once.
57. Stable `key` props on list items (IDs, not array indexes when items reorder).
58. **No intervals/animation frames while closed.** Clear every `setInterval`,
    `setTimeout` and `requestAnimationFrame` in effect cleanups.
59. Remove every `window.addEventListener` in the cleanup of the effect that added it.
    Leaked listeners multiply after each open/close.
60. Images: compress, use `.webp` where possible, size them to how they are displayed
    (a 64×64 icon is not a 1024×1024 PNG). Item images are the #1 NUI memory hog.
61. Fonts: bundle locally as `.woff2`, 1–2 families, only the weights you use. No
    Google Fonts CDN — it adds network requests and fails offline.
62. No video backgrounds, no autoplaying audio loops, no large GIFs. Use a static image.
63. Avoid `console.log` in hot paths (message handlers, renders) in production builds.
64. Medium/large UIs: TypeScript with `strict: true`, every NUI message and callback
    payload typed in one shared `types.ts`, no `any` without a stated reason (P4.3).
    Tiny UIs may use plain JS.
65. Use ESLint + Prettier if the project has them; follow the existing config.

---

## 6. CSS rules (performance & compatibility)

66. **Do not use `backdrop-filter: blur()` or `filter: blur()`.** NUI is a transparent
    layer composited over the game — the game world is not "behind" the DOM, so a
    backdrop blur does not blur the game at all, and it still costs GPU time every frame.
    Use a semi-transparent solid background instead: `background: rgba(12, 12, 16, 0.88)`.
    Only exception: the user explicitly asks after being told the cost (P7.2).
67. Avoid other expensive filters too: `filter: drop-shadow()`, large `filter` chains,
    `mix-blend-mode` on big areas.
68. Keep `box-shadow` small and few. No huge multi-layer glow shadows on many elements.
69. **Animate only `transform` and `opacity`.** Never animate `width`, `height`, `top`,
    `left`, `margin`, `box-shadow` or `filter` — they trigger layout/paint every frame.
70. No infinite animations (spinners, pulsing glows) running while nothing is happening.
    Use them only during actual loading and stop them after.
71. `will-change` only on elements that are about to animate, removed afterwards.
    Overusing it eats GPU memory.
72. Avoid full-screen elements with transparency stacked on top of each other — each
    layer must be composited over the whole screen.
73. Use `rem`/`px` with a root font size that scales via a small media query set, or a
    `clamp()`; test at 1280×720, 1920×1080, 2560×1440 and ultrawide 3440×1440.
74. Layouts with flexbox/grid; no absolute-positioned pixel layouts that break on other
    resolutions or aspect ratios.
75. `user-select: none` on UI chrome; allow selection only in text inputs.
76. Readability: minimum ~14px equivalent at 1080p, good contrast against a bright
    game scene (sunny day, snow) and a dark one (night).
77. Do not rely on color alone for state (red/green). Add icons or text for colorblind
    players.

---

## 7. DUI rules

78. Create DUI lazily: `CreateDui(url, width, height)` only when the player is close to
    the screen, `DestroyDui(handle)` when they leave or the resource stops.
79. Small resolutions: 512×256, 512×512, 1024×512. Never 4K. Resolution = cost.
80. Bind to a texture once: `CreateRuntimeTxd` → `CreateRuntimeTextureFromDuiHandle(txd, name, GetDuiHandle(dui))`
    → `AddReplaceTexture(origTxd, origTxn, txdName, txnName)`. Remove the replacement
    (`RemoveReplaceTexture`) on cleanup.
81. Reuse one DUI for many identical screens (all TVs showing the same channel).
82. Update content with `SendDuiMessage(dui, json.encode(data))` or `SetDuiUrl`, never by
    destroying and recreating.
83. DUI pages follow the same CSS rules as NUI: static where possible, minimal animation.
84. Never load arbitrary player-supplied URLs into a DUI without a whitelist
    (abuse, IP grabbing, inappropriate content).

---

## 8. Lua client performance

Target: **0.00–0.01 ms idle** and **< 0.10 ms while in active use** in `resmon`.

### Loops
85. **No `while true do Wait(0)` loops unless something must happen every frame**
    (drawing, disabling controls) — and only while that condition holds.
86. Use dynamic sleep: far away → `Wait(1000)` or more, close → `Wait(0)`:
    ```lua
    CreateThread(function()
        while true do
            local sleep = 1000
            local dist = #(GetEntityCoords(cache.ped) - Config.Coords)
            if dist < 15.0 then
                sleep = 0
                DrawMarker(2, Config.Coords.x, Config.Coords.y, Config.Coords.z, 0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0, 0.3, 0.3, 0.3, 255, 255, 255, 180, false, true, 2, false, nil, nil, false)
            end
            Wait(sleep)
        end
    end)
    ```
87. **Better than any loop: don't poll, react.** Use events, statebag change handlers,
    `lib.points` (onEnter/onExit/nearby), `lib.zones`, ox_target, `lib.onCache`.
88. **One thread for many things.** Never one thread per entity, per zone or per player.
    Iterate a list in a single thread.
89. Threads must end when no longer needed (`break` out when the UI closes, the job ends,
    the player leaves the zone). Do not leave infinite loops for one-time tasks.
90. Use `SetTimeout(ms, fn)` for one-shot delays instead of a thread with `Wait`.
91. Split heavy work over frames: process N items, `Wait(0)`, continue — don't do
    10,000 iterations in a single frame.
92. **Keybinds: use `RegisterKeyMapping` + `RegisterCommand`** (or `lib.addKeybind`), not
    an `IsControlJustPressed` loop. Zero per-frame cost and players can rebind keys.
    ```lua
    RegisterCommand('+kz_open', function() openUi() end, false)
    RegisterCommand('-kz_open', function() end, false)
    RegisterKeyMapping('+kz_open', 'Open menu', 'keyboard', 'F7')
    ```

### Native calls
93. Every native call crosses into the engine — minimize them per frame. Call once,
    store in a local, reuse.
94. Use `cache.ped`, `cache.vehicle`, `cache.playerId`, `cache.serverId` (ox_lib) instead
    of calling `PlayerPedId()` / `GetVehiclePedIsIn()` repeatedly.
95. Distance: `#(a - b)` with vector3. Never `GetDistanceBetweenCoords` or manual
    `math.sqrt` on separate x/y/z.
96. For pure comparisons you can compare squared distance or use a cheap radius check
    before the precise one.
97. Hashes: backtick literal `` `adder` `` (computed at compile time) or `joaat('adder')`.
    Never `GetHashKey` inside loops.
98. `GetGamePool('CVehicle'|'CPed'|'CObject')` and `GetActivePlayers()` allocate full
    lists — never call them every frame. Throttle (e.g. every 500–1000 ms) or avoid.
99. Avoid raycasts (`StartShapeTestRay`/`StartExpensiveSynchronousShapeTestLosProbe`)
    every frame; use the async variants and throttle them.
100. Cross-resource `exports` calls serialize their arguments and are much slower than a
     local function call. Never call exports inside per-frame loops; cache the result.

### Lua language
101. `local` everything — variables and functions. No accidental globals (they are slower
     and collide between files of the same resource).
102. Localize hot natives/functions at file top when used in tight loops:
     `local GetEntityCoords = GetEntityCoords`.
103. Do not create tables inside per-frame loops (`{x, y, z}`, `vector3(...)` of
     constants, closures). Create once outside. Per-frame allocation causes GC spikes.
104. Append with `t[#t + 1] = v` (faster than `table.insert`). Build strings with
     `table.concat`, not `..` in loops.
105. Use `<const>` for constants in Lua 5.4: `local MAX_DIST <const> = 15.0`.
106. Prefer numeric `for` loops over `ipairs` in very hot code; `pairs` only for maps.
107. Use lookup tables instead of long `if/elseif` chains:
     `local allowed = { police = true, ems = true }; if allowed[job] then ... end`.
108. Time with `GetGameTimer()` on the client (ms since game start); never `os.time()`
     for cooldowns on the client.
109. Use `promise.new()` + `Citizen.Await(p)` or `lib.callback.await` for async waits,
     not busy-wait loops checking a flag.

### Assets & world
110. `RequestModel` → wait with timeout → use → **`SetModelAsNoLongerNeeded`**. Same for
     anim dicts (`RemoveAnimDict`), ptfx assets (`RemoveNamedPtfxAsset`), audio banks,
     texture dicts (`SetStreamedTextureDictAsNoLongerNeeded`). Use `lib.requestModel`,
     `lib.requestAnimDict` etc. which have timeouts built in.
111. Every created entity, blip, cam, ptfx, sound ID (`ReleaseSoundId`), zone, point,
     target and DUI must be tracked and removed on cleanup.
112. Create blips once at start (or on job change), not in loops.
113. Spawn peds/props only when players are nearby, delete them when far away (unless
     they are networked and server-managed).
114. Local-only props (decorations, job markers) → `CreateObject(..., false, false, false)`
     (non-networked). Networking things that don't need it wastes bandwidth and entity slots.
115. Streaming assets (YTD/YDR/YFT): keep textures compressed and appropriately sized.
     Oversized textures (4K on small props, huge YTDs) cause texture loss and stutter for
     everyone. Watch the server console's oversized-asset warnings.

---

## 9. Server performance

116. The server's Lua runs on the main server thread. A long synchronous loop stalls
     the whole server (console shows hitch warnings). Yield with `Wait(0)` in long jobs.
117. **Capture `source` immediately:** `local src = source` as the first line of every
     net event handler. `source` changes after any `Wait`/await.
118. `GetPlayers()` returns player IDs as **strings**. Convert with `tonumber` before
     comparing with `source`.
119. Keep per-player data in tables keyed by `src` and **delete it on `playerDropped`**.
     Forgotten entries are the most common server memory leak.
120. Cache data in memory (player state, shop stock, configs) and persist periodically
     and on drop — don't hit the DB for every read.
121. Background server loops: run every few seconds or minutes, not every tick.
122. `PerformHttpRequest` is async — never wait on external APIs inside critical paths.
     Discord webhooks are rate-limited; batch logs instead of one request per event.
123. `SaveResourceFile` / `LoadResourceFile` are synchronous disk I/O — not in loops.
124. Use `deferrals` correctly in `playerConnecting`: `deferrals.defer()`, `Wait(0)`,
     `deferrals.update(...)`, and **always** `deferrals.done()` / `done(reason)`.
125. Logging: one `Config.Debug` flag; debug prints only when enabled. No print spam.

---

## 10. Networking, events, statebags, OneSync

126. Net events: `RegisterNetEvent('kz_res:server:action', function(...) end)`.
     Naming: `resource:side:action` (e.g. `kz_garage:server:takeOut`).
127. Request/response → `lib.callback.register` / `lib.callback.await` (or the
     framework's callback system), not two separate events with matching IDs.
128. Throttle client → server events (UI clicks, position updates). Rate-limit on the
     server per `src` too.
129. Never `TriggerClientEvent(name, -1, bigData)` if only nearby players need it. Send
     to specific players (`lib.getNearbyPlayers` or a list you maintain).
130. Large payloads (initial data sync, big lists) → `TriggerLatentClientEvent(name, target, bytesPerSecond, ...)`
     so they don't choke the reliable channel.
131. Event arguments are serialized (msgpack). No functions, no userdata, no cyclic
     tables; avoid sparse arrays.
132. Pass **network IDs**, never entity handles, across client/server.
     `NetworkGetNetworkIdFromEntity` / `NetworkGetEntityFromNetworkId` and check
     `DoesEntityExist` on arrival.
133. Synced state (door locked, vehicle fuel, player status flags) → **statebags**:
     `Entity(ent).state:set('locked', true, true)`, `Player(src).state`, `GlobalState`.
     React with `AddStateBagChangeHandler` instead of polling.
134. Server is the authority for statebags. Treat any client-writable state as
     untrusted; never base money/permissions on it.
135. In a statebag change handler on the client, the entity may not exist locally yet —
     resolve it with `GetEntityFromStateBagName` and handle the 0/not-loaded case.
136. Keep statebag values small. Do not store full inventories or big tables in a
     replicated statebag that updates often.
137. Server-side vehicle spawning: use `CreateVehicleServerSetter` (OneSync) so the
     server owns the entity; set state/plate server-side.
138. Routing buckets (`SetPlayerRoutingBucket`, `SetEntityRoutingBucket`) for instances
     (apartments, races, character selection) instead of hiding players client-side.
139. Exports between resources: define with `exports('name', fn)`, call with
     `exports.resource:name(...)`. Document every public export at the top of the file.

---

## 11. Database (oxmysql)

140. **Always parameterized queries** (`?` placeholders). Never build SQL with string
     concatenation or `string.format` of user data.
141. Use the right helper: `MySQL.query.await` (rows), `MySQL.single.await` (one row),
     `MySQL.scalar.await` (one value), `MySQL.insert.await` (insert id),
     `MySQL.update.await` (affected rows), `MySQL.prepare.await` (repeated statements),
     `MySQL.transaction.await` (atomic multi-step).
142. **No queries inside loops.** Fetch in one query (`WHERE id IN (...)`) or batch
     inserts/updates.
143. Money transfers, trades and purchases that touch multiple rows → transactions.
144. Index every column used in `WHERE`, `JOIN` or `ORDER BY` on large tables
     (`citizenid`, `identifier`, `owner`, `plate`). Check with `EXPLAIN`.
145. Select only needed columns, not `SELECT *` on wide tables.
146. Don't store data you query by inside JSON blobs. JSON columns are fine for opaque
     data (metadata, settings).
147. Ship `sql/install.sql` with `CREATE TABLE IF NOT EXISTS` and correct types
     (`INT UNSIGNED`, `VARCHAR(n)`, `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`), plus
     migration notes when changing an existing schema.
148. Per-client cosmetic settings (HUD layout, volume, keybind prefs) → client KVP
     (`SetResourceKvp`, `GetResourceKvpString`), not the database.
149. Slow-query awareness: oxmysql warns about slow queries — treat those warnings as
     bugs.

---

## 12. Security (critical)

150. **Never trust the client.** Cheaters can trigger any client→server event with any
     arguments, call NUI callbacks, edit client files and spoof client-side state.
151. Money, items, XP, job changes, permissions, rewards, prices and quantities are
     decided and applied **on the server**. The client only *requests*.
152. Bad pattern (never write): `TriggerServerEvent('kz:giveMoney', 5000)`.
     Good pattern: `TriggerServerEvent('kz:completeDelivery', deliveryId)` and the
     server checks that the delivery exists, belongs to `src`, the player is at the
     location, cooldown passed, then pays the configured amount.
153. Validate every argument: type (`type(x) == 'number'`), range, integer-ness
     (`math.floor(x) == x`), NaN (`x ~= x`), string length, allowed values via lookup table.
154. Check distance server-side: `#(GetEntityCoords(GetPlayerPed(src)) - target) < max`.
155. Check job/permissions server-side every time (framework job data or
     `IsPlayerAceAllowed(src, 'kz.admin')`), never trust a "isPolice" flag from the client.
156. Per-player cooldowns and rate limits on every rewarding or spammable event.
157. Identify players by identifiers (`GetPlayerIdentifierByType(src, 'license')` /
     framework citizen ID), never by name.
158. Before acting on a network ID from the client, verify the entity exists and that
     the action makes sense (owned vehicle, nearby, correct type).
159. **XSS in NUI:** never inject player-provided text with `innerHTML` /
     `dangerouslySetInnerHTML` (names, chat, notes, phone messages). React escapes
     text by default — keep it that way.
160. Never `load()` / `ExecuteCommand()` strings that came from a client.
161. No secrets in shared/client files or replicated convars (`setr`). Server-only
     values via `GetConvar` with `set` (not `setr`) or `config.server.lua`.
162. Log suspicious requests (invalid args, impossible distances, cooldown violations)
     with player identifiers; do not silently ignore them.
163. Don't leak data: send clients only what they need (no full player lists with
     identifiers/IPs to the NUI).

---

## 13. Lifecycle & cleanup

164. `onResourceStop` handlers must check the resource name first:
     ```lua
     AddEventHandler('onResourceStop', function(res)
         if res ~= GetCurrentResourceName() then return end
         closeUi()
         -- delete entities, blips, zones, DUIs, cams, restore player state
     end)
     ```
165. Initialize player-dependent client logic on the framework's "player loaded" event,
     **and** handle the case where the resource restarts while the player is already
     loaded (check player data on resource start).
166. Reset everything you changed on the player on cleanup: NUI focus, frozen state,
     invisibility, controls disabled, camera, timecycle modifiers, attached props.
167. `restart <resource>` must leave zero ghosts: no duplicate blips, peds, props,
     threads or stuck UI.

---

## 14. UX rules

168. Every UI closes with ESC and has a visible close button.
169. Consistent layout, colors and spacing across all resources; reuse the shared
     design tokens/components if the project has them.
170. Give feedback on every action: success, error, loading. Errors say what went wrong
     in plain language (via locale strings).
171. Confirm destructive actions (sell, delete, drop all) once.
172. Keyboard support where it makes sense (Enter to confirm, arrows in lists).
173. Don't block the screen center during gameplay; HUD elements in corners, small,
     configurable when possible.
174. All player-facing strings through locales — no hard-coded Finnish/English text in
     Lua or JSX.
175. Numbers formatted for humans: thousand separators, currency symbol, no 12 decimals.

---

## 15. Code style & maintainability

176. File responsibilities: `client/main.lua` (entry), `client/ui.lua` (NUI bridge),
     `server/main.lua`, `server/db.lua` (all queries), `shared/utils.lua`.
177. Naming: `camelCase` locals/functions, `PascalCase` module tables, `UPPER_SNAKE` for
     `<const>` constants, events `resource:side:action`.
178. All tunable values in `config.lua` with a short comment each. No magic numbers in logic.
179. Early returns over deep nesting.
180. Comments explain *why*, not *what*. Match the surrounding comment density.
181. Use LuaLS annotations (`---@param`, `---@return`, `---@class`) on public functions
     and exports.
182. Don't duplicate framework functionality (getting player data, money, jobs) — call
     the framework's API through one small bridge file so switching frameworks is easy.

---

## 16. Testing — what Claude can and must do

Claude **cannot** run GTA V, FXServer, natives, resmon or the profiler. Do not try.
Claude **must** run every applicable check below and report results honestly.
Verification tools (luacheck, selene, busted) may be installed temporarily or globally
to run checks, but are never added to the project's dependencies without asking
(P4.6). If a tool cannot be installed, say so.

183. **Lua lint:** `luacheck .` or `selene .` with a config that knows FiveM globals
     (natives, `CreateThread`, `Wait`, `vector3`, `exports`, `lib`, `cache`, `MySQL`,
     `json`, `source`). Fix real issues: undefined locals, unused variables, shadowing,
     accidental globals.
184. **Lua syntax:** `luac -p file.lua` (Lua 5.4). CfxLua extensions (backtick hashes,
     `+=` compound operators, `?.` safe navigation, `in` table unpacking) fail on stock
     `luac` — report those lines as expected, never "fix" valid CfxLua syntax.
185. **Unit tests for pure logic:** keep calculations, validation and data transforms
     in native-free functions and test them with `busted`, stubbing natives as globals.
186. **TypeScript:** `npx tsc --noEmit`.
187. **Web lint/format:** `npm run lint`, `npx prettier --check .` if configured.
188. **Web unit tests:** `npx vitest run` if configured (stores, formatters, reducers).
189. **Build:** `npm run build` must succeed. Then verify `web/dist/index.html` exists
     and references `./assets/...` (relative), not `/assets/...`.
190. **Manifest check:** every path/glob in `fxmanifest.lua` must match real files;
     every file the built UI references must be covered by `files`.
191. **Visual check without the game:** run `npm run dev` with mock data and take
     Playwright screenshots at 1280×720, 1920×1080 and 2560×1440 if available.
192. **Static anti-pattern grep** before finishing:
     ```bash
     grep -rn "backdrop-filter\|filter: *blur" web/src
     grep -rn "dangerouslySetInnerHTML\|innerHTML" web/src
     grep -rn "GetDistanceBetweenCoords\|GetHashKey" --include=*.lua .
     grep -rn "Wait(0)" --include=*.lua .            # justify each one
     grep -rnE "MySQL\.[a-z.]+\(['\"][^'\"]*['\"] *\.\." --include=*.lua .   # SQL concat
     grep -rn "RegisterNUICallback" --include=*.lua . # verify each calls cb()
     ```
193. **SQL:** if a SQL file changed and a MariaDB/MySQL binary is available, load it into
     a throwaway database to verify syntax.
194. **Final report** includes an in-game test list, for example:
     - [ ] Resource starts with no errors in F8 and the server console
     - [ ] `resmon 1`: idle ≈ 0.00 ms, active < 0.10 ms
     - [ ] UI opens/closes, ESC works, mouse is released, no stuck focus
     - [ ] `restart <resource>` leaves no ghost entities/blips/UI
     - [ ] Invalid input / wrong distance / spammed event is rejected server-side
     - [ ] Works with 2 players (sync, statebags, other player sees the change)

---

## 17. Profiling tips for the user (in-game)

195. `resmon 1` (F8) — per-resource client CPU time and memory. Memory that grows
     forever = leak.
196. `profiler record 500` then `profiler view` (F8) — frame-by-frame breakdown to find
     which resource/function spikes. The server console has `profiler` too.
197. txAdmin's resource/performance pages and server console hitch warnings show
     server-side stalls.
198. Test with the resource stopped vs started to measure its real FPS impact.
199. Test worst cases: many players nearby, UI open for long, many items in inventory,
     after 2+ hours of play (leaks show up late).
200. When a user reports "lag", ask for resmon and profiler output before rewriting code.

---

## 18. Final checklist before saying "done"

- [ ] Correct framework API used; no invented natives/exports/events
- [ ] No unnecessary `Wait(0)` loops; no thread per entity; loops sleep when idle
- [ ] Keybinds via `RegisterKeyMapping`, interaction via target/points/zones
- [ ] Models/dicts released; entities/blips/DUIs/zones cleaned on stop
- [ ] NUI renders nothing when hidden; no timers running while closed
- [ ] No `backdrop-filter` / `filter: blur`; animations use transform/opacity only
- [ ] Every `RegisterNUICallback` calls `cb()`; ESC closes; focus always released
- [ ] `SendNUIMessage` only on change, small payloads
- [ ] All rewards/permissions validated server-side with type, range, distance, cooldown
- [ ] `local src = source` first line in net handlers; per-player data cleared on drop
- [ ] SQL parameterized, no queries in loops, indexes for lookups
- [ ] Strings through locales; config values in `config.lua`
- [ ] Lint, typecheck, build and tests run — results reported
- [ ] In-game test list given to the user
