// Disc Dogs: the cups - your dogs and five cat teams, each with its own name, jersey and ways, play a round robin:
// every team plays every other once, and the most wins takes the cup, with points scored less points let in to
// settle a tie. You play one match a round; the cats' matches that round are played out without you
// There are two cups: the Park Cup, through a sunny day, and once you've won that, the City Cup, at night in a
// parking lot downtown under its lights, against tougher cats, six a side, with the Saint Bernard on your team
// The screens are the choice of cups, each cup's table of results, the matchup before each of your matches, the
// ceremony at the end, and the final table. game.js plays the matches, and draws the field behind these screens

'use strict';

// each cup's teams: yours, then the cats, weakest first. Each has a jersey, a word on its ways, the player shown for
// it, and how its players differ from plain cats: how fast they run and turn, how much higher they leap, how much
// further they throw, and how they defend: how far behind its mark a guard lags, how long it takes to go for a throw,
// and how near it has to be to knock one down; and, for the City Cup's cats, how long they show where they're
// throwing before they throw (a plain cat takes .6 seconds) and how much harder their throws are to knock down (a
// plain cat's are 1). A cup at night is played under lights; a cup in the lot is played on a parking lot in the city
// rather than in the park; a cup with extras has one more player on each side
const PARK_SQUADS =
[
    {name: 'ZOOMIES', jersey: '#3d7dff', ways: 'THAT\'S YOU!', captain: 'akita'},
    {name: 'NAPPERS', jersey: '#b28cff', ways: 'SLEEPY: SLOW TO REACT', captain: 'patch',
        speed: .85, grip: .9, leap: -4, arm: -15, defense: {lag: .55, react: .5, block: .45}},
    {name: 'ALLEY CATS', jersey: '#ff8a2a', ways: 'SCRAPPY BLOCKERS', captain: 'tabby',
        speed: .95, grip: 1, leap: 0, arm: 0, defense: {lag: .42, react: .38, block: .62}},
    {name: 'FLUFFS', jersey: '#ff6fb5', ways: 'BOUNCY: HUGE LEAPS', captain: 'snowy',
        speed: .95, grip: 1, leap: 8, arm: 0, defense: {lag: .4, react: .38, block: .55}},
    {name: 'PROWLERS', jersey: '#ffd23a', ways: 'QUICK ON THEIR FEET', captain: 'sooty',
        speed: 1.1, grip: 1.1, leap: 2, arm: 10, defense: {lag: .36, react: .34, block: .55}},
    {name: 'TOMCATS', jersey: '#ff4a3d', ways: 'GOOD AT EVERYTHING', captain: 'ginger',
        speed: 1.08, grip: 1.1, leap: 6, arm: 20, defense: {lag: .33, react: .32, block: .6}},
];
const CITY_SQUADS =
[
    {name: 'ZOOMIES', jersey: '#3d7dff', ways: 'NOW WITH A BERNARD!', captain: 'akita'},
    {name: 'BODEGA CATS', jersey: '#3ff0dc', ways: 'STREET SMART', captain: 'ginger',
        speed: 1, grip: 1.05, leap: 4, arm: 10, defense: {lag: .3, react: .3, block: .66}, windup: .45, slip: .8},
    {name: 'STRAYS', jersey: '#ffc93a', ways: 'SCRAPPY BLOCKERS', captain: 'tabby',
        speed: 1.02, grip: 1.05, leap: 4, arm: 10, defense: {lag: .3, react: .28, block: .74}, windup: .45, slip: .8},
    {name: 'ROOFTOPPERS', jersey: '#c08aff', ways: 'SKY HIGH LEAPS', captain: 'snowy',
        speed: 1.02, grip: 1.05, leap: 14, arm: 15, defense: {lag: .3, react: .29, block: .65}, windup: .42, slip: .78},
    {name: 'MIDNIGHTS', jersey: '#e04aa0', ways: 'FAST AND SNEAKY', captain: 'sooty',
        speed: 1.18, grip: 1.15, leap: 6, arm: 20, defense: {lag: .28, react: .27, block: .68}, windup: .38, slip: .75},
    {name: 'FAT CATS', jersey: '#ff6a2a', ways: 'THE BEST THERE IS', captain: 'patch',
        speed: 1.15, grip: 1.15, leap: 10, arm: 35, defense: {lag: .26, react: .26, block: .7}, windup: .38, slip: .72},
];
const CUPS =
[
    {id: 'park', name: 'THE PARK CUP', squads: PARK_SQUADS},
    {id: 'city', name: 'THE CITY CUP', squads: CITY_SQUADS, night: true, lot: true,
        extras: {us: 'bernard', them: 'smoky'}},
];

