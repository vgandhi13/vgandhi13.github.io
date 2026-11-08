---
title: Neural Language Models
description: Language modelling and recurrent neural networks.
date: 2026-11-08
updated: 2026-11-08
---

Language modelling is the task of predicting what word comes next.

For example: “My name is ____”.

More formally, given a sequence of words $x_1, x_2, \ldots, x_t$, compute the probability distribution of the next word $x_{t+1}$:

$$
P(x_{t+1} \mid x_1, \ldots, x_t).
$$

A system that does this is called a **language model**.

## Recurrent Neural Networks

In a feedforward network (FFN), information moves from the input (pink) through hidden layers (green) to the output (blue). It has no carried state, so processing a new input does not automatically use information from previous inputs. For example, it can predict the next word from a fixed window of words supplied as input, but it cannot remember earlier words outside that window unless they are explicitly included in its input.

A recurrent neural network (RNN) processes a sequence one item at a time. Each step uses both the current input and a hidden state from the previous step. The hidden state is a vector of numbers that represents the RNN's internal memory at a particular step. It's called hidden because it is an internal representation rather than the input or the final prediction.

<figure class="narrow" style="max-width: min(25rem, 100%); margin-inline: auto;">
  <img src="/images/notes/feedforward-vs-recurrent.png" alt="A feedforward network with input, hidden, and output layers beside an RNN unrolled over three time steps, with hidden states connected from left to right." />
  <figcaption>Read the right diagram from left to right as time passing. The three green boxes represent the same computation reused at three time steps, with the same learned weights. Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 3 (UMass Amherst, Fall 2026).</figcaption>
</figure>

We can process the sequence of input vectors $x_t$ (the red boxes) by applying a recurrence formula at every time step:

<figure class="narrow" style="max-width: min(25rem, 100%); margin-inline: auto;">
  <img src="/images/notes/rnn-recurrence.jpg" alt="RNN recurrence: the new hidden state h_t is f_W applied to the previous hidden state h_{t-1} and the current input vector x_t. W denotes the function's parameters." />
  <figcaption>The hidden state is updated using the previous state and the current input. Source: CS646: Information Retrieval, Neural Language Models lecture slides (UMass Amherst, Fall 2026).</figcaption>
</figure>

We can unroll this recurrence to follow the hidden state while reading “the cat sat”:

