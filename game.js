// Disc Dogs - dogs vs cats ultimate frisbee for GitHub Game Off 2026, theme SHIFT
// Five dogs against five cats on a long park field, in a cup against five cat teams (cup.js). The one with the disc can't run: touch to aim it, let go to
// throw, and you shift into the dog who runs for it, leaps and catches it. Catch it in the cats' end zone to score,
// and first to 3 wins. When the cats have it you shift into a defender, and get to do the chasing

'use strict';

// the screen is 384 by 216 pixels and a world unit is one pixel; everything here is laid out in pixels, counting
// down from the top, and turned into world space only to draw. The field is half as long again as the screen, and
// the view follows the disc along it
const SCREEN_SIZE = vec2(384, 216);
const FIELD_WIDTH = 616;

// the field: the lawn inside the fence, with an end zone at each end; the dogs go for the right one, the cats for the
// left one
const LAWN = {left: 6, right: FIELD_WIDTH - 6, top: 102, bottom: 206};
const ZONE = 64;
const GATE = {x: 294, w: 28};
const LOGO = {y: 156}; // the middle of the logo painted at the middle of the field
// a match is first to 3, or whoever's ahead when the clock runs out, which runs only while the disc is in play; a
// throw in the air when it runs out still counts, and if it's tied then, the next point wins
const WIN = 3, MATCH_TIME = 60;

// the players: how each is drawn (its strips, the size of a cell, the row of a cell its feet are on, its size, and
// where it holds the disc, from its feet, facing right), how high it leaps, how far it can throw and how high its
// throws float, how it runs (its top speed, and its grip: how fast it can change speed or turn, both in pixels a second), and the pitch of
// its bark or meow. The dogs are big, and tall enough to reach high; the cats are small, quick and nimble, leap
// higher, and lob the disc high over the dogs
const DOG = {cell: 100, leap: 12, range: 150, float: .15, anims: {walk: ['walk', 8], run: ['run', 8], call: ['bark', 3],
    sit: ['sitting', 1]}};
const CAT = {cell: 50, feet: 32, width: 21, height: 14, mouth: [8, -8], runMouth: [11, -9], leap: 22, range: 150, float: .24,
    cat: true,
    anims: {idle: ['Idle', 10], walk: ['Walk', 8], run: ['Run', 8], call: ['Meow', 4], sit: ['Sitting', 1]}};
const KINDS =
{
    akita:     {...DOG, file: 'dogs/Dog-2-Akita/Akita-', idle: 'Idle', feet: 58, width: 19, height: 15,
        mouth: [8, -9], speed: 72, grip: 320, voice: 1.3},
    golden:    {...DOG, file: 'dogs/Dog-1-Golden-Retriever/Golden-Retriever-', idle: 'idle', feet: 61, width: 33,
        height: 22, mouth: [15, -17], range: 190, speed: 76, grip: 200, voice: 1},
    schnauzer: {...DOG, file: 'dogs/Dog-4-Schnauzer/Schnauzer-', idle: 'Idle', feet: 62, width: 27, height: 23,
        mouth: [12, -16], speed: 68, grip: 300, voice: 1.5, yappy: true},
    husky:     {...DOG, file: 'dogs/Dog-6-Siberian-Husky/Siberian-Husky-', idle: 'Idle', feet: 62, width: 33,
        height: 24, mouth: [15, -17], range: 175, speed: 80, grip: 190, voice: .95},
    dane:      {...DOG, file: 'dogs/Dog-3-Great-Dane/Great-Dane-', idle: 'idle', feet: 67, width: 39, height: 34,
        mouth: [19, -25], runMouth: [24, -20], speed: 88, grip: 140, voice: .7},
    ginger:    {...CAT, file: 'cats/Cat-1/Cat-1-', speed: 80, grip: 380, voice: 1.1},
    sooty:     {...CAT, file: 'cats/Cat-2/Cat-2-', speed: 84, grip: 360, voice: .95},
    tabby:     {...CAT, file: 'cats/Cat-3/Cat-3-', range: 190, speed: 76, grip: 420, voice: 1.25},
    patch:     {...CAT, file: 'cats/Cat-4/Cat-4-', height: 16, speed: 74, grip: 400, voice: .85},
    snowy:     {...CAT, file: 'cats/Cat-5/Cat-5-', height: 16, range: 175, speed: 78, grip: 390, voice: 1.4},

    // the sixth of each side, only in the City Cup, and in the crowd
    bernard:   {...DOG, file: 'dogs/Dog-5-Saint-Bernard/Saint-Bernard-', idle: 'Idle', feet: 65, width: 43, height: 29,
        mouth: [20, -21], range: 140, speed: 64, grip: 150, voice: .65},
    smoky:     {...CAT, file: 'cats/Cat-6/Cat-6-', speed: 78, grip: 390, voice: 1.2},
};

// the one you are runs a little faster than it would on its own, and turns more sharply, while you steer it
const YOU_SPEED = 1.05, YOU_GRIP = 2;

// the teams, and where they line up to start a point, as the team with the disc and as the team without, counted
// from the end the team with the disc starts at, so the defense lines up facing it; from the cats' end it's flipped
const TEAMS = {us: ['akita', 'husky', 'golden', 'schnauzer', 'dane'], them: ['ginger', 'sooty', 'tabby', 'patch', 'snowy']};
const TEAM_NAME = {us: 'ZOOMIES', them: 'CATS'};
const DOG_NAMES = {akita: 'AKITA', husky: 'HUSKY', golden: 'GOLDEN RETRIEVER', schnauzer: 'SCHNAUZER', dane: 'GREAT DANE',
    bernard: 'SAINT BERNARD'};
const LINEUP = {offense: [[48, 154], [100, 116], [100, 192], [140, 136], [140, 172], [176, 154]],
    defense: [[196, 118], [186, 154], [196, 190], [230, 136], [230, 172], [262, 154]]};

// a throw: how fast the disc flies, and how long after it leaves the thrower's mouth before anyone can catch it. A
// player can catch it from the ground up to most of its height and a leap; how long one can hold it before it has to
// let it go. A throw goes where it's aimed out to part of the thrower's range, then strays more the further it goes,
// up to so far at the full range
const DISC_SPEED = 230, RELEASE = .3, STALL = 5, SURE = .6, STRAY = 16;

// charged throws (on trial; set on to false to put them back how they were): hold before you let go, and the longer
// you hold, up to full, the faster and flatter it goes, the less the wind takes it, the straighter it flies and the
// harder it is to knock down; a quick tap is a plain throw. The hold eats into your five seconds
const CHARGE = {on: true, start: .15, full: .7, speed: .45, float: .55, wind: .65, stray: .5, block: .2};
const chargeOf = (held)=> CHARGE.on ? clamp((held - CHARGE.start)/CHARGE.full, 0, 1) : 0;
let charging; // when you started holding a throw, by touch, mouse or Space

// defending is a step behind: a guard follows where its mark was a moment ago, a guard only goes for a throw once
// it's seen where it's going, and has to be right under it to knock it down, where a catcher only has to be near.
// A cat shows where it's throwing, with a dotted line like yours, for a moment before it throws
const GUARD_LAG = .4, GUARD_GAP = 18, REACT = .38, BLOCK_REACH = .55, WINDUP = .6;

// how each team defends: yours as above, and the cats each their own team's way
const OUR_DEFENSE = {lag: GUARD_LAG, react: REACT, block: BLOCK_REACH};
const DEFENSE = {us: OUR_DEFENSE, them: OUR_DEFENSE};

// the cats you're playing: how long they show where they're throwing before they throw, and how much harder their
// throws are to knock down than a plain cat's, the better teams' quicker and sharper
const windup = ()=> SQUADS[rival].windup ?? WINDUP;
const slipOf = ()=> SQUADS[rival].slip ?? 1;

// the powers: good plays fill each team's meter, faster when it's behind, and once it's full it can go off: your
// zoomies when you tap your meter or press Z, and the cats' catnip whenever they feel like it
// The zoomies: for a few seconds your dogs run faster and turn sharper, knock down throws from further and sooner,
// and every throw of yours is a rocket, fast, flat, further and dead on, and too fast for a cat to catch
// The catnip: the cats run faster, leap higher, and lob the disc up high, where it's much harder for a dog to knock
// down. What fills a meter, and by how much; and where the meters are, under each team's score, big enough to hit
const POWERS =
{
    us: {name: 'ZOOMIES', time: 6, speed: 1.35, grip: 1.4, leap: 0, reach: 40, rocket: 2.2},
    them: {name: 'CATNIP', time: 6, speed: 1.3, grip: 1.3, leap: 6, reach: 0, lob: 1.5, slip: .6},
};
const FILLS = {catch: 10, block: 22, turnover: 9, scored: 8, conceded: 16, behind: 1.5};
const METERS = {us: {x: 6, y: 13, w: 104, h: 12}, them: {x: 274, y: 13, w: 104, h: 12}};

// the stick: press anywhere and drag the way you want to run, further to run faster; and how near a tap has to be to
// one of your dogs to shift into it
const STICK_REACH = 18, TAP_REACH = 16;

const hex = (h)=> { const c = new Color; c.setHex(h); return c; };
const COLOR_CITY_FAR = hex('#a9c3dc'), COLOR_CITY = hex('#8aa6c4'), COLOR_WINDOW = hex('#dfeaf4');
const COLOR_TREES = hex('#4f9a48'), COLOR_TREES_DARK = hex('#3f8040');

// the time of day for each round of the cup, from midday to a sunset final: what it's called, the sky from its top
// to the horizon, the sun's colour and how far down the sky it is, how late it is (which warms the light, darkens
// the city and trees and stretches the shadows), how many of the city's windows are lit, and how bright the string
// lights along the fence are
const TIMES =
[
    {name: 'MIDDAY', top: '#6fb8ec', bottom: '#d2effc', sun: '#fffbe0', sunY: 12, late: 0, lit: 0, lights: 0},
    {name: 'EARLY AFTERNOON', top: '#68addf', bottom: '#e4eef0', sun: '#fff4c0', sunY: 18, late: .2, lit: 0, lights: 0},
    {name: 'LATE AFTERNOON', top: '#5b96d0', bottom: '#f6e2bc', sun: '#ffe08a', sunY: 24, late: .45, lit: .08, lights: 0},
    {name: 'GOLDEN HOUR', top: '#4d78bd', bottom: '#ffc685', sun: '#ffb45a', sunY: 30, late: .7, lit: .25, lights: .6},
    {name: 'SUNSET', top: '#3a3a7c', bottom: '#ff9466', sun: '#ff7444', sunY: 38, late: 1, lit: .6, lights: 1},
].map((t)=> ({...t, top: hex(t.top), bottom: hex(t.bottom), sun: hex(t.sun)}));

// and the City Cup's nights, from evening to midnight: the moon up instead of the sun, with stars, how dark it is
// over everything but the floodlit field, a short shadow under each player from the lights overhead, and no warm glow
const NIGHTS =
[
    {name: 'EVENING', top: '#2b2f6e', bottom: '#e0806a', sun: '#ff8a5a', sunY: 40, late: 1, lit: .7, lights: 1, dark: .1,
        shadow: .5, glow: .6},
    {name: 'NIGHT', top: '#0e1236', bottom: '#33305e', sun: '#f2eed8', sunY: 18, late: .9, lit: .85, lights: 1,
        dark: .3, shadow: .1, glow: 0, moon: true},
    {name: 'LATE NIGHT', top: '#0b0e2e', bottom: '#2c2856', sun: '#f2eed8', sunY: 15, late: .9, lit: .75, lights: 1,
        dark: .34, shadow: .1, glow: 0, moon: true},
    {name: 'NEARLY MIDNIGHT', top: '#090c28', bottom: '#26224e', sun: '#f4f0dc', sunY: 13, late: .9, lit: .8, lights: 1,
        dark: .37, shadow: .1, glow: 0, moon: true},
    {name: 'MIDNIGHT', top: '#070a24', bottom: '#221e48', sun: '#fff8e0', sunY: 12, late: .9, lit: .9, lights: 1,
        dark: .4, shadow: .1, glow: 0, moon: true},
].map((t)=> ({...t, top: hex(t.top), bottom: hex(t.bottom), sun: hex(t.sun)}));
const COLOR_DUSK = hex('#3a2a5a'), COLOR_GLOW = rgb(1, .62, .3), COLOR_LAMP = hex('#ffd98a');
const COLOR_FLOOD = rgb(1, .98, .86), COLOR_NIGHT = rgb(.04, .05, .16);

// where the sun and the moon are across the sky, clear of the scores
const SUN_X = 258;

// the lights along the back of a field at night: where they stand, and how high their lamps are; on the lot, just
// below the hints and just above the shops' signs
const FLOODLIGHTS = [70, FIELD_WIDTH/2, FIELD_WIDTH - 70], LAMPS = 44, LOT_LAMPS = 40;

// the time of day now: the round being played, or about to be; the final table stays as the last round was. A match
// keeps its round's light to the end of its results, though the cup has moved on to the next round when it ended
let matchRound = 0;
const daylight = ()=> (CUPS[cupIndex].night ? NIGHTS : TIMES)[min(inMatch() ? matchRound : cup.round,
    TIMES.length - 1)];

// whether the cup's played on the parking lot in the city, not in the park
const inLot = ()=> CUPS[cupIndex].lot;

// where each light's lamps shine from: four in a row on a floodlight tower in the park, and one at each end of the
// arm of a parking lot light in the city
const lampsOf = (x)=> inLot() ? [[x - 13, LOT_LAMPS + 2, 9, 2], [x + 6, LOT_LAMPS + 2, 9, 2]] :
    [0, 1, 2, 3].map((i)=> [x - 8 + i*5, LAMPS + 1, 3, 5]);
const COLOR_POST = hex('#6f7480'), COLOR_MESH = rgb(.85, .88, .92, .55), COLOR_PATH = hex('#d8c9a4');
const COLOR_LAWN = hex('#6aae4c'), COLOR_LAWN_STRIPE = hex('#73b855'), COLOR_TUFT = hex('#5b9a40');
const COLOR_DIRT = [rgb(.7, .58, .38, .7), rgb(.58, .46, .3, .6), rgb(.66, .7, .4, .55)];
const COLOR_CHALK = rgb(1, 1, 1, .75), COLOR_CONE = hex('#ff8a3a');

// the parking lot: its tarmac, patched here and there, grit, cracks, oil, the old lines of its parking spaces; the
// sidewalk and the street behind it; and the warm orange of its lights, and the blue of a TV in a window
const COLOR_ASPHALT = hex('#585c65'), COLOR_PATCH = [hex('#545861'), hex('#5c6069')];
const COLOR_GRAVEL = [rgb(.82, .82, .85, .45), rgb(.22, .23, .27, .45), rgb(.66, .6, .5, .4)];
const COLOR_CRACK = rgb(.16, .17, .2, .6), COLOR_OIL = rgb(.08, .08, .12, .22), COLOR_STALL = rgb(1, .86, .3, .25);
const COLOR_SIDEWALK = hex('#8c8f97'), COLOR_STREET = hex('#3e4149'), COLOR_IRON = hex('#26262e');
const COLOR_SODIUM = rgb(1, .86, .62), COLOR_TV = hex('#9fd0ff'), COLOR_SHOP = hex('#ffe2a8');
const COLOR_DISC = hex('#ff5a4a'), COLOR_DISC_LIGHT = hex('#ffa090');
const COLOR_PANEL = hex('#1b1530'), COLOR_GOLD = hex('#e8b54f'), COLOR_GOLD_DARK = hex('#c8913a');
const COLOR_CATNIP = hex('#7ee07a');
const POWER_COLOR = {us: COLOR_GOLD, them: COLOR_CATNIP};
const COLOR_YOU = rgb(1, 1, 1, .9);
const SPOT = {us: rgb(1, 1, 1), them: rgb(1, .4, .35)}; // the ring where a throw will come down, by whose it is
const TEAM_COLOR = {us: rgb(.35, .65, 1, .7), them: rgb(1, .4, .35, .6)};
const JERSEY = {us: hex('#3d7dff'), them: hex('#ff4a3d')};
const TEAM_TEXT = {us: hex('#9cc8ff'), them: hex('#ffa294')};
const COLOR_TEXT = hex('#f3ead8'), COLOR_HINT = hex('#ffe9b8'), COLOR_DIM = hex('#a89cc8');
const SHADOW = rgb(0, 0, 0, .25), COLOR_OUTLINE = rgb(.06, .05, .1, .75);

// sprites: a strip a frame per square cell, each one's feet on the same row of every cell, facing right; and the
// cats' meow, a little burst by the mouth
const ANIM_FPS = {run: 14};
const IMAGES = [];
for (const kind of Object.values(KINDS))
{
    const anims = kind.cat ? kind.anims : {idle: [kind.idle, 10], ...kind.anims};
    kind.anims = {};
    for (const [anim, [file, frames]] of Object.entries(anims))
        kind.anims[anim] = {frames, texture: IMAGES.push(`art/${kind.file}${file}.png`) - 1};
}
const MEOW_TEXTURE = IMAGES.push('art/cats/Meow-VFX/Meow-VFX.png') - 1;
let meowTiles;