// the cup being played, its teams and its name; and each side's players in it
let cupIndex = 0, SQUADS = PARK_SQUADS, CUP_NAME = CUPS[0].name;
function useCup(index)
{
    cupIndex = index;
    SQUADS = CUPS[index].squads;
    CUP_NAME = CUPS[index].name;
}
const roster = (team)=> [...TEAMS[team], ...(CUPS[cupIndex].extras ? [CUPS[cupIndex].extras[team]] : [])];

// a cup is open once you've won the one before it; or, to try the City Cup without winning the Park Cup first, open
// the game with ?city on the end of its address
const SHORTCUT = /[?&]city\b/i.test(location.search);
const unlocked = (index)=> !index || SHORTCUT || trophies[CUPS[index - 1].id] > 0;

// someone new to it hasn't played a match of a cup yet, or won one, so there's no choosing to do: one tap and they're
// on the field, and the table and the matchups start from the next round, when there's something in them
const newcomer = ()=> !SHORTCUT && !cup.round && !Object.keys(trophies).length;

// who plays whom each round: every pair once, and you meet the cats weakest first
const ROUNDS =
[
    [[0, 1], [2, 5], [3, 4]],
    [[0, 2], [1, 3], [4, 5]],
    [[0, 3], [1, 5], [2, 4]],
    [[0, 4], [1, 2], [3, 5]],
    [[0, 5], [1, 4], [2, 3]],
];

// the cup so far: which round it is, every result, keyed by the two teams, lower first, with each one's points, and
// what each of your dogs has done over it; and how many of each cup you've won. It's kept in the browser, so a cup
// can be finished another day
let cup = {id: 'park', round: 0, results: {}, pups: {}}, trophies = {}, cupTime = 0, chosen = 0;

// your best paws against each team of each cup, kept from cup to cup, and how many of a cup's you've got of all there
// are to get, three a team
let bestPaws = {};
const pawTotal = (index)=> Object.values(bestPaws[CUPS[index].id] || {}).reduce((a, b)=> a + b, 0);
const pawMost = (index)=> (CUPS[index].squads.length - 1)*3;
function loadCup()
{
    try
    {
        const saved = JSON.parse(localStorage.getItem('zoomies'));
        cup = saved?.cup || cup;
        cup.pups ||= {};
        cup.id ||= 'park';
        trophies = typeof saved?.trophies == 'number' ? {park: saved.trophies} : saved?.trophies || {};
        bestPaws = saved?.paws || {};
    }
    catch(e) {}
    useCup(max(0, CUPS.findIndex((each)=> each.id == cup.id)));
}
const saveCup = ()=> { try { localStorage.setItem('zoomies', JSON.stringify({cup, trophies, paws: bestPaws})); }
    catch(e) {} };

// how one team did against another, from its side: its points and theirs, or nothing yet
function result(a, b)
{
    const r = cup.results[a < b ? `${a}-${b}` : `${b}-${a}`];
    return r && {scored: a < b ? r[0] : r[1], against: a < b ? r[1] : r[0]};
}

function recordOf(team)
{
    const record = {won: 0, lost: 0, diff: 0};
    for (let other = 0; other < SQUADS.length; ++other)
    {
        const r = other != team && result(team, other);
        if (!r)
            continue;
        r.scored > r.against ? ++record.won : ++record.lost;
        record.diff += r.scored - r.against;
    }
    return record;
}

// the table, top first: most wins, then the most points scored over points let in
const standings = ()=> SQUADS.map((_, i)=> i).sort((a, b)=>
{
    const ra = recordOf(a), rb = recordOf(b);
    return rb.won - ra.won || rb.diff - ra.diff || a - b;
});

// who you play this round
const opponent = ()=> cup.round < ROUNDS.length ? ROUNDS[cup.round][0][1] : undefined;

// a cat team's player: a plain cat, changed by its team's ways
function teamKind(team, name)
{
    const kind = KINDS[name], squad = SQUADS[team];
    if (!team)
        return kind;
    return {...kind, speed: kind.speed*squad.speed, grip: kind.grip*squad.grip, leap: kind.leap + squad.leap,
        range: kind.range + squad.arm};
}

// how a team rates, each from nothing to one: how fast it runs, how high it reaches, how far it throws, and how well
// it defends
function ratings(team)
{
    const names = roster(team ? 'them' : 'us'), kinds = names.map((name)=> teamKind(team, name));
    const average = (get)=> kinds.reduce((sum, kind)=> sum + get(kind), 0)/kinds.length;
    const defense = SQUADS[team].defense || OUR_DEFENSE;
    return {
        SPEED: clamp((average((kind)=> kind.speed) - 50)/45, .08, 1),
        LEAP: clamp((average((kind)=> kind.height*.6 + kind.leap) - 14)/24, .08, 1),
        ARM: clamp((average((kind)=> kind.range) - 110)/100, .08, 1),
        DEFENSE: clamp(defense.block/.65*.4 + (.6 - defense.react)/.3*.3 + (.6 - defense.lag)/.3*.3, .08, 1),
    };
}

