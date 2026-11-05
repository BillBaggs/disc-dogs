// Disc Dogs: the music and the voices - a bouncy tune for the matches and an easy-going one for the cup's screens,
// each written out below as notes for a few little instruments and mixed into one looping track when the game
// starts, so it plays without a hitch; the match tune hurries along in the last ten seconds and in the zoomies. The
// dogs' barks and the cats' meows, cut from real recordings. And the speaker in the corner, to turn all the sound
// off and on

'use strict';

// the instruments, as zzfx sounds at the pitch a note of 0 plays: a plucky lead, a soft round lead, a bass, and
// the drums
const INSTRUMENTS =
{
    pluck: [.35, 0, 523.25, .005, .05, .14, 1, 1.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, .7, .04],
    flute: [.3, 0, 523.25, .03, .16, .3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .8, .05],
    bass:  [.55, 0, 65.41, .005, .07, .09, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, .8, .03],
    kick:  [.6, 0, 150, 0, .02, .12, 0, 1, -16],
    snare: [.22, 0, 900, 0, .02, .1, 4, 1, 0, 0, 0, 0, 0, 2],
    hat:   [.1, 0, 3200, 0, .004, .03, 4, 1],
};

// the tunes: how fast, then each part's notes, a step a sixteenth of a bar, in semitones above its instrument's
// pitch, with a dot a rest; the drums play wherever there's an x. Every part is as long as the tune
const _ = '.';
const bars = (...list)=> list.flat();
const TUNES =
{
    // C, A minor, F, G, twice over, with a melody that bounces about on top
    match: {bpm: 132, parts: [
        {instrument: 'pluck', volume: .8, notes: bars(
            [4, _, 7, _, 4, _, 0, _, 2, _, 4, _, _, _, _, _],
            [0, _, -3, _, 0, _, 4, _, 2, _, 0, _, _, _, _, _],
            [-3, _, 0, _, 5, _, 4, _, 2, _, 0, _, -3, _, _, _],
            [-5, _, -1, _, 2, _, _, _, 7, _, 5, _, 2, _, -1, _],
            [4, _, 7, _, 4, _, 0, _, 2, _, 4, _, 7, _, _, _],
            [9, _, 7, _, 4, _, 0, _, 2, _, 4, _, _, _, _, _],
            [5, _, 4, _, 2, _, 0, _, -3, _, 0, _, 2, _, _, _],
            [-1, _, 2, _, 7, _, 5, _, 2, _, -1, _, 0, _, _, _])},
        {instrument: 'bass', volume: 1, notes: bars(...[0, 9, 5, 7, 0, 9, 5, 7].map((root)=>
            [root, _, root + 12, _, root + 7, _, root + 12, _, root, _, root + 12, _, root + 7, _, root + 12, _]))},
        {instrument: 'kick', volume: 1, notes: bars(...Array(8).fill(['x', _, _, _, _, _, _, _, 'x', _, 'x', _, _, _, _, _]))},
        {instrument: 'snare', volume: 1, notes: bars(...Array(8).fill([_, _, _, _, 'x', _, _, _, _, _, _, _, 'x', _, _, _]))},
        {instrument: 'hat', volume: 1, notes: bars(...Array(8).fill([_, _, 'x', _, _, _, 'x', _, _, _, 'x', _, _, _, 'x', 'x']))},
    ]},

    // a stroll round the park: C, E minor, F, C, then F, G, C, G
    cup: {bpm: 96, parts: [
        {instrument: 'flute', volume: .8, notes: bars(
            [0, _, _, _, 4, _, _, _, 7, _, _, _, 4, _, _, _],
            [2, _, _, _, -1, _, _, _, -5, _, _, _, _, _, _, _],
            [-3, _, _, _, 0, _, _, _, 5, _, _, _, 4, _, 2, _],
            [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [5, _, _, _, 4, _, _, _, 2, _, _, _, 0, _, _, _],
            [2, _, _, _, -1, _, _, _, -5, _, _, _, -1, _, 2, _],
            [4, _, _, _, 0, _, _, _, 7, _, _, _, 4, _, _, _],
            [2, _, _, _, _, _, _, _, -1, _, _, _, _, _, _, _])},
        {instrument: 'bass', volume: .8, notes: bars(...[12, 16, 17, 12, 17, 19, 12, 19].map((root)=>
            [root, _, _, _, _, _, _, _, root + 7, _, _, _, _, _, _, _]))},
        {instrument: 'hat', volume: .7, notes: bars(...Array(8).fill([_, _, _, _, 'x', _, _, _, _, _, _, _, 'x', _, _, _]))},
    ]},
};

// how loud the music is under everything else, how much faster the match tune goes at the end, and how loud all
// the sound is when it's on
const MUSIC_VOLUME = .45, HURRY = 1.12, SOUND_ON = soundVolume;

// a tune mixed into one track: each part's notes made once a pitch and laid in where they fall, a note running past
// the end wrapping round to the start, so it loops without a seam
function makeTune({bpm, parts})
{
    const step = 60/bpm/4, steps = parts[0].notes.length;
    const samples = new Float32Array(Math.round(steps*step*audioDefaultSampleRate)), made = new Map;
    for (const {instrument, volume, notes} of parts)
        notes.forEach((note, i)=>
        {
            if (note == _)
                return;
            const key = instrument + note;
            if (!made.has(key))
            {
                const sound = INSTRUMENTS[instrument].slice();
                if (note != 'x')
                    sound[2] *= 2**(note/12);
                made.set(key, zzfxG(...sound));
            }
            const start = Math.round(i*step*audioDefaultSampleRate);
            made.get(key).forEach((sample, j)=> samples[(start + j) % samples.length] += sample*volume);
        });
    const peak = samples.reduce((top, sample)=> max(top, Math.abs(sample)), 0);
    if (peak > 1)
        samples.forEach((sample, i)=> samples[i] = sample/peak);
    const tune = new Sound;
    tune.sampleChannels = [samples];
    tune.buildSampleBuffer?.();
    tune.loadedPercent = 1;
    return tune;
}

let tunes, music, musicTune, musicFast, musicQuiet = false, muted = false;
function makeMusic()
{
    tunes = {match: makeTune(TUNES.match), cup: makeTune(TUNES.cup)};
    try { muted = localStorage.getItem('zoomies-muted') == '1'; }
    catch(e) {}
    setSoundVolume(muted ? 0 : SOUND_ON);
}

// the match tune during a match and the cup's tune on its screens, swapping over with a quick fade; the match tune
// hurries in the last ten seconds, and goes quiet while the match is paused
function updateMusic()
{
    const tune = inMatch() && mode != 'over' ? tunes.match : tunes.cup;
    if (tune != musicTune)
    {
        music?.stop(.3);
        music = tune.playMusic(MUSIC_VOLUME);
        musicTune = tune;
        musicFast = musicQuiet = false;
    }
    if (music && matchPaused != musicQuiet)
    {
        musicQuiet = matchPaused;
        music.setVolume(MUSIC_VOLUME*(musicQuiet ? .3 : 1), .2);
    }
    const fast = mode == 'play' && (clock <= 10 || powered('us') || powered('them'));
    if (music && fast != musicFast)
    {
        musicFast = fast;
        music.rate = fast ? HURRY : 1;
        if (music.source)
            music.source.playbackRate.value = music.rate;
    }
}

// the speaker in the top left corner: a tap on it, or M, turns all the sound off or on, and it's remembered
function updateMute()
{
    const tap = presses.find(({pos})=> pos.x < 20 && pos.y < 12);
    if (!tap && !keyWasPressed('KeyM'))
        return;
    presses = presses.filter((press)=> press != tap);
    muted = !muted;
    setSoundVolume(muted ? 0 : SOUND_ON);
    try { localStorage.setItem('zoomies-muted', muted ? '1' : '0'); }
    catch(e) {}
}

const SPEAKER = ['...#', '..##', '####', '####', '####', '..##', '...#'], COLOR_MUTED = rgb(1, .45, .4);
function drawSpeaker()
{
    const left = Math.round(view), color = rgb(1, 1, 1, .7);
    SPEAKER.forEach((row, r)=> [...row].forEach((cell, i)=> cell == '#' && rect(left + 5 + i, 4 + r, 1, 1, color)));
    if (muted)
        for (let i = 0; i < 5; ++i)
        {
            rect(left + 11 + i, 5 + i, 1, 1, COLOR_MUTED);
            rect(left + 15 - i, 5 + i, 1, 1, COLOR_MUTED);
        }
    else
    {
        rect(left + 11, 6, 1, 3, color);
        rect(left + 13, 5, 1, 5, color);
    }
}

///////////////////////////////////////////////////////////////////////////////
// the voices: real barks and meows (CC0, from BigSoundBank, see art/sounds), recordings of a few each, cut into single
// ones once they've loaded, wherever the sound dies away in between; until then, or if they don't load, the made up
// ones play

const barks = [], meows = [];
function cutVoices(recording, into)
{
    const samples = recording.sampleChannels?.[0], rate = recording.sampleRate;
    if (!samples)
        return;

    // how loud it is, ten milliseconds at a time
    const hop = Math.round(rate*.01), loud = [];
    for (let i = 0; i < samples.length; i += hop)
    {
        let top = 0;
        for (let j = i; j < min(i + hop, samples.length); ++j)
            top = max(top, Math.abs(samples[j]));
        loud.push(top);
    }

    // the loud stretches, joined across gaps shorter than eighty milliseconds, and long enough to be a bark or meow
    const threshold = loud.reduce((a, b)=> max(a, b))*.15, runs = [];
    let start = -1, quiet = 0;
    loud.forEach((level, i)=>
    {
        if (level > threshold)
        {
            start < 0 && (start = i);
            quiet = 0;
        }
        else if (start >= 0 && ++quiet > 8)
        {
            runs.push([start, i - quiet]);
            start = -1;
        }
    });
    start >= 0 && runs.push([start, loud.length - 1]);

    // each cut a little wide, faded in and out, and as loud as the others
    for (const [from, to] of runs.filter(([from, to])=> to - from >= 8))
    {
        const cut = samples.slice(max(0, (from - 2)*hop), min(samples.length, (to + 6)*hop)), fade = hop;
        const peak = cut.reduce((a, b)=> max(a, Math.abs(b)), 0);
        cut.forEach((sample, i)=> cut[i] = sample/peak*.9*min(1, i/fade, (cut.length - 1 - i)/(fade*4)));
        const voice = new Sound;
        voice.sampleRate = rate;
        voice.sampleChannels = [cut];
        voice.buildSampleBuffer?.();
        voice.loadedPercent = 1;
        into.push(voice);
    }
}
new Sound('art/sounds/0112.mp3', 0, 0, undefined, (recording)=> cutVoices(recording, barks));
new Sound('art/sounds/0098.mp3', 0, 0, undefined, (recording)=> cutVoices(recording, meows));
new Sound('art/sounds/0494.mp3', 0, 0, undefined, (recording)=> cutVoices(recording, meows));

// a dog barks or a cat meows, in its own voice: little dogs yip higher and big ones boom lower, and each cat's a
// little different
function barkOrMeow(kind, volume)
{
    const voices = kind.cat ? meows : barks;
    if (!voices.length)
    {
        (kind.cat ? sound_meow : sound_bark).play(undefined, volume*.8, kind.voice*rand(.95, 1.05));
        return;
    }
    const pitch = kind.cat ? 1 + (kind.voice - 1)*.5 : clamp(kind.voice, .75, 1.45);
    voices[randInt(voices.length)].play(undefined, volume, pitch*rand(.96, 1.04));
}

// the crowd's applause (CC0, from BigSoundBank, see art/sounds): a recording of a small crowd clapping, cut once it's
// loaded into short bursts and longer ones from different parts of it, each faded out, and the whole of it for the
// end of a cup, all as loud as each other
const applauseCuts = {short: [], long: [], whole: undefined};
function cutApplause(recording)
{
    const channels = recording.sampleChannels, rate = recording.sampleRate;
    if (!channels)
        return;
    const peak = channels.reduce((top, channel)=> channel.reduce((a, b)=> max(a, Math.abs(b)), top), 0);
    const length = channels[0].length/rate;
    const cut = (from, seconds)=>
    {
        const start = Math.round(from*rate), pieces = channels.map((channel)=> channel.slice(start, start +
            Math.round(seconds*rate)));
        const fadeIn = rate*.04, fadeOut = rate*min(.8, seconds*.4);
        for (const piece of pieces)
            piece.forEach((sample, i)=> piece[i] = sample/peak*.9*min(1, i/fadeIn, (piece.length - i)/fadeOut));
        const sound = new Sound;
        sound.sampleRate = rate;
        sound.sampleChannels = pieces;
        sound.buildSampleBuffer?.();
        sound.loadedPercent = 1;
        return sound;
    };
    applauseCuts.short = [1, 3, 5, 7].filter((from)=> from + 1.6 < length).map((from)=> cut(from, 1.6));
    applauseCuts.long = [.5, 3.5, 6].filter((from)=> from + 3 < length).map((from)=> cut(from, 3));
    applauseCuts.whole = cut(0, length);
}
new Sound('art/sounds/0815.mp3', 0, 0, undefined, cutApplause);