const sound_bark   = new Sound([.45, .05, 330, .005, .03, .08, 2, 1.6, -18, 0, 0, 0, 0, .5, 0, 0, 0, .7, .03]);
const sound_meow   = new Sound([.3, .05, 620, .06, .14, .22, 0, 1.4, 6, -.4, 0, 0, 0, 0, 0, 0, 0, .8, .05]);
const sound_hiss   = new Sound([.2, .1, 2400, .01, .18, .1, 4, 1, -6, 0, 0, 0, 0, 0, 0, 0, 0, .7]);
const sound_throw  = new Sound([.15, .1, 900, .04, .08, .12, 4, 1, 12, 0, 0, 0, 0, 0, 0, 0, 0, .5]);
// a catch is a soft thud with a little snap of teeth or claws on top, and a drop a dull bump on the grass; neither
// rises in pitch, which made them bloop like bubbles when they came on every pass
const sound_catch  = new Sound([.45, .05, 180, .001, .012, .05, 0, 1, -6, 0, 0, 0, 0, 4]);
const sound_snap   = new Sound([.5, .05, 400, .001, .01, .05, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .6, 0, 0, -1200]);
const sound_drop   = new Sound([.35, .05, 140, .005, .02, .14, 0, 1, -1.5, 0, 0, 0, 0, 2]);
const sound_note   = new Sound([.4, 0, 523.25, .005, .06, .3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .6]);
const sound_puff   = new Sound([.15, .1, 700, .01, .05, .2, 4, 1, -12]);
const sound_tock   = new Sound([.4, 0, 330, 0, .01, .06, 1, 1, -8]);
const sound_whistle = new Sound([.25, 0, 2000, .01, .4, .06, 0, 1, 0, 0, 0, 0, 0, 0, 40, 0, 0, .9]);
const sound_zoom   = new Sound([.4, 0, 180, .02, .3, .3, 1, 1.4, 22, 0, 0, 0, 0, 0, 0, 0, 0, .7]);
const sound_catnip = new Sound([.35, 0, 520, .02, .25, .3, 1, 1, -4, 0, 0, 0, 0, 0, 30, 0, 0, .7]);
const sound_rocket = new Sound([.3, .05, 700, .01, .12, .15, 4, 1, 20, 0, 0, 0, 0, 1]);
const sound_clap   = new Sound([.8, .2, 1100, .001, .012, .07, 4, 1, 0, 0, 0, 0, 0, 1.5, 0, 0, 0, .5]);

// the crowd clapping: a short burst, a longer one, or the whole of it at the end of a cup, from a real recording
// (music.js); until that's loaded, a lot of little bursts of noise scattered over a couple of seconds
function applause(size, volume)
{
    const cuts = size == 'whole' ? [applauseCuts.whole] : applauseCuts[size];
    const cut = cuts?.[randInt(cuts.length)];
    if (cut)
    {
        cut.play(undefined, volume, rand(.96, 1.04));
        return;
    }
    const claps = {short: 10, long: 26, whole: 40}[size];
    for (let i = 0; i < claps*2; ++i)
        setTimeout(()=> sound_clap.play(undefined, volume*rand(.5, 1), rand(.8, 1.25)), rand()**1.4*2000);
}
const fanfare = (notes, gap=.11)=> notes.forEach((note, i)=> setTimeout(()=> sound_note.playNote(note, undefined, .5),
    i*gap*1e3));

// mode: one of the cup's screens, 'title', 'table', 'matchup' or 'final'; or in a match, 'ready' until you first
// touch it, 'play', 'point' while a point is cheered, and 'over'; rival is the cup team you're playing
// player is the dog you are; the disc is in holder's mouth, or in flight, or loose on the grass; offense is the team
// that has it or gets it; view is how far along the field the screen is
let mode, players = [], player, holder, flight, loose, offense, score, effects, dust, banner, pauseTime, receiving;
let clock, timeUp, suddenDeath; // how long is left, whether it's run out, and whether the next point wins
let tally; // each team's throws, how many of them it caught, the other team's throws it picked off, and its noise
let crowd, confetti = []; // which fans are cheering, for how much longer and whether it's a point; and the confetti
// each team's meter, out of 100, how long its power has left, and how long till the cats use theirs; and the
// burst when one goes off: its name splashed across the screen, a flash and a shake
let power = {us: {meter: 0, time: 0}, them: {meter: 0, time: 0}}, splash, flash = 0, shake = 0;
let stick, aiming, hover, overTime, view = 0, rival = 1;
const inMatch = ()=> ['ready', 'play', 'point', 'over'].includes(mode);
let autopilot; // for scripted playtests: a function that gives the way to run, as the arrow keys would

// a match on hold: Escape, P, or the pause button in the top right corner stops everything where it is, and any of
// those, a tap anywhere, or Space or Enter starts it again
let matchPaused = false;

// how you play, by what you last pressed: 'touch', 'mouse' or 'keys', so the few words there are say tap, click or
// Space; before you've pressed anything, it's a guess from the screen. And until you've thrown a few times, a ghost
// shows you how while you hold the disc: a hand, or a mouse pointer, that taps your most open dog. ghost is how long
// it's been showing and the dog it taps; it waits while you move the mouse, which shows you the throw itself
let inputKind = matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse', ghost, taught = 0, hoverTime = -9;
let scoredOnce = false; // whether you've ever scored; till you have, arrows on the grass show you which way to go
const TEACH = 3, GHOST_CYCLE = 2.2;

// every finger on the screen, and the mouse, by id, so you can run with one thumb and tap with the other; the
// engine's mouse follows only one finger. These are screen positions
const pointers = new Map;
let presses = [];
function pointerPos(e)
{
    const r = mainCanvas.getBoundingClientRect();
    return vec2((e.clientX - r.left)/r.width*SCREEN_SIZE.x, (e.clientY - r.top)/r.height*SCREEN_SIZE.y);
}
addEventListener('pointerdown', (e)=>
{
    if (!mainCanvas || e.button)
        return;
    const pos = pointerPos(e);
    pointers.set(e.pointerId, pos);
    presses.push({id: e.pointerId, pos});
    inputKind = e.pointerType == 'mouse' ? 'mouse' : 'touch';
});
addEventListener('pointermove', (e)=>
{
    if (!mainCanvas)
        return;
    pointers.has(e.pointerId) && pointers.set(e.pointerId, pointerPos(e));
    if (e.pointerType == 'mouse')
    {
        hover = pointerPos(e);
        hoverTime = time;
    }
});
addEventListener('keydown', (e)=>
{
    if (/^(Space|Enter|Shift|Arrow|Key[WASD]$)/.test(e.code))
        inputKind = 'keys';
});
for (const type of ['pointerup', 'pointercancel'])
    addEventListener(type, (e)=> pointers.delete(e.pointerId));

///////////////////////////////////////////////////////////////////////////////
// the game

// a match against one of the cup's cat teams, in their jersey and with their ways; in the first one, everyone waits
// for you to make the first move, with nothing to read, and the rest start straight away
function startMatch(team)
{
    rival = team;
    const squad = SQUADS[team], jersey = hex(squad.jersey);
    TEAM_NAME.them = squad.name;
    JERSEY.them = jersey;
    TEAM_TEXT.them = jersey.lerp(WHITE, .4);
    TEAM_COLOR.them = jersey.scale(1, .6);
    DEFENSE.them = squad.defense;
    matchRound = cup.round;
    reset();
    if (cup.round)
        mode = 'play';
}

function reset()
{
    mode = 'ready';
    matchPaused = false;
    players = ['us', 'them'].flatMap((team)=> roster(team).map((name)=> newPlayer(name, team)));
    score = {us: 0, them: 0};
    tally = {us: {throws: 0, caught: 0, picks: 0, calls: 0}, them: {throws: 0, caught: 0, picks: 0, calls: 0}};
    crowd = undefined;
    confetti = [];
    power = {us: {meter: 0, time: 0}, them: {meter: 0, time: 0}};
    splash = undefined;
    clock = MATCH_TIME;
    timeUp = suddenDeath = false;
    effects = [];
    dust = [];
    banner = stick = aiming = charging = undefined;
    player = undefined;
    pickup = comeback = comebackBig = undefined;
    teamStatus = {};
    pickupTime = PICKUP_FIRST;
    shiftWind(false);
    kickoff('us');
}

// a point starts with each team lined up at the end the team with the disc starts from, and its longest thrower
// with the disc, at the back
function kickoff(team)
{
    offense = team;
    flight = loose = pickup = undefined;
    const thrower = teamOf(team).reduce((a, b)=> b.kind.range > a.kind.range ? b : a);
    const lineup = {[team]: [thrower, ...teamOf(team).filter((one)=> one != thrower)], [other(team)]: teamOf(other(team))};
    for (const one of players)
    {
        const [x, y] = LINEUP[one.team == team ? 'offense' : 'defense'][lineup[one.team].indexOf(one)];
        one.pos = vec2(team == 'us' ? x : FIELD_WIDTH - x, y);
        one.vel = vec2();
        one.goal = one.leap = one.seen = undefined;
        one.timer = one.fast = one.dazed = 0;
        one.mirror = one.team == 'them';
    }
    take(thrower);
    control(team == 'us' ? holder : nearest('us', holder.pos));
    youShift = undefined; // everyone's lined up afresh, so no leap across the field
    assignGuards();
    view = viewTarget();
}

const teamOf = (team)=> players.filter((one)=> one.team == team);
const other = (team)=> team == 'us' ? 'them' : 'us';
const nearest = (team, pos, except)=> teamOf(team).filter((one)=> one != except)
    .sort((a, b)=> a.pos.distance(pos) - b.pos.distance(pos))[0];

// which way a team is going, and whether a player is in the end zone it's going for
const forward = (team)=> team == 'us' ? 1 : -1;
const inEndZone = (one)=> one.team == 'us' ? one.pos.x > LAWN.right - ZONE : one.pos.x < LAWN.left + ZONE;

// you shift into another of your dogs: when you tap or click one, or press Shift; and on offense you follow the
// disc, into the dog you throw to and whichever of yours gets it, since you're always the one to throw it. On
// defense you keep the dog you have, so the one you're steering never changes under you. You can see yourself
// shift: your arrow leaps from the dog you were to the dog you are, with a trail of arrows behind it, and lands in a
// puff. It only makes a sound when you picked the dog, so a pass isn't a pile of little noises
let youShift; // the arrow's leap: from which dog, how far along, and how long it takes
function control(dog, picked)
{
    if (!dog || dog == player)
        return;
    const from = player;
    player = dog;
    dog.goal = undefined;
    if (mode == 'play' && from)
    {
        picked && sound_puff.play(undefined, .5);
        youShift = {from, time: 0, life: picked ? .2 : .35};
    }
}

// where your arrow is, over a dog's head
const arrowOver = (one)=> vec2(one.pos.x, head(one).y - 10);
function drawYouArrow(x, top, alpha=1)
{
    for (let i = 0; i < 4; ++i)
    {
        rect(x - 4 + i, top + i + 1, 9 - i*2, 1, rgb(0, 0, 0, .35*alpha));
        rect(x - 4 + i, top + i, 9 - i*2, 1, COLOR_YOU.scale(1, alpha));
    }
}

// the arrow on its way, arcing over from the dog you were to the dog you are, and a puff when it lands
function updateYouShift()
{
    if (!youShift || (youShift.time += timeDelta) < youShift.life)
        return;
    youShift = undefined;
    effects.push({type: 'puff', pos: player.pos.add(vec2(0, -player.kind.height/2)), time: 0, life: .4});
}
function drawYouShift()
{
    const p = youShift.time/youShift.life, from = arrowOver(youShift.from), to = arrowOver(player);
    for (let k = 5; k >= 0; --k)
    {
        const q = p - k*.06;
        if (q <= 0)
            continue;
        const at = from.lerp(to, 1 - (1 - q)**2).add(vec2(0, -Math.sin(q*PI)*14));
        drawYouArrow(Math.round(at.x), Math.round(at.y), k ? .5 - k*.08 : 1);
    }
}

// one gets the disc, and has a moment to look before it has to throw
function take(one)
{
    holder = one;
    one.stall = 0;
    one.wait = rand(1, 2.2);
    one.windup = undefined;
    offense = one.team;
}

// each of the team without the disc marks one of the team with it, whoever's nearest; it keeps to its mark until
// the disc changes hands
function assignGuards()
{
    const pairs = [];
    for (const guard of teamOf(other(offense)))
    {
        guard.guard = undefined;
        for (const mark of teamOf(offense))
            pairs.push([guard, mark, guard.pos.distance(mark.pos)]);
    }
    const taken = new Set;
    for (const [guard, mark] of pairs.sort((a, b)=> a[2] - b[2]))
        if (!guard.guard && !taken.has(mark))
        {
            guard.guard = mark;
            taken.add(mark);
        }
}

// throw the disc at a spot, as far as it can go: it floats over, curving a little, and the nearest of each team
// goes for it; when it's your throw, you shift into whichever of your dogs that is
function throwDisc(thrower, spot, charge=0)
{
    let to = spot.subtract(thrower.pos);
    if (to.length() > rangeOf(thrower))
        to = to.normalize(rangeOf(thrower));
    const rocket = zooming(thrower), lob = thrower.team == 'them' && powered('them');
    charge = rocket ? 0 : charge;
    const stray = rocket ? 0 : strayOf(thrower, to.length())*(1 - CHARGE.stray*charge);
    const off = vec2().setAngle(rand(PI*2), stray*Math.sqrt(rand()));
    const aimed = onLawn(thrower.pos.add(to).add(vec2(off.x, off.y*.5)));
    to = onLawn(aimed.add(driftOf(thrower, aimed, charge)));
    thrower.mirror = aimed.x < thrower.pos.x;
    const distance = aimed.distance(thrower.pos), [x, y] = thrower.kind.mouth;
    const from = thrower.pos.add(vec2(thrower.mirror ? -x : x, 0));
    ++tally[thrower.team].throws;
    if (thrower == player && taught < TEACH)
    {
        ++taught;
        try { localStorage.setItem('zoomies-taught', taught); } catch(e) {}
    }
    const speed = DISC_SPEED*(1 + CHARGE.speed*charge);
    flight = {thrower, team: thrower.team, from, to, drift: to.subtract(aimed), time: 0, start: -y, rocket, lob, charge,
        trail: [],
        life: rocket ? .15 + distance/(DISC_SPEED*POWERS.us.rocket) : .25 - .1*charge + distance/speed,
        float: rocket ? 4 + distance*.04 : (8 + distance*thrower.kind.float)*(lob ? POWERS.them.lob : 1)*
            (1 - CHARGE.float*charge),
        curve: rocket ? 0 : rand(-1, 1)*min(16, distance*.1)*(1 - charge)};
    flight.chasers = [nearest('us', to, thrower), nearest('them', to, thrower)];
    holder = undefined;
    setAnim(thrower, 'call', false);
    rocket ? sound_rocket.play() : charge > .7 ? sound_rocket.play(undefined, .5, .8) : sound_throw.play(undefined, 1,
        1 + charge*.4);
    if (thrower.team == 'us')
        control(nearest('us', to, thrower));
}

// how far a throw can stray from where it's aimed, the further the wilder; depth strays half as much
const strayOf = (thrower, distance)=> STRAY*clamp((distance/thrower.kind.range - SURE)/(1 - SURE), 0, 1);
const onLawn = (pos)=> vec2(clamp(pos.x, LAWN.left + 4, LAWN.right - 4), clamp(pos.y, LAWN.top, LAWN.bottom));

// the wind: which way it blows and how hard, in pixels a second. It shifts at every point, round to a new way, and
// blows harder as the cup goes on, and harder again between the city's buildings; gust is the burst of it when it
// shifts. A throw drifts with it for as long as it's in the air, half as much across the field's depth as along it,
// as everything seen at a slant does; the zoomies' rockets go too fast to be blown
let wind = vec2(), gust = 0;
const WIND = [6, 12, 16, 20, 24], WIND_CITY = 6;
function shiftWind(announce)
{
    const strength = (WIND[min(matchRound, WIND.length - 1)] + (inLot() ? WIND_CITY : 0))*rand(.75, 1.25);
    const angle = (wind.length() ? wind.angle() : rand(PI*2)) + rand(PI*.5, PI*1.5);
    wind = vec2().setAngle(angle, strength);
    gust = 1.2;
    announce && !banner && showBanner('WIND SHIFT!', COLOR_HINT);
}
function driftOf(thrower, aimed, charge=0)
{
    if (zooming(thrower))
        return vec2();
    const seconds = (.25 + aimed.distance(thrower.pos)/DISC_SPEED)*(1 - CHARGE.wind*charge);
    return vec2(wind.x*seconds, wind.y*seconds*.5);
}