// a match without you: the better team usually wins, by first to 3 or ahead when time ran out
function playOut(a, b)
{
    const power = (team)=> Object.values(ratings(team)).reduce((sum, value)=> sum + value)**3;
    const aWins = rand() < power(a)/(power(a) + power(b)), winner = rand() < .6 ? 3 : 1 + randInt(2);
    const loser = randInt(winner);
    cup.results[`${a}-${b}`] = aWins ? [winner, loser] : [loser, winner];
}

// your match is over: the moment it ends, it goes in the table, the rest of the round is played out, the cup moves on
// to the next round, and it's all saved, so leaving or reloading on the results can't lose a match or take one back.
// The match keeps its own round's light while its results show
function recordMatch(scored, against)
{
    cup.results[`0-${opponent()}`] = [scored, against];
    const best = bestPaws[cup.id] ||= {};
    best[opponent()] = max(best[opponent()] || 0, pawsOf(scored, against));
    for (const dog of teamOf('us'))
    {
        const pup = cup.pups[dog.name] ||= {points: 0, blocks: 0, catches: 0};
        pup.points += dog.points;
        pup.blocks += dog.blocks;
        pup.catches += dog.catches;
    }
    for (const [a, b] of ROUNDS[cup.round].slice(1))
        playOut(a, b);
    ++cup.round;
    if (cup.round == ROUNDS.length && standings()[0] == 0)
        trophies[cup.id] = (trophies[cup.id] || 0) + 1;
    saveCup();
}

// on from your match's results, to the table, or to the end of the cup
const finishMatch = ()=> showCup(cup.round < ROUNDS.length ? 'table' : 'champions');

// back to the choice of cups, the newest open one picked
function newCup()
{
    chosen = unlocked(1) ? 1 : 0;
    showCup('title');
}

// start a cup afresh
function startCup(index)
{
    useCup(index);
    cup = {id: CUPS[index].id, round: 0, results: {}, pups: {}};
    saveCup();
    showCup('table');
}

function showCup(screen)
{
    mode = screen;
    cupTime = 0;
    crowd = undefined;

    // the end of the cup: the winners' fans on their feet, clapping, and a fanfare, a big one if it's you
    if (screen == 'champions')
    {
        const champ = standings()[0];
        setTimeout(()=> fanfare(champ ? [0, 4, 7, 12] : [0, 4, 7, 12, 7, 12, 16, 19, 24], .13), 500);
        applause('whole', champ ? .5 : .8);
        crowd = {team: champ ? 'them' : 'us', time: Infinity, big: true};
        fireworks = [];
        fireworkTime = .3;
    }
}

// the goodest pup of the whole cup, by the same count as a match's, and what it did
function cupPup()
{
    const worth = (name)=> cup.pups[name] ? cup.pups[name].points*3 + cup.pups[name].blocks*2 + cup.pups[name].catches : 0;
    return roster('us').reduce((a, b)=> worth(b) > worth(a) ? b : a);
}
function didLine({points, blocks, catches})
{
    const plural = (n, word)=> `${n} ${word}${n == 1 ? '' : word.endsWith('H') ? 'ES' : 'S'}`;
    return [[points, 'POINT'], [blocks, 'BLOCK'], [catches, 'CATCH']].filter(([n])=> n)
        .map(([n, word])=> plural(n, word)).join(', ');
}

// fireworks over the park: bursts of sparks in your colours and gold, falling as they fade, each with a pop
const sound_pop = new Sound([.25, .3, 200, 0, .02, .25, 4, 1, -6, 0, 0, 0, 0, 2]);
let fireworks = [], fireworkTime = 0;
function updateFireworks()
{
    if ((fireworkTime -= timeDelta) < 0)
    {
        fireworkTime = rand(.35, .8);
        const at = vec2(rand(40, SCREEN_SIZE.x - 40), rand(18, 64));
        const color = [hex(SQUADS[standings()[0]].jersey), COLOR_GOLD, WHITE, COLOR_HINT, hex('#ff8fd0')][randInt(5)];
        for (let i = 0; i < 40; ++i)
            fireworks.push({pos: at.copy(), vel: vec2().setAngle(rand(PI*2), rand(30, 75)), color, time: 0,
                life: rand(.8, 1.3)});
        sound_pop.play(undefined, .5, rand(.8, 1.2));
        if (rand() < .35)
            throwConfetti();
    }
    for (const spark of fireworks)
    {
        spark.time += timeDelta;
        spark.vel = spark.vel.scale(.97).add(vec2(0, 30*timeDelta));
        spark.pos = spark.pos.add(spark.vel.scale(timeDelta));
    }
    fireworks = fireworks.filter((spark)=> spark.time < spark.life);
}

