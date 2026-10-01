# CLAUDE.md – FiveM-projektin ohjeet

Claude lukee tämän tiedoston jokaisen session alussa. Noudata näitä sääntöjä aina,
ellei käyttäjä erikseen pyydä muuta. Jos jokin sääntö on ristiriidassa olemassa
olevan koodin kanssa, kysy ennen kuin muutat laajasti.

---

## 0. Projektin tiedot (TÄYTÄ NÄMÄ)

Täytä omat tiedot tähän, niin Claude ei arvaa väärin.

- **Framework:** _(esim. Qbox / QBCore / ESX / ox_core / standalone)_
- **Kirjastot:** _(esim. ox_lib, oxmysql, ox_target, ox_inventory)_
- **Tietokanta:** _(esim. MariaDB + oxmysql)_
- **UI-stack:** _(esim. React + Vite + TypeScript / Svelte / vanilla JS)_
- **Kieli pelissä:** _(esim. suomi, locales/fi.json)_
- **Muuta:** _(nimeämiskäytännöt, resurssien prefixit, palvelimen pelaajamäärä jne.)_

Jos tieto puuttuu, tarkista ensin olemassa oleva koodi (`fxmanifest.lua`,
`package.json`, `require`/`exports`-kutsut) ja käytä samaa kuin muualla projektissa.

---

## 1. Työskentelysäännöt Claudelle

1. **Lue ennen kuin kirjoitat.** Katso resurssin rakenne, `fxmanifest.lua` ja
   lähimmät vastaavat tiedostot. Kirjoita koodia, joka näyttää samalta kuin ympäröivä koodi.
2. **Älä keksi natiiveja.** Käytä vain natiiveja, jotka varmasti löytyvät osoitteesta
   https://docs.fivem.net/natives/. Jos et ole varma nimestä tai parametreista, sano se
   ääneen äläkä arvaa.
3. **Älä yritä testata peliä.** FiveM-palvelinta tai GTA V:tä ei voi ajaa tässä
   ympäristössä. Tee sen sijaan kaikki testit, jotka voi tehdä (ks. kohta 8), ja anna
   käyttäjälle lyhyt lista siitä, mitä pitää testata pelissä.
4. **Pienin toimiva muutos.** Älä lisää ominaisuuksia, kirjastoja tai abstraktioita,
   joita ei pyydetty.
5. **Raportoi rehellisesti:** mitä muutettiin, mitä testattiin ja millä tuloksella,
   ja mitä ei voitu testata.

---

## 2. Resurssin rakenne

```
resurssin-nimi/
├── fxmanifest.lua
├── config.lua            # vain asetukset, ei logiikkaa
├── shared/               # client + server (vakiot, apufunktiot)
├── client/
│   └── main.lua
├── server/
│   └── main.lua
├── locales/              # käännökset (jos käytössä)
└── web/                  # NUI (vain jos resurssilla on UI)
    ├── src/
    ├── dist/             # Viten build-output, tämä ladataan peliin
    ├── package.json
    └── vite.config.ts
```

Perus-`fxmanifest.lua`:

```lua
fx_version 'cerulean'
game 'gta5'
lua54 'yes'

shared_scripts { '@ox_lib/init.lua', 'config.lua', 'shared/*.lua' }
client_scripts { 'client/*.lua' }
server_scripts { '@oxmysql/lib/MySQL.lua', 'server/*.lua' }

ui_page 'web/dist/index.html'
files { 'web/dist/index.html', 'web/dist/assets/*' }
```

- Poista rivit, joita resurssi ei tarvitse (ei `ui_page`, jos ei ole UI:ta).
- Kaikki tiedostot, joita NUI lataa, pitää olla `files`-listassa.
- Server-only-salaisuudet (webhookit, API-avaimet) **vain** server-puolelle, käytä
  `GetConvar`-arvoja, ei koodiin kovakoodattuna.

---

## 3. Milloin käyttää mitäkin: UI / UX / NUI / DUI / natiivit

