# Disc Dogs

**Dogs vs cats ultimate frisbee. Every throw shifts you into another dog.**

A small arcade sports game made for [GitHub Game Off 2026](https://itch.io/jam/game-off-2026), theme **SHIFT**.

You never play just one dog. Throw the disc and you shift into whoever catches it, so you're always the one with
the disc and always the one who has to decide what happens next. The wind shifts every point too, so a throw that
was easy a moment ago now has to be aimed into a crosswind.

Play it in the browser: *(itch.io link goes here)*

## How to play

Get the disc into the cats' end zone, on the right. First to 3, or whoever's ahead when the minute's up.

| | Mouse or touch | Keyboard |
|---|---|---|
| Throw | Tap or click a dog | Space throws to whoever's most open |
| Charged throw | Hold before letting go | Hold Space |
| Run | Drag anywhere | Arrow keys or WASD |
| Switch dog | Tap a dog | Shift |
| Zoomies | Tap your meter when it's full | Z |
| Pause | Top right button | P or Esc |
| Sound | Speaker, top left | M |

- **Holding the disc**: you have 5 seconds to throw (the dots over your dog). A longer hold charges the throw:
  faster, flatter, harder to block and less pushed around by the wind. A quick tap is a normal throw.
- **The wind** shows in the box in the bottom left corner. The aim line bends to show where the disc will really
  come down.
- **Zoomies and catnip**: good plays fill your meter. Zoomies make your dogs fast and your throws rockets. The cats'
  catnip makes them jump higher and lob the disc.
- **Pickups** pop up on the field. Whoever runs over one first gets it: a bone for speed, a star for the meter, a
  squeaky duck that freezes the other team nearby for a moment.
- **Comeback**: in the last 20 seconds, the team that's behind gets a little faster and springier.
- **Paws**: win a match for a bronze paw, win by 2 for silver, shut them out 3-0 for gold. Each cup has 15 to
  collect.

## Cups

- **The Park Cup**: five cat teams, one match each, during a day at the park. Most wins takes the cup.
- **The City Cup**: opens when you win the Park Cup. Six a side, at night, in a parking lot, against tougher
  cats.

Short on time? Add `?city` to the address to open the City Cup straight away.

## Running it locally

It's plain HTML and JavaScript with no build step. Serve the folder with any static server, for example:

```
node tools/serve.js
```

then open http://localhost:8783. The game reloads its files fresh every time, so it's also handy for testing on a
phone on the same Wi-Fi.

## Credits

- **Engine**: [LittleJS](https://github.com/KilledByAPixel/LittleJS) by Frank Force, MIT license
  (`lib/LICENSE.txt`). Sound effects are [ZzFX](https://github.com/KilledByAPixel/ZzFX), built into LittleJS.
- **Dog and cat art**: LuizMelo's [Pet Dogs Pack](https://luizmelo.itch.io/pet-dogs-pack) and
  [Pet Cat Pack](https://luizmelo.itch.io/pet-cat-pack), CC0 (`art/dogs/License.txt`, `art/cats/License.txt`).
- **Barks, meows and applause**: recordings from [BigSoundBank](https://bigsoundbank.com), CC0
  (`art/sounds/License.txt` lists each one).
- **Music**: written as note data in `music.js` and played through ZzFX.

## How it was made, and AI use

The game was designed and directed by its author and built with **Claude Code** (Anthropic's Claude), which wrote
the code and the music data from the author's direction. The author playtested every change on desktop and phone
and decided what stayed. Some early playtesting notes also came from OpenAI Codex agents. All art and recorded
sounds are human-made CC0 assets, credited above; none of them are AI-generated.

## License

The game's own code (`index.html`, `game.js`, `cup.js`, `music.js`, `tools/`) is MIT licensed, see `LICENSE`.
LittleJS keeps its own MIT license, and the art and recordings are CC0, as credited above.