// on the cup's screens, a tap or Space or Enter goes on, once the screen has been up a moment
function updateCup(taps)
{
    cupTime += timeDelta;
    updateConfetti();
    if (mode == 'champions')
        updateFireworks();
    if (mode == 'title' && cupTime > .3)
    {
        // someone new is one tap from the field: anywhere, or Space or Enter, and they're in the Park Cup's first match
        if (newcomer())
        {
            if (taps.length || keyWasPressed('Space') || keyWasPressed('Enter'))
            {
                sound_tock.play();
                startCup(0);
                startMatch(opponent());
            }
            return;
        }

        // a tap on a cup plays it, if it's open; the arrow keys pick one and Space or Enter plays it
        if (keyWasPressed('ArrowLeft') || keyWasPressed('ArrowRight'))
            chosen = 1 - chosen;
        const tapped = taps.length && CARDS.findIndex(({x})=> Math.abs(taps[0].pos.x - x - CARD.w/2) < CARD.w/2 &&
            Math.abs(taps[0].pos.y - CARD.y - CARD.h/2) < CARD.h/2);
        const pick = tapped >= 0 && taps.length ? tapped : keyWasPressed('Space') || keyWasPressed('Enter') ? chosen : -1;
        if (pick >= 0 && unlocked(pick))
        {
            sound_tock.play();
            startCup(pick);
        }
        else if (pick >= 0)
            sound_drop.play();
        return;
    }
    if (cupTime < .5 || !(taps.length || keyWasPressed('Space') || keyWasPressed('Enter')))
        return;
    sound_tock.play();
    if (mode == 'table')
        showCup('matchup');
    else if (mode == 'matchup')
        startMatch(opponent());
    else if (mode == 'champions')
        showCup('final');
    else if (mode == 'final')
        newCup();
}

///////////////////////////////////////////////////////////////////////////////
// drawing the cup's screens, over the park

const ordinal = (n)=> n + (['ST', 'ND', 'RD'][n - 1] || 'TH');

// a team's player standing, in its jersey, its feet at x, y
function drawStanding(team, name, x, y, mirror=false)
{
    const kind = KINDS[name], anim = kind.anims.idle, frame = (time*8 + x*.37|0) % anim.frames;
    const at = vec2(x, SCREEN_SIZE.y - y - kind.cell/2 + kind.feet);
    drawTile(at, vec2(kind.cell), anim.tiles[frame], WHITE, 0, mirror);
    drawTile(at, vec2(kind.cell), anim.jerseys[frame], hex(SQUADS[team].jersey), 0, mirror);
}

// the cup itself, in gold, its foot at x, y
function drawTrophy(x, y)
{
    const dark = COLOR_GOLD_DARK, gold = COLOR_GOLD, shine = COLOR_HINT;
    rect(x - 10, y - 4, 20, 4, dark);
    rect(x - 6, y - 7, 12, 3, gold);
    rect(x - 2, y - 14, 4, 7, dark);
    rect(x - 12, y - 32, 24, 14, gold);
    rect(x - 10, y - 18, 20, 4, gold);
    rect(x - 8, y - 32, 3, 12, shine);
    for (const side of [-1, 1])
    {
        rect(x + side*14 - 2, y - 30, 4, 2, dark);
        rect(x + side*16 - 2, y - 30, 2, 9, dark);
        rect(x + side*14 - 2, y - 23, 4, 2, dark);
    }
}

// a win: a paw, its four toes clear of its pad, centred on x, y; a loss: a bold cross
const PAW = ['...##...##...', '..####.####..', '..####.####..', '...##...##...', '##.........##', '###.......###',
    '###..###..###', '.#..#####..#.', '...#######...', '...#######...', '...#######...', '....##.##....'];
const MINI_TROPHY = ['#######', '#.###.#', '.#####.', '..###..', '...#...', '..###..', '.#####.'];
function drawMiniTrophy(x, y)
{
    MINI_TROPHY.forEach((row, r)=> [...row].forEach((cell, i)=> cell == '#' && rect(x - 3 + i, y - 3 + r, 1, 1, COLOR_GOLD)));
}