// the wind as streaks blowing across the field and the sky, each where the wind has carried it, so they stay put as
// the view moves: a few now and then, longer and quicker the harder it blows, and a burst of them when it shifts.
// The vane in the corner shows it the rest of the time
// the wind vane in the bottom left corner, on a dark plate like the scoreboard's: an aqua arrow the way the wind
// blows, longer the harder it blows, swinging round to its new way when it shifts, the plate's rim lit up as it does;
// behind it, little white streaks blow across the plate, more and faster the harder it blows, and in a burst as it
// shifts. They stay in the plate, so the field stays clear
const COLOR_WIND = hex('#8ff0dc');
let vaneAngle;
function drawVane()
{
    const target = vec2(wind.x, wind.y*.5).angle(), strength = wind.length();
    vaneAngle ??= target;
    vaneAngle += (((target - vaneAngle + 3*PI) % (2*PI)) - PI)*min(1, timeDelta*6);
    const cx = 23, cy = 199, half = {x: 19, y: 13}, dir = vec2().setAngle(vaneAngle);
    screenRect(cx - half.x - 1, cy - half.y - 1, half.x*2 + 2, half.y*2 + 2, gust > 0 ?
        COLOR_WIND.scale(1, .5*gust/1.2 + .2) : rgb(1, 1, 1, .15));
    screenRect(cx - half.x, cy - half.y, half.x*2, half.y*2, rgb(.1, .08, .2, .8));
    if (strength)
    {
        const way = vec2(wind.x, wind.y*.5).normalize(), burst = gust/1.2, speed = 10 + strength*1.2;
        const count = Math.round(3 + strength*.15 + 4*burst), length = 3 + Math.round(strength*.12);
        const wrap = (value, size)=> (value % size + size) % size;
        for (let i = 0; i < count; ++i)
        {
            const a = i*.618034 % 1, b = (i*.414214 + .3) % 1, pace = speed*(.75 + b*.5);
            const x = wrap(a*40 + time*pace*way.x, half.x*2 + length*2) - half.x - length;
            const y = wrap(b*26 + time*pace*way.y, half.y*2 + length) - half.y - length/2;
            for (let k = 0; k < length; ++k)
            {
                const px = Math.round(x - way.x*k), py = Math.round(y - way.y*k);
                if (Math.abs(px) < half.x - 1 && Math.abs(py) < half.y - 1)
                    screenRect(cx + px, cy + py, 1, 1, rgb(1, 1, 1, (.4 + .3*burst)*(1 - k/length)));
            }
        }
    }
    // a bold arrow pointing the nearest of eight ways, with a dark edge round it: straight, a shaft and a wide head,
    // or slanting, a diagonal shaft and a head square in the corner; the shaft longer the harder it blows. The
    // straight and slanting shapes point right and down right, turned a quarter at a time for the other six
    const way = (Math.round(Math.atan2(dir.y, dir.x)/(PI/4)) % 8 + 8) % 8, longer = Math.round(min(1, strength/30)*4);
    const on = (x, y)=>
    {
        for (let turn = 0; turn < way >> 1; ++turn)
            [x, y] = [y, -x];
        return way & 1 ? x <= 4 && y <= 4 && x + y >= 3 || Math.abs(x - y) <= 1 && x + y < 3 && x + y >= -3 - longer*2 :
            x >= 0 && x <= 4 && Math.abs(y) <= 4 - x || Math.abs(y) <= 1 && x < 0 && x >= -3 - longer;
    };
    const dark = rgb(.02, .02, .05);
    for (let y = -10; y <= 10; ++y)
        for (let x = -10; x <= 10; ++x)
            if (on(x, y))
                screenRect(cx + x, cy + y, 1, 1, COLOR_WIND);
            else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))
                screenRect(cx + x, cy + y, 1, 1, dark);
}

// where to aim for a throw to come down on a spot, allowing for the wind, as the cats do, and Space
const aimFor = (thrower, spot)=> spot.subtract(driftOf(thrower, spot.subtract(driftOf(thrower, spot))));

// where the disc is over the grass, and how high, part of the way through its flight: on its way to where it was
// aimed, curving a little, and carried more and more by the wind to where it comes down
function discGround(f, p)
{
    const line = f.to.subtract(f.from), side = line.length() ? vec2(-line.y, line.x).normalize() : vec2();
    return f.from.lerp(f.to, p).add(side.scale(f.curve*Math.sin(p*PI))).add(f.drift.scale(p*p - p));
}
const discHeight = (f, p)=> f.start*(1 - p) + f.float*Math.sin(p*PI);

// where the disc is, wherever it is
const discAt = ()=> holder ? holder.pos : flight ? discGround(flight, min(flight.time/flight.life, 1)) :
    loose ? loose.pos : player.pos;

// how far a player is from being under the disc, as a fraction of its reach; and how high it can reach with a leap
const under = (one, at)=> Math.hypot((one.pos.x - at.x)/(one.kind.width*.5 + 6), (one.pos.y - at.y)/7);
const reachOf = (one)=> one.kind.height*.6 + one.kind.leap + (boost(one)?.leap || 0) +
    (rallying(one) ? rally().leap : 0);

function updateDisc()
{
    if (flight)
    {
        const f = flight;
        f.time += timeDelta;
        const p = min(f.time/f.life, 1), at = discGround(f, p), height = discHeight(f, p);
        f.rocket && f.trail.push(at.add(vec2(0, -height)));

        // whoever's under it and can reach it catches it, the nearest first
        if (f.time > RELEASE)
        {
            const reaches = (one)=> one.team == f.team ? under(one, at) < 1 : !f.rocket &&
                under(one, at) < (zooming(one) ? 1 : DEFENSE[one.team].block)*(f.lob ? POWERS.them.slip : 1)*
                (f.team == 'them' ? slipOf() : 1)*(1 - CHARGE.block*(f.charge || 0));
            const catcher = players.filter((one)=> one != f.thrower && height <= reachOf(one) && reaches(one))
                .sort((a, b)=> under(a, at) - under(b, at))[0];
            if (catcher)
            {
                catchDisc(catcher, height);
                return;
            }
        }
        if (p >= 1)
            drop(at, f.team == 'us' ? 'DROPPED!' : `${TEAM_NAME.them} DROPPED IT!`);
    }
    else if (loose)
    {
        // a loose disc is picked up by the first of the team that gets it to reach it
        const picker = teamOf(offense).find((one)=> under(one, loose.pos) < 1);
        if (picker)
        {
            loose = undefined;
            take(picker);
            sound_catch.play(undefined, .5);
            if (picker.team == 'us')
                control(picker);
            assignGuards();
        }
    }
    else if (holder)
    {
        // with the disc held, the stall counts up; yours ticks through its last second and a half, higher each time
        const before = holder.stall;
        holder.stall += timeDelta;
        if (holder == player)
            for (const left of [1.5, 1, .5])
                if (before < STALL - left && holder.stall >= STALL - left)
                    sound_tock.play(undefined, .7, 2.8 - left);

        // held too long: it has to let go of it, and it's the other team's
        if (holder.stall > STALL)
        {
            const one = holder;
            holder = undefined;
            drop(one.pos.add(vec2(one.mirror ? -6 : 6, 2)), 'STALL!');
        }
    }
}

function catchDisc(one, height)
{
    const f = flight;
    flight = undefined;
    take(one);
    sound_catch.play();
    sound_snap.play(undefined, .6);
    one.team == f.team ? (++tally[one.team].caught, ++one.catches) : (++tally[one.team].picks, ++one.blocks);
    fill(one.team, f.team == one.team ? FILLS.catch : FILLS.block);

    // a catch up high is a leap
    if (height > one.kind.height*.35)
        one.leap = {time: 0, height: height - one.kind.height*.25};

    // a cat that knocks a dog's throw down hisses about it, and a dog that picks off a cat's throw barks
    if (one.team != f.team)
    {
        showBanner(one.team == 'us' ? 'INTERCEPTED!' : 'BLOCKED!', TEAM_TEXT[one.team]);
        cheer(one.team, 1, false);
        one.kind.cat ? hiss(one) : call(one);
    }
    if (inEndZone(one))
    {
        ++one.points;
        point(one.team);
        return;
    }
    if (one.team == 'us')
        control(one);
    assignGuards();
}

// the disc hits the grass: it's the other team's, where it lies
function drop(at, why)
{
    const team = flight?.team || offense;
    flight = undefined;
    loose = {pos: vec2(clamp(at.x, LAWN.left + 4, LAWN.right - 4), clamp(at.y, LAWN.top, LAWN.bottom))};
    offense = other(team);
    sound_drop.play();
    fill(offense, FILLS.turnover);
    showBanner(why, TEAM_TEXT[offense]);
    assignGuards();
}

// a point: the team that scored barks or meows about it, one after another
function point(team)
{
    ++score[team];
    if (team == 'us' && !scoredOnce)
    {
        scoredOnce = true;
        try { localStorage.setItem('zoomies-scored', '1'); } catch(e) {}
    }
    mode = 'point';
    pauseTime = 2.6;
    receiving = other(team);
    showBanner(team == 'us' ? 'POINT!' : `${TEAM_NAME.them} SCORE`, TEAM_TEXT[team]);
    fill(team, FILLS.scored);
    fill(other(team), FILLS.conceded);
    team == 'us' ? fanfare([0, 4, 7, 12, 16]) : fanfare([7, 3, 0], .16);
    teamOf(team).forEach((one, i)=> setTimeout(()=> call(one), 150 + i*230 + rand(80)));
    cheer(team, 2.4, true);
    if (team == 'us')
        throwConfetti();
}

// a good play fills a team's meter, more when it's behind; your full meter chimes, and the cats wait a moment
// before using theirs
function fill(team, amount)
{
    const meter = power[team];
    if (meter.time > 0 || meter.meter >= 100)
        return;
    meter.meter = min(100, meter.meter + amount*(score[team] < score[other(team)] ? FILLS.behind : 1));
    if (meter.meter < 100)
        return;
    if (team == 'us')
    {
        fanfare([12, 16, 19, 24], .07);
        showBanner('ZOOMIES READY!', COLOR_GOLD);
    }
    else
        meter.wait = rand(.6, 1.6);
}

// a power goes off: its name splashes across the screen with a flash and a shake, sparks burst off the team, they
// all bark or meow, and the crowd goes up
function startPower(team)
{
    const meter = power[team];
    if (meter.meter < 100 || meter.time > 0 || mode != 'play')
        return;
    meter.meter = 0;
    meter.time = POWERS[team].time;
    (team == 'us' ? sound_zoom : sound_catnip).play();
    splash = {text: POWERS[team].name + '!', color: POWER_COLOR[team], time: 0};
    banner = undefined;
    flash = .25;
    shake = .35;
    teamOf(team).forEach((one, i)=>
    {
        setTimeout(()=> call(one), i*120);
        for (let j = 0; j < 12; ++j)
            effects.push({type: 'spark', pos: one.pos.add(vec2(0, -one.kind.height/2)), color: POWER_COLOR[team],
                vel: vec2().setAngle(rand(PI*2), rand(30, 80)), time: 0, life: rand(.4, .7)});
    });
    cheer(team, 1.2, false);
}

// a tap on your meter, or Z, sets the zoomies off; a tap there does nothing else, even when it isn't full. The cats
// use their catnip a moment after it fills. The powers run down while the disc's in play
function updatePowers()
{
    const box = METERS.us, tap = presses.find(({pos})=> pos.x > box.x - 4 && pos.x < box.x + box.w + 10 &&
        pos.y > box.y - 2 && pos.y < box.y + box.h + 6);
    presses = presses.filter((press)=> press != tap);
    if (tap || keyWasPressed('KeyZ'))
        startPower('us');
    const cats = power.them;
    if (mode == 'play' && cats.meter >= 100 && (cats.wait -= timeDelta) < 0)
        startPower('them');
    if (mode == 'play')
        for (const meter of Object.values(power))
            meter.time = max(0, meter.time - timeDelta);
    if (splash && (splash.time += timeDelta) > 1.4)
        splash = undefined;
    flash = max(0, flash - timeDelta);
    shake = max(0, shake - timeDelta);
}

// pickups: every so often a treat pops up on the grass, somewhere you can see it, and whoever runs over it first,
// dog or cat, gets it. A bone is a burst of speed for whoever grabs it; a star flies up and fills its team's meter;
// and a squeaky duck squeaks, and the other team's players near it stop and stare, dizzy, for a moment. Nobody
// needs telling: you see them grab one, and what it does. The nearest free player of each team within reach goes
// for one, so it's a race; you, you have to steer to
const PICKUP_ART =
{
    bone: ['.##......##.', '####....####', '.##########.', '.##########.', '####....####', '.##......##.'],
    star: ['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '.#.....#.'],
    duck: ['...###....', '..#####...', '..##e##oo.', '..#####oo.', '#..###....', '########..', '.#######..', '..#####...'],
    comeback: ['...#....', '..##.#..', '..####..', '.######.', '.##oo##.', '##oooo##', '##oooo##', '.######.'],
};
const PICKUP_COLOR = {bone: hex('#fff1d0'), star: COLOR_GOLD, duck: hex('#ffd83a'), comeback: hex('#ff7a2a')};

// each team's status box, under its meter: what a pickup it's grabbed is doing, its picture and a word, the picture
// flying up into it from the grass; and the comeback, while it's on
const STATUS = {us: {x: 2, y: 43, w: 86, h: 14}, them: {x: 296, y: 43, w: 86, h: 14}};
const STATUS_WORD = {bone: 'SPEED UP', star: 'METER UP', duck: 'FREEZE!', comeback: 'COMEBACK'};
const STATUS_LIFE = {star: 2.2, duck: 2.2}, STATUS_FLY = .55;
let teamStatus = {};
const statusIcon = (team)=> { const box = STATUS[team]; return vec2(team == 'us' ? box.x + 10 : box.x + box.w - 10,
    box.y + box.h - 2); };

// the comeback: with this many seconds left, a team that's behind gets a lift, all of them, till the clock runs
// out: a little quicker, sharper, springier, and throwing further; a bit for one down, more for two. If they draw
// level they keep it, and if the other team falls behind, it goes to them
const COMEBACK = {time: 20, small: {speed: 1.08, grip: 1.1, leap: 3, reach: 10},
    big: {speed: 1.15, grip: 1.2, leap: 5, reach: 20}};
let comeback, comebackBig;
const rallying = (one)=> comeback == one.team;
const rally = ()=> COMEBACK[comebackBig ? 'big' : 'small'];
const PICKUP_KINDS = ['bone', 'bone', 'star', 'star', 'duck'];
const PICKUP_FIRST = 9, PICKUP_GAP = [6, 10], PICKUP_LIFE = 8, PICKUP_SEEK = 70;
const BONE_TIME = 4, BONE_SPEED = 1.35, STAR_FILL = 25, DUCK_REACH = 60, DUCK_TIME = 1.6;
const sound_appear = new Sound([.3, 0, 600, .01, .04, .12, 1, 1, 0, 0, 400, .05]);
const sound_treat  = new Sound([.4, 0, 1000, .01, .05, .2, 1, 1.5, 0, 0, 700, .06]);
const sound_squeak = new Sound([.45, .05, 1500, .01, .07, .06, 1, 1, 60, -30]);
let pickup, pickupTime;

// draw a little picture from rows of characters, with a dark edge round it, its middle bottom at x, y
function drawPixels(art, x, y, colors, alpha=1)
{
    const w = art[0].length, h = art.length, left = x - (w >> 1), top = y - h;
    const on = (i, r)=> art[r]?.[i] && art[r][i] != '.';
    for (let r = -1; r <= h; ++r)
        for (let i = -1; i <= w; ++i)
            if (!on(i, r) && (on(i - 1, r) || on(i + 1, r) || on(i, r - 1) || on(i, r + 1)))
                rect(left + i, top + r, 1, 1, rgb(.06, .05, .1, .8*alpha));
    art.forEach((row, r)=> [...row].forEach((cell, i)=> cell != '.' && rect(left + i, top + r, 1, 1,
        (colors[cell] || colors['#']).scale(1, alpha))));
}
const drawPickupArt = (kind, x, y, alpha)=> drawPixels(PICKUP_ART[kind], x, y,
    {'#': PICKUP_COLOR[kind], o: kind == 'comeback' ? hex('#ffd83a') : hex('#ff8a3a'), e: hex('#1b1530')}, alpha);

// who's free to go for a pickup: not you, and not anyone with the disc, going for a throw, or guarding the thrower
const freeFor = (one)=> one != player && one != holder && !(one.dazed > 0) && !flight?.chasers.includes(one) &&
    !(holder && one.guard == holder) && !(loose && one.team == offense && one == nearest(offense, loose.pos));

function updatePickups()
{
    for (const one of players)
    {
        one.fast = max(0, (one.fast || 0) - timeDelta);
        one.dazed = max(0, (one.dazed || 0) - timeDelta);
        if (one.fast > 0 && one.vel.length() > 30 && rand() < timeDelta*30)
            effects.push({type: 'spark', pos: one.pos.add(vec2(rand(-4, 4), -rand(2, one.kind.height))),
                color: PICKUP_COLOR.bone, vel: one.vel.scale(-.3).add(vec2(0, -10)), time: 0, life: .35});
    }
    for (const team of ['us', 'them'])
        if (teamStatus[team] && (teamStatus[team].time += timeDelta) > teamStatus[team].life)
            teamStatus[team] = undefined;
    if (mode != 'play')
        return;

    if (!pickup)
    {
        if ((pickupTime -= timeDelta) > 0)
            return;
        pickupTime = rand(...PICKUP_GAP);
        for (let tries = 0; tries < 12; ++tries)
        {
            const at = vec2(clamp(view + rand(50, SCREEN_SIZE.x - 50), LAWN.left + ZONE + 8, LAWN.right - ZONE - 8),
                rand(LAWN.top + 10, LAWN.bottom - 6));
            if (players.every((one)=> one.pos.distance(at) > 28) && discAt().distance(at) > 30)
            {
                pickup = {kind: PICKUP_KINDS[randInt(PICKUP_KINDS.length)], pos: at, time: 0};
                effects.push({type: 'puff', pos: at.add(vec2(0, -4)), time: 0, life: .4});
                sound_appear.play(undefined, .6);
                break;
            }
        }
        return;
    }

    if ((pickup.time += timeDelta) > PICKUP_LIFE)
    {
        effects.push({type: 'puff', pos: pickup.pos.add(vec2(0, -4)), time: 0, life: .3});
        pickup = undefined;
        return;
    }

    // the nearest free one of each team goes for it, if it's near enough
    pickup.seekers = ['us', 'them'].map((team)=> teamOf(team).filter(freeFor)
        .sort((a, b)=> a.pos.distance(pickup.pos) - b.pos.distance(pickup.pos))[0])
        .filter((one)=> one && one.pos.distance(pickup.pos) < PICKUP_SEEK);

    const grabber = players.find((one)=> one != holder && !(one.dazed > 0) &&
        Math.abs(one.pos.x - pickup.pos.x) < one.kind.width/2 + 4 && Math.abs(one.pos.y - pickup.pos.y) < 6);
    if (grabber)
        grab(grabber);
}

function grab(one)
{
    const {kind, pos} = pickup;
    pickup = undefined;
    teamStatus[one.team] = {kind, from: pos, time: -STATUS_FLY, life: STATUS_LIFE[kind] ?? BONE_TIME};
    for (let j = 0; j < 10; ++j)
        effects.push({type: 'spark', pos: pos.add(vec2(0, -4)), color: PICKUP_COLOR[kind],
            vel: vec2().setAngle(rand(PI*2), rand(30, 70)), time: 0, life: rand(.3, .5)});
    if (kind == 'duck')
    {
        sound_squeak.play();
        setTimeout(()=> sound_squeak.play(undefined, .7, 1.15), 140);
        say(one, 'SQUEAK!', PICKUP_COLOR.duck);
        for (const them of teamOf(other(one.team)))
            if (them != holder && them.pos.distance(pos) < DUCK_REACH)
            {
                them.dazed = DUCK_TIME;
                them.goal = undefined;
                them.mirror = pos.x < them.pos.x;
            }
        return;
    }
    sound_treat.play();
    if (kind == 'bone')
        one.fast = BONE_TIME;
    else
    {
        fill(one.team, STAR_FILL);
    }
}

function drawPickup()
{
    if (!pickup)
        return;
    const {kind, pos, time: age} = pickup, x = Math.round(pos.x), y = Math.round(pos.y);
    const left = PICKUP_LIFE - age, alpha = left < 2 && time*8 % 1 < .4 ? .25 : 1, pop = min(1, age*6);
    ellipse(x, y, 18, 6, PICKUP_COLOR[kind].scale(1, (.25 + .15*Math.sin(time*6))*alpha));
    ellipse(x, y, 10, 3, SHADOW);
    drawPickupArt(kind, x, Math.round(y - 3 - 2*pop - 2*Math.abs(Math.sin(time*3))), alpha);
}

// the dazed ones, with stars going round their heads
function drawDazed(one)
{
    const top = head(one);
    for (let i = 0; i < 3; ++i)
    {
        const angle = time*7 + i*PI*2/3, at = top.add(vec2(Math.cos(angle)*10, Math.sin(angle)*3 - 4));
        const x = Math.round(at.x), y = Math.round(at.y), color = i ? PICKUP_COLOR.duck : WHITE;
        rect(x - 2, y - 2, 5, 5, rgb(.06, .05, .1, .5));
        rect(x - 1, y - 1, 3, 3, color);
        rect(x - 2, y, 5, 1, color);
        rect(x, y - 2, 1, 5, color);
    }
}

// a team's status box: a pickup's picture flying up into it from where it was grabbed, then popping in, lit round
// the edge in its colour, with a bar under it running down; and the comeback's flame while that's on. The word goes
// on in drawStatusWords, over everything
const statusOf = (team)=> teamStatus[team] || (comeback == team && mode != 'over' ? {kind: 'comeback', time: 9, life: 0} :
    undefined);
function drawStatus(team)
{
    const now = statusOf(team);
    if (!now)
        return;
    const box = STATUS[team], {kind, time: age} = now, icon = statusIcon(team), left = Math.round(view);
    if (age < 0)
    {
        const p = 1 + age/STATUS_FLY, to = icon.add(vec2(left, 0));
        const at = now.from.lerp(to, p*p).add(vec2(0, -Math.sin(p*PI)*30));
        drawPickupArt(kind, Math.round(at.x), Math.round(at.y), 1);
        return;
    }
    const pop = max(0, 1 - age/.25), glow = .5 + .5*Math.sin(time*8);
    screenRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2,
        PICKUP_COLOR[kind].lerp(WHITE, pop).scale(1, min(1, .45 + .4*glow + pop)));
    screenRect(box.x, box.y, box.w, box.h, rgb(.1, .08, .2, .9));
    if (now.life)
    {
        const width = Math.round((box.w - 2)*max(0, 1 - age/now.life));
        screenRect(team == 'us' ? box.x + 1 : box.x + box.w - 1 - width, box.y + box.h - 2, width, 1,
            PICKUP_COLOR[kind].scale(1, .8));
    }
    drawPickupArt(kind, left + icon.x, icon.y - Math.round(pop*3), 1);
}
function drawStatusWords(text)
{
    for (const team of ['us', 'them'])
    {
        const now = statusOf(team), box = STATUS[team];
        if (now && now.time >= 0)
            text(STATUS_WORD[now.kind], team == 'us' ? box.x + 52 : box.x + box.w - 52, box.y + 7,
                PICKUP_COLOR[now.kind].lerp(WHITE, .35));
    }
}

