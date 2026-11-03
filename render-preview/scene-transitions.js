"use strict";
// Scene-specific OBS transitions. Gracefully fall back to Fade if a type is unavailable.
var OnyxTransitions;
(function (OnyxTransitions) {
    const choices = {
        'ONYX STARTING SOON': { names: ['Fade'], duration: 1100 },
        'ONYX LIVE': { names: ['Swipe', 'Slide', 'Fade'], duration: 560 },
        'ONYX CASTERS': { names: ['Slide', 'Swipe', 'Fade'], duration: 720 },
        'ONYX INTERVIEW': { names: ['Fade'], duration: 850 },
        'ONYX CHATTING': { names: ['Slide', 'Fade'], duration: 620 },
        'ONYX BREAK': { names: ['Fade'], duration: 1250 },
        'ONYX ENDING': { names: ['Fade'], duration: 1400 },
        'ONYX GAME': { names: ['Swipe', 'Fade'], duration: 430 }
    };
    let chain = Promise.resolve();
    function take(rpc, sceneName) {
        // Serialize transition setup + take to avoid interleaved button presses.
        const task = chain.catch(() => { }).then(async () => {
            const profile = choices[sceneName] || { names: ['Fade'], duration: 650 };
            try {
                const list = await rpc('GetSceneTransitionList');
                const available = new Set((list.transitions || []).map(x => x.transitionName));
                const name = profile.names.find(n => available.has(n));
                if (name) {
                    await rpc('SetCurrentSceneTransition', { transitionName: name });
                    // Cut has no duration; all our profiles use timed transitions.
                    await rpc('SetCurrentSceneTransitionDuration', { transitionDuration: profile.duration });
                }
            }
            catch (err) {
                console.warn('ONYX: keeping existing OBS transition', err);
            }
            await rpc('SetCurrentProgramScene', { sceneName });
        });
        chain = task.catch(() => { });
        return task;
    }
    OnyxTransitions.take = take;
})(OnyxTransitions || (OnyxTransitions = {}));