// a medal on its ribbon, its middle at x, y: silver for second, bronze for third
function drawMedal(x, y, place)
{
    const color = hex(place == 2 ? '#d8dde6' : '#d08a4a');
    rect(x - 4, y - 9, 3, 5, hex('#3d7dff'));
    rect(x + 1, y - 9, 3, 5, hex('#ff4a3d'));
    ellipse(x, y, 9, 9, color.lerp(BLACK, .25));
    ellipse(x, y, 7, 7, color);
    rect(x - 1, y - 2, 1, 3, WHITE);
}

// a paw print for a win: four toes and the pad, each picked out by a dark edge round it
function drawPaw(x, y, color)
{
    const on = (i, r)=> PAW[r]?.[i] == '#', dark = rgb(.05, .12, .07, .85);
    for (let r = -1; r <= PAW.length; ++r)
        for (let i = -1; i <= PAW[0].length; ++i)
            if (!on(i, r) && (on(i - 1, r) || on(i + 1, r) || on(i, r - 1) || on(i, r + 1)))
                rect(x - 6 + i, y - 6 + r, 1, 1, dark);
    PAW.forEach((row, r)=> [...row].forEach((cell, i)=> cell == '#' && rect(x - 6 + i, y - 6 + r, 1, 1, color)));
}

function drawCross(x, y, color)
{
    for (let i = 0; i < 6; ++i)
    {
        rect(x - 3 + i, y - 3 + i, 2, 2, color);
        rect(x + 2 - i, y - 3 + i, 2, 2, color);
    }
}
const COLOR_WIN = rgb(.4, .9, .45), COLOR_LOSS = rgb(1, .4, .35);

// a win's rating, in paws: one for a win, two for winning by two or more, and three for a shutout; bronze, silver
// and gold. On the table a win's paw is the colour of its rating, and after a match yours stamp in one by one
const pawsOf = (scored, against)=> scored <= against ? 0 : !against && scored >= WIN ? 3 : scored - against >= 2 ? 2 : 1;
const PAW_COLORS = [, rgb(.74, .45, .24), rgb(.86, .89, .94), rgb(1, .84, .26)];

// an empty paw, just its outline, for one still to earn
function drawPawSlot(x, y, color=rgb(1, 1, 1, .3))
{
    const on = (i, r)=> PAW[r]?.[i] == '#';
    PAW.forEach((row, r)=> [...row].forEach((cell, i)=> cell == '#' &&
        !(on(i - 1, r) && on(i + 1, r) && on(i, r - 1) && on(i, r + 1)) && rect(x - 6 + i, y - 6 + r, 1, 1, color)));
}

// the table: a row a team, with your row picked out and this round's opponent's pulsing; a column a team, a paw for
// a win and a cross for a loss; and each team's record
const TABLE = {top: 58, row: 20, name: 52, cell: 196, column: 22, record: 350};
function drawTable(final)
{
    // during the cup each team has a chip of its jersey colour at the start of its row, and the same over its column,
    // to match them up by; numbers there would read as places, which only the final table, in order, has
    const order = final ? standings() : SQUADS.map((_, i)=> i), next = opponent();
    const chip = (x, y, team)=>
    {
        rect(x - 5, y - 4, 10, 8, rgb(0, 0, 0, .5));
        rect(x - 4, y - 3, 8, 6, hex(SQUADS[team].jersey));
    };
    if (!final)
        order.forEach((team)=> chip(TABLE.cell + team*TABLE.column, 46, team));
    order.forEach((team, row)=>
    {
        const y = TABLE.top + row*TABLE.row;
        const shade = team == 0 ? rgb(.3, .5, 1, .35) : team == next && !final ? rgb(1, 1, 1, .12 + .1*Math.sin(time*6)) :
            rgb(.1, .08, .2, .45);
        rect(8, y - 9, SCREEN_SIZE.x - 16, 18, shade);
        rect(8, y - 9, 3, 18, hex(SQUADS[team].jersey));
        drawStanding(team, SQUADS[team].captain, 34, y + 7);
        if (final)
            return;
        chip(18, y, team);
        for (let other = 0; other < SQUADS.length; ++other)
        {
            const x = TABLE.cell + other*TABLE.column, r = result(team, other);
            if (other == team)
                rect(x - 4, y, 9, 1, rgb(1, 1, 1, .3));
            else if (r)
            {
                const won = r.scored > r.against;
                rect(x - 10, y - 8, 20, 16, (won ? COLOR_WIN : COLOR_LOSS).scale(1, .2));
                const paws = pawsOf(r.scored, r.against);
                won ? drawPaw(x, y, PAW_COLORS[paws]) : drawCross(x, y, COLOR_LOSS);
                if (paws == 3 && (time*1.5 + team*.37 + other*.61) % 1 < .3)
                {
                    rect(x + 6, y - 8, 1, 3, WHITE);
                    rect(x + 5, y - 7, 3, 1, WHITE);
                }
            }
        }
    });
}