// the fans of a team cheer, hopping about and clapping, and a few of them call out, while on a point the other fans
// sulk; there are more of your fans, so they clap louder
function cheer(team, seconds, big)
{
    crowd = {team, time: seconds, big};
    applause(big ? 'long' : 'short', (team == 'us' ? .7 : .4)*(big ? 1 : .7));
    const fans = FANS.filter((fan)=> fan.team == team).sort(()=> rand() - .5).slice(0, big ? 3 : 1);
    fans.forEach((fan, i)=> setTimeout(()=> fanCall(fan), 200 + i*260));
}

function fanCall(fan)
{
    const kind = KINDS[fan.name];
    barkOrMeow(kind, .25);
    effects.push({type: 'text', text: kind.cat ? 'MEOW' : kind.yappy ? 'YIP!' : 'WOOF!', color: TEAM_TEXT[fan.team],
        pos: vec2(fan.x, fan.y - kind.height - 4), time: 0, life: 1});
}

// confetti drifting down, fluttering, and fading out
function updateConfetti()
{
    for (const bit of confetti)
    {
        bit.time += timeDelta;
        bit.vel.y += 12*timeDelta;
        bit.pos = bit.pos.add(vec2(bit.vel.x + Math.sin(bit.time*5 + bit.spin)*14, bit.vel.y).scale(timeDelta));
    }
    confetti = confetti.filter((bit)=> bit.time < bit.life);
}

function drawConfetti()
{
    for (const bit of confetti)
    {
        const flat = Math.sin(bit.time*9 + bit.spin) > 0;
        rect(Math.round(bit.pos.x), Math.round(bit.pos.y), flat ? 2 : 1, flat ? 1 : 2, bit.color.scale(1,
            min(1, (bit.life - bit.time)*2)));
    }
}

// confetti over the screen, in your colours, drifting down
function throwConfetti()
{
    const colors = [JERSEY.us, COLOR_GOLD, WHITE, COLOR_HINT];
    for (let i = 0; i < 70; ++i)
        confetti.push({pos: vec2(view + rand(SCREEN_SIZE.x), rand(20, 80)), vel: vec2(rand(-12, 12), rand(8, 30)),
            color: colors[i % colors.length], time: 0, life: rand(1.6, 2.6), spin: rand(9)});
}

// after a point: the match is over at 3, or in sudden death, or with time up and a team ahead; with time up and
// still tied, it's sudden death
function endPoint()
{
    if (score.us >= WIN || score.them >= WIN || suddenDeath || timeUp && score.us != score.them)
    {
        endMatch();
        return;
    }
    if (timeUp)
        startSuddenDeath();
    mode = 'play';
    shiftWind(true);
    kickoff(receiving);
}

// when each of a match's paws stamps in on the results
const stampAt = (i)=> .5 + i*.35;

function endMatch()
{
    mode = 'over';
    overTime = 0;
    recordMatch(score.us, score.them);
    if (score.us > score.them)
        setTimeout(()=> fanfare([0, 4, 7, 12, 7, 12, 16, 19]), 300);
}

// the team that's behind with the clock running low gets its comeback: a whoosh, a flash, and a shower of embers
// off each of them; and again, bigger, if it falls two behind. Pulling one back is just a quieter lift
function startComeback(team, big)
{
    const fresh = team != comeback, bigger = big && !comebackBig;
    comeback = team;
    comebackBig = big;
    if (!fresh && !bigger)
        return;
    showBanner(fresh ? 'COMEBACK POWER!' : 'COMEBACK POWER UP!', PICKUP_COLOR.comeback);
    sound_zoom.play(undefined, .6, .8);
    flash = .15;
    teamOf(team).forEach((one)=>
    {
        for (let j = 0; j < 8; ++j)
            effects.push({type: 'spark', pos: one.pos.add(vec2(0, -one.kind.height/2)), color: PICKUP_COLOR.comeback,
                vel: vec2().setAngle(rand(PI*2), rand(30, 70)), time: 0, life: rand(.4, .7)});
    });
    cheer(team, 1.2, false);
}

function startSuddenDeath()
{
    suddenDeath = true;
    showBanner('SUDDEN DEATH: NEXT POINT WINS!', COLOR_HINT);
}

// the clock runs while the disc's in play, ticking through the last seconds; when it runs out the whistle goes, and
// once any throw in the air has come down, the team ahead wins, or it's sudden death
function updateClock()
{
    if (!timeUp)
    {
        const before = Math.ceil(clock);
        clock = max(0, clock - timeDelta);
        if (Math.ceil(clock) < before && before <= 5 && clock > 0)
            sound_tock.play(undefined, .6, 1.5);
        const gap = score.us - score.them, behind = gap < 0 ? 'us' : gap > 0 ? 'them' : undefined;
        if (behind && clock <= COMEBACK.time && clock > 0 && (behind != comeback || (Math.abs(gap) >= 2) != comebackBig))
            startComeback(behind, Math.abs(gap) >= 2);
        if (!clock)
        {
            timeUp = true;
            comeback = undefined;
            sound_whistle.play();
            showBanner('TIME!', COLOR_HINT);
        }
    }
    if (timeUp && !suddenDeath && !flight)
        score.us == score.them ? startSuddenDeath() : endMatch();
}

// the goodest pup: the dog of yours that did the most, points counting most, then blocks, then catches; if none of
// them did anything, nobody
function goodestPup()
{
    const worth = (dog)=> dog.points*3 + dog.blocks*2 + dog.catches;
    const best = teamOf('us').reduce((a, b)=> worth(b) > worth(a) ? b : a);
    return worth(best) ? best : undefined;
}

function showBanner(text, color=COLOR_HINT)
{
    banner = {text, color, time: 1.8};
}

///////////////////////////////////////////////////////////////////////////////
// the players

function newPlayer(name, team)
{
    const one = {name, kind: team == 'them' ? teamKind(rival, name) : KINDS[name], team, catches: 0, blocks: 0, points: 0, pos: vec2(), vel: vec2(), mirror: false, timer: 0, callTime: rand(1, 4),
        dustTime: 0};
    setAnim(one, 'idle');
    one.animTime = rand(9);
    return one;
}

function setAnim(one, anim, loop=true)
{
    if (one.anim == anim && one.loop == loop)
        return;
    one.anim = anim;
    one.animTime = 0;
    one.loop = loop;
}

function animFrame(one)
{
    const anim = one.kind.anims[one.anim], frame = one.animTime*(ANIM_FPS[one.anim] || 10)|0;
    return one.loop ? frame % anim.frames : min(frame, anim.frames - 1);
}

// runners run, walkers walk, and face the way they go; a bark or meow plays out, and a leaper is stretched out
// mid-stride
function animate(one)
{
    one.animTime += timeDelta;
    if (one.leap && (one.leap.time += timeDelta) > .4)
        one.leap = undefined;
    const speed = one.vel.length();
    if (Math.abs(one.vel.x) > 3)
        one.mirror = one.vel.x < 0;
    if (one.anim == 'call' && !one.loop && one.animTime < .35)
        return;
    if (one.leap || speed > 40)
        setAnim(one, 'run');
    else if (speed > 5)
        setAnim(one, 'walk');
    else
        setAnim(one, 'idle');
}

// speed changes toward the speed it wants only as fast as its grip lets it, so a big dog going flat out can't turn,
// and skids, kicking up dust when it turns or pulls up hard
function steer(one, desired, grip)
{
    const change = desired.subtract(one.vel), most = grip*timeDelta, speed = one.vel.length();
    one.vel = one.vel.add(change.length() > most ? change.normalize(most) : change);
    if ((one.dustTime -= timeDelta) < 0 && speed > 36 && change.length() > speed*.6 && change.dot(one.vel) < 0)
    {
        one.dustTime = .04;
        dust.push({pos: one.pos.add(vec2(rand(-4, 4), rand(-1, 1))), vel: one.vel.scale(-.15).add(vec2(0, -8)),
            time: 0, life: rand(.3, .5)});
    }
}

// how fast one runs and turns and how far it throws, which its team's power makes more of
const powered = (team)=> power[team].time > 0;
const zooming = (one)=> one.team == 'us' && powered('us');
const boost = (one)=> powered(one.team) ? POWERS[one.team] : undefined;
const speedOf = (one)=> one.kind.speed*(boost(one)?.speed || 1)*(one.fast > 0 ? BONE_SPEED : 1)*
    (rallying(one) ? rally().speed : 1);
const gripOf = (one)=> one.kind.grip*(boost(one)?.grip || 1)*(one.fast > 0 ? 1.3 : 1)*(rallying(one) ? rally().grip : 1);
const rangeOf = (one)=> one.kind.range + (boost(one)?.reach || 0) + (rallying(one) ? rally().reach : 0);

// run for somewhere, slowing to arrive
const runTo = (one, at, speed=speedOf(one))=>
{
    const to = at.subtract(one.pos), distance = to.length();
    return distance > 1 ? to.normalize(speed*min(1, distance/20)) : vec2();
};

function keepOnField(one)
{
    const p = one.pos, half = one.kind.width/2;
    if (p.x < LAWN.left + half && one.vel.x < 0 || p.x > LAWN.right - half && one.vel.x > 0)
        one.vel.x = 0;
    if (p.y < LAWN.top && one.vel.y < 0 || p.y > LAWN.bottom && one.vel.y > 0)
        one.vel.y = 0;
    p.x = clamp(p.x, LAWN.left + half, LAWN.right - half);
    p.y = clamp(p.y, LAWN.top, LAWN.bottom);
}

// where it holds the disc, lifted with it when it leaps, and where its head is, for what it says
const lift = (one)=> one.leap ? one.leap.height*(1 - (one.leap.time/.4)**2) : 0;
function mouth(one)
{
    const [x, y] = one.anim == 'run' && one.kind.runMouth || one.kind.mouth;
    return one.pos.add(vec2(one.mirror ? -x - 1 : x + 1, y + 1 - lift(one)));
}
const head = (one)=> one.pos.add(vec2(one.mirror ? -6 : 6, -one.kind.height - 2 - lift(one)));

// a word over a head, rising and fading
const say = (one, text, color=COLOR_TEXT)=> effects.push({type: 'text', text, color, pos: head(one), time: 0, life: 1});

// a dog barks, and a cat meows
function call(one)
{
    ++tally[one.team].calls;
    if (one.kind.cat)
    {
        barkOrMeow(one.kind, .5);
        effects.push({type: 'meow', pos: head(one).add(vec2(0, 4)), mirror: one.mirror, time: 0, life: .5});
        say(one, 'MEOW', TEAM_TEXT[one.team]);
    }
    else
    {
        barkOrMeow(one.kind, .5);
        say(one, one.kind.yappy ? 'YIP!' : 'WOOF!', TEAM_TEXT[one.team]);
    }
    if (one != holder || mode != 'play')
        setAnim(one, 'call', false);
    one.callTime = rand(2, 4);
}

function hiss(cat)
{
    sound_hiss.play(undefined, .5);
    say(cat, 'HISS!', TEAM_TEXT[cat.team]);
}

///////////////////////////////////////////////////////////////////////////////
// what each player does on its own, and what the dog you are does when you leave it be

// somewhere to get open: in the clear of the other team, forward, a good throw from the disc, apart from the rest of
// its team, and not too far to run
function cutSpot(one)
{
    const disc = holder?.pos || loose?.pos || one.pos, dir = forward(one.team);
    const mates = teamOf(one.team).filter((mate)=> mate != one && mate != holder);
    const guards = teamOf(other(one.team));
    let spot = one.pos, top = -Infinity;
    for (let x = max(LAWN.left + 16, disc.x - 200); x <= min(LAWN.right - 16, disc.x + 200); x += 24)
        for (let y = LAWN.top + 4; y <= LAWN.bottom - 4; y += 17)
        {
            const at = vec2(x, y);
            const clear = Math.min(70, ...guards.map((guard)=> guard.pos.distance(at)));
            const apart = Math.min(60, disc.distance(at), ...mates.map((mate)=> (mate.goal || mate.pos).distance(at)));
            const value = clear + (at.x - disc.x)*dir*.3 - Math.abs(at.distance(disc) - 110)*.3 + apart*.5 -
                at.distance(one.pos)*.25;
            if (value > top)
            {
                top = value;
                spot = at;
            }
        }
    return spot;
}

// the way a player wants to go: with the disc it stands; going for a throw it runs for where it'll come down; for a
// loose disc, the nearest of the team that gets it runs to pick it up; the team with the disc runs to get open; and
// the team without sticks close to its mark, or stands in front of the thrower, between it and its end zone
function wants(one)
{
    if (one == holder)
        return vec2();
    const react = zooming(one) ? 0 : DEFENSE[one.team].react;
    if (flight && flight.chasers.includes(one) && (one.team == flight.team || flight.time > react))
        return runTo(one, flight.to, speedOf(one));
    if (loose && one.team == offense && one == nearest(offense, loose.pos))
        return runTo(one, loose.pos, speedOf(one));
    if (pickup?.seekers?.includes(one))
        return runTo(one, pickup.pos, speedOf(one));
    if (one.team == offense)
    {
        if ((one.timer -= timeDelta) < 0 || !one.goal)
        {
            one.timer = rand(.5, .9);
            one.goal = cutSpot(one);
        }
        return runTo(one, one.goal);
    }
    const mark = one.guard;
    if (!mark)
        return vec2();
    one.seen = one.seen ? one.seen.lerp(mark.pos, min(1, timeDelta/DEFENSE[one.team].lag)) : mark.pos.copy();
    if (mark == holder)
        return runTo(one, mark.pos.add(vec2(forward(mark.team)*GUARD_GAP, 0)));
    const disc = holder?.pos || loose?.pos || flight?.to || one.seen;
    return runTo(one, one.seen.add(disc.subtract(one.seen).normalize(GUARD_GAP)));
}