**UI ja UX eivät ole tekniikoita** – UI = miltä näyttää, UX = miten helppo käyttää.
Tekniikan valinta:

| Tarve | Käytä | Älä käytä |
|---|---|---|
| Valikot, inventaario, puhelin, HUD, lomakkeet | **NUI** (HTML/CSS/JS ruudun päällä) | DUI |
| Ruutu/näyttö pelimaailmassa (TV, mainostaulu, tietokoneen näyttö) | **DUI** (selain renderöidään tekstuuriksi) | NUI |
| Yksinkertainen ilmoitus, progressbar, kontekstivalikko, textUI | **ox_lib** (tai frameworkin valmis) | Oma NUI |
| Marker, yksinkertainen 3D-teksti | Natiivit (`DrawMarker`) vain kun pelaaja on lähellä | Jatkuva `Wait(0)`-looppi kaikille |
| Interaktio objektin/pedin kanssa | **ox_target** tai `lib.points`/`lib.zones` | Oma etäisyysluuppi joka framella |

### NUI – säännöt
- Yksi NUI-sivu per resurssi. Pidä se kevyenä: kun UI on piilossa, **älä renderöi
  DOMia ollenkaan** (React: `return null` / `{visible && <App/>}`), älä vain `opacity: 0`.
- `SendNUIMessage` vain kun data **muuttuu**. Ei joka frame. HUD-päivitykset: max
  ~4–5 kertaa sekunnissa ja vain muuttuneet arvot.
- Jokaisen `RegisterNUICallback`-käsittelijän on **aina** kutsuttava `cb(...)`,
  muuten JS:n `fetch` jää roikkumaan.
- Fokus: `SetNuiFocus(true, true)` avatessa, `SetNuiFocus(false, false)` sulkiessa.
  Sulje myös `Escape`-näppäimellä JS:ssä ja `onResourceStop`-eventissä, ettei pelaaja
  jää jumiin hiiren kanssa.
- Ei `setInterval`/`requestAnimationFrame`-looppeja, kun UI on kiinni.

### DUI – säännöt
- DUI on **raskas** (oma selaininstanssi). Luo vasta kun pelaaja on lähellä
  (`CreateDui`), tuhoa kun poistuu (`DestroyDui`).
- Pieni resoluutio (esim. 512×512 tai 1024×512), ei 4K.
- Yksi DUI voi palvella monta samanlaista näyttöä – älä luo yhtä per objekti.
- Päivitä sisältöä `SendDuiMessage`/`SetDuiUrl`-kutsuilla, ei luomalla uutta DUI:ta.

---

## 4. Web / NUI -koodi (React, Vite yms.)

### Vite-asetukset
```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: './',                       // PAKOLLINEN: muuten polut hajoaa pelissä
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
});
```

- Valitse kevein riittävä: pieni UI → vanilla JS tai Preact/Svelte; iso UI
  (puhelin, tabletti, inventaario) → React on ok.
- Ei raskaita UI-kirjastoja (MUI, Ant Design) pienen asian takia. Tailwind ok.
- Fontit ja kuvat **paikallisesti** resurssiin (ei CDN:ää), kuvat `.webp`/`.png`
  pienennettynä. Toisen resurssin kuvat: `nui://resurssi/polku/kuva.png`.
- Tee `fetchNui`- ja `useNuiEvent`-apufunktiot yhteen paikkaan ja käytä niitä:

```ts
export async function fetchNui<T = unknown>(event: string, data?: unknown): Promise<T> {
  const resource = (window as any).GetParentResourceName?.() ?? 'dev';
  const res = await fetch(`https://${resource}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data ?? {}),
  });
  return res.json();
}
export const isEnvBrowser = () => !(window as any).invokeNative;
```

- Tue selainkehitystä: kun `isEnvBrowser()` on tosi, näytä UI mock-datalla, jotta
  `npm run dev` toimii ilman peliä.

### CSS – mitä EI saa käyttää
- **`backdrop-filter: blur()` ja `filter: blur()` – ÄLÄ KÄYTÄ.** NUI on läpinäkyvä
  kerros pelin päällä: peliä ei ole DOMissa "takana", joten backdrop-blur ei sumenna
  peliä ollenkaan ja syö silti GPU:ta. Käytä tilalle puoliläpinäkyvää taustaa,
  esim. `background: rgba(15, 15, 20, 0.85)`.
- Ei isoja/monikerroksisia `box-shadow`-varjoja, ei videotaustoja, ei jatkuvasti
  pyöriviä animaatioita.
- Animoi vain `transform` ja `opacity` (GPU-ystävällinen). Ei `width`/`height`/
  `top`/`left`-animaatioita.
- Ei `vh`/`vw`-pohjaisia fonttikokoja, jotka näyttävät oudoilta eri resoluutioilla –
  testaa layout 1280×720, 1920×1080 ja 2560×1440 selaimen devtoolsissa.

---

## 5. Lua-koodi: suorituskyky

Tavoite: resurssi **0.00–0.01 ms** resmonissa idle-tilassa.

### Loopit
- **Ei `while true do Wait(0)` -looppeja**, ellei piirretä jotain joka frame. Ja
  silloinkin vain kun tarvitaan (pelaaja lähellä / UI auki).
- Käytä dynaamista sleepiä:

```lua
CreateThread(function()
    while true do
        local sleep = 1000
        local dist = #(GetEntityCoords(cache.ped) - Config.Location)
        if dist < 10.0 then
            sleep = 0
            DrawMarker(...)
        end
        Wait(sleep)
    end
end)
```

- Parempi kuin loopit: **eventit, statebagit, `lib.points`, `lib.zones`, ox_target,
  `lib.onCache`**. Reagoi muutoksiin, älä kysele jatkuvasti.
- Ei yhtä threadia per entiteetti/pelaaja. Yksi thread käy listan läpi.

### Mikro-optimoinnit, joita aina noudatetaan
- `local` kaikkialla (myös funktiot). Ei globaaleja.
- Etäisyys: `#(vec1 - vec2)`, ei `GetDistanceBetweenCoords`.
- Hashit: `` `adder` `` (backtick, käännösaikainen) tai `joaat`, ei `GetHashKey` loopissa.
- Cache: `cache.ped`, `cache.vehicle` (ox_lib) tai tallenna `PlayerPedId()`
  muuttujaan, älä kutsu natiivia monta kertaa samassa framessa.
- Aikaleimat: `GetGameTimer()` (client) / `os.time()` (server).
- Merkkijonojen kokoaminen loopissa: `table.concat`, ei `..`-ketjua.
- `CreateThread` / `Wait` (ei vanhoja `Citizen.`-etuliitteitä uudessa koodissa).

### Verkko ja eventit
- Ei eventtien spämmäystä: client → server max muutaman kerran sekunnissa ja
  ratelimit serverillä.
- Pyyntö-vastaus: `lib.callback` (tai frameworkin callback), ei kahta erillistä eventtiä.
- Iso data: `TriggerLatentClientEvent`. Ei `TriggerClientEvent(-1, ...)` isolla
  payloadilla.
- Synkronoitava tila (esim. ovi auki/kiinni, entiteetin tila): **statebagit**
  (`Entity(ent).state`, `GlobalState`, `Player(src).state`).

### Tietokanta (oxmysql)
- Aina parametrit (`?`), **ei koskaan** merkkijonoyhdistelyä SQL:ään.
- Ei kyselyitä loopissa – hae kerralla, cachea muistiin, tallenna ajoittain/poistuessa.
- Käytä async-versioita (`MySQL.query.await` coroutinessa / callback-muoto).

---

## 6. Turvallisuus (TÄRKEÄ)