// the choice of cups: a card for each, with a little picture of where and when it's played, the cups of it you've
// won, and a padlock on one that isn't open yet
const CARD = {y: 44, w: 150, h: 120}, CARDS = [{x: 36}, {x: 198}];
function drawCup(index)
{
    const {x} = CARDS[index], open = unlocked(index), night = CUPS[index].night, won = trophies[CUPS[index].id] || 0;
    rect(x - 2, CARD.y - 2, CARD.w + 4, CARD.h + 4, index == chosen ? COLOR_GOLD.scale(1, .6 + .4*Math.sin(time*6)) :
        rgb(1, 1, 1, .15));
    rect(x, CARD.y, CARD.w, CARD.h, COLOR_PANEL);

    // its picture: the sky, the sun or the moon and stars, the city, and the grass
    for (let y = 0; y < 44; y += 2)
        rect(x + 8, CARD.y + 20 + y, CARD.w - 16, 2, (night ? hex('#0e1236').lerp(hex('#33305e'), y/44) :
            hex('#6fb8ec').lerp(hex('#d2effc'), y/44)));
    if (night)
        for (let i = 0; i < 12; ++i)
            rect(x + 12 + (i*37 % 126), CARD.y + 23 + (i*13 % 22), 1, 1, WHITE);
    ellipse(x + CARD.w - 30, CARD.y + 32, night ? 10 : 14, night ? 10 : 14, hex(night ? '#f2eed8' : '#fffbe0'));
    if (CUPS[index].lot)
    {
        // the city's street close up, with its windows lit, a light on its pole, and the parking lot in front
        for (let i = 0; i < 6; ++i)
        {
            const h = 18 + (i*11 % 15), bx = x + 8 + i*22;
            rect(bx, CARD.y + 64 - h, 21, h, hex(['#4a2a2a', '#3a3446', '#2e3650'][i % 3]));
            rect(bx, CARD.y + 64 - h, 21, 1, hex('#6a5a6a'));
            for (let wy = CARD.y + 68 - h; wy < CARD.y + 58; wy += 5)
                for (let wx = bx + 3; wx < bx + 19; wx += 5)
                    (wx*3 + wy*7) % 4 == 0 && rect(wx, wy, 2, 2, COLOR_LAMP);
        }
        rect(x + 8, CARD.y + 64, CARD.w - 16, 8, hex('#4a4e57'));
        for (let sx = x + 12; sx < x + CARD.w - 10; sx += 10)
            rect(sx, CARD.y + 66, 1, 6, rgb(1, .86, .3, .45));
        rect(x + 40, CARD.y + 38, 1, 26, hex('#6a6e7a'));
        rect(x + 35, CARD.y + 38, 11, 1, hex('#6a6e7a'));
        drawEllipseGradient(toWorld(vec2(x + 40, CARD.y + 40)), vec2(30, 18), rgb(1, .86, .62, .5), rgb(1, .86, .62, 0));
        rect(x + 34, CARD.y + 39, 4, 1, rgb(1, .86, .62));
        rect(x + 43, CARD.y + 39, 4, 1, rgb(1, .86, .62));
    }
    else
    {
        for (let i = 0; i < 9; ++i)
        {
            const h = 10 + (i*17 % 18);
            rect(x + 8 + i*15, CARD.y + 64 - h, 13, h, night ? hex('#2a2d55') : hex('#8aa6c4'));
            if (night)
                rect(x + 12 + i*15, CARD.y + 66 - h, 2, 2, COLOR_LAMP);
        }
        rect(x + 8, CARD.y + 64, CARD.w - 16, 8, night ? hex('#3f7a3a') : COLOR_LAWN);
    }
    for (let i = 0; i < min(won, 8); ++i)
        drawMiniTrophy(x + CARD.w/2 - (min(won, 8) - 1)*5 + i*10, CARD.y + 86);

    // the paws you've got of the cup's, gold once you've got them all; the number goes on with the words
    const paws = pawTotal(index), most = pawMost(index);
    if (open && paws)
        drawPaw(x + CARD.w/2 - 22, CARD.y + 106, PAW_COLORS[paws == most ? 3 : paws*3 >= most*2 ? 2 : 1]);

    // a cup that isn't open yet is dim, behind a padlock
    if (!open)
    {
        rect(x, CARD.y, CARD.w, CARD.h, rgb(.06, .05, .14, .6));
        rect(x + CARD.w/2 - 6, CARD.y + 40, 12, 9, COLOR_GOLD_DARK);
        rect(x + CARD.w/2 - 4, CARD.y + 33, 2, 7, COLOR_GOLD_DARK);
        rect(x + CARD.w/2 + 2, CARD.y + 33, 2, 7, COLOR_GOLD_DARK);
        rect(x + CARD.w/2 - 4, CARD.y + 32, 8, 2, COLOR_GOLD_DARK);
    }
}