// a thrower looks for whoever of its team is most open, more so going forward, and throws to where it'll be
function bestThrow(thrower)
{
    let choice, top = -Infinity;
    for (const mate of teamOf(thrower.team).filter((one)=> one != thrower))
    {
        const distance = mate.pos.distance(thrower.pos);
        if (distance > thrower.kind.range + 30)
            continue;
        const lead = ((thrower.team == 'them' ? windup() : 0) + .25 + distance/DISC_SPEED)*.8;
        const spot = mate.pos.add(mate.vel.scale(lead));
        const open = Math.min(80, ...teamOf(other(thrower.team)).map((one)=> one.pos.distance(spot)));
        const value = open + (spot.x - thrower.pos.x)*forward(thrower.team)*.25 +
            (thrower.team == 'us' ? spot.x > LAWN.right - ZONE : spot.x < LAWN.left + ZONE)*30;
        if (value > top)
        {
            top = value;
            choice = {spot: aimFor(thrower, spot), land: spot, open};
        }
    }
    const ahead = thrower.pos.add(vec2(forward(thrower.team)*60, 0));
    return choice || {spot: aimFor(thrower, ahead), land: ahead, open: 0};
}

// the cats' thrower waits for someone to get open, and with time running out throws anyway; it shows where it's
// throwing a moment first
function updateTheirThrower()
{
    if (holder?.team != 'them')
        return;
    if (holder.windup)
    {
        holder.mirror = holder.windup.x < holder.pos.x;
        if ((holder.windupTime -= timeDelta) < 0)
            throwDisc(holder, holder.windup);
        return;
    }
    if ((holder.wait -= timeDelta) > 0)
        return;
    const choice = bestThrow(holder);
    if (choice.open > 22 || holder.stall > STALL - 1.5 - windup())
    {
        holder.windup = choice.spot.add(vec2(rand(-6, 6), rand(-4, 4)));
        holder.windupTime = windup();
    }
    else
        holder.wait = .25;
}

///////////////////////////////////////////////////////////////////////////////
// you

// with the disc, a touch aims a throw there, and it goes when you let go; without it, a tap on another of your dogs
// shifts you into it, and anywhere else starts the stick. Space throws to whoever's most open, and Shift swaps you to
// your next dog
function handleInput()
{
    const taps = presses;
    presses = [];
    if (mode == 'over')
    {
        const before = overTime;
        overTime += timeDelta;
        for (let i = 0; i < pawsOf(score.us, score.them); ++i)
            if (before < stampAt(i) && overTime >= stampAt(i))
            {
                sound_snap.play(undefined, .8, 1 + i*.25);
                sound_note.playNote([0, 4, 7][i] + 12, undefined, .4);
            }
        const next = taps.some(({pos})=> Math.abs(pos.x - 192) < 36 && Math.abs(pos.y - 175) < 10) ||
            keyWasPressed('Space') || keyWasPressed('Enter');
        if (overTime > .8 && next)
        {
            sound_tock.play();
            finishMatch();
        }
        return;
    }
    // the first move starts the match, and the touch or the key that makes it counts: a touch aims your first throw
    if (mode == 'ready' && (taps.length || keyWasPressed('Space') || keyDirection().length() || autopilot))
        mode = 'play';
    if (mode != 'play')
        return;

    for (const {id, pos} of taps)
    {
        const at = pos.add(vec2(Math.round(view), 0));
        const mate = teamOf('us').find((dog)=> dog != player &&
            at.distance(dog.pos.add(vec2(0, -dog.kind.height/2))) < TAP_REACH);
        if (holder == player)
            aiming = {id, pos, start: time};
        else if (mate)
            control(mate, true);
        else
            stick = {id, origin: pos, dir: vec2(), amount: 0};
    }
    if (keyWasPressed('Space') && holder == player)
        charging = time;
    if (charging !== undefined && (holder != player || !keyIsDown('Space')))
    {
        holder == player && throwDisc(player, bestThrow(player).spot, chargeOf(time - charging));
        charging = undefined;
    }
    if ((keyWasPressed('ShiftLeft') || keyWasPressed('ShiftRight')) && holder != player)
    {
        const team = teamOf('us');
        control(team[(team.indexOf(player) + 1) % team.length], true);
    }

    // the throw you're aiming follows its finger, and goes when it lifts
    if (aiming && holder != player)
        aiming = undefined;
    if (aiming && pointers.has(aiming.id))
        aiming.pos = pointers.get(aiming.id);
    else if (aiming)
    {
        throwDisc(player, aiming.pos.add(vec2(Math.round(view), 0)), chargeOf(time - aiming.start));
        aiming = undefined;
    }

    // with the disc you face the way you're aiming
    const aimAt = holder == player && (aiming?.pos || hover);
    if (aimAt)
        player.mirror = aimAt.x + Math.round(view) < player.pos.x;

    // the stick follows its finger, and a finger that goes past its edge pulls it along, so it never runs out of
    // room; it's gone when the finger lifts
    if (stick && !pointers.has(stick.id))
        stick = undefined;
    if (stick)
    {
        const offset = pointers.get(stick.id).subtract(stick.origin), length = offset.length();
        if (length > STICK_REACH)
            stick.origin = stick.origin.add(offset.normalize(length - STICK_REACH));
        stick.dir = length > 1.5 ? offset.normalize() : vec2();
        stick.amount = clamp((length - 1.5)/(STICK_REACH*.6), 0, 1);
    }
}

// the dog you are goes where you steer it, or does what it would on its own, no better, when you leave it be
function updatePlayer()
{
    const top = speedOf(player)*YOU_SPEED, grip = gripOf(player)*YOU_GRIP, keys = autopilot ? autopilot() : keyDirection();
    if (player == holder)
        steer(player, vec2(), grip);
    else if (keys.length())
        steer(player, vec2(keys.x, -keys.y).normalize(top), grip);
    else if (stick && stick.amount)
        steer(player, stick.dir.scale(top*stick.amount), grip);
    else
        steer(player, wants(player), gripOf(player));
}

// what to do now, along the top
function hint()
{
    if (powered('us'))
        return 'ZOOMIES! THROWS THEY CAN\'T CATCH';
    if (powered('them'))
        return 'CATNIP! THEIR LOBS ARE HARD TO BLOCK';
    if (power.us.meter >= 100)
        return {touch: 'ZOOMIES READY! TAP YOUR METER', mouse: 'ZOOMIES READY! CLICK YOUR METER OR PRESS Z',
            keys: 'ZOOMIES READY! PRESS Z'}[inputKind];
    if (holder == player)
        return {touch: 'TAP A DOG TO THROW', mouse: 'CLICK A DOG TO THROW', keys: 'PRESS SPACE TO THROW'}[inputKind];
    if (flight?.team == 'us')
        return 'CATCH IT!';
    if (flight?.team == 'them')
        return 'BLOCK IT!';
    if (holder?.windup)
        return 'GET THERE FIRST!';
    if (holder?.team == 'them')
        return {touch: 'STICK TO YOUR CAT. TAP A DOG TO SWITCH', mouse: 'STICK TO YOUR CAT. CLICK A DOG TO SWITCH',
            keys: 'STICK TO YOUR CAT. SHIFT SWITCHES DOGS'}[inputKind];
    if (loose && offense == 'us')
        return 'PICK IT UP';
}

// the ghost shows itself while you have the disc and haven't started a throw: straight away while everyone waits for
// your first move, and after a second of holding it later; never while the mouse is moving. Each time round it
// taps whichever of your dogs is most open then, the one Space would throw to
function updateGhost()
{
    if (taught >= TEACH || holder != player || aiming || time - hoverTime < 1 ||
        !(mode == 'ready' || mode == 'play' && player.stall > 1))
        return ghost = undefined;
    ghost ||= {time: -.4};
    const round = Math.floor(ghost.time/GHOST_CYCLE);
    ghost.time += timeDelta;
    if (!ghost.target || Math.floor(ghost.time/GHOST_CYCLE) != round)
        ghost.target = nearest('us', bestThrow(player).land, player);
}

// the ghost: on a phone a hand, on a computer a mouse pointer, coming in to the dog, pressing on it, with the line of
// the throw it would make while it's down and a ripple where it pressed, then fading away. With the keys there's
// no ghost, only the dog's ring pulsing
const GHOST_HAND = ['....##.......', '...#oo#......', '...#oo#......', '...#oo#......', '...#oo###....',
    '...#oo#oo##..', '.###oo#oo#oo#', '#oo#oooooooo#', '#ooooooooooo#', '.#oooooooooo#', '.#ooooooooo#.',
    '..#oooooooo#.', '..#oooooooo#.', '...########..'];
const GHOST_POINTER = ['#.........', '##........', '#o#.......', '#oo#......', '#ooo#.....', '#oooo#....', '#ooooo#...',
    '#oooooo#..', '#ooooooo#.', '#oooo#####', '#oo#oo#...', '#o#.#oo#..', '##..#oo#..', '#....#oo#.', '.....#oo#.',
    '......##..'];
function drawGhost()
{
    if (!ghost || ghost.time < 0 || inputKind == 'keys')
        return;
    const t = ghost.time % GHOST_CYCLE/GHOST_CYCLE, mate = ghost.target, left = Math.round(view);
    const tip = vec2(Math.round(mate.pos.x) - left, Math.round(mate.pos.y - mate.kind.height/2));
    const down = t > .32 && t < .64, fade = clamp(t/.12, 0, 1)*clamp((1 - t)/.2, 0, 1);
    if (down)
        drawThrowLine(player, mate.pos, rgb(1, 1, 1, .8));
    if (t > .32 && t < .8)
    {
        const p = (t - .32)/.48;
        screenEllipse(tip.x, tip.y, 6 + p*18, 4 + p*10, rgb(1, 1, 1, .6*(1 - p)));
    }

    // it slides in from below and to the right, and dips a pixel while it presses
    const come = clamp(t/.32, 0, 1), ease = 1 - (1 - come)**3;
    const hand = inputKind == 'touch', art = hand ? GHOST_HAND : GHOST_POINTER, hot = hand ? vec2(4, 0) : vec2();
    const at = tip.add(vec2(22, 18).scale(1 - ease)).add(vec2(0, down ? 1 : 0)).subtract(hot);
    art.forEach((row, r)=> [...row].forEach((cell, i)=> cell != '.' && screenRect(Math.round(at.x) + i,
        Math.round(at.y) + r, 1, 1, cell == '#' ? rgb(.06, .05, .1, .7*fade) : rgb(1, 1, 1, .85*fade))));
}

// the view follows the disc, looking ahead the way the team with it is going
const viewTarget = ()=> clamp(discAt().x + forward(offense)*60 - SCREEN_SIZE.x/2, 0, FIELD_WIDTH - SCREEN_SIZE.x);

///////////////////////////////////////////////////////////////////////////////
// engine callbacks

// a team jersey for every frame of every strip, made from the sprite itself: the middle of its body, between its tail
// and its head and above its legs, in white shaded by the fur under it, so it can be drawn over the sprite in either
// team's colour and follows the body as it runs. Its edges are darker, like a vest's trim
function makeJerseys(kind, anim)
{
    const image = textureInfos[anim.texture].image, cell = kind.cell;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height), data = pixels.data;
    const alpha = (x, y)=> data[(y*canvas.width + x)*4 + 3];
    const vest = new Uint8ClampedArray(data.length);
    for (let frame = 0; frame < anim.frames; ++frame)
    {
        const left = frame*cell;
        let x0 = cell, x1 = -1, y0 = cell, y1 = -1;
        for (let y = 0; y < cell; ++y)
            for (let x = 0; x < cell; ++x)
                if (alpha(left + x, y) > 128)
                {
                    x0 = min(x0, x);
                    x1 = max(x1, x);
                    y0 = min(y0, y);
                    y1 = max(y1, y);
                }
        if (x1 < 0)
            continue;
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const from = x0 + Math.round(w*.3), to = x0 + Math.round(w*.66), bottom = y0 + Math.round(h*.62);
        for (let y = y0; y <= bottom; ++y)
            for (let x = from; x <= to; ++x)
            {
                const i = (y*canvas.width + left + x)*4;
                if (data[i + 3] <= 128)
                    continue;
                const fur = (data[i] + data[i + 1] + data[i + 2])/765, edge = x == from || x == to || y == bottom;
                const shade = 255*(edge ? .55 : .72 + fur*.28);
                vest.set([shade, shade, shade, 255], i);
            }
    }
    context.putImageData(new ImageData(vest, canvas.width, canvas.height), 0, 0);
    const texture = new TextureInfo(canvas);
    return Array.from({length: anim.frames}, (_, i)=> tile(i, cell, texture));
}

function gameInit()
{
    for (const kind of Object.values(KINDS))
        for (const anim of Object.values(kind.anims))
        {
            anim.tiles = Array.from({length: anim.frames}, (_, i)=> tile(i, kind.cell, anim.texture));
            anim.jerseys = makeJerseys(kind, anim);
        }
    meowTiles = [0, 1, 2].map((i)=> tile(i, 16, MEOW_TEXTURE));
    makeMusic();
    loadCup();
    try
    {
        taught = Number(localStorage.getItem('zoomies-taught')) || 0;
        scoredOnce = localStorage.getItem('zoomies-scored') == '1';
    }
    catch(e) {}
    // a cup you're partway through picks up where you left it; with the ?city shortcut, it's straight to the choice
    // of cups, the City Cup picked, unless it's a City Cup you're partway through
    chosen = unlocked(1) ? 1 : 0;
    const resume = !SHORTCUT || cup.id == 'city';
    showCup(!resume ? 'title' : cup.round >= ROUNDS.length ? 'final' : cup.round ? 'table' : 'title');
}

function gameUpdate()
{
    updateMute();
    updateMusic();

    // the cup's screens, over the park
    if (!inMatch())
    {
        const taps = presses;
        presses = [];
        updateCup(taps);
        view = 0;
        setCameraPos(SCREEN_SIZE.scale(.5));
        return;
    }

    if (updatePause())
        return;
    updatePowers();
    updatePickups();
    handleInput();
    updateGhost();

    updateYouShift();
    gust = max(0, gust - timeDelta);
    for (const effect of effects)
        effect.time += timeDelta;
    effects = effects.filter((effect)=> effect.time < effect.life);
    if (banner && (banner.time -= timeDelta) < 0)
        banner = undefined;

    if (mode == 'play')
    {
        updateDisc();
        updateTheirThrower();
    }
    if (mode == 'play')
        updateClock();
    if (mode == 'point' && (pauseTime -= timeDelta) < 0)
        endPoint();

    for (const one of players)
    {
        if (mode != 'play' || one.dazed > 0)
            steer(one, vec2(), one.kind.grip);
        else if (one == player)
            updatePlayer();
        else
            steer(one, wants(one), gripOf(one));

        // now and then, one that's open calls for the disc: your dogs while you hold it, and the cats while one of
        // them does
        if (mode == 'play' && holder && one.team == holder.team && one != holder && (one.callTime -= timeDelta) < 0 &&
            Math.min(...teamOf(other(one.team)).map((guard)=> guard.pos.distance(one.pos))) > 40)
        {
            call(one);
            if (one.team == 'them')
                one.callTime = rand(4, 8);
        }
    }

    // players that bump into each other shove apart; but the one with the disc has planted its feet, so it stands
    // its ground and the other gets all of the shove
    for (let i = 0; i < players.length; ++i)
        for (let j = i + 1; j < players.length; ++j)
        {
            const a = players[i], b = players[j];
            const near = Math.hypot((a.pos.x - b.pos.x)/((a.kind.width + b.kind.width)*.4), (a.pos.y - b.pos.y)/6);
            if (near < 1)
            {
                const apart = a.pos.subtract(b.pos), normal = apart.length() ? apart.normalize() : vec2(1, 0);
                const push = (1 - near)*1.5, aStays = a == holder, bStays = b == holder;
                if (!aStays)
                    a.pos = a.pos.add(normal.scale(bStays ? push*2 : push));
                if (!bStays)
                    b.pos = b.pos.subtract(normal.scale(aStays ? push*2 : push));
            }
        }
    for (const one of players)
    {
        one.pos = one.pos.add(one.vel.scale(timeDelta));
        keepOnField(one);
        animate(one);
    }

    for (const speck of dust)
    {
        speck.time += timeDelta;
        speck.pos = speck.pos.add(speck.vel.scale(timeDelta));
    }
    dust = dust.filter((speck)=> speck.time < speck.life);
    updateConfetti();
    if (crowd && (crowd.time -= timeDelta) < 0)
        crowd = undefined;

    view += (viewTarget() - view)*min(1, timeDelta*3);
    const jolt = ()=> shake > 0 ? Math.round(rand(-2, 2)) : 0;
    setCameraPos(vec2(Math.round(view) + SCREEN_SIZE.x/2 + jolt(), SCREEN_SIZE.y/2 + jolt()));
}

// pausing and unpausing; it's true while the match is on hold, and on the frame it goes either way, so the key or
// the tap that does it does nothing else. The taps while it's paused, and on the button, go no further
function updatePause()
{
    if (mode == 'over')
        return matchPaused = false;
    const button = presses.find(({pos})=> pos.x > 364 && pos.y < 13);
    const toggle = button || keyWasPressed('Escape') || keyWasPressed('KeyP') ||
        matchPaused && (presses.length || keyWasPressed('Space') || keyWasPressed('Enter'));
    if (matchPaused || button)
        presses = [];
    if (!toggle)
        return matchPaused;
    matchPaused = !matchPaused;
    aiming = stick = charging = undefined;
    sound_tock.play();
    return true;
}

function gameUpdatePost() {}

///////////////////////////////////////////////////////////////////////////////
// drawing