<style>
.rnn-demo { --rnn-input: #f7dddd; --rnn-input-border: #bd7777; }
:root[data-theme='dark'] .rnn-demo { --rnn-input: #492e34; --rnn-input-border: #d7959d; }
.rnn-demo svg { display: block; width: 100%; height: auto; color: var(--text); }
.rnn-demo text { fill: currentColor; font: 22px system-ui, sans-serif; text-anchor: middle; }
.rnn-demo .rnn-small { font-size: 18px; }
.rnn-demo .rnn-state { fill: var(--diagram-green); stroke: var(--diagram-green-border); }
.rnn-demo .rnn-function { fill: var(--surface); stroke: var(--border); }
.rnn-demo .rnn-input { fill: var(--rnn-input); stroke: var(--rnn-input-border); }
.rnn-demo .rnn-arrow { fill: none; stroke: currentColor; stroke-width: 1.5; marker-end: url(#rnn-arrowhead); }
.rnn-demo .rnn-controls { display: flex; justify-content: center; gap: .6rem; margin: .75rem 0; }
.rnn-demo .rnn-controls[hidden], .rnn-demo button[hidden] { display: none; }
.rnn-demo button { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 5px; padding: .3rem .8rem; cursor: pointer; }
.rnn-demo button:focus-visible { outline: 2px solid var(--link); outline-offset: 3px; }
.rnn-demo.is-playing .rnn-step { animation: rnn-reveal .7s both; animation-delay: calc(var(--i) * 2.5s + .4s); }
.rnn-demo.is-paused .rnn-step { animation-play-state: paused; }
@keyframes rnn-reveal { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .rnn-demo.is-playing .rnn-step { animation: none; } }
</style>

<figure class="narrow rnn-demo" id="rnn-unrolling">
  <svg viewBox="0 0 620 245" role="img" aria-labelledby="rnn-title rnn-desc">
    <title id="rnn-title">Unrolling an RNN for “the cat sat”</title>
    <desc id="rnn-desc">Starting with h zero, process the word the to produce h one, then cat with h one to produce h two, then sat with h two to produce h three. Every step reuses the same function f W and the same parameters W.</desc>
    <defs><marker id="rnn-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
    <rect class="rnn-state" x="4" y="48" width="52" height="65" rx="4" />
    <text x="30" y="89">h₀</text>
    <text class="rnn-small" x="30" y="31">start</text>
    <g class="rnn-step" style="--i: 0">
      <path class="rnn-arrow" d="M 56 80 H 86" />
      <rect class="rnn-function" x="89" y="53" width="60" height="55" rx="4" />
      <text x="119" y="88">f<tspan baseline-shift="sub" font-size="15">W</tspan></text>
      <path class="rnn-arrow" d="M 149 80 H 185" />
      <rect class="rnn-state" x="188" y="48" width="52" height="65" rx="4" />
      <text x="214" y="89">h₁</text>
      <text class="rnn-small" x="214" y="31">step 1</text>
      <path class="rnn-arrow" d="M 119 164 V 112" />
      <rect class="rnn-input" x="84" y="167" width="70" height="48" rx="4" />
      <text x="119" y="198">the</text>
      <text class="rnn-small" x="119" y="239">x₁</text>
    </g>
    <g class="rnn-step" style="--i: 1">
      <path class="rnn-arrow" d="M 240 80 H 270" />
      <rect class="rnn-function" x="273" y="53" width="60" height="55" rx="4" />
      <text x="303" y="88">f<tspan baseline-shift="sub" font-size="15">W</tspan></text>
      <path class="rnn-arrow" d="M 333 80 H 369" />
      <rect class="rnn-state" x="372" y="48" width="52" height="65" rx="4" />
      <text x="398" y="89">h₂</text>
      <text class="rnn-small" x="398" y="31">step 2</text>
      <path class="rnn-arrow" d="M 303 164 V 112" />
      <rect class="rnn-input" x="268" y="167" width="70" height="48" rx="4" />
      <text x="303" y="198">cat</text>
      <text class="rnn-small" x="303" y="239">x₂</text>
    </g>
    <g class="rnn-step" style="--i: 2">
      <path class="rnn-arrow" d="M 424 80 H 454" />
      <rect class="rnn-function" x="457" y="53" width="60" height="55" rx="4" />
      <text x="487" y="88">f<tspan baseline-shift="sub" font-size="15">W</tspan></text>
      <path class="rnn-arrow" d="M 517 80 H 553" />
      <rect class="rnn-state" x="556" y="48" width="52" height="65" rx="4" />
      <text x="582" y="89">h₃</text>
      <text class="rnn-small" x="582" y="31">step 3</text>
      <path class="rnn-arrow" d="M 487 164 V 112" />
      <rect class="rnn-input" x="452" y="167" width="70" height="48" rx="4" />
      <text x="487" y="198">sat</text>
      <text class="rnn-small" x="487" y="239">x₃</text>
    </g>
  </svg>
  <div class="rnn-controls" hidden>
    <button type="button" data-rnn-pause aria-pressed="false">Pause</button>
    <button type="button" data-rnn-replay>Replay</button>
  </div>
  <figcaption>
    At each step:
    <ul>
      <li>After “the”, the hidden state contains information from “the”.</li>
      <li>After “cat”, it is updated using “cat” and the previous state.</li>
      <li>After “sat”, it contains a compressed representation of the sequence so far.</li>
    </ul>
    Adapted from Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slides 5–7 (UMass Amherst, Fall 2026).
  </figcaption>
</figure>

<script>
(() => {
  const demo = document.getElementById('rnn-unrolling');
  if (!demo) return;
  const controls = demo.querySelector('.rnn-controls');
  const pause = demo.querySelector('[data-rnn-pause]');
  const replay = demo.querySelector('[data-rnn-replay]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const resetPause = () => {
    demo.classList.remove('is-paused');
    pause.textContent = 'Pause';
    pause.setAttribute('aria-pressed', 'false');
  };
  const play = () => {
    resetPause();
    demo.classList.remove('is-playing');
    void demo.offsetWidth;
    if (!motion.matches) demo.classList.add('is-playing');
  };
  controls.hidden = motion.matches;
  pause.addEventListener('click', () => {
    const paused = demo.classList.toggle('is-paused');
    pause.textContent = paused ? 'Resume' : 'Pause';
    pause.setAttribute('aria-pressed', String(paused));
  });
  replay.addEventListener('click', play);
  motion.addEventListener('change', () => {
    controls.hidden = motion.matches;
    demo.classList.remove('is-playing');
    resetPause();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        play();
        observer.disconnect();
      }
    }, { threshold: .45 });
    observer.observe(demo);
  }
})();
</script>

The same function $f_W$ and set of parameters $W$ are used at every time step.

<figure class="narrow">
  <img src="/images/notes/rnn-shared-weights-slide-8.png" alt="Slide 8: an unrolled RNN with arrows from one shared weight matrix W to the repeated f_W computations at each time step." />
  <figcaption>The same weight matrix W is reused at every time step. Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 8 (UMass Amherst, Fall 2026).</figcaption>
</figure>

This is an example of a many-to-one RNN because it reads several inputs and produces one output for the whole sequence.