function drawCupScreen()
{
    rect(0, 0, SCREEN_SIZE.x, SCREEN_SIZE.y, rgb(.06, .05, .14, mode == 'champions' ? .25 : .55));
    if (mode == 'title')
        CARDS.forEach((_, index)=> drawCup(index));
    else if (mode == 'champions')
    {
        // fireworks in the sky, and the winners on a stage, hopping, their star up on a block in the middle holding
        // the trophy over its head: if it's you, the goodest pup of the cup, and if not, their captain
        for (const spark of fireworks)
        {
            const p = spark.time/spark.life;
            rect(Math.round(spark.pos.x), Math.round(spark.pos.y), p < .7 ? 2 : 1, p < .7 ? 2 : 1, spark.color.scale(1, 1 - p*p));
        }
        rect(60, 150, 264, 4, hex('#a8754a'));
        rect(64, 154, 256, 16, hex('#6a4430'));
        rect(168, 136, 48, 4, hex('#c08a58'));
        rect(170, 140, 44, 10, hex('#8a5a3c'));
        const champ = standings()[0], star = champ ? SQUADS[champ].captain : cupPup();
        const others = roster(champ ? 'them' : 'us').filter((name)=> name != star);
        others.forEach((name, i)=>
        {
            const hop = Math.round(Math.abs(Math.sin(time*7 + i*1.3))*5);
            drawStanding(champ, name, i % 2 ? 234 + (i >> 1)*34 : 150 - (i >> 1)*34, 150 - hop, i % 2 == 1);
        });
        const lift = Math.round(Math.abs(Math.sin(time*4))*3);
        drawStanding(champ, star, 192, 136 - lift);
        drawTrophy(192, 136 - KINDS[star].height + 3 - lift);
        drawConfetti();

        // and if it isn't you, where you came, with a medal for second or third
        const place = standings().indexOf(0) + 1;
        if (champ && place <= 3)
            drawMedal(96, 179, place);
    }
    else if (mode == 'table')
        drawTable(false);
    else if (mode == 'final')
    {
        drawTable(true);
        if (standings()[0] == 0)
            drawTrophy(330, 140);
    }
    else if (mode == 'matchup')
    {
        const them = opponent();
        for (const [team, x] of [[0, 8], [them, 208]])
        {
            rect(x, 26, 168, 92, rgb(.1, .08, .2, .7));
            rect(x, 26, 168, 2, hex(SQUADS[team].jersey));
            // the biggest stand in the middle, so the little ones are by the edges
            const names = roster(team ? 'them' : 'us').sort((a, b)=> KINDS[b].width - KINDS[a].width);
            const gap = names.length > 5 ? 26 : 31, odd = names.length % 2;
            const offset = (i)=> odd ? (i % 2 ? -1 : 1)*Math.ceil(i/2) : (i % 2 ? 1 : -1)*(Math.floor(i/2) + .5);
            names.forEach((name, i)=> drawStanding(team, name, x + 84 + Math.round(offset(i)*gap), 96, team != 0));
        }

        // how the two teams rate, side by side: yours growing left, theirs right
        const ours = ratings(0), theirs = ratings(them);
        Object.keys(ours).forEach((stat, i)=>
        {
            const y = 132 + i*14;
            rect(14, y - 4, 140, 8, rgb(0, 0, 0, .3));
            rect(230, y - 4, 140, 8, rgb(0, 0, 0, .3));
            rect(154 - Math.round(140*ours[stat]), y - 4, Math.round(140*ours[stat]), 8, hex(SQUADS[0].jersey));
            rect(230, y - 4, Math.round(140*theirs[stat]), 8, hex(SQUADS[them].jersey));
        });
    }
}