// a rectangle and an ellipse given in field pixels, the rectangle from its top left corner; and the same fixed to
// the screen, for what stays put as the view moves
const rect = (x, y, w, h, color)=> drawRect(vec2(x + w/2, SCREEN_SIZE.y - y - h/2), vec2(w, h), color);
const ellipse = (x, y, w, h, color)=> drawEllipse(vec2(x, SCREEN_SIZE.y - y), vec2(w, h), color);
const toWorld = (pos)=> vec2(pos.x, SCREEN_SIZE.y - pos.y);
const line = (x1, y1, x2, y2, color)=> drawLine(toWorld(vec2(x1, y1)), toWorld(vec2(x2, y2)), 1, color);
const screenRect = (x, y, w, h, color)=> rect(x + Math.round(view), y, w, h, color);
const screenEllipse = (x, y, w, h, color)=> ellipse(x + Math.round(view), y, w, h, color);

// the city behind the park, made up once: two rows of buildings, the near ones with windows; it slides by slower
// than the field, and the trees in between
const CITY_SLIDE = .3, TREE_SLIDE = .6;
const BUILDINGS = [];
for (const [far, base] of [[true, 26], [false, 40]])
    for (let x = far ? -6 : -14, i = far ? 3 : 0; x < SCREEN_SIZE.x + (FIELD_WIDTH - SCREEN_SIZE.x)*CITY_SLIDE; ++i)
    {
        const w = 16 + (i*37 % 21), h = base + (i*53 % 34);
        BUILDINGS.push({x, w, top: 84 - h, far});
        x += w + (i*7 % 4) + (far ? -3 : 1);
    }
// the lawn's wear and tear, made up once: bare patches where play goes most, in front of each end zone and in the
// middle, as specks of earth and dry grass that thin out toward their edges; and darker tufts and a few flowers
// all over
const SPECKS = [];
{
    let seed = 11;
    const random = ()=> (seed = seed*16807 % 2147483647)/2147483647;
    const patches = [[96, 154, 46, 30, 340], [FIELD_WIDTH - 96, 154, 46, 30, 340], [FIELD_WIDTH/2, 152, 64, 32, 400],
        [200, 186, 26, 12, 100], [420, 124, 26, 10, 100]];
    for (const [x, y, rx, ry, count] of patches)
        for (let i = 0; i < count; ++i)
        {
            const angle = random()*PI*2, r = Math.sqrt(random());
            if (random() < r*r)
                continue;
            SPECKS.push({x: Math.round(x + Math.cos(angle)*rx*r), y: Math.round(y + Math.sin(angle)*ry*r),
                w: random() < .3 ? 2 : 1, h: 1, color: COLOR_DIRT[random()*3|0]});
        }
    for (let i = 0; i < 320; ++i)
        SPECKS.push({x: Math.round(random()*FIELD_WIDTH), y: Math.round(100 + random()*116), w: 1, h: 2,
            color: COLOR_TUFT});
    for (let i = 0; i < 26; ++i)
    {
        const x = Math.round(random()*FIELD_WIDTH), y = random() < .5 ? 100 + random()*4 : 212 + random()*3;
        SPECKS.push({x, y: Math.round(y), w: 1, h: 1, color: random() < .5 ? WHITE : hex('#ffe066')});
    }
}

// the City Cup's street, behind its parking lot, made up once: a block of old buildings close up, brick, stone and
// painted, some tall and some short, a few with a fire escape or a water tank on the roof, and shops along the
// bottom with striped awnings, every other one with a neon sign; it slides by a little slower than the lot. And
// cars parked along the kerb, clear of the gate
const STREET_SLIDE = .75, STREET = [];
{
    let seed = 5, sign = 0;
    const random = ()=> (seed = seed*16807 % 2147483647)/2147483647;
    const walls = ['#7a3e35', '#8a6a52', '#5c6272', '#46506b', '#6f4c5f', '#94744f', '#6a3330'];
    const awnings = ['#c8443a', '#2e8f6a', '#3d6fc4', '#d89a2a', '#8a4ac0'];
    const signs = [['BODEGA', '#5ff0e0'], ['PIZZA', '#ff6a5a'], ['HOT DOGS', '#ffd84a'], ['24 HR', '#ff5ac8'],
        ['FISH', '#7ac8ff'], ['DELI', '#9aff7a'], ['LAUNDRY', '#c89aff']];
    for (let x = -10, i = 0; x < SCREEN_SIZE.x + (FIELD_WIDTH - SCREEN_SIZE.x)*STREET_SLIDE + 10; ++i)
    {
        const w = 46 + (random()*38|0), tall = random() < .45;
        const building = {x, w, top: tall ? 6 + (random()*12|0) : 22 + (random()*14|0), color: hex(walls[i % walls.length]),
            awning: hex(awnings[i*3 % awnings.length]), seed: i,
            escape: w > 56 && random() < .5 ? 6 + (random()*(w - 30)|0) : -1,
            tank: !tall && random() < .5 ? 6 + (random()*(w - 20)|0) : -1};
        const [word, color] = signs[sign % signs.length];
        if (i % 2 == 0 && word.length*8 + 8 <= w)
        {
            building.sign = {word, color: hex(color)};
            ++sign;
        }
        STREET.push(building);
        x += w + (random() < .25 ? 3 : 0);
    }
}
const CARS = [[22, '#a8423c'], [126, '#3f6fb0'], [196, '#d8c8a0'], [356, '#4a8a7a'], [452, '#7a7f8a'], [562, '#c8a03a']]
    .map(([x, color], i)=> ({x, color: hex(color), mirror: i % 2}));

// and the wear on the lot, made up once: patches of newer and older tarmac, the old parking spaces' lines along the
// top and bottom, worn, with oil stains in some, cracks wandering across it with weeds coming up through a few, a
// manhole cover, and grit all over
const LOT = [];
{
    let seed = 29;
    const random = ()=> (seed = seed*16807 % 2147483647)/2147483647;
    const mark = (x, y, w, h, color, oval)=> LOT.push({x: Math.round(x), y: Math.round(y), w, h, color, oval});
    for (let i = 0; i < 12; ++i)
        mark(random()*FIELD_WIDTH - 20, 96 + random()*100, 24 + random()*56|0, 10 + random()*22|0, COLOR_PATCH[i % 2]);
    for (let x = 14; x < FIELD_WIDTH; x += 26)
        for (const y of [100, 189])
        {
            mark(x, y, 1, 22, COLOR_STALL);
            random() < .35 && mark(x + 13, y + 11, 10 + random()*6|0, 4 + random()*3|0, COLOR_OIL, true);
        }
    for (let i = 0; i < 16; ++i)
    {
        let x = random()*FIELD_WIDTH, y = 100 + random()*112;
        const length = 8 + random()*22|0, step = random() < .5 ? 1 : -1;
        for (let j = 0; j < length; ++j)
        {
            mark(x, y, 1, 1, COLOR_CRACK);
            x += step;
            random() < .35 && (y += random() < .5 ? 1 : -1);
        }
        if (random() < .5)
        {
            mark(x, y - 2, 1, 2, COLOR_TUFT);
            mark(x + 1, y - 1, 1, 1, COLOR_TREES);
        }
    }
    mark(176, 130, 13, 6, rgb(.2, .21, .25, .7), true);
    mark(176, 130, 9, 4, rgb(.4, .41, .45, .8), true);
    for (let i = 0; i < 900; ++i)
        mark(random()*FIELD_WIDTH, 92 + random()*124, 1, 1, COLOR_GRAVEL[random()*3|0]);
}

// the street behind the lot: its buildings, then the sidewalk, the kerb, and the cars parked along it
function drawStreet(day, left)
{
    const shift = left*(1 - STREET_SLIDE), right = left + SCREEN_SIZE.x;
    for (const building of STREET)
    {
        const {w, top, escape, tank, sign, seed} = building, x = Math.round(building.x + shift);
        if (x > right || x + w < left)
            continue;
        const wall = building.color.lerp(COLOR_DUSK, day.late*.3), shade = wall.lerp(BLACK, .4);

        // a water tank up on the roof, on its legs
        if (tank >= 0)
        {
            const tx = x + tank, wood = hex('#6b4a35').lerp(COLOR_DUSK, day.late*.3), band = wood.lerp(BLACK, .3);
            rect(tx + 1, top - 5, 1, 5, COLOR_IRON);
            rect(tx + 9, top - 5, 1, 5, COLOR_IRON);
            rect(tx, top - 14, 11, 9, wood);
            rect(tx, top - 11, 11, 1, band);
            rect(tx, top - 7, 11, 1, band);
            rect(tx + 1, top - 16, 9, 2, band);
            rect(tx + 3, top - 18, 5, 2, band);
        }

        // the wall, with a ledge along its top, and its windows, more of them lit as it gets late, a few of them
        // blue with a TV on
        rect(x, top, w, 74 - top, wall);
        rect(x - 1, top, w + 2, 2, wall.lerp(WHITE, .18));
        rect(x, top + 2, w, 1, shade);
        for (let row = 0, wy = top + 7; wy + 5 < (sign ? 43 : 51); ++row, wy += 8)
            for (let col = 0, wx = x + 5; wx <= x + w - 8; ++col, wx += 7)
            {
                const n = (col*73 + row*151 + seed*37) % 100;
                rect(wx, wy, 3, 5, n < day.lit*100 ? n % 4 ? COLOR_LAMP : COLOR_TV : shade);
                rect(wx, wy + 5, 3, 1, wall.lerp(WHITE, .1));
            }

        // a fire escape down its front: landings with railings, and ladders between them
        if (escape >= 0)
            for (let wy = top + 14; wy < 50; wy += 16)
            {
                const ex = x + escape;
                rect(ex, wy, 16, 1, COLOR_IRON);
                rect(ex, wy - 3, 16, 1, COLOR_IRON);
                for (const post of [0, 8, 15])
                    rect(ex + post, wy - 3, 1, 3, COLOR_IRON);
                wy + 16 < 50 && line(ex + 3, wy + 1, ex + 12, wy + 15, COLOR_IRON);
            }

        // the shop along the bottom: its striped awning, its lit window and its door; and over the awning, a neon
        // sign (it glows brighter in the dark, see drawDaylight), dimmed behind the cup's screens so it's not read as
        // part of them
        rect(x + 1, 54, w - 2, 20, shade);
        rect(x + 4, 61, w - 17, 11, COLOR_SHOP.lerp(shade, .25));
        rect(x + w - 11, 60, 7, 14, COLOR_IRON);
        for (let i = 0; i < w - 2; i += 4)
            rect(x + 1 + i, 54, min(4, w - 2 - i), 4, i/4 % 2 ? building.awning : COLOR_TEXT);
        rect(x + 1, 58, w - 2, 1, building.awning.lerp(BLACK, .4));
        if (sign)
        {
            const middle = x + w/2;
            rect(Math.round(middle - sign.word.length*4 - 3), 45, sign.word.length*8 + 6, 9, hex('#14101e'));
            engineImageFont.drawText(sign.word, toWorld(vec2(middle, 50)), 8, true, sign.color.scale(1, inMatch() ? 1 : .3));
        }
    }

    // the sidewalk, in slabs, the kerb, and the street with the cars parked along it
    rect(left, 74, SCREEN_SIZE.x, 6, COLOR_SIDEWALK);
    for (let x = Math.floor(left/14)*14; x < right; x += 14)
        rect(x, 74, 1, 6, COLOR_SIDEWALK.lerp(BLACK, .15));
    rect(left, 80, SCREEN_SIZE.x, 1, COLOR_SIDEWALK.lerp(WHITE, .2));
    rect(left, 81, SCREEN_SIZE.x, 11, COLOR_STREET);
    for (const car of CARS)
        if (car.x + 32 > left && car.x < right)
            drawCar(car);
}

// a car parked at the kerb, nose one way or the other
function drawCar({x, color, mirror})
{
    const glass = hex('#9fb8d0').lerp(COLOR_NIGHT, .5), tyre = hex('#1c1c22'), y = 91, cab = mirror ? x + 11 : x + 5;
    rect(cab, y - 12, 15, 5, color);
    rect(cab + 2, y - 11, 5, 3, glass);
    rect(cab + 8, y - 11, 5, 3, glass);
    rect(x, y - 7, 31, 5, color);
    rect(x, y - 7, 31, 1, color.lerp(WHITE, .25));
    rect(x + 4, y - 3, 6, 3, tyre);
    rect(x + 21, y - 3, 6, 3, tyre);
    rect(mirror ? x + 30 : x, y - 6, 1, 2, hex('#ff5a4a'));
    rect(mirror ? x : x + 30, y - 6, 1, 2, hex('#fff2c0'));
}

