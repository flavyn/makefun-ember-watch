# Ember Watch

A first-person night watch on a lamp rock, taken further: the sea does not send the same wave twice.
Hollows walk in from eight gates, the beacon at the middle has 100 integrity, and the keeper has one
ember lance, flares and eight waves. Between waves salvage buys an upgrade, or you keep it for a bigger one.

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/flavyn/makefun-ember-watch/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/flavyn/makefun-ember-watch/reward.svg)](https://make.fun/bounty/best-game-01)

## Play it

```
node serve.ts            # http://127.0.0.1:8080/
```

Desktop Chrome, keyboard and mouse. `W A S D` move, mouse look, left click the ember lance,
`R` vents its heat, `G` throws a flare, `C` crouches, `Esc` pauses, `M` mutes, `1 2 3` pick an upgrade
and `4` keeps the salvage for later.

## What each wave asks

The wave plan is the ramp, and it is visible in `tuning.js`: a crawler is the crowd, a striker lunges,
a brute breaks the beacon, and the **warden** — first sent on wave four — is the reason to aim. Its
plate takes a quarter of a body hit and its head pays 1.6x, so a wave of wardens cannot be sprayed.
The plan also closes the gap between spawns from 1.00 to 0.70, so later waves arrive faster.

Two upgrades change how the fight is played, not only its numbers: the **Drilled Lens** makes the beam
punch through one more Hollow, and the **Frost Wick** slows whatever it hits, which buys the shot that
finishes a warden. Every landing shows a hit marker; a body hit on a warden flashes "plated warden - go
for the head"; a locked lance clicks dry and its heat bar flashes.

## Files

```
game/index.html        the page, the HUD, the three screens, the import map
game/src/main.js       bootstrap, the fixed step, the firing pipeline and the beam's pierce
game/src/world.js      the rock, its lanes, its lamps, and the collision boxes
game/src/player.js     movement, crouch, wall collision, the camera
game/src/hollow.js     the Hollow pool, its behaviours, its plate, and hit detection
game/src/weapon.js     heat, vent, spread, recoil, flares, the dry click
game/src/rounds.js     waves, the ramp, salvage, upgrades, win and loss
game/src/hud.js        the bars, the hit marker, and what is written only when it changes
game/src/audio.js      every sound, synthesised in WebAudio
game/src/input.js      keyboard, mouse and pointer lock
```

## Handing it in

```
node main.ts             # copies game/ and screenshots/ to $MAKEFUN_OUTPUT_DIR and writes dossier.json
```

`main.ts` uses `buildDossier` from `vendor/makefun-game.ts`, the kit's own copy, so the gate's rebuild
is byte for byte the dossier this program writes. MIT licensed; see `LICENSE`.