- **Älä koskaan luota clientiin.** Kaikki raha, itemit, palkinnot, työpaikat ja
  oikeudet tarkistetaan ja tehdään **serverillä**.
- Server-eventissä aina: käytä `source`a (ei clientin lähettämää ID:tä), tarkista
  datan tyyppi ja arvoalue, tarkista etäisyys serverillä (`GetEntityCoords(GetPlayerPed(source))`),
  tarkista cooldown/ratelimit.
- Client ei saa lähettää hintaa, määrää ilman rajaa tai palkkion suuruutta – server
  päättää ne `config`in perusteella.
- Ei `ExecuteCommand`/`load`-kutsuja clientin datalla.

---

## 7. Koodityyli

- Tiedostot: `client/`, `server/`, `shared/`; yksi selkeä vastuu per tiedosto.
- Nimeäminen: `camelCase` paikallisille, `PascalCase` taulukoille/moduuleille,
  eventit `resurssi:server:toiminto` / `resurssi:client:toiminto`.
- Config-arvot `config.lua`:han, ei taikanumeroita koodiin.
- Kommentoi vain se, mikä ei ole ilmeistä koodista (miksi, ei mitä).
- Siivoa `onResourceStop`-eventissä: poista luodut entiteetit, blipit, DUI:t,
  NUI-fokus ja zonet.

---

## 8. Testaus (mitä Claude voi ja ei voi tehdä)

**Ei mahdollista:** pelin/palvelimen käynnistäminen, natiivien ajaminen, resmonin
mittaaminen. Älä yritä.

**Tee aina kun mahdollista** (asenna työkalu tarvittaessa, ja kerro jos ei onnistu):

| Mitä | Komento / tapa |
|---|---|
| Lua-lint | `luacheck .` tai `selene .` (FiveM-std: tunne natiivit globaaleiksi) |
| Lua-syntaksi | `luac -p tiedosto.lua` – HUOM: CfxLua-syntaksi (`` `hash` ``, `+=`, `?.`) ei käy tavallisella luacilla, raportoi nämä erikseen äläkä "korjaa" niitä |
| Puhdas logiikka | Erota laskenta/validointi omiksi funktioiksi ja testaa `busted`illa mockaamalla natiivit |
| TypeScript | `npx tsc --noEmit` |
| Web-lint | `npm run lint` (jos määritelty) |
| Web-testit | `npx vitest run` (jos käytössä) |
| Build | `npm run build` – varmista että `web/dist/index.html` syntyy ja polut ovat suhteellisia (`./assets/...`) |
| Manifest | Tarkista että jokainen `fxmanifest.lua`:n polku/glob osuu oikeisiin tiedostoihin |
| UI ilman peliä | `npm run dev` + mock-data, Playwright-kuvakaappaus eri resoluutioilla jos mahdollista |

**Lopuksi** anna käyttäjälle lyhyt "Testaa pelissä" -lista, esim.:
- [ ] Resurssi käynnistyy ilman virheitä F8-konsolissa ja server-konsolissa
- [ ] `resmon`: idle ~0.00 ms, käytössä matala
- [ ] UI aukeaa/sulkeutuu, ESC toimii, hiiri vapautuu
- [ ] `restart resurssi` ei jätä haamuobjekteja tai jumita fokusta
- [ ] Server-validointi: väärä data / liian kaukana → hylätään

---

## 9. Tarkistuslista ennen kuin sanot "valmis"

- [ ] Ei turhia `Wait(0)`-looppeja, ei threadia per entiteetti
- [ ] Ei `backdrop-filter`/`filter: blur`, ei raskaita animaatioita
- [ ] NUI ei renderöi mitään, kun se on kiinni
- [ ] Kaikki `RegisterNUICallback`:t kutsuvat `cb()`
- [ ] Kaikki tärkeä logiikka ja validointi serverillä
- [ ] SQL parametreilla
- [ ] `onResourceStop` siivoaa
- [ ] Ajetut testit + tulokset raportoitu, pelitestilista annettu