function drawPark()
{
    const left = Math.round(view), right = left + SCREEN_SIZE.x, day = daylight();
    for (let y = 0; y < 84; y += 2)
        screenRect(0, y, SCREEN_SIZE.x, 2, day.top.lerp(day.bottom, y/84));
    if (day.moon)
        for (let i = 0; i < 46; ++i)
            screenRect(i*83 % SCREEN_SIZE.x, i*29 % 60, 1, 1, rgb(1, 1, 1, .35 + .35*Math.sin(time*2 + i)));

    // the city, darkening toward dusk, with more of its windows lit; and between its far buildings and its near
    // ones the sun, low and big and orange by sunset, with a haze round it, sinking behind the near ones
    const city = left*(1 - CITY_SLIDE);
    const farColor = COLOR_CITY_FAR.lerp(COLOR_DUSK, day.late*.55), nearColor = COLOR_CITY.lerp(COLOR_DUSK, day.late*.75);
    const darkWindow = COLOR_WINDOW.lerp(COLOR_DUSK, day.late*.8);
    for (const {x, w, top, far} of BUILDINGS.filter((building)=> building.far))
        rect(x + city, top, w, 84 - top, farColor);
    const sunSize = day.moon ? 14 : 16 + day.late*10, haze = day.sun.copy();
    haze.a = day.moon ? .15 : .35;
    drawEllipseGradient(toWorld(vec2(left + SUN_X, day.sunY)), vec2(sunSize*3.2), haze, day.sun.scale(1, 0));
    screenEllipse(SUN_X, day.sunY, sunSize, sunSize, day.sun);
    if (day.moon)
        for (const [x, y, size] of [[-3, -2, 3], [2, 2, 2], [3, -3, 1]])
            screenEllipse(SUN_X + x, day.sunY + y, size, size, day.sun.lerp(BLACK, .15));
    for (const {x, w, top, far} of BUILDINGS.filter((building)=> !building.far))
    {
        rect(x + city, top, w, 84 - top, nearColor);
        for (let wy = top + 4; wy < 76; wy += 6)
            for (let wx = x + 3; wx < x + w - 3; wx += 4)
                if ((wx*13 + wy*7) % 5 < 2)
                    rect(wx + city, wy, 2, 3, (wx*7 + wy*3) % 100 < day.lit*100 ? COLOR_LAMP : darkWindow);
    }

    // in the park, the trees along the path outside the fence; in the city, the street behind the lot
    if (inLot())
        drawStreet(day, left);
    else
    {
        const trees = left*(1 - TREE_SLIDE), treeDark = COLOR_TREES_DARK.lerp(COLOR_DUSK, day.late*.4);
        const treeLight = COLOR_TREES.lerp(COLOR_GLOW, day.late*.15).lerp(COLOR_DUSK, day.late*.25);
        for (let x = 6; x < SCREEN_SIZE.x + (FIELD_WIDTH - SCREEN_SIZE.x)*TREE_SLIDE; x += 30)
        {
            ellipse(x + (x*7 % 9) + trees, 82, 34, 22, treeDark);
            ellipse(x + 12 + (x*5 % 7) + trees, 86, 30, 18, treeLight);
        }
    }

    // the lights, at night: floodlight towers in the park, and in the city tall poles with a lamp at each end of an
    // arm across the top
    if (CUPS[cupIndex].night)
        for (const x of FLOODLIGHTS)
        {
            if (inLot())
            {
                rect(x, LOT_LAMPS + 2, 2, 99 - LOT_LAMPS - 2, hex('#7a7e8a'));
                rect(x - 9, LOT_LAMPS + 1, 20, 1, hex('#7a7e8a'));
                for (const [lx, ly, lw] of lampsOf(x))
                    rect(lx - 1, ly - 2, lw + 2, 3, hex('#2a2d38'));
            }
            else
            {
                rect(x - 1, LAMPS + 6, 3, 98 - LAMPS - 6, hex('#4a4e5c'));
                rect(x - 9, LAMPS, 19, 7, hex('#2a2d38'));
            }
            for (const [lx, ly, lw, lh] of lampsOf(x))
                rect(lx, ly, lw, lh, inLot() ? COLOR_SODIUM : COLOR_FLOOD);
        }

    // the lawn, mown in stripes and worn in patches; or the parking lot's tarmac, patched, cracked and gritty
    if (inLot())
    {
        screenRect(0, 92, SCREEN_SIZE.x, SCREEN_SIZE.y - 92, COLOR_ASPHALT);
        for (const {x, y, w, h, color, oval} of LOT)
            if (x + w > left && x - w < right)
                oval ? ellipse(x, y, w, h, color) : rect(x, y, w, h, color);
    }
    else
    {
        screenRect(0, 92, SCREEN_SIZE.x, SCREEN_SIZE.y - 92, COLOR_LAWN);
        for (let x = Math.floor(left/28)*28; x < right; x += 28)
            rect(x, 92, 14, SCREEN_SIZE.y - 92, COLOR_LAWN_STRIPE);
        for (const speck of SPECKS)
            if (speck.x > left - 2 && speck.x < right)
                rect(speck.x, speck.y, speck.w, speck.h, speck.color);
    }

    // faint chalk: the sidelines along the top and bottom of the field, a dashed line across the middle, and a mark
    // in front of each end zone, where a disc thrown out of play would be brought back in; on the lot it's paint,
    // and shows up more
    const bold = inLot() ? 1.5 : 1;
    rect(LAWN.left, 99, LAWN.right - LAWN.left, 1, rgb(1, 1, 1, .45*bold));
    rect(LAWN.left, 211, LAWN.right - LAWN.left, 1, rgb(1, 1, 1, .45*bold));
    for (let y = 101; y < 211; y += 8)
        if (Math.abs(y + 2 - LOGO.y) > 14)
            rect(FIELD_WIDTH/2, y, 1, 4, rgb(1, 1, 1, .3*bold));

    // a logo painted on the grass in the middle, lying flat: a disc, with a paw print on it
    const paint = rgb(1, .97, .86, .34*bold);
    ellipse(FIELD_WIDTH/2, LOGO.y, 60, 22, rgb(1, .97, .86, .1));
    for (let i = 0; i < 72; ++i)
    {
        const angle = i/72*PI*2, cos = Math.cos(angle), sin = Math.sin(angle);
        rect(Math.round(FIELD_WIDTH/2 + cos*30), Math.round(LOGO.y + sin*11), 2, 2, paint);
        if (i % 2)
            rect(Math.round(FIELD_WIDTH/2 + cos*25), Math.round(LOGO.y + sin*9), 1, 1, paint);
    }
    ellipse(FIELD_WIDTH/2, LOGO.y + 2, 14, 6, paint);
    for (const [x, y] of [[-9, -2], [-4, -5], [4, -5], [9, -2]])
        ellipse(FIELD_WIDTH/2 + x, LOGO.y + y, 5, 3, paint);
    for (const x of [LAWN.left + ZONE + 40, LAWN.right - ZONE - 40])
        for (let i = 0; i < 5; ++i)
        {
            rect(x - 2 + i, 152 + i, 1, 1, rgb(1, 1, 1, .5));
            rect(x + 2 - i, 152 + i, 1, 1, rgb(1, 1, 1, .5));
        }

    // the end zones, the dogs' on the left and the cats' on the right, chalked off, with a cone at each corner; the
    // one you're going for glows gold while the arrows show the way to it
    const dogZone = LAWN.left + ZONE, catZone = LAWN.right - ZONE;
    rect(0, 96, dogZone, SCREEN_SIZE.y - 96, rgb(.4, .6, 1, .2));
    rect(catZone, 96, FIELD_WIDTH - catZone, SCREEN_SIZE.y - 96, JERSEY.them.scale(1, .24));
    if (showGoal())
        rect(catZone, 96, FIELD_WIDTH - catZone, SCREEN_SIZE.y - 96, rgb(1, .9, .5, .14 + .1*Math.sin(time*5)));
    for (const x of [dogZone, catZone])
    {
        rect(x, 96, 1, SCREEN_SIZE.y - 96, COLOR_CHALK);
        for (const y of [97, 211])
        {
            rect(x - 2, y - 1, 5, 2, COLOR_CONE.lerp(BLACK, .2));
            rect(x - 1, y - 4, 3, 3, COLOR_CONE);
            rect(x, y - 6, 1, 2, COLOR_CONE);
        }
    }

    for (const fan of FANS)
        if (!KINDS[fan.name].cat)
            drawFan(fan);

    // the chain link fence along the back, with its gate open
    for (let x = Math.floor(left/6)*6 - 24; x < right + 24; x += 6)
    {
        line(x, 78, x + 20, 98, COLOR_MESH);
        line(x + 20, 78, x, 98, COLOR_MESH);
    }
    rect(GATE.x, 79, GATE.w, 13, inLot() ? COLOR_STREET : COLOR_PATH);
    inLot() && rect(GATE.x, 79, GATE.w, 2, COLOR_SIDEWALK);
    rect(GATE.x, 92, GATE.w, 7, inLot() ? COLOR_ASPHALT : COLOR_LAWN_STRIPE);
    rect(left, 77, SCREEN_SIZE.x, 2, COLOR_POST);
    for (let x = 8; x < FIELD_WIDTH; x += 44)
        if (x < GATE.x - 4 || x > GATE.x + GATE.w + 4)
            rect(x, 75, 3, 24, COLOR_POST);
    rect(GATE.x - 3, 73, 3, 26, COLOR_POST);
    rect(GATE.x + GATE.w, 73, 3, 26, COLOR_POST);
    for (let i = 0; i < 6; ++i)
        line(GATE.x + GATE.w + 3, 78 + i*4, GATE.x + GATE.w + 16, 74 + i*4, COLOR_MESH);

    // pennants strung from post to post, sagging a little, in both teams' colours and gold, blown the way the wind
    // is going and fluttering the harder it blows
    const colors = [JERSEY.us, JERSEY.them, COLOR_GOLD, WHITE];
    const lean = clamp(wind.x/18, -1.4, 1.4), flap = min(1, wind.length()/12)*.4;
    for (let post = 9; post < FIELD_WIDTH - 44; post += 44)
        if ((post + 44 < GATE.x - 4 || post > GATE.x + GATE.w + 4) && post + 44 > left && post < right)
            for (let x = post + 4, i = 0; x < post + 42; x += 6, ++i)
            {
                const y = Math.round(76 + Math.sin((x - post)/44*PI)*4), color = colors[(i + post) % 4];
                const sway = lean + Math.sin(time*9 + x*.7)*flap;
                rect(x - 3, y, 6, 1, rgb(1, 1, 1, .4));
                rect(x - 2 + Math.round(sway*.6), y + 1, 5, 1, color);
                rect(x - 1 + Math.round(sway*1.4), y + 2, 3, 1, color);
                rect(x + Math.round(sway*2.2), y + 3, 1, 1, color);
            }
    // string lights from post to post as it gets late, their bulbs glowing
    if (daylight().lights)
        for (let post = 9; post < FIELD_WIDTH - 44; post += 44)
            if (post + 44 > left && post < right)
                for (let x = post + 3; x < post + 44; x += 8)
                {
                    const y = Math.round(74 + Math.sin((x - post)/44*PI)*3), glow = COLOR_LAMP.copy();
                    glow.a = .22*daylight().lights*(.8 + .2*Math.sin(time*3 + x));
                    ellipse(x, y + 1, 7, 7, glow);
                    rect(x, y, 1, 2, COLOR_LAMP.scale(1, .4 + .6*daylight().lights));
                }
    for (const fan of FANS)
        if (KINDS[fan.name].cat)
            drawFan(fan);
}

// the crowd along the back: dogs on the path behind the fence, the big ones looking over it, and cats up on its top
// rail; no jerseys, as it's plain enough who each of them wants to win. Who's where is made up once
const FANS = [];
{
    const dogs = ['bernard', 'golden', 'akita', 'husky', 'schnauzer', 'dane'];
    const cats = ['smoky', 'ginger', 'sooty', 'tabby', 'patch', 'snowy'];
    for (let x = 22, i = 0; x < FIELD_WIDTH - 16; x += 24 + (i*17 % 13), ++i)
        if (x < GATE.x - 14 || x > GATE.x + GATE.w + 14)
            FANS.push(i % 3 == 1 ? {name: cats[i % cats.length], team: 'them', x, y: 78} :
                {name: dogs[i % dogs.length], team: 'us', x, y: 95});
}

// a fan watching the disc: hopping when its team's cheering, sitting glumly when the other team's just scored
function drawFan(fan)
{
    const kind = KINDS[fan.name], cheering = crowd?.team == fan.team, sulking = crowd?.big && crowd.team != fan.team;
    const anim = kind.anims[sulking ? 'sit' : 'idle'], frame = sulking ? 0 : (time*8 + fan.x*.37|0) % anim.frames;
    const hop = cheering ? Math.round(Math.abs(Math.sin(time*14 + fan.x))*4) : 0;
    const mirror = (inMatch() ? discAt().x : FIELD_WIDTH/2) < fan.x;
    const at = vec2(fan.x, SCREEN_SIZE.y - fan.y + hop - kind.cell/2 + kind.feet);
    drawTile(at, vec2(kind.cell), anim.tiles[frame], WHITE, 0, mirror);
}

function drawDisc(pos)
{
    const x = Math.round(pos.x), y = Math.round(pos.y);
    ellipse(x, y, 9, 4, COLOR_DISC.lerp(BLACK, .3));
    ellipse(x, y - .5, 8, 3, COLOR_DISC);
    rect(x - 2, y - 1, 4, 1, COLOR_DISC_LIGHT);
}

function drawPlayer(one)
{
    const {cell, feet, width} = one.kind, anim = one.kind.anims[one.anim];
    const x = Math.round(one.pos.x), y = Math.round(one.pos.y), up = Math.round(lift(one));

    // each stands on its team's colour, and you on white; on defense the cat you're on has a ring that pulses. On the
    // grey of the lot, the colour's stronger, with a dark rim round it, and each has a thin dark outline, to stand out
    const lot = inLot();
    if (one == player.guard && one.team != player.team)
        ellipse(x, y, width + 12, 12, rgb(1, .4, .35, .35 + .3*Math.sin(time*8)));
    if (one == ghost?.target && ghost.time >= 0)
        ellipse(x, y, width + 12, 12, rgb(1, 1, 1, .3 + .25*Math.sin(time*8)));
    if (rallying(one) && mode == 'play')
        ellipse(x, y, width + 12, 12, PICKUP_COLOR.comeback.scale(1, (comebackBig ? .3 : .18) +
            (comebackBig ? .2 : .12)*Math.sin(time*12 + x)));
    if (boost(one))
        ellipse(x, y, width + 10, 11, POWER_COLOR[one.team].scale(1, .5 + .3*Math.sin(time*16 + x)));
    lot && ellipse(x, y, width + (one == player ? 8 : 6), one == player ? 10 : 9, rgb(0, 0, 0, .4));
    ellipse(x, y, width + (one == player ? 6 : 4), one == player ? 8 : 7, one == player ? COLOR_YOU :
        TEAM_COLOR[one.team].scale(1, lot ? 1.4 : 1));
    if (one == player && power.us.meter >= 100 && mode == 'play')
        for (let i = 0; i < 3; ++i)
        {
            const angle = time*5 + i*PI*2/3, at = head(one).add(vec2(Math.cos(angle)*10, Math.sin(angle)*4 - 4));
            rect(Math.round(at.x), Math.round(at.y), 2, 2, i ? COLOR_GOLD : WHITE);
        }
    if ((boost(one) || one.fast > 0) && one.vel.length() > 40)
    {
        const back = one.vel.normalize(-1);
        for (let i = 0; i < 3; ++i)
        {
            const at = one.pos.add(back.scale(width*.5 + 4 + i*3)).add(vec2(0, -one.kind.height*(.25 + i*.25)));
            rect(Math.round(at.x) - 3, Math.round(at.y), 7, 1, rgb(1, 1, 1, .55 - i*.12));
        }
    }
    const late = daylight().shadow ?? daylight().late;
    ellipse(x - Math.round(width*.3*late), y, width*(.8 + .7*late), 5, SHADOW);
    const at = vec2(x, SCREEN_SIZE.y - y + up - cell/2 + feet), frame = animFrame(one);
    if (lot)
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
            drawTile(at.add(vec2(dx, dy)), vec2(cell), anim.tiles[frame], COLOR_OUTLINE, 0, one.mirror);
    drawTile(at, vec2(cell), anim.tiles[frame], WHITE, 0, one.mirror);
    drawTile(at, vec2(cell), anim.jerseys[frame], JERSEY[one.team], 0, one.mirror);
    one.dazed > 0 && drawDazed(one);
    if (one == holder)
    {
        drawDisc(mouth(one));

        // how long it's held it, a dot a second; in the last second and a half they grow and flash red and white
        const late = one.stall > STALL - 1.5, flash = late && time*4 % 1 < .5;
        if (mode == 'play')
            for (let i = 0; i < STALL; ++i)
                rect(x - STALL*2 + i*4, Math.round(head(one).y) - (one == player ? 16 : 4) - (late ? 1 : 0), 3, late ? 3 : 2,
                    flash ? WHITE : late ? SPOT.them : i < one.stall ? TEAM_TEXT.them : rgb(1, 1, 1, .5));
    }
}

// until you've scored once, while your dogs have the disc, gold arrows on the grass point from it to the end zone
// you're going for, with a shimmer running along them that way, so where to take it needs no words
const showGoal = ()=> !scoredOnce && offense == 'us' && (mode == 'ready' || mode == 'play');
function drawGoal()
{
    if (!showGoal())
        return;
    const catZone = LAWN.right - ZONE, y = Math.round((LAWN.top + LAWN.bottom)/2);
    for (let x = Math.ceil((discAt().x + 36)/28)*28; x < catZone - 2; x += 28)
    {
        const color = rgb(1, .93, .65, .18 + .5*(.5 + .5*Math.sin(x/28*1.2 - time*6)));
        for (let i = 0; i < 6; ++i)
        {
            rect(x - 6 + i, y - 7 + i, 2, 2, color);
            rect(x - 6 + i, y + 6 - i, 2, 2, color);
        }
        rect(x, y - 1, 2, 2, color);
    }
}

// the throw you're aiming: dots from you toward your finger or the mouse, fading away to nothing at the furthest
// you can throw, and where it would come down, spread as wide as it might stray. The mouse's waits while the ghost
// shows a throw of its own
function drawAim()
{
    const screen = aiming?.pos || (!(ghost?.time >= 0) && hover);
    if (mode != 'play' && mode != 'ready')
        return;
    const held = aiming ? time - aiming.start : charging !== undefined ? time - charging : 0, charge = chargeOf(held);
    if (holder == player && charging !== undefined)
        drawThrowLine(player, bestThrow(player).spot, COLOR_CHARGE.lerp(WHITE, 1 - charge), false, charge);
    else if (holder == player && screen)
        drawThrowLine(player, screen.add(vec2(Math.round(view), 0)), zooming(player) ? COLOR_GOLD :
            COLOR_CHARGE.lerp(WHITE, 1 - charge), false, charge);
    if (holder == player && charge > 0 && !zooming(player))
    {
        const full = charge >= 1, flash = full && time*10 % 1 < .5, {x, y} = player.pos;
        drawEllipse(toWorld(vec2(Math.round(x), Math.round(y))), vec2(player.kind.width + 8 + charge*12, 8 + charge*5),
            CLEAR_WHITE, 0, full ? 2 : 1, (flash ? WHITE : COLOR_CHARGE).scale(1, .5 + .5*charge));
    }
    if (holder?.windup)
        drawThrowLine(holder, holder.windup, TEAM_TEXT.them, true);
}

// a dotted line along the grass from a thrower toward a spot, fading away at its range, with where the throw would
// come down and how far it might stray; a cat's landing spot pulses, for you to get to
const COLOR_CHARGE = rgb(1, .55, .2);
function drawThrowLine(thrower, spot, color, pulse, charge=0)
{
    // it comes down where the throw would: as far as the thrower's range, and on the field
    const range = rangeOf(thrower);
    let way = spot.subtract(thrower.pos);
    if (way.length() > range)
        way = way.normalize(range);
    way = vec2(clamp(thrower.pos.x + way.x, LAWN.left + 4, LAWN.right - 4),
        clamp(thrower.pos.y + way.y, LAWN.top, LAWN.bottom)).subtract(thrower.pos);
    const distance = way.length();
    if (distance < 10)
        return;

    // and the wind carries it, more and more along the way, so the line bends to where it really comes down
    const dir = way.normalize(), aimed = thrower.pos.add(way);
    const bend = onLawn(aimed.add(driftOf(thrower, aimed, charge))).subtract(aimed);
    for (let d = 10; d < distance; d += 6)
    {
        const at = thrower.pos.add(dir.scale(d)).add(bend.scale((d/distance)**2));
        rect(Math.round(at.x), Math.round(at.y), 2, 1, color.scale(1, .9*(1 - d/range)**.6 + .08));
    }
    const end = aimed.add(bend), stray = zooming(thrower) ? 0 : strayOf(thrower, distance)*(1 - CHARGE.stray*charge);
    if (stray)
        ellipse(end.x, end.y, stray*2 + 6, stray + 3, rgb(1, .9, .5, .25));
    const at = vec2(Math.round(end.x), Math.round(end.y)), beat = Math.sin(time*14);
    if (!pulse)
        ellipse(at.x, at.y, 8, 3, color.scale(1, .6));
    else
    {
        // a cat's has the red ring its throw will have, beating, for you to get to before it goes
        ellipse(at.x, at.y, 8, 3, SPOT.them.scale(1, .5));
        drawEllipse(toWorld(at), vec2(22 + beat*2, 9 + beat), CLEAR_WHITE, 0, 1, SPOT.them.scale(1, .9));
    }
}

// a team's meter, under its score: filling from the outside in, yours gold and theirs green; when it's full it
// glows, with sparks running round it, and while the power lasts it drains
function drawMeter(team)
{
    const box = METERS[team], meter = power[team], color = POWER_COLOR[team], glow = .5 + .5*Math.sin(time*10);
    const full = meter.meter >= 100, on = meter.time > 0;
    screenRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2, full || on ? color.scale(1, .55 + .45*glow) :
        rgb(1, 1, 1, .35));
    screenRect(box.x, box.y, box.w, box.h, rgb(.1, .08, .2, .92));
    const width = Math.round((box.w - 2)*(on ? meter.time/POWERS[team].time : meter.meter/100));
    screenRect(team == 'us' ? box.x + 1 : box.x + box.w - 1 - width, box.y + 1, width, box.h - 2,
        full || on ? color.lerp(WHITE, glow*.45) : color.scale(.75, 1));
    if (full)
        for (let i = 0; i < 6; ++i)
        {
            const along = (time*.6 + i/6) % 1, around = along*2*(box.w + box.h);
            const x = around < box.w ? around : around < box.w + box.h ? box.w : around < 2*box.w + box.h ?
                2*box.w + box.h - around : 0;
            const y = around < box.w ? 0 : around < box.w + box.h ? around - box.w : around < 2*box.w + box.h ? box.h :
                2*(box.w + box.h) - around;
            screenRect(Math.round(box.x + x) - 1, Math.round(box.y + y) - 1, 2, 2, WHITE);
        }
}