function drawCupText(text)
{
    const blink = (time*2 % 2) < 1.4 ? COLOR_HINT : COLOR_DIM;
    const left = (string, x, y, color=COLOR_TEXT)=> engineImageFont.drawTextScreen(string, vec2(x + 4, y), 8, false, color,
        false);
    if (mode == 'title')
    {
        text('DISC DOGS', 192, 20, COLOR_HINT, 16);
        text('EVERY THROW SHIFTS YOU INTO ANOTHER DOG', 192, 35, COLOR_TEXT);
        CARDS.forEach(({x}, index)=>
        {
            const won = trophies[CUPS[index].id] || 0;
            text(CUPS[index].name, x + CARD.w/2, CARD.y + 10, unlocked(index) ? COLOR_HINT : COLOR_DIM);
            const paws = pawTotal(index);
            if (unlocked(index) && paws)
                text(`${paws}/${pawMost(index)}`, x + CARD.w/2 + 9, CARD.y + 106, paws == pawMost(index) ? COLOR_GOLD :
                    COLOR_TEXT);
            else
                text(!unlocked(index) ? 'WIN THE PARK CUP' : won ? `WON ${won}` : CUPS[index].night ?
                    'AT NIGHT, 6 A SIDE' : 'FIVE CAT TEAMS', x + CARD.w/2, CARD.y + 106,
                    unlocked(index) ? COLOR_TEXT : COLOR_DIM);
        });
        if (newcomer())
            text({touch: 'TAP TO PLAY', mouse: 'CLICK TO PLAY', keys: 'PRESS SPACE TO PLAY'}[inputKind], 192, 190, blink);
        else
        {
            text('TAP A CUP TO PLAY IT', 192, 186, blink);
            text('MOST WINS TAKES THE CUP', 192, 198, COLOR_DIM);
        }
    }
    else if (mode == 'champions')
    {
        const champ = standings()[0], star = cupPup(), place = standings().indexOf(0) + 1;
        const color = (champ ? hex(SQUADS[champ].jersey) : COLOR_GOLD).lerp(WHITE, .3 + .3*Math.sin(time*6));
        text('CHAMPIONS!', 192, 18, color, 16);
        text(`THE ${SQUADS[champ].name} WIN ${CUP_NAME}`, 192, 34, COLOR_HINT);
        if (champ)
        {
            // you didn't win it, but you get your place, and your goodest pup
            text(`YOU FINISHED ${ordinal(place)}`, 192, 179, place <= 3 ? COLOR_HINT : COLOR_TEXT);
            text(`GOODEST PUP: ${DOG_NAMES[star]}`, 192, 190, COLOR_DIM);
        }
        else
        {
            text('GOODEST PUP OF THE CUP', 192, 178, COLOR_GOLD);
            text(`${DOG_NAMES[star]}${cup.pups[star] ? ': ' + didLine(cup.pups[star]) : ''}`, 192, 189);
        }
        text('TAP TO SEE THE TABLE', 192, 203, blink);
    }
    else if (mode == 'table' || mode == 'final')
    {
        const final = mode == 'final', place = standings().indexOf(0) + 1;
        text(final ? place == 1 ? 'CHAMPIONS!' : `YOU FINISHED ${ordinal(place)}` : CUP_NAME, 192, 16,
            final && place == 1 ? COLOR_GOLD : COLOR_HINT, 16);
        text(final ? 'FINAL TABLE' : `ROUND ${cup.round + 1} OF ${ROUNDS.length}`, 192, 33, COLOR_DIM);
        if (!final)
        {
            text('W-L', TABLE.record, 46, COLOR_DIM);
        }
        (final ? standings() : SQUADS.map((_, i)=> i)).forEach((team, row)=>
        {
            const y = TABLE.top + row*TABLE.row, record = recordOf(team);
            final && left(`${row + 1}`, 14, y, COLOR_DIM);
            left(SQUADS[team].name, TABLE.name, y, team == 0 ? hex('#9cc8ff') : COLOR_TEXT);
            text(`${record.won}-${record.lost}`, final ? 220 : TABLE.record, y);
            if (final)
                text(`${record.diff > 0 ? '+' : ''}${record.diff}`, 262, y, COLOR_DIM);
        });
        text(final ? 'TAP TO CHOOSE A CUP' : `TAP TO PLAY THE ${SQUADS[opponent()].name}`, 192, 196, blink);
    }
    else if (mode == 'matchup')
    {
        const them = opponent();
        text(`${CUP_NAME}: ROUND ${cup.round + 1}, ${daylight().name}`, 192, 12, COLOR_DIM);
        for (const [team, x] of [[0, 92], [them, 292]])
        {
            const record = recordOf(team);
            text(SQUADS[team].name, x, 38, team ? hex(SQUADS[team].jersey).lerp(WHITE, .4) : hex('#9cc8ff'));
            text(`${record.won}-${record.lost}`, x, 50, COLOR_DIM);
            text(SQUADS[team].ways, x, 110, COLOR_DIM);
        }
        text('VS', 192, 64, COLOR_GOLD, 16);
        ['SPEED', 'LEAP', 'ARM', 'DEFENSE'].forEach((stat, i)=> text(stat, 192, 132 + i*14, COLOR_DIM));
        text('TAP TO PLAY', 192, 196, blink);
    }
}