// under the clock, whose disc it is and which way it's going: the disc, and arrows in that team's colour pointing at
// the end zone it's going for, with a shimmer running along them that way
function drawPossession()
{
    const way = forward(offense), color = TEAM_TEXT[offense], y = 20;
    screenEllipse(192 - way*13, y + 1, 8, 5, COLOR_DISC);
    for (let i = 0; i < 3; ++i)
    {
        const tip = 192 - way + way*i*8, glow = color.scale(1, .45 + .55*(.5 + .5*Math.sin(i*1.3 - time*7)));
        for (let s = 0; s < 4; ++s)
        {
            const x = way > 0 ? tip - 3 + s : tip + 2 - s;
            screenRect(x, y - 3 + s, 2, 1, glow);
            s < 3 && screenRect(x, y + 3 - s, 2, 1, glow);
        }
    }
}

// a warm light over the field as the day goes on, deepening to dusk at the top. At night it's dark all round, but
// for pools of light on the field; the players are lit by the lights, so in a match the dark goes on first, under
// them ('ground'), and the warm light and the lamps after them ('sky'); on the cup's screens it all goes on at once
function drawDaylight(stage)
{
    const day = daylight(), glow = day.glow ?? day.late, light = inLot() ? COLOR_SODIUM : COLOR_FLOOD;
    if (stage != 'sky' && day.dark)
    {
        screenRect(0, 0, SCREEN_SIZE.x, SCREEN_SIZE.y, COLOR_NIGHT.scale(1, day.dark));
        for (const x of FLOODLIGHTS)
            drawEllipseGradient(toWorld(vec2(x, 156)), vec2(300, 140), light.scale(1, day.dark*.6), light.scale(1, 0));
    }
    if (stage == 'ground')
        return;
    if (glow)
    {
        screenRect(0, 0, SCREEN_SIZE.x, SCREEN_SIZE.y, COLOR_GLOW.scale(1, glow*.13));
        drawRect(vec2(Math.round(view) + SCREEN_SIZE.x/2, SCREEN_SIZE.y - 30), vec2(SCREEN_SIZE.x, 60),
            COLOR_DUSK.scale(1, glow*.12));
    }

    // the lamps shining at the top: white floodlight in the park, and the warm orange of street lights on the lot,
    // where the neon signs glow too
    if (day.dark)
    {
        for (const x of FLOODLIGHTS)
        {
            for (const [gx, gy, gw, gh] of inLot() ? lampsOf(x).map(([lx, ly, lw])=> [lx + lw/2, ly + 1, 34, 22]) :
                [[x, LAMPS + 3, 50, 32]])
                drawEllipseGradient(toWorld(vec2(gx, gy)), vec2(gw, gh), light.scale(1, .5), light.scale(1, 0));
            for (const [lx, ly, lw, lh] of lampsOf(x))
                rect(lx, ly, lw, lh, light);
        }
        if (inLot())
        {
            const shift = Math.round(view)*(1 - STREET_SLIDE);
            for (const {x, w, sign} of STREET)
                if (sign)
                    drawEllipseGradient(toWorld(vec2(Math.round(x + shift) + w/2, 50)), vec2(sign.word.length*8 + 24, 24),
                        sign.color.scale(1, .3), sign.color.scale(1, 0));
        }
    }
}

function gameRender()
{
    drawPark();
    if (!inMatch())
    {
        drawDaylight();
        drawCupScreen();
        drawSpeaker();
        return;
    }
    drawDaylight('ground');
    for (const speck of dust)
    {
        const p = speck.time/speck.life;
        rect(Math.round(speck.pos.x), Math.round(speck.pos.y) - 1, 2, 2, rgb(.86, .76, .56, .8*(1 - p)));
    }
    drawGoal();
    drawPickup();
    drawAim();
    if (loose)
    {
        ellipse(loose.pos.x, loose.pos.y, 9, 3, SHADOW);
        drawDisc(loose.pos.add(vec2(0, -1)));
    }
    [...players].sort((a, b)=> a.pos.y - b.pos.y).forEach(drawPlayer);

    // an arrow over the dog you are, over everyone, bobbing; or leaping over to the one you've just shifted into
    if (mode != 'over' && youShift)
        drawYouShift();
    else if (mode != 'over')
    {
        const at = arrowOver(player);
        drawYouArrow(Math.round(at.x), Math.round(at.y + Math.sin(time*6)*1.5));
    }

    drawConfetti();

    // the disc in the air, with its shadow on the grass, and where it's coming down: a spot with a ring round it,
    // white for your throws and red for theirs, the ring closing in on the spot as the disc comes down, so you can
    // see where to be and when
    if (flight)
    {
        const p = min(flight.time/flight.life, 1), at = discGround(flight, p);
        const mark = SPOT[flight.team], spot = vec2(Math.round(flight.to.x), Math.round(flight.to.y));
        ellipse(spot.x, spot.y, 8, 3, mark.scale(1, .5));
        drawEllipse(toWorld(spot), vec2(10 + (1 - p)*18, 4 + (1 - p)*7), CLEAR_WHITE, 0, 1, mark.scale(1, .9));
        ellipse(Math.round(at.x), Math.round(at.y), 7, 3, SHADOW);
        flight.trail.forEach((spot, i)=>
        {
            const age = (flight.trail.length - i)/12;
            age < 1 && rect(Math.round(spot.x) - 1, Math.round(spot.y), 3, 2,
                COLOR_GOLD.lerp(rgb(1, .4, .2), age).scale(1, 1 - age));
        });
        drawDisc(at.add(vec2(0, -discHeight(flight, p))));
    }

    for (const effect of effects)
    {
        const p = effect.time/effect.life;
        if (effect.type == 'puff')
            for (let i = 0; i < 10; ++i)
            {
                const at = effect.pos.add(vec2().setAngle(i*PI/5, 5 + p*16));
                rect(Math.round(at.x) - 1, Math.round(at.y) - 1, 3, 3, rgb(1, 1, 1, 1 - p));
            }
        else if (effect.type == 'meow')
            drawTile(toWorld(effect.pos.add(vec2(effect.mirror ? -8 : 8, 0))), vec2(16), meowTiles[min(p*3|0, 2)], WHITE,
                0, effect.mirror);
        else if (effect.type == 'spark')
        {
            const at = effect.pos.add(effect.vel.scale(effect.time)).add(vec2(0, 40*effect.time*effect.time));
            rect(Math.round(at.x), Math.round(at.y), 2, 2, effect.color.scale(1, 1 - p));
        }
    }

    drawDaylight('sky');
    if (flash > 0)
        screenRect(0, 0, SCREEN_SIZE.x, SCREEN_SIZE.y, rgb(1, 1, 1, flash*2));
    drawGhost();

    // arrows at the edges for anyone off the screen
    for (const one of players)
    {
        const x = one.pos.x - Math.round(view), y = Math.round(one.pos.y - one.kind.height/2);
        if (x < -4 || x > SCREEN_SIZE.x + 4)
        {
            const edge = x < 0 ? 1 : SCREEN_SIZE.x - 4, point = x < 0 ? -1 : 1;
            for (let i = 0; i < 3; ++i)
                screenRect(edge + (point > 0 ? i : 2 - i), y - 2 + i, 1, 5 - i*2, TEAM_TEXT[one.team]);
        }
    }

    // the stick, under your finger
    if (stick && mode == 'play')
    {
        const {origin, dir, amount} = stick, knob = origin.add(dir.scale(amount*STICK_REACH*.6));
        screenEllipse(origin.x, origin.y, STICK_REACH*2, STICK_REACH*2, rgb(1, 1, 1, .12));
        screenEllipse(knob.x, knob.y, 12, 12, rgb(1, 1, 1, .3));
    }

    // the scoreboard, on dark plates so it reads against any sky: each team's name, score and meter, and between
    // them the clock and whose disc it is
    for (const [x, w] of [[2, 113], [165, 54], [269, 113]])
        screenRect(x, 1, w, 27, rgb(.1, .08, .2, .65));
    mode != 'over' && drawPossession();
    drawMeter('us');
    drawMeter('them');
    drawStatus('us');
    drawStatus('them');
    for (const team of ['us', 'them'])
        if (powered(team))
        {
            const edge = POWER_COLOR[team].scale(1, .12 + .08*Math.sin(time*10));
            screenRect(0, 0, SCREEN_SIZE.x, 3, edge);
            screenRect(0, SCREEN_SIZE.y - 3, SCREEN_SIZE.x, 3, edge);
            screenRect(0, 0, 3, SCREEN_SIZE.y, edge);
            screenRect(SCREEN_SIZE.x - 3, 0, 3, SCREEN_SIZE.y, edge);
        }
    if ((mode == 'play' || mode == 'ready') && (banner || hint()) || mode == 'point' && banner)
        screenRect(0, 28, SCREEN_SIZE.x, 13, rgb(.1, .08, .2, .7));
    if (mode == 'over')
    {
        screenRect(52, 26, 280, 164, COLOR_PANEL);
        screenRect(52, 26, 280, 1, COLOR_GOLD);
        screenRect(52, 189, 280, 1, COLOR_GOLD);
        screenRect(64, 125, 256, 1, rgb(1, 1, 1, .15));
        screenRect(154, 168, 76, 14, COLOR_GOLD);
        screenRect(155, 169, 74, 12, COLOR_GOLD_DARK);
        const pup = goodestPup(), left = Math.round(view);
        screenEllipse(84, 158, 34, 8, COLOR_GOLD);
        drawStanding(0, pup ? pup.name : 'akita', 84 + left, 158);

        // the match's paws, between the team names: each earned one drops in, flashing white, with a burst round it,
        // bronze then silver then gold; the ones not earned are just outlines
        const rating = pawsOf(score.us, score.them);
        for (let i = 0; i < 3; ++i)
        {
            const x = left + 172 + i*20, y = 54, since = overTime - stampAt(i);
            if (i >= rating || since < 0)
            {
                drawPawSlot(x, y);
                continue;
            }
            const drop = Math.round(max(0, 1 - since/.12)*5);
            since < .1 ? drawPawSlot(x, y - drop, WHITE) : drawPaw(x, y - drop, PAW_COLORS[i + 1]);
            if (since < .3)
                for (let k = 0; k < 8; ++k)
                {
                    const at = vec2(x, y).add(vec2().setAngle(k*PI/4, 9 + since*30));
                    rect(Math.round(at.x), Math.round(at.y), 2, 2, PAW_COLORS[i + 1].scale(1, 1 - since/.3));
                }
        }
    }
    mode != 'over' && drawVane();
    if (matchPaused)
        screenRect(0, 0, SCREEN_SIZE.x, SCREEN_SIZE.y, rgb(.06, .05, .1, .6));
    drawSpeaker();
    mode != 'over' && drawPauseButton();
}

// the pause button in the top right corner, across from the speaker: two bars, or while paused, play
const PAUSE_ICON = ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##', '##.##'];
const PLAY_ICON = ['#....', '##...', '###..', '####.', '###..', '##...', '#....'];
function drawPauseButton()
{
    const color = matchPaused ? COLOR_HINT : rgb(1, 1, 1, .7);
    (matchPaused ? PLAY_ICON : PAUSE_ICON).forEach((row, r)=> [...row].forEach((cell, i)=>
        cell == '#' && screenRect(373 + i, 4 + r, 1, 1, color)));
}

function gameRenderPost()
{
    const text = (string, x, y, color=COLOR_TEXT, size=8)=>
        engineImageFont.drawTextScreen(string, vec2(x, y), size, true, color, false);
    if (!inMatch())
    {
        drawCupText(text);
        fitCanvasToPixels();
        return;
    }

    text(`${TEAM_NAME.us} ${score.us}`, 66, 8, TEAM_TEXT.us);
    text(`${score.them} ${TEAM_NAME.them}`, 318, 8, TEAM_TEXT.them);
    const seconds = Math.ceil(clock);
    if (suddenDeath)
        text('SUDDEN DEATH', 192, 8, COLOR_GOLD);
    else
        text(`${seconds/60|0}:${String(seconds % 60).padStart(2, '0')}`, 192, 8,
            seconds <= 10 && (time*3 % 1 < .6 || timeUp) ? TEAM_TEXT.them : COLOR_TEXT);

    mode != 'over' && drawStatusWords(text);
    if (banner && mode != 'over')
        text(banner.text, 192, 34, banner.color);
    else if ((mode == 'play' || mode == 'ready') && hint())
        text(hint(), 192, 34, holder?.team == 'them' || flight?.team == 'them' ? TEAM_TEXT.them :
            ghost ? COLOR_HINT : COLOR_DIM);

    if (mode == 'over')
    {
        const won = score.us > score.them;
        text(won ? 'YOU WIN!' : 'YOU LOST', 192, 38, won ? COLOR_HINT : TEAM_TEXT.them, 16);
        text(TEAM_NAME.us, 96, 56, TEAM_TEXT.us);
        text(TEAM_NAME.them, 288, 56, TEAM_TEXT.them);
        const accuracy = (team)=> tally[team].throws ? Math.round(tally[team].caught/tally[team].throws*100) + '%' : '-';
        [['SCORE', score.us, score.them],
            ['PASSES', `${tally.us.caught}/${tally.us.throws}`, `${tally.them.caught}/${tally.them.throws}`],
            ['ACCURACY', accuracy('us'), accuracy('them')],
            ['INTERCEPTIONS', tally.us.picks, tally.them.picks],
            ['WOOFS & MEOWS', tally.us.calls, tally.them.calls]].forEach(([label, ours, theirs], i)=>
        {
            text(label, 192, 70 + i*11, COLOR_DIM);
            text(`${ours}`, 96, 70 + i*11);
            text(`${theirs}`, 288, 70 + i*11);
        });

        // the goodest pup, and what it did, or if nobody did anything, all of them; beside it, without commas if
        // they don't fit
        const pup = goodestPup(), plural = (n, word)=> `${n} ${word}${n == 1 ? '' : word.endsWith('H') ? 'ES' : 'S'}`;
        const left = (string, x, y, color)=> engineImageFont.drawTextScreen(string, vec2(x + 4, y), 8, false, color, false);
        const did = pup && [[pup.points, 'POINT'], [pup.blocks, 'BLOCK'], [pup.catches, 'CATCH']].filter(([n])=> n)
            .map(([n, word])=> plural(n, word));
        left('GOODEST PUP', 108, 135, COLOR_GOLD);
        left(pup ? DOG_NAMES[pup.name] : 'ALL OF THEM', 108, 146, COLOR_TEXT);
        left(pup ? did.join(did.join(', ').length > 27 ? ' ' : ', ') : 'FOR TRYING SO HARD', 108, 157, COLOR_DIM);
        text('CONTINUE', 192, 175, COLOR_PANEL);
    }

    for (const team of ['us', 'them'])
    {
        const box = METERS[team], meter = power[team], dark = COLOR_PANEL;
        if (meter.time > 0)
            text(POWERS[team].name + '!', box.x + box.w/2, box.y + box.h/2, dark);
        else if (meter.meter >= 100)
            text(team == 'them' ? 'CATNIP!' : inputKind == 'touch' ? 'TAP ME!' : inputKind == 'keys' ? 'PRESS Z' :
                time % 1.6 < .8 ? 'CLICK ME!' : 'PRESS Z', box.x + box.w/2, box.y + box.h/2, dark);
    }
    if (splash)
    {
        const t = splash.time, size = 16 + Math.round(max(0, .25 - t)*48), color = splash.color.copy();
        color.a = 1 - max(0, (t - 1)/.4);
        const shadow = rgb(0, 0, 0, .45*color.a);
        text(splash.text, 194, 72, shadow, size);
        text(splash.text, 192, 70, color, size);
    }

    // the words that float up off the players, which a pause would leave hanging over its own words
    const left = Math.round(view);
    for (const effect of matchPaused ? [] : effects)
        if (effect.type == 'text')
        {
            const p = effect.time/effect.life, color = effect.color.copy();
            color.a = 1 - p*p;
            text(effect.text, effect.pos.x - left, effect.pos.y - p*10, color);
        }
    if (matchPaused)
    {
        text('PAUSED', 192, 100, COLOR_HINT, 16);
        text({touch: 'TAP TO PLAY', mouse: 'CLICK TO PLAY', keys: 'PRESS P TO PLAY'}[inputKind], 192, 122,
            (time*2 % 2) < 1.4 ? COLOR_TEXT : COLOR_DIM);
    }
    fitCanvasToPixels();
}

// scale the canvas by a whole number of screen pixels so every art pixel is the same size,
// unless that would waste much of the window, then fill it with hard edged pixels anyway
function fitCanvasToPixels()
{
    const ratio = window.devicePixelRatio || 1;
    const fit = Math.min(innerWidth*ratio/SCREEN_SIZE.x, innerHeight*ratio/SCREEN_SIZE.y);
    const scale = fit >= 1 && Math.floor(fit)/fit > .85 ? Math.floor(fit) : fit;
    const width = SCREEN_SIZE.x*scale, height = SCREEN_SIZE.y*scale;

    // center it on whole screen pixels, a half pixel offset would blur it again
    const left = Math.round((innerWidth*ratio - width)/2)/ratio, top = Math.round((innerHeight*ratio - height)/2)/ratio;
    for (const canvas of document.querySelectorAll('canvas'))
    {
        canvas.style.width = width/ratio + 'px';
        canvas.style.height = height/ratio + 'px';
        canvas.style.left = left + 'px';
        canvas.style.top = top + 'px';
        canvas.style.transform = 'none';
    }
}

///////////////////////////////////////////////////////////////////////////////
// the canvas size is set before the engine starts, so it never depends on the window size
setCanvasFixedSize(SCREEN_SIZE);
setCanvasPixelated(true);
glSetAntialias(false); // smoothed edges turn into blur once the pixels are scaled up
setDebugWatermark(false);
setCameraScale(1);
setCameraPos(SCREEN_SIZE.scale(.5));
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, IMAGES);
