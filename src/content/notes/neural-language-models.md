---
title: Neural Language Models
description: Language modelling and recurrent neural networks.
date: 2026-11-08
updated: 2026-11-10
bibliography:
  - id: bahdanau-attention
    authors: Dzmitry Bahdanau, Kyunghyun Cho, and Yoshua Bengio
    title: Neural Machine Translation by Jointly Learning to Align and Translate
    source: arXiv preprint arXiv:1409.0473
    year: 2014
    url: https://arxiv.org/abs/1409.0473
  - id: attention-is-all-you-need
    authors: Ashish Vaswani et al.
    title: Attention Is All You Need
    source: NeurIPS
    sourcePrefix: in
    year: 2017
    url: https://arxiv.org/abs/1706.03762
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

### Kinds of RNNs

<figure class="narrow">
  <img src="/images/notes/rnn-many-to-one-slide-9.png" alt="A many-to-one RNN: inputs x_1 through x_T update hidden states using shared weights W, and the final hidden state h_T produces a single output y." />
  <figcaption>The same weight matrix W is reused at every time step, and the final hidden state produces one output y. Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 9 (UMass Amherst, Fall 2026).</figcaption>
</figure>

This is an example of a **many-to-one RNN** because it reads several inputs and produces one output for the whole sequence.

<style>
.rnn-many-row { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.3fr); align-items: center; gap: 1.5rem; margin-top: 2rem; }
.rnn-many-row > * { min-width: 0; }
.rnn-lm-prefix img { width: min(20rem, 100%); margin-inline: auto; }
.rnn-many-row figure { margin: 0; }
.rnn-many-row .rnn-many-text > :first-child { margin-top: 0; }
.rnn-many-row .rnn-many-text > :last-child { margin-bottom: 0; }
@media (max-width: 800px) { .rnn-many-row { grid-template-columns: minmax(0, 1fr); } }
</style>

<div class="rnn-many-row">
<div class="rnn-many-text">

The diagram on the right is a **many-to-many RNN**. It receives an input and makes a prediction at every step. It also shows how we combine the prediction errors to train it. Each $L_t$ measures error at one position:

$$
\begin{aligned}
L_t = -\log P(&\text{correct next word} \\
&\mid \text{words read so far}).
\end{aligned}
$$

The arrows leading to the large $L$ indicate that these errors are combined by summing or averaging. Here as well, **the same weights $W$ are reused at every step**, so errors from all positions help train that shared computation.

</div>
<figure class="narrow">
  <img src="/images/notes/rnn-many-to-many-slide-14.png" alt="A many-to-many RNN with an output y_t and loss L_t at every step. Each position's loss feeds into the total loss L, and the recurrent computations share weights W." />
  <figcaption>Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 14 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>

<div class="rnn-many-row">
<div class="rnn-many-text">

A **one-to-many RNN** uses one input to generate a sequence of outputs. Here, $x$ could be a vector representing the image, and each $y_t$ predicts a word in the caption. An example is image captioning:

$$
\begin{gathered}
\text{one image} \\
\downarrow \\
\text{“a”} \to \text{“cat”} \to \text{“sleeping”}
\end{gathered}
$$

</div>
<figure class="narrow">
  <img src="/images/notes/rnn-one-to-many-slide-15.png" alt="A one-to-many RNN: one input x initializes a sequence of recurrent computations with shared weights W, producing outputs y_1, y_2, y_3, and onward to y_T." />
  <figcaption>Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 15 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>

<div class="rnn-many-row">
<div class="rnn-many-text">

A **sequence-to-sequence RNN** reads an input sequence and then generates an output sequence. The two sentences can have different lengths. It has two stages:

1. **Encoder RNN:** Reads the input tokens ($x_1, \ldots, x_4$), which are converted to embeddings. Its hidden state updates as it reads. The final encoder state contains a compressed summary of the input.
2. **Decoder RNN:** The thick arrow passes the summary to the decoder, giving it information about what to generate. The decoder uses its first hidden state to produce $y_1$, then uses its evolving hidden state and the previously generated token to produce each subsequent output $y_i$.

An example is translation:

$$
\begin{gathered}
\underbrace{\text{“I am a student”}}_{\text{encoder reads}} \\
\downarrow \\
\underbrace{\text{“Je”} \to \text{“suis”} \to \text{“étudiant”}}_{\text{decoder generates}}
\end{gathered}
$$

</div>
<figure class="narrow">
  <svg viewBox="0 0 1065 775" role="img" aria-labelledby="seq2seq-diagram-title">
    <title id="seq2seq-diagram-title">An encoder RNN reads four embedded input tokens in the red box. A thick arrow transfers its final hidden state to the decoder RNN in the blue box, which generates three outputs y_1, y_2, and y_3.</title>
    <image href="/images/notes/rnn-sequence-to-sequence-slide-17.png" width="1065" height="775" />
    <text x="835" y="48" text-anchor="middle" fill="#243a4f" font-family="system-ui, sans-serif" font-size="32">Decoder RNN</text>
  </svg>
  <figcaption>The encoder (red) passes its final state to the decoder (blue). The encoder RNN is many-to-one as it encodes the input sequence into a single vector, whereas the decoder RNN is one-to-many as it produces an output sequence from a single input vector. Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 17 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>

<div class="rnn-many-row">
<div class="rnn-many-text">

In a **multi-layer RNN**, several RNN layers stack on top of one another. Each layer has its own hidden state and memory. This diagram has three recurrent layers (green) and an output layer (blue). A higher layer receives the current hidden state from the layer below, plus its own memory from the previous time step. For example, for input $x_2$, layer 3 combines layer 2's new hidden state at $t=2$ with its own previous hidden state from $t=1$. The two source states are marked with crosses in the diagram.

Stacking lets the model learn more complex representations through successive transformations. For example, layer 1 might learn to recognize words and local patterns, layer 2 might combine those patterns into information about what is being described, and so on. Weights are shared across time within a layer, but different layers have their own weights.

</div>
<figure class="narrow">
  <svg viewBox="0 0 530 515" role="img" aria-labelledby="multilayer-rnn-title">
    <title id="multilayer-rnn-title">Three stacked recurrent layers and a blue output layer over six time steps. Crosses mark layer 3 at time 1 and layer 2 at time 2, the two states used to update layer 3 at time 2.</title>
    <image href="/images/notes/rnn-multilayer-slide-19.png" width="530" height="515" />
    <path d="M 25 195 L 45 215 M 45 195 L 25 215 M 118 287 L 138 307 M 138 287 L 118 307" fill="none" stroke="#9b2525" stroke-width="3.5" stroke-linecap="round" />
  </svg>
  <figcaption>Layers are counted from bottom to top. The crosses mark layer 3's previous state and layer 2's current state. Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 19 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>

<div class="rnn-many-row">
<div class="rnn-many-text">

A **bidirectional RNN** processes the same sequence in both directions, so each prediction can use context from before and after a word. Each input $x_t$ goes into both RNNs. Their hidden states at that position are then combined (often by concatenating the two vectors) to compute $y_t$. For example, consider:

> “She sat by the **bank** of the river.”

At **“bank”**:

- The forward state has read **“She sat by the bank.”**
- The backward state has read **“river the of bank.”**
- Combining them helps the model recognize that “bank” refers to a riverbank.

The two directions usually have different learned weights. Within each direction, those weights are reused across all positions.

</div>
<figure class="narrow">
  <img src="/images/notes/rnn-bidirectional-slide-20.png" alt="A bidirectional RNN: each input x_t feeds a forward recurrent chain with arrows to the right and a backward recurrent chain with arrows to the left. Both hidden states feed the output y_t at that position." />
  <figcaption>Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 20 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>

### RNN Language Model

<div class="rnn-many-row rnn-lm-row rnn-lm-prefix">
<div class="rnn-many-text">

In an **RNN language model**, the embedding matrix $E$ maps each input word to a vector. The RNN uses that vector to update its hidden state. After reading the prefix, the final hidden state summarizes the words seen so far. The model uses this summary to predict the next word through a probability distribution over the vocabulary. For example, the “retrieval” bar in the diagram represents:

$$
P(\text{"retrieval"} \mid \text{"the center for information"}).
$$

Repeating this prediction at each position and multiplying the probabilities assigned to the actual next words gives the model's probability for the whole sequence:

$$
P(x_1, \ldots, x_T)
= \prod_{t=1}^{T} P(x_t \mid x_1, \ldots, x_{t-1}).
$$

Each conditional distribution is computed from the RNN hidden state summarizing the preceding words. For $t=1$, the prefix is empty.

</div>
<figure class="narrow">
  <img src="/images/notes/rnn-language-model-slide-10.png" alt="The words ‘the center for information’ pass through embedding matrix E and recurrent hidden states. The final state produces a next-word distribution over the vocabulary, including ‘retrieval’ and ‘processing’." width="550" height="725" />
  <figcaption>Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 10 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>

#### From Hidden States to Probabilities

<div class="rnn-many-row rnn-lm-row">
<div class="rnn-many-text">

The hidden state is not itself a probability distribution over words. **Unembedding** and **softmax** turn it into one:

1. A learned transformation maps the hidden vector to a score for every vocabulary word:

   $$
   z_t = Uh_t + b.
   $$

   These scores are called **logits**. They can be positive or negative and do not need to sum to one.

2. **Softmax** converts the scores into probabilities:

   $$
   p_t(v) = \frac{e^{z_t(v)}}{\sum_{u \in V} e^{z_t(u)}}.
   $$

   Here, $V$ is the vocabulary, and $p_t(v)$ is the probability that word $v$ comes next. Each probability is between zero and one, and the probabilities over the whole vocabulary sum to one.

</div>
<figure class="narrow">
  <img src="/images/notes/rnn-output-slide-11.png" alt="An RNN hidden vector is unembedded into one score per vocabulary word, then softmax converts those scores into a probability distribution over the next word." width="1190" height="540" />
  <figcaption>Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 11 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>

#### Decoding

In an **RNN encoder-decoder** setup, the encoder's final hidden state summarizes the input sentence. This vector gives the decoder its starting context for generation. Generation stops when the decoder produces `<EOS>` (the end-of-sequence token).

During training, we feed the decoder the **correct previous token**, even if its previous prediction was wrong. This is called **teacher forcing**. For example, suppose the correct output is:

> “This is an output”.

In the left diagram, the model's predictions read “This was the sentence”, but the inputs still follow the correct output. After predicting “was” instead of “is”, the decoder receives “is” as its next input.

During testing, the correct output is unknown. We feed each **predicted token** back as the next input, as shown in the right diagram. There, the decoder generates “This is a sentence”.

<div class="figure-row rnn-decoding-figures">
<div class="figure-col">
<figure class="narrow">
  <img src="/images/notes/rnn-teacher-forcing-slide-24.png" alt="Training with teacher forcing: the decoder predicts ‘This was the sentence’, while its inputs use the correct sequence ‘This is an output’, regardless of those predictions." width="680" height="315" />
  <figcaption><strong>Training: teacher forcing.</strong> Correct tokens are fed into the decoder. Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 24 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>
<div class="figure-col">
<figure class="narrow">
  <img src="/images/notes/rnn-generation-slide-23.png" alt="Test-time generation: arrows feed each predicted token back into the decoder to generate ‘This is a sentence’, ending with the EOS token." width="680" height="315" />
  <figcaption><strong>Testing: generation.</strong> Predicted tokens are fed back into the decoder. Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 23 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>
</div>

There are three main approaches to choosing the decoder's next token at test time:

1. **Greedy decoding:** Select the highest-probability token at each step.
2. **Random sampling:** Randomly select a token according to the predicted probability distribution.
3. **Beam search:** Instead of keeping only one output sequence at each time step, keep the top $K$ most probable candidate sequences. Extend those candidates and retain the top $K$ overall at the next step. The intuition is that ruling out the second-most-probable choice too early can lead to a much worse final result: decisions at earlier time steps affect the probabilities of all later tokens and therefore the probability of the whole sequence.

<style>
.rnn-decoding-methods { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; margin: 1.5rem 0; align-items: start; }
.rnn-decoding-methods figure { min-width: 0; margin: 0; }
.rnn-decoding-methods img { display: block; width: 100%; height: auto; aspect-ratio: 660 / 590; object-fit: contain; background: white; }
@media (max-width: 700px) { .rnn-decoding-methods { grid-template-columns: minmax(0, 1fr); gap: 1.5rem; } }
</style>

<div class="rnn-decoding-methods">
<figure class="narrow">
  <img src="/images/notes/rnn-greedy-slide-26.png" alt="Greedy decoding: red circles mark the highest-probability token chosen at each step, generating ‘This is a sentence’." width="735" height="500" />
  <figcaption><strong>1. Greedy decoding.</strong> Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 26 (UMass Amherst, Fall 2026).</figcaption>
</figure>
<figure class="narrow">
  <img src="/images/notes/rnn-random-sampling-slide-27.png" alt="Random sampling: blue circles mark tokens sampled from each next-token distribution, generating ‘This was a word’." width="660" height="590" />
  <figcaption><strong>2. Random sampling.</strong> Source: Negin Rahimi, CS646: Information Retrieval, Neural Language Models, slide 27 (UMass Amherst, Fall 2026).</figcaption>
</figure>
<figure class="narrow">
  <img src="/images/notes/rnn-beam-search-d2l.svg" alt="Beam search with beam size two: retain A and C, then AB and CE, then ABD and CED as candidate sequences over three steps." width="485" height="312" />
  <figcaption><strong>3. Beam search.</strong> Two candidate sequences are retained at each step. Source: <a href="https://d2l.ai/chapter_recurrent-modern/beam-search.html#fig-beam-search">Dive into Deep Learning, Fig. 10.8.3</a>.</figcaption>
</figure>
</div>

### Issues with Recurrent models

#### 1. Linear Interaction Distance

In an RNN, information travels word by word. At each word, the model updates its hidden state, a running summary of what it has read. Connecting distant words therefore requires many steps. For information from word 1 to reach word 5, it follows this chain:

$$
h_1 \rightarrow h_2 \rightarrow h_3 \rightarrow h_4 \rightarrow h_5.
$$

There is no direct connection from $h_1$ to $h_3$ in a standard RNN. Nearby words have shorter paths between them, so the architecture naturally favours local relationships. For a sentence of $n$ words, the first and last words are separated by $n-1$ recurrent transitions. The longest communication path therefore **grows linearly with sentence length**.

<style>
.rnn-issue-example { margin: 1.5rem 0; padding: 1rem 1.25rem; background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--link); border-radius: 6px; }
.rnn-issue-example > :first-child { margin-top: 0; }
.rnn-issue-example > :last-child { margin-bottom: 0; }
.rnn-issue-example .rnn-example-label { color: var(--text-muted); font-size: .85rem; margin-bottom: .65rem; }
.rnn-order-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: .75rem 0; }
.rnn-order-pair p { margin: 0; }
.rnn-order-pair small { display: block; color: var(--text-muted); margin-top: .3rem; }
@media (max-width: 600px) { .rnn-order-pair { grid-template-columns: minmax(0, 1fr); } }
</style>

<div class="rnn-issue-example">
<p class="rnn-example-label">Example: remembering a distant word</p>

“The **course**, despite the many changes to the assignments and the schedule, was useful. I enjoyed **it**.”

To interpret “it,” the model needs to retain information about “course.” That information must pass through every intervening hidden-state update, even while the model incorporates details about the assignments and schedule.

</div>

Every recurrent update incorporates another word into a **fixed-size summary**, so earlier information can be weakened or overwritten. During training, gradients also pass backwards through the chain of recurrent updates. Repeated multiplication by small derivatives can shrink those gradients, making it difficult to learn dependencies between distant words. This is the **vanishing gradient problem**.

**Word order is built into the RNN's computation.** Changing the order changes the chain of hidden states, so the same word can receive a different contextual representation.

<div class="rnn-issue-example">
<p class="rnn-example-label">Example: same words, different order</p>
<div class="rnn-order-pair">
<p>“The <strong>dog</strong> bites the <strong>man</strong>.”<small>The dog does the biting.</small></p>
<p>“The <strong>man</strong> bites the <strong>dog</strong>.”<small>The man does the biting.</small></p>
</div>

When the RNN reaches “bites,” its previous hidden state summarizes either “the dog” or “the man.” Even though the embedding of “bites” is the same, its updated hidden state can differ because the preceding context differs. The final sentence representations can therefore distinguish who bit whom. This sensitivity to order is useful; the difficulty is carrying the relevant context through a long chain.

</div>

#### 2. Lack of Parallelizability

RNNs must process word positions sequentially:

$$
h_t = f_W(h_{t-1}, x_t).
$$

To compute the current hidden state $h_t$, we need the **previous hidden state** $h_{t-1}$. GPUs are good at performing many independent calculations at once, but these dependencies prevent an RNN from computing all hidden states across a sequence in parallel. It must finish each step before starting the next.

Calculations within each step and across different sequences in a batch can still run in parallel. However, the sequential chain across word positions limits how much a GPU can speed up the model, especially for long sequences.

### Bahdanau Attention

Early sequence-to-sequence models typically used an encoder-decoder architecture with RNNs or LSTMs. In the basic setup, the encoder compressed the input into a **single fixed-length context vector**, creating a bottleneck.

For example, consider translating:

> “The **cat** that was sitting on the mat near the window **is sleeping**.”

The encoder had to compress the entire sentence into one fixed-size vector. The decoder could access the input only through this final encoder state, so important details could be lost. In particular, it could struggle to connect “cat” with “is sleeping” across the intervening words.

In 2014, **Bahdanau et al.** proposed an attention mechanism for neural machine translation. Instead of forcing the decoder to rely on one fixed context vector, attention lets it **focus on different parts of the input for each output word**. The decoder can look back at all encoder hidden states and combine them into a context vector that changes at each generation step. [[1]](#ref-bahdanau-attention)

<figure>
  <img src="/images/notes/bahdanau-attention.jpg" alt="Bahdanau attention: the encoder produces a hidden state for each input word. All encoder hidden states feed context vectors that are recomputed for successive decoder outputs." width="856" height="328" />
  <figcaption>Each decoder step receives a context vector built from all encoder hidden states. Source: <a href="https://storage.ghost.io/c/5b/7b/5b7b4b03-8aa3-41fc-90fc-c26c215e6ac1/content/images/2022/09/badhanau.png">Bahdanau Attention Overview diagram</a>.</figcaption>
</figure>

## Transformers

### Self-Attention

In 2017, **Vaswani et al.** introduced the **Transformer** in *Attention Is All You Need*. It replaced recurrence with attention, using **self-attention** to let tokens exchange information directly within the same sequence. In an unmasked self-attention layer, each word can attend to every other word without passing information through a chain of recurrent hidden states. Self-attention itself has no built-in locality bias. Long-distance context has “equal opportunity” to be attended to. [[2]](#ref-attention-is-all-you-need)

For the sentence **“the cat sat on the mat”**, an illustrative attention pattern might be:

- **“sat” attends strongly to “cat”** to gather information about who performed the action.
- **“mat” attends strongly to the preceding “the”** to capture their grammatical relationship.
- **“cat” attends strongly to “sat”** to gather information about what the cat is doing.

<style>
.self-attention-figures { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1.5rem; align-items: center; margin: 1.5rem 0; }
.self-attention-figures > figure { min-width: 0; margin: 0; }
@media (max-width: 800px) { .self-attention-figures { grid-template-columns: minmax(0, 1fr); } }
.attention-heatmap { --ah-low: var(--surface); --ah-mid: #d3e5f6; --ah-high: #245b94; --ah-high-text: #fff; }
:root[data-theme='dark'] .attention-heatmap { --ah-mid: #294c6a; --ah-high: #8ac2f0; --ah-high-text: #12202e; }
.attention-heatmap table { display: table; width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 4px; margin: .75rem 0; font-size: .8rem; }
.attention-heatmap th, .attention-heatmap td { padding: .5rem .15rem; text-align: center; border: 0; }
.attention-heatmap th { font-weight: 600; color: var(--heading); }
.attention-heatmap th:first-child { width: 4.5rem; }
.attention-heatmap td { background: var(--ah-low); color: var(--text); border-radius: 4px; font-variant-numeric: tabular-nums; }
.attention-heatmap td.ah-mid { background: var(--ah-mid); }
.attention-heatmap td.ah-high { background: var(--ah-high); color: var(--ah-high-text); font-weight: 600; }
.attention-heatmap .ah-axis { margin: 0; text-align: center; color: var(--text-muted); font-size: .85rem; }
@media (max-width: 420px) { .attention-heatmap table { border-spacing: 2px; font-size: .75rem; } .attention-heatmap th:first-child { width: 3.5rem; } }
</style>

<div class="self-attention-figures">
<figure class="narrow attention-heatmap">
<p class="ah-axis">Columns: words being attended to</p>
<table aria-label="Illustrative self-attention weights for the cat sat on the mat. Rows are words being updated; columns are words being attended to.">
<thead><tr><th scope="col">Updating ↓</th><th scope="col">the₁</th><th scope="col">cat</th><th scope="col">sat</th><th scope="col">on</th><th scope="col">the₂</th><th scope="col">mat</th></tr></thead>
<tbody>
<tr><th scope="row">the₁</th><td class="ah-low">0.10</td><td class="ah-high">0.45</td><td class="ah-low">0.10</td><td class="ah-low">0.05</td><td class="ah-low">0.10</td><td class="ah-mid">0.20</td></tr>
<tr><th scope="row">cat</th><td class="ah-low">0.10</td><td class="ah-mid">0.15</td><td class="ah-high">0.45</td><td class="ah-low">0.05</td><td class="ah-low">0.05</td><td class="ah-mid">0.20</td></tr>
<tr><th scope="row">sat</th><td class="ah-low">0.05</td><td class="ah-high">0.55</td><td class="ah-low">0.10</td><td class="ah-low">0.10</td><td class="ah-low">0.05</td><td class="ah-mid">0.15</td></tr>
<tr><th scope="row">on</th><td class="ah-low">0.05</td><td class="ah-low">0.10</td><td class="ah-mid">0.20</td><td class="ah-low">0.10</td><td class="ah-low">0.10</td><td class="ah-high">0.45</td></tr>
<tr><th scope="row">the₂</th><td class="ah-low">0.05</td><td class="ah-low">0.10</td><td class="ah-low">0.05</td><td class="ah-low">0.10</td><td class="ah-mid">0.15</td><td class="ah-high">0.55</td></tr>
<tr><th scope="row">mat</th><td class="ah-low">0.05</td><td class="ah-low">0.10</td><td class="ah-low">0.10</td><td class="ah-mid">0.15</td><td class="ah-high">0.55</td><td class="ah-low">0.05</td></tr>
</tbody>
</table>
<figcaption>Illustrative self-attention weights, not measured model outputs. Read each row across: larger numbers and more intense blue cells mean stronger attention. Each row sums to 1. The subscripts distinguish the two occurrences of “the.” This unmasked example represents encoder self-attention.</figcaption>
</figure>
<figure class="narrow">
  <img src="/images/notes/self-attention-jalammar.png" alt="Self-attention visualization for ‘The animal did not cross the street because it was too tired’: lines from ‘it’ to other tokens show particularly strong attention to ‘animal’." width="437" height="413" />
  <figcaption>The token “it” attends to other parts of the sentence, including “animal.” Source: <a href="https://jalammar.github.io/illustrated-transformer/">Jay Alammar, The Illustrated Transformer</a>.</figcaption>
</figure>
</div>

All word positions can be updated **at the same time** because they read input vectors that are already available. One position does not need to wait for another position's updated representation. In an RNN, by contrast, each hidden state must wait for the previous hidden state.

Suppose the sentence is **“Cats drink milk.”** Before self-attention starts, we already have three input vectors: $x_1$ for “Cats,” $x_2$ for “drink,” and $x_3$ for “milk.” The layer performs three independent jobs:

| Job | Reads | Produces |
| --- | --- | --- |
| Update “Cats” | $x_1, x_2, x_3$ | $y_1$ |
| Update “drink” | $x_1, x_2, x_3$ | $y_2$ |
| Update “milk” | $x_1, x_2, x_3$ | $y_3$ |

**Updating “Cats” means computing a new vector for that word using information from the sentence.** The word itself stays “Cats.” Before attention, $x_1$ represents “Cats.” After attention, $y_1$ also contains information gathered from “drink” and “milk,” helping represent what the cats are doing.

A GPU can run these independent jobs in parallel: each output reads the same set of input vectors, rather than waiting for another output. If there is another self-attention layer afterward, it uses the completed $y$ vectors as its inputs. Autoregressive generation still produces new tokens one at a time; the parallelism here is across positions whose inputs are already available.

The diagrams below show the same contrast for **four positions**:

<div class="figure-row attention-parallelism-figures">
<div class="figure-col">
<figure class="narrow" id="self-attention-parallelism">
  <img src="/images/notes/self-attention-layer.jpg" alt="A self-attention layer takes four available input vectors x_1 through x_4 and produces four output vectors y_1 through y_4 without a chain between output positions." width="544" height="458" />
  <figcaption><strong>Self-attention:</strong> y<sub>1</sub>, y<sub>2</sub>, y<sub>3</sub>, y<sub>4</sub> can be computed parallely.</figcaption>
</figure>
</div>
<div class="figure-col">
<figure class="narrow">
  <img src="/images/notes/recurrent-layer.jpg" alt="A recurrent layer with four connected hidden states between input vectors x_1 through x_4 and output vectors y_1 through y_4. Connections between positions create sequential dependencies within each recurrent direction." width="526" height="440" />
  <figcaption><strong>Recurrence:</strong> y<sub>2</sub> is computed after y<sub>1</sub>, y<sub>3</sub> is computed after y<sub>2</sub>, y<sub>4</sub> is computed after y<sub>3</sub>.</figcaption>
</figure>
</div>
</div>

### Architecture

<figure class="narrow" style="max-width: min(26rem, 100%); margin-inline: auto;">
  <img src="/images/notes/transformer-architecture-vaswani.jpg" alt="The original Transformer architecture: an encoder stack on the left and a decoder stack on the right, with embeddings, positional encodings, attention, feed-forward layers, residual connections and normalization, followed by a linear layer and softmax." width="747" height="1100" />
  <figcaption>Figure 1: The Transformer - model architecture. Source: <a href="https://arxiv.org/html/1706.03762v7#S3.F1">Vaswani et al., Attention Is All You Need</a> (2017).</figcaption>
</figure>

In the Transformer shown above, the encoder and decoder each contain a stack of Transformer layers.

#### Input Embeddings + positional information

A Transformer usually processes **tokens**, which need not be whole words. The exact split depends on the tokenizer's vocabulary. Common words may stay whole, and less common words may become several pieces. After tokenization, each token has an integer ID that selects a row from a learned embedding table. This extensive matrix allows the model to assign semantic meaning to each token, in the sense that tokens with similar usage or meaning in language are placed close together in this high-dimensional space, while dissimilar tokens are farther apart.

The input to the first encoder layer is the token's embedding plus a positional encoding, which adds information about where that token occurs:

$$
x_i = \operatorname{Embedding}(\text{token}_i) + \operatorname{Position}(i)
$$

<figure class="narrow" style="clear: both; max-width: min(26rem, 100%); margin-inline: auto;">
  <img src="/images/notes/transformer-input-embeddings.png" alt="The prompt ‘Data visualization empowers users to’ is split into tokens, including ‘em’ and ‘powers’. Each token ID selects an embedding vector, which is added to its positional encoding to form the final embedding." width="870" height="692" />
  <figcaption>Expanding the Embedding layer view, showing how the input prompt is converted to a vector representation. The process involves (1) Tokenization, (2) Token Embedding, (3) Positional Encoding, and (4) Final Embedding. Source: <a href="https://poloclub.github.io/transformer-explainer/">Transformer Explainer, Polo Club</a>.</figcaption>
</figure>

#### Transformer Encoder

<style>
.transformer-encoder-section { display: flow-root; }
figure.transformer-encoder-figure { float: right; width: min(13rem, 36%); margin: 0 0 1rem 1.5rem; }
figure.transformer-encoder-figure img { display: block; width: 100%; height: auto; }
@media (max-width: 600px) {
  figure.transformer-encoder-figure { float: none; width: min(13rem, 100%); margin: 0 auto 1.5rem; }
}
</style>

<div class="transformer-encoder-section">
<figure class="narrow transformer-encoder-figure">
  <img src="/images/notes/transformer-encoder-slide-9.jpg" alt="Transformer encoder: input embeddings and positional encoding feed a stack of N layers, each containing multi-head self-attention, a feed-forward network, and two Add & Norm operations with residual connections." width="351" height="640" />
</figure>

Each encoder layer contains self-attention, a feed-forward network, and the residual additions and layer normalization shown as “Add & Norm.” Its job is to turn each input token into a vector that captures both the token's meaning and its context in the sentence. The $N\times$ labels mean “repeat this entire block $N$ times.” Each repetition is a separate layer with its own learned parameters.[^three-layer-encoder] The token representations evolve through layers from the first block to the last one, allowing the model to build up an intricate understanding of each token.

Every encoder layer receives one vector for each input token and produces an updated vector for each token. This is the same pattern as the self-attention illustration [above](#self-attention-parallelism), where $x_1, x_2, x_3, x_4$ become $y_1, y_2, y_3, y_4$, except that a complete encoder layer also includes the feed-forward network and Add & Norm operations. Token positions can be processed in parallel within a layer, but the next layer uses the previous layer's outputs, so the layers run in sequence.


</div>

#### Multi-Head Self Attention

The self-attention mechanism enables the model to capture relationships among tokens in a sequence, so that each token's representation is influenced by the others. It is called **self-attention because the queries, keys, and values all come from the same input sequence**.

<style>
.qkv-query { color: #2563a5; }
.qkv-key { color: #b83c4b; }
.qkv-value { color: #16734c; }
:root[data-theme='dark'] .qkv-query { color: #8cb8ff; }
:root[data-theme='dark'] .qkv-key { color: #ff9ca5; }
:root[data-theme='dark'] .qkv-value { color: #70d7aa; }
</style>

**Step 1: <span class="qkv-query">Query</span>, <span class="qkv-key">Key</span>, and <span class="qkv-value">Value</span> Matrices**

Each token's embedding vector is transformed into three vectors: <span class="qkv-query">Query (Q)</span>, <span class="qkv-key">Key (K)</span>, and <span class="qkv-value">Value (V)</span>. These vectors are derived by multiplying the input embedding matrix with learned weight matrices for <span class="qkv-query">Q</span>, <span class="qkv-key">K</span>, and <span class="qkv-value">V</span>.

Following the paper's convention, we write each input vector $X_i$ as a row and multiply by the learned weights on the right [[2]](#ref-attention-is-all-you-need):

$$
Q_i = X_i W^Q, \qquad K_i = X_i W^K, \qquad V_i = X_i W^V
$$

<figure>
  <img src="/images/notes/transformer-qkv.png" alt="Six token embeddings form a 6 by 768 matrix. Multiplication by learned Q, K, and V weights of shape 768 by 2304, plus a learned bias, produces a 6 by 2304 matrix containing the query, key, and value vectors." width="1245" height="401" />
  <figcaption>Computing <span class="qkv-query">Query</span>, <span class="qkv-key">Key</span>, and <span class="qkv-value">Value</span> matrices from the input embeddings. This GPT-2 example combines all three projections into one matrix multiplication and adds a learned bias. Source: <a href="https://poloclub.github.io/transformer-explainer/">Transformer Explainer, Polo Club</a>.</figcaption>
</figure>

<span class="qkv-query">Q</span> is what we're trying to learn context for, <span class="qkv-key">K</span> is the key to be matched, and <span class="qkv-value">V</span> is the information to be extracted.

**An analogy to understand Q, K, and V**

1. **<span class="qkv-query">Query (Q)</span>** is the search text you type in the search engine bar.
2. **<span class="qkv-key">Key (K)</span>** is the title of each web page in the search results.
3. **<span class="qkv-value">Value (V)</span>** is the actual content of the web pages shown.

Once we match the search term (<span class="qkv-query">Query</span>) with the relevant results (<span class="qkv-key">Key</span>), we want to get the content (<span class="qkv-value">Value</span>) of the most relevant pages.

<style>
.attention-lookup-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr); gap: 1.5rem; align-items: start; }
.attention-lookup-row > div > p:first-child { margin-top: 0; }
figure.attention-lookup-figure { margin: 0; min-width: 0; }
.attention-lookup-figure svg { font-family: inherit; font-size: 18px; }
.attention-lookup-figure .al-box { fill: var(--surface); stroke: currentColor; stroke-width: 1.5; }
.attention-lookup-figure .al-line { fill: none; stroke: currentColor; stroke-width: 1.4; marker-end: url(#al-arrow); }
@media (max-width: 1000px) { .attention-lookup-row { grid-template-columns: minmax(0, 1fr); } figure.attention-lookup-figure { width: min(34rem, 100%); margin-inline: auto; } }
@media (max-width: 600px) { .attention-lookup-scroll { overflow-x: auto; } .attention-lookup-figure svg { min-width: 540px; } }
</style>

<div class="attention-lookup-row">
<div>

Once we have the <span class="qkv-query">Q</span>, <span class="qkv-key">K</span>, and <span class="qkv-value">V</span> matrices, we retrieve information for a query by first comparing it with every key. This gives a similarity score:

$$
s_i = \operatorname{similarity}(q, k_i)
$$

A higher score means that entry is more relevant to the query. In Transformer attention, softmax turns the scores into nonnegative weights that sum to 1. We multiply each value by its weight, then sum the weighted values. This is the general attention process.

</div>
<figure class="narrow attention-lookup-figure">
<div class="attention-lookup-scroll">
<svg viewBox="0 0 720 360" role="img" aria-labelledby="attention-lookup-title attention-lookup-desc" xmlns="http://www.w3.org/2000/svg">
<title id="attention-lookup-title">Attention as a soft lookup over keys and values</title>
<desc id="attention-lookup-desc">A blue query d is compared with five red keys a through e. Their similarity scores pass through softmax to produce weights. Each weight multiplies its green value vector, and the results are summed into the output.</desc>
<defs><marker id="al-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
<g text-anchor="middle" fill="currentColor">
<text x="42" y="140" class="qkv-query">Query</text><rect class="al-box qkv-query" x="12" y="154" width="60" height="36" rx="4"/><text x="42" y="178" class="qkv-query">d</text>
<text x="150" y="30" class="qkv-key">Keys</text><text x="225" y="30" class="qkv-value" opacity="0.3">Values</text><text x="316" y="30">Scores</text>
<rect class="al-box" x="374" y="52" width="42" height="258" rx="6"/><text transform="translate(402 181) rotate(-90)">Softmax</text>
<text x="462" y="30">Weights</text><text x="562" y="18">Weighted<tspan x="562" dy="20">values</tspan></text>
<path class="al-line" d="M72 172 C100 172 100 80 120 80"/>
<rect class="al-box qkv-key" x="122" y="62" width="56" height="36" rx="4"/><text class="qkv-key" x="150" y="86">a</text>
<g opacity="0.3"><rect class="al-box qkv-value" x="195" y="62" width="60" height="36" rx="4"/><text class="qkv-value" x="225" y="86">v₁</text></g>
<path class="al-line" d="M264 80 H288"/><text x="316" y="86">s₁</text><path class="al-line" d="M340 80 H372"/>
<path class="al-line" d="M418 80 H436"/><text x="462" y="86">w₁</text>
<path class="al-line" d="M488 80 H510"/><rect class="al-box qkv-value" x="514" y="62" width="100" height="36" rx="4"/><text x="564" y="86"><tspan>w₁ × </tspan><tspan class="qkv-value">v₁</tspan></text>
<path class="al-line" d="M72 172 C100 172 100 130 120 130"/>
<rect class="al-box qkv-key" x="122" y="112" width="56" height="36" rx="4"/><text class="qkv-key" x="150" y="136">b</text>
<g opacity="0.3"><rect class="al-box qkv-value" x="195" y="112" width="60" height="36" rx="4"/><text class="qkv-value" x="225" y="136">v₂</text></g>
<path class="al-line" d="M264 130 H288"/><text x="316" y="136">s₂</text><path class="al-line" d="M340 130 H372"/>
<path class="al-line" d="M418 130 H436"/><text x="462" y="136">w₂</text>
<path class="al-line" d="M488 130 H510"/><rect class="al-box qkv-value" x="514" y="112" width="100" height="36" rx="4"/><text x="564" y="136"><tspan>w₂ × </tspan><tspan class="qkv-value">v₂</tspan></text>
<path class="al-line" d="M72 172 C100 172 100 180 120 180"/>
<rect class="al-box qkv-key" x="122" y="162" width="56" height="36" rx="4"/><text class="qkv-key" x="150" y="186">c</text>
<g opacity="0.3"><rect class="al-box qkv-value" x="195" y="162" width="60" height="36" rx="4"/><text class="qkv-value" x="225" y="186">v₃</text></g>
<path class="al-line" d="M264 180 H288"/><text x="316" y="186">s₃</text><path class="al-line" d="M340 180 H372"/>
<path class="al-line" d="M418 180 H436"/><text x="462" y="186">w₃</text>
<path class="al-line" d="M488 180 H510"/><rect class="al-box qkv-value" x="514" y="162" width="100" height="36" rx="4"/><text x="564" y="186"><tspan>w₃ × </tspan><tspan class="qkv-value">v₃</tspan></text>
<path class="al-line" d="M72 172 C100 172 100 230 120 230"/>
<rect class="al-box qkv-key" x="122" y="212" width="56" height="36" rx="4"/><text class="qkv-key" x="150" y="236">d</text>
<g opacity="0.3"><rect class="al-box qkv-value" x="195" y="212" width="60" height="36" rx="4"/><text class="qkv-value" x="225" y="236">v₄</text></g>
<path class="al-line" d="M264 230 H288"/><text x="316" y="236">s₄</text><path class="al-line" d="M340 230 H372"/>
<path class="al-line" d="M418 230 H436"/><text x="462" y="236">w₄</text>
<path class="al-line" d="M488 230 H510"/><rect class="al-box qkv-value" x="514" y="212" width="100" height="36" rx="4"/><text x="564" y="236"><tspan>w₄ × </tspan><tspan class="qkv-value">v₄</tspan></text>
<path class="al-line" d="M72 172 C100 172 100 280 120 280"/>
<rect class="al-box qkv-key" x="122" y="262" width="56" height="36" rx="4"/><text class="qkv-key" x="150" y="286">e</text>
<g opacity="0.3"><rect class="al-box qkv-value" x="195" y="262" width="60" height="36" rx="4"/><text class="qkv-value" x="225" y="286">v₅</text></g>
<path class="al-line" d="M264 280 H288"/><text x="316" y="286">s₅</text><path class="al-line" d="M340 280 H372"/>
<path class="al-line" d="M418 280 H436"/><text x="462" y="286">w₅</text>
<path class="al-line" d="M488 280 H510"/><rect class="al-box qkv-value" x="514" y="262" width="100" height="36" rx="4"/><text x="564" y="286"><tspan>w₅ × </tspan><tspan class="qkv-value">v₅</tspan></text>
<path d="M626 62 H634 V298 H626" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path class="al-line" d="M636 180 H666"/><text x="687" y="186" font-size="28">Σ</text><text x="680" y="224" font-size="16">Output</text>
<text x="225" y="340" fill="var(--text-muted)" font-size="16">A key-value store</text>
</g></svg>
</div>
<figcaption>Attention as a soft lookup. Adapted from Negin Rahimi, CS646: Information Retrieval, Transformer lecture, slide 15 (UMass Amherst, Fall 2026).</figcaption>
</figure>
</div>

**Scaled dot-product attention**

Self-attention for one head is computed using:

$$
\operatorname{Attention}(Q,K,V)
= \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt d}\right)V
$$

Here, $Q$, $K$, and $V$ stack the token vectors as rows, $d$ is the dimension of each query and key, and softmax is applied separately to each row. The walkthrough below uses four tokens and unmasked encoder self-attention.

To update the representation of $x_1$, we take its query $Q_1$ and compare it with **every key**:

$$
E_{1,j}=\frac{Q_1\cdot K_j}{\sqrt d}
$$

This produces four scalar scores:

$$
[E_{1,1},E_{1,2},E_{1,3},E_{1,4}]
$$

Notice that token 1 attends to itself too. Read the indices as:

> $E_{1,3}$: how well the query from **token 1** matches the key from **token 3**.

The dot product measures compatibility, and dividing by $\sqrt d$ controls the scores' size.

Then we apply softmax across the four scores:

$$
A_{1,j}=\frac{\exp(E_{1,j})}{\sum_{m=1}^{4}\exp(E_{1,m})}
$$

The resulting weights are nonnegative and sum to 1. For example:

$$
[A_{1,1},A_{1,2},A_{1,3},A_{1,4}]=[0.1,\;0.1,\;0.3,\;0.5]
$$

When updating token 1, the attention mechanism gives the largest weight to information from token 4.

Then we use those weights on the **value vectors**:

$$
Y_1=\sum_{j=1}^{4}A_{1,j}V_j
$$

With the example weights:

$$
Y_1=0.1V_1+0.1V_2+0.3V_3+0.5V_4
$$

We repeat the lookup for token 2 and the other tokens. These lookups can happen in parallel. The **same keys and values** are available, but a different query generally produces different weights.

<style>
.self-attention-demo { margin: 1.5rem 0; }
.self-attention-demo .sa-controls[hidden] { display: none; }
.self-attention-demo .sa-controls { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .75rem; }
.self-attention-demo button { font: inherit; font-size: .85rem; padding: .25rem .6rem; border: 1px solid var(--border); border-radius: 4px; color: var(--text); background: var(--surface); cursor: pointer; }
.self-attention-demo button[aria-pressed='true'] { border-color: var(--link); color: var(--link); }
.self-attention-demo .sa-scroll { overflow-x: auto; }
.self-attention-demo svg { font-family: inherit; font-size: 18px; min-width: 640px; }
.self-attention-demo .sa-box { fill: var(--surface); stroke: currentColor; stroke-width: 1.5; }
.self-attention-demo .sa-arrow { fill: none; stroke: currentColor; stroke-width: 1.5; marker-end: url(#sa-arrowhead); }
.self-attention-demo .sa-inactive { opacity: .25; }
.self-attention-demo .sa-selected { stroke-width: 3; }
.self-attention-demo.is-playing .sa-stage { animation: sa-reveal .7s both; animation-delay: calc(var(--i) * 2s); }
.self-attention-demo.is-paused .sa-stage { animation-play-state: paused; }
@keyframes sa-reveal { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .self-attention-demo.is-playing .sa-stage { animation: none; } .self-attention-demo .sa-pause { display: none; } }
</style>

<figure class="self-attention-demo" id="self-attention-walkthrough">
<div class="sa-controls" hidden>
<span>Query token:</span>
<button type="button" data-sa-token="0" aria-pressed="true">1</button>
<button type="button" data-sa-token="1" aria-pressed="false">2</button>
<button type="button" data-sa-token="2" aria-pressed="false">3</button>
<button type="button" data-sa-token="3" aria-pressed="false">4</button>
<button type="button" class="sa-pause">Pause</button>
<button type="button" class="sa-replay">Replay</button>
</div>
<div class="sa-scroll" tabindex="0" role="region" aria-label="Self-attention diagram, scroll horizontally on small screens">
<svg viewBox="0 0 800 510" role="img" aria-labelledby="sa-title sa-desc" xmlns="http://www.w3.org/2000/svg">
<title id="sa-title">A four-token self-attention walkthrough</title>
<desc id="sa-desc">Each input produces a blue query, a red key, and a green value. Query 1 is compared with every key, including its own. Softmax converts the scores into weights 0.1, 0.1, 0.3, and 0.5. Their weighted values sum to output Y1. Other queries reuse the same keys and values.</desc>
<defs><marker id="sa-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="currentColor"/></marker></defs>
<g fill="currentColor" text-anchor="middle">
<g class="sa-stage" style="--i:0">
<text x="100" y="490">Center</text><rect class="sa-box" x="74" y="426" width="52" height="38" rx="4"/><text x="100" y="452">x₁</text>
<path class="sa-arrow" d="M100 426 V405 H45 V390"/><g class="qkv-query sa-selected" data-sa-query="0"><rect class="sa-box" x="22" y="350" width="46" height="40" rx="4"/><text x="45" y="377">Q₁</text></g>
<path class="sa-arrow" d="M100 426 V405 H100 V390"/><g class="qkv-key"><rect class="sa-box" x="77" y="350" width="46" height="40" rx="4"/><text x="100" y="377">K₁</text></g>
<path class="sa-arrow" d="M100 426 V405 H155 V390"/><g class="qkv-value"><rect class="sa-box" x="132" y="350" width="46" height="40" rx="4"/><text x="155" y="377">V₁</text></g>
<text x="300" y="490">for</text><rect class="sa-box" x="274" y="426" width="52" height="38" rx="4"/><text x="300" y="452">x₂</text>
<path class="sa-arrow" d="M300 426 V405 H245 V390"/><g class="qkv-query sa-inactive" data-sa-query="1"><rect class="sa-box" x="222" y="350" width="46" height="40" rx="4"/><text x="245" y="377">Q₂</text></g>
<path class="sa-arrow" d="M300 426 V405 H300 V390"/><g class="qkv-key"><rect class="sa-box" x="277" y="350" width="46" height="40" rx="4"/><text x="300" y="377">K₂</text></g>
<path class="sa-arrow" d="M300 426 V405 H355 V390"/><g class="qkv-value"><rect class="sa-box" x="332" y="350" width="46" height="40" rx="4"/><text x="355" y="377">V₂</text></g>
<text x="500" y="490">intelligent</text><rect class="sa-box" x="474" y="426" width="52" height="38" rx="4"/><text x="500" y="452">x₃</text>
<path class="sa-arrow" d="M500 426 V405 H445 V390"/><g class="qkv-query sa-inactive" data-sa-query="2"><rect class="sa-box" x="422" y="350" width="46" height="40" rx="4"/><text x="445" y="377">Q₃</text></g>
<path class="sa-arrow" d="M500 426 V405 H500 V390"/><g class="qkv-key"><rect class="sa-box" x="477" y="350" width="46" height="40" rx="4"/><text x="500" y="377">K₃</text></g>
<path class="sa-arrow" d="M500 426 V405 H555 V390"/><g class="qkv-value"><rect class="sa-box" x="532" y="350" width="46" height="40" rx="4"/><text x="555" y="377">V₃</text></g>
<text x="700" y="490">information</text><rect class="sa-box" x="674" y="426" width="52" height="38" rx="4"/><text x="700" y="452">x₄</text>
<path class="sa-arrow" d="M700 426 V405 H645 V390"/><g class="qkv-query sa-inactive" data-sa-query="3"><rect class="sa-box" x="622" y="350" width="46" height="40" rx="4"/><text x="645" y="377">Q₄</text></g>
<path class="sa-arrow" d="M700 426 V405 H700 V390"/><g class="qkv-key"><rect class="sa-box" x="677" y="350" width="46" height="40" rx="4"/><text x="700" y="377">K₄</text></g>
<path class="sa-arrow" d="M700 426 V405 H755 V390"/><g class="qkv-value"><rect class="sa-box" x="732" y="350" width="46" height="40" rx="4"/><text x="755" y="377">V₄</text></g>
</g><g class="sa-stage" style="--i:1">
<path class="sa-arrow qkv-query" data-sa-compare="0" d="M45 350 L100 280"/>
<path class="sa-arrow qkv-key" d="M100 350 V280"/>
<rect class="sa-box" x="57" y="240" width="86" height="38" rx="4"/><text data-sa-score="0" x="100" y="265">E₁,1</text>
<path class="sa-arrow qkv-query" data-sa-compare="1" d="M45 350 L300 280"/>
<path class="sa-arrow qkv-key" d="M300 350 V280"/>
<rect class="sa-box" x="257" y="240" width="86" height="38" rx="4"/><text data-sa-score="1" x="300" y="265">E₁,2</text>
<path class="sa-arrow qkv-query" data-sa-compare="2" d="M45 350 L500 280"/>
<path class="sa-arrow qkv-key" d="M500 350 V280"/>
<rect class="sa-box" x="457" y="240" width="86" height="38" rx="4"/><text data-sa-score="2" x="500" y="265">E₁,3</text>
<path class="sa-arrow qkv-query" data-sa-compare="3" d="M45 350 L700 280"/>
<path class="sa-arrow qkv-key" d="M700 350 V280"/>
<rect class="sa-box" x="657" y="240" width="86" height="38" rx="4"/><text data-sa-score="3" x="700" y="265">E₁,4</text>
</g>
<g class="sa-stage" style="--i:2"><rect class="sa-box" x="45" y="165" width="710" height="36" rx="5"/><text x="400" y="190" style="paint-order: stroke; stroke: var(--surface); stroke-width: 7px; stroke-linejoin: round;">Softmax across this row</text>
<path class="sa-arrow" d="M100 240 V202"/><path class="sa-arrow" d="M100 165 V141"/>
<text data-sa-weight="0" x="100" y="128">A₁,1 = 0.1</text>
<path class="sa-arrow" d="M300 240 V202"/><path class="sa-arrow" d="M300 165 V141"/>
<text data-sa-weight="1" x="300" y="128">A₁,2 = 0.1</text>
<path class="sa-arrow" d="M500 240 V202"/><path class="sa-arrow" d="M500 165 V141"/>
<text data-sa-weight="2" x="500" y="128">A₁,3 = 0.3</text>
<path class="sa-arrow" d="M700 240 V202"/><path class="sa-arrow" d="M700 165 V141"/>
<text data-sa-weight="3" x="700" y="128">A₁,4 = 0.5</text>
</g><g class="sa-stage" style="--i:3">
<rect class="sa-box qkv-value" x="37" y="64" width="126" height="36" rx="4"/><text data-sa-product="0" x="100" y="89">0.1 × V₁</text><path class="sa-arrow" d="M100 113 V101"/><path class="sa-arrow qkv-value" d="M155 350 V336 H183 V82 H164"/>
<rect class="sa-box qkv-value" x="237" y="64" width="126" height="36" rx="4"/><text data-sa-product="1" x="300" y="89">0.1 × V₂</text><path class="sa-arrow" d="M300 113 V101"/><path class="sa-arrow qkv-value" d="M355 350 V336 H383 V82 H364"/>
<rect class="sa-box qkv-value" x="437" y="64" width="126" height="36" rx="4"/><text data-sa-product="2" x="500" y="89">0.3 × V₃</text><path class="sa-arrow" d="M500 113 V101"/><path class="sa-arrow qkv-value" d="M555 350 V336 H583 V82 H564"/>
<rect class="sa-box qkv-value" x="637" y="64" width="126" height="36" rx="4"/><text data-sa-product="3" x="700" y="89">0.5 × V₄</text><path class="sa-arrow" d="M700 113 V101"/><path class="sa-arrow qkv-value" d="M755 350 V336 H783 V82 H764"/>
</g><g class="sa-stage" style="--i:4">
<path class="sa-arrow" d="M100 64 V44 H400 V35"/>
<path class="sa-arrow" d="M300 64 V44 H400 V35"/>
<path class="sa-arrow" d="M500 64 V44 H400 V35"/>
<path class="sa-arrow" d="M700 64 V44 H400 V35"/>
<rect class="sa-box" x="345" y="2" width="110" height="32" rx="4"/><text data-sa-output="" x="400" y="25">Sum → Y₁</text></g></g></svg>
</div>
<figcaption>One query, four keys, and four values. Compare the selected query with every key, then scale the scores by √d. The weights are illustrative, not measured model outputs. Adapted from Negin Rahimi, CS646: Information Retrieval, Transformer lecture, slides 16–20 (UMass Amherst, Fall 2026).</figcaption>
</figure>

<script>
(() => {
  const demo = document.getElementById('self-attention-walkthrough');
  if (!demo) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rows = [[.1,.1,.3,.5],[.2,.4,.1,.3],[.15,.15,.5,.2],[.1,.2,.2,.5]];
  const subs = ['₁','₂','₃','₄'];
  const pause = demo.querySelector('.sa-pause');
  let token = 0;
  let started = false;
  function replay() {
    demo.classList.remove('is-playing', 'is-paused');
    pause.textContent = 'Pause';
    void demo.offsetWidth;
    if (!reduced.matches) demo.classList.add('is-playing');
  }
  function choose(index) {
    token = index;
    demo.querySelectorAll('[data-sa-token]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.saToken) === token)));
    demo.querySelectorAll('[data-sa-query]').forEach(g => {
      const active = Number(g.dataset.saQuery) === token;
      g.classList.toggle('sa-inactive', !active);
      g.classList.toggle('sa-selected', active);
    });
    for (let j=0;j<4;j++) {
      demo.querySelector(`[data-sa-compare="${j}"]`).setAttribute('d', `M${45+200*token} 350 L${100+200*j} 280`);
      demo.querySelector(`[data-sa-score="${j}"]`).textContent = `E${subs[token]},${j+1}`;
      demo.querySelector(`[data-sa-weight="${j}"]`).textContent = `A${subs[token]},${j+1} = ${rows[token][j]}`;
      demo.querySelector(`[data-sa-product="${j}"]`).textContent = `${rows[token][j]} × V${subs[j]}`;
    }
    demo.querySelector('[data-sa-output]').textContent = `Sum → Y${subs[token]}`;
    demo.querySelector('#sa-desc').textContent = `Query ${token+1} is compared with every key. Softmax gives illustrative weights ${rows[token].join(', ')}. Weighted values sum to output Y${token+1}.`;
    replay();
  }
  demo.querySelector('.sa-controls').hidden = false;
  demo.querySelectorAll('[data-sa-token]').forEach(b => b.addEventListener('click', () => choose(Number(b.dataset.saToken))));
  demo.querySelector('.sa-replay').addEventListener('click', replay);
  pause.addEventListener('click', () => {
    const paused = demo.classList.toggle('is-paused');
    pause.textContent = paused ? 'Resume' : 'Pause';
  });
  demo.addEventListener('animationend', e => {
    if (e.target.matches('.sa-stage[style="--i:4"]')) {
      demo.classList.remove('is-playing', 'is-paused');
      pause.textContent = 'Pause';
    }
  });
  reduced.addEventListener('change', () => { if (reduced.matches) demo.classList.remove('is-playing', 'is-paused'); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting) && !started) { started = true; replay(); observer.disconnect(); }
    }, { threshold: .25 });
    observer.observe(demo);
  }
})();
</script>

The animation follows one query at a time so we can see how its output is built. In practice, we stack all token representations into a matrix and compute every query's lookup together. **Each row performs the same calculation we just did for token 1.**

Let $n$ be the number of tokens and $D$ the dimension of each input vector. Stacking the inputs as rows gives $X\in\mathbb{R}^{n\times D}$. Here, $n$ is the sequence length, separate from the $N$ used earlier for the number of stacked Transformer layers.

<style>
.attention-dimensions table { width: fit-content; max-width: 100%; margin-inline: auto; }
</style>

<div class="attention-dimensions">

| Quantity | Computation | Dimensions[^attention-head-dimensions] |
| --- | --- | --- |
| Input representations | $X$ | $n\times D$ |
| Query and key weights | $W^Q,\ W^K$ | $D\times d$ each |
| Value weights | $W^V$ | $D\times d_v$ |
| <span class="qkv-query">Queries</span> | $Q=XW^Q$ | $n\times d$ |
| <span class="qkv-key">Keys</span> | $K=XW^K$ | $n\times d$ |
| <span class="qkv-value">Values</span> | $V=XW^V$ | $n\times d_v$ |
| Scaled similarity scores | $E=QK^\top/\sqrt d$ | $n\times n$ |
| Attention weights | $A=\operatorname{softmax}_{\text{row}}(E)$ | $n\times n$ |
| Output representations | $Y=AV$ | $n\times d_v$ |

</div>

The first matrix multiplication compares **every query with every key**:

$$
\underbrace{Q}_{n\times d}\;
\underbrace{K^\top}_{d\times n}
\;\longrightarrow\;
\underbrace{QK^\top}_{n\times n}
$$

After scaling, entry $E_{i,j}$ is the score for query $i$ and key $j$. Softmax is applied **across each row**, so every query gets its own set of weights summing to 1.

The second matrix multiplication performs all the weighted sums:

$$
\underbrace{A}_{n\times n}\;
\underbrace{V}_{n\times d_v}
\;=\;
\underbrace{Y}_{n\times d_v}
$$

Row $i$ of $Y$ is $Y_i=\sum_{j=1}^{n}A_{i,j}V_j$, exactly the value-weighting step in the walkthrough. We get **one output vector for every input token**, with all token lookups computed in parallel.

<style>
.multihead-summary { display: flow-root; }
figure.multihead-summary-figure { float: right; width: min(11rem, 36%); margin: 0 0 1rem 1.5rem; }
figure.multihead-summary-figure img { display: block; width: 100%; height: auto; }
@media (max-width: 600px) { figure.multihead-summary-figure { float: none; width: min(11rem, 100%); margin: 0 auto 1.5rem; } }
</style>

<div class="multihead-summary">
<figure class="narrow multihead-summary-figure">
  <img src="/images/notes/transformer-multihead-attention.jpg" alt="Multi-head attention: h separate learned linear projections of queries, keys, and values feed parallel scaled dot-product attention heads. Their outputs are concatenated and passed through a final linear projection." width="488" height="640" />
  <figcaption>Source: <a href="https://arxiv.org/html/1706.03762v7#S3.F2">Vaswani et al., Attention Is All You Need</a> (2017), Figure 2.</figcaption>
</figure>

In practice, we take $h$ different sets of linear transformations of each input, one set of query, key, and value projections per attention head ($h=8$ in the original paper) [[2]](#ref-attention-is-all-you-need). Multiple attention heads allow the model to consider relationships between tokens from different perspectives. These $h$ copies of self-attention are independent and can run in parallel, each with its own learned projection weights.

The head outputs are then concatenated and passed through a final learned linear projection, as shown in the diagram.

</div>

#### Multi-Layer Perceptron

Self-attention forms weighted sums of the value vectors. The attention weights depend nonlinearly on the inputs through softmax, but the value-mixing step does not apply an element-wise nonlinear activation. After multi-head attention combines information across tokens and projects the concatenated outputs, the Multilayer Perceptron (MLP) refines each token's representation using two linear transformations with an element-wise nonlinear activation in between.

In GPT-2 (small), the first linear transformation expands the dimensionality four-fold from `768` to `3072`. This gives the model a larger feature space in which to represent patterns. A GELU activation is then applied element-wise, allowing the MLP to learn nonlinear transformations.

The second linear transformation reduces the dimensionality back to `768`. It maps the expanded features back to the model's representation size, so the output can continue through the next parts of the Transformer block. These dimensions depend on the model; the original Transformer used a ReLU activation.

Unlike self-attention, which integrates information across tokens, the MLP processes each token independently. The same MLP weights are used at every token position. It transforms the features within each token's vector, enriching the model's representational capacity.


The ReLU version can be written as follows, with $z_i$ denoting the MLP input at token position $i$:

$$
\begin{aligned}
m_i &= \operatorname{MLP}(z_i) \\
    &= \operatorname{ReLU}(z_iW_1+b_1)W_2+b_2.
\end{aligned}
$$

$W_1$ and $b_1$ expand the feature dimension, and $W_2$ and $b_2$ project it back.[^mlp-gpt2-activation]

#### Add & Norm

<figure class="narrow" style="max-width: min(24rem, 100%); margin-inline: auto;">
  <img src="/images/notes/transformer-add-norm-labeled.jpg" alt="Inputs x ell minus one feed self-attention F and a residual path. The attention output F of x ell minus one is added to the inputs to form x ell, then passed through layer normalization." width="960" height="720" />
  <figcaption>Residual connection and layer normalization around self-attention, labeled to match the equation below. Adapted from: <a href="https://www.lesswrong.com/posts/McmHduRWJynsjZjx5/walkthrough-the-transformer-architecture-part-2-2">Matthew Barnett, Walkthrough: The Transformer Architecture, Part 2/2</a>.</figcaption>
</figure>

Residual connections and layer normalization help Transformers train effectively. Both also remain active during inference.

1. **Residual connections** add a sublayer's input to its output:

   $$
   \boxed{x_{\ell}=x_{\ell-1}+F(x_{\ell-1})}
   $$

   Here, $F$ could be an attention sublayer or a feed-forward sublayer. This gives gradients a direct path through the addition and helps mitigate vanishing gradients in deep networks.

2. **Layer normalization** stabilizes training and can help the model converge faster. For each token, it computes the mean and variance across that token's features, then centers and rescales them. Learned scale and bias parameters let the model adjust the normalized representation.

   For one token represented by $d$ numbers, $x=[x_1,\ldots,x_d]$, compute its mean and variance:

   $$
   \mu=\frac{1}{d}\sum_i x_i,
   \qquad
   \sigma^2=\frac{1}{d}\sum_i(x_i-\mu)^2
   $$

   Then normalize:

   $$
   \boxed{\operatorname{LayerNorm}(x)_i
   =\gamma_i\frac{x_i-\mu}{\sqrt{\sigma^2+\epsilon}}+\beta_i}
   $$

   This helps control activation scales and reduces sensitivity to weight initialization. Changing inputs to later layers are often described using the intuition of *internal covariate shift*, though reducing this shift is not a complete explanation of why normalization helps.[^layer-norm-shift]

   In the original Transformer architecture, layer normalization is applied after each residual addition: once around the self-attention sublayer and once around the MLP sublayer in each encoder block. These are the “Add & Norm” operations shown in the architecture diagram [[2]](#ref-attention-is-all-you-need).

#### Transformer Decoder

<style>
.transformer-decoder-section { display: flow-root; }
figure.transformer-decoder-figure { float: right; width: min(13rem, 36%); margin: 0 0 1rem 1.5rem; }
figure.transformer-decoder-figure svg { display: block; width: 100%; height: auto; }
@media (max-width: 600px) {
  figure.transformer-decoder-figure { float: none; width: min(13rem, 100%); margin: 0 auto 1.5rem; }
}
</style>

<div class="transformer-decoder-section">
<figure class="narrow transformer-decoder-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="380 225 350 580" role="img" aria-label="The original Transformer's decoder stack, repeated N times: masked multi-head self-attention, encoder-decoder cross-attention, and a feed-forward network, each with a residual connection and Add and Norm.">
    <image href="/images/notes/transformer-architecture-vaswani.jpg" width="747" height="1100" />
  </svg>
  <figcaption>Decoder stack. Source: <a href="https://arxiv.org/html/1706.03762v7#S3.F1">Vaswani et al., Figure 1</a>.</figcaption>
</figure>

Like the encoder, the decoder consists of a stack of $N$ layers ($N=6$ in the original Transformer). Each layer has its own learned parameters.

Each decoder layer in the original Transformer contains three sublayers, applied in order: **masked self-attention**, **cross-attention**, and a **feed-forward neural network**. Each sublayer has a residual connection followed by layer normalization [[2]](#ref-attention-is-all-you-need).

The encoder builds contextual representations of the input sequence, with each token able to attend to every input position. The decoder uses those representations to generate an output sequence one token at a time. Masked self-attention lets it attend only to the output tokens available so far, preventing it from looking at future tokens. Cross-attention lets it attend to the encoder's output, and the feed-forward network refines each token's representation.

</div>

#### Masked Self-Attention

When predicting the next token, the decoder must not look at future tokens in the output sequence. Otherwise, it could see the answer during training. The rule is:

$$
\boxed{\text{Position }i\text{ may attend only to positions }j\le i}
$$

**Attending to yourself is allowed:** the token at the current input position is already known. The target is the *next* token.

To enforce this rule, we set the attention scores for future tokens to $-\infty$ **before applying softmax**. Their attention weights then become zero, since $e^{-\infty}=0$. Each position can still attend to itself and all earlier positions.

<style>
.mask-matrix-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; }
.mask-matrix-stage { min-width: 0; }
.mask-matrix-stage h5 { margin: 0 0 .75rem; font-size: 1rem; color: var(--heading); }
.mask-matrix-stage table { display: table; width: 100%; margin: 0; table-layout: fixed; font-size: .9rem; }
.mask-matrix-stage th, .mask-matrix-stage td { padding: .55rem .2rem; text-align: center; }
.mask-matrix-stage th { font-weight: 500; }
.mask-matrix-stage td { background: var(--diagram-blue); font-variant-numeric: tabular-nums; color: var(--heading); }
.mask-matrix-stage td.mask-future { background: var(--surface); color: var(--text-muted); }
.mask-matrix-stage:last-child td:not(.mask-future) { background: var(--diagram-green); }
.mask-matrix-stage p { margin: .6rem 0 0; font-size: .85rem; color: var(--text-muted); }
@media (max-width: 760px) { .mask-matrix-grid { grid-template-columns: 1fr; gap: 1.5rem; max-width: 24rem; margin-inline: auto; } }
</style>

<figure class="mask-matrix-figure">
<div class="mask-matrix-grid">
<div class="mask-matrix-stage">
<h5>1. Unnormalized scores</h5>
<table aria-label="1. Unnormalized scores: rows are query tokens, columns are key tokens">
<thead><tr><th scope="col">Q ↓ K →</th><th scope="col">The</th><th scope="col">cat</th><th scope="col">sat</th></tr></thead>
<tbody>
<tr><th scope="row">The</th><td>1</td><td>2</td><td>3</td></tr>
<tr><th scope="row">cat</th><td>1</td><td>2</td><td>0</td></tr>
<tr><th scope="row">sat</th><td>0</td><td>1</td><td>2</td></tr>
</tbody></table>
<p>Scaled query–key scores, before masking.</p>
</div>
<div class="mask-matrix-stage">
<h5>2. Mask future positions</h5>
<table aria-label="2. Mask future positions: rows are query tokens, columns are key tokens">
<thead><tr><th scope="col">Q ↓ K →</th><th scope="col">The</th><th scope="col">cat</th><th scope="col">sat</th></tr></thead>
<tbody>
<tr><th scope="row">The</th><td>1</td><td class="mask-future">−∞</td><td class="mask-future">−∞</td></tr>
<tr><th scope="row">cat</th><td>1</td><td>2</td><td class="mask-future">−∞</td></tr>
<tr><th scope="row">sat</th><td>0</td><td>1</td><td>2</td></tr>
</tbody></table>
<p>Replace scores above the diagonal with −∞.</p>
</div>
<div class="mask-matrix-stage">
<h5>3. Row-wise softmax</h5>
<table aria-label="3. Row-wise softmax: rows are query tokens, columns are key tokens">
<thead><tr><th scope="col">Q ↓ K →</th><th scope="col">The</th><th scope="col">cat</th><th scope="col">sat</th></tr></thead>
<tbody>
<tr><th scope="row">The</th><td>1.000</td><td class="mask-future">0</td><td class="mask-future">0</td></tr>
<tr><th scope="row">cat</th><td>0.269</td><td>0.731</td><td class="mask-future">0</td></tr>
<tr><th scope="row">sat</th><td>0.090</td><td>0.245</td><td>0.665</td></tr>
</tbody></table>
<p>Each row sums to 1; future tokens get 0.</p>
</div>
</div>
<figcaption>Illustrative attention scores for “The cat sat.” Rows are query positions; columns are key positions. The diagonal stays visible, so each token can attend to itself. The final numbers are attention weights over input positions, not next-token probabilities.</figcaption>
</figure>

Masking lets us train on all positions simultaneously while preserving the same information restriction used when generating one token at a time.[^teacher-forcing]

#### Cross-Attention

<figure class="narrow" style="max-width: min(22rem, 100%); margin-inline: auto;">
  <img src="/images/notes/transformer-query-key-value-paths.jpg" alt="Annotated Transformer architecture showing Q, K, and V paths. Encoder self-attention and decoder masked self-attention each use their own sequence for all three; decoder cross-attention receives Q from the decoder and K and V from the encoder output." width="478" height="418" />
  <figcaption>Q, K, and V sources in the Transformer. Annotated architecture diagram adapted from <a href="https://arxiv.org/html/1706.03762v7#S3.F1">Vaswani et al., Figure 1</a>.</figcaption>
</figure>

In **self-attention**, queries ($Q$), keys ($K$), and values ($V$) come from the same sequence. Each token attends to positions in that sequence, subject to any mask.

In **cross-attention**, queries come from one sequence, while keys and values come from another. This lets one sequence selectively retrieve information from another. In the original Transformer decoder, queries come from the decoder states after masked self-attention; keys and values come from the encoder's final output [[2]](#ref-attention-is-all-you-need). Each is formed through its own learned projection.

Suppose we are translating:

- **English input:** “I love machine learning”
- **French output:** “J'aime l'apprentissage automatique”

Focus on the decoder position containing **“J'aime.”** Its masked self-attention can use the French prefix available so far. Its cross-attention query instead attends to the English encoder representations for “I,” “love,” “machine,” and “learning.” The resulting weighted combination of English value vectors helps the decoder predict the next French token.

<style>
.cross-attention-comparison { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
.cross-attention-panel { min-width: 0; }
.cross-attention-panel h5 { margin: 0 0 .5rem; font-size: 1rem; color: var(--heading); }
.cross-attention-panel svg { display: block; width: 100%; height: auto; font-family: inherit; color: var(--text); }
@media (max-width: 760px) { .cross-attention-comparison { grid-template-columns: 1fr; max-width: 26rem; margin-inline: auto; } }
</style>

<figure>
<div class="cross-attention-comparison">
<div class="cross-attention-panel">
<h5>Masked self-attention</h5>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 325" role="img" aria-label="Masked self-attention: the query at J’aime attends to the French prefix, start and J’aime. The resulting attention weights mix values from that French sequence.">
  <rect x="8" y="12" width="178" height="108" rx="8" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)" />
  <rect x="202" y="12" width="210" height="108" rx="8" fill="var(--diagram-green)" stroke="var(--diagram-green-border)" />
  <g fill="currentColor" text-anchor="middle" font-size="15">
    <text x="97" y="40">French decoder input</text>
    <text x="97" y="70" font-size="21">J’aime</text>
    <text x="97" y="100" font-size="11">selected query position</text>
    <text x="307" y="44">French decoder input</text>
    <text x="307" y="77" font-size="16">⟨start⟩ · J’aime</text>
    <text x="307" y="102" font-size="12">same sequence as Q</text>
  </g>
  <g fill="none" stroke="var(--text-muted)" stroke-width="1.5">
    <path d="M97 120 V145 M92 139 L97 145 L102 139" />
    <path d="M307 120 V145 M302 139 L307 145 L312 139" />
    <path d="M97 183 V203 H155 V219 M150 213 L155 219 L160 213" />
    <path d="M307 183 V203 H265 V219 M260 213 L265 219 L270 213" />
    <path d="M210 264 V285 M205 279 L210 285 L215 279" />
  </g>
  <g fill="currentColor" text-anchor="middle" font-size="17">
    <text x="97" y="173">Q</text>
    <text x="307" y="173">K, V</text>
  </g>
  <rect x="55" y="220" width="310" height="44" rx="8" fill="var(--surface)" stroke="var(--border)" />
  <text x="210" y="248" fill="currentColor" text-anchor="middle" font-size="16">Score Q against K → softmax → mix V</text>
  <text x="210" y="311" fill="currentColor" text-anchor="middle" font-size="15">Updated representation at J’aime</text>
</svg>
</div>
<div class="cross-attention-panel">
<h5>Cross-attention</h5>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 325" role="img" aria-label="Cross-attention: the query at J’aime attends to English encoder outputs for I love machine learning. The resulting attention weights mix values from that English sequence.">
  <rect x="8" y="12" width="178" height="108" rx="8" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)" />
  <rect x="202" y="12" width="210" height="108" rx="8" fill="var(--diagram-green)" stroke="var(--diagram-green-border)" />
  <g fill="currentColor" text-anchor="middle" font-size="15">
    <text x="97" y="40">French decoder state</text>
    <text x="97" y="70" font-size="21">J’aime</text>
    <text x="97" y="100" font-size="11">after masked self-attention</text>
    <text x="307" y="44">English encoder output</text>
    <text x="307" y="77" font-size="12">I · love · machine · learning</text>
    <text x="307" y="102" font-size="12">different sequence</text>
  </g>
  <g fill="none" stroke="var(--text-muted)" stroke-width="1.5">
    <path d="M97 120 V145 M92 139 L97 145 L102 139" />
    <path d="M307 120 V145 M302 139 L307 145 L312 139" />
    <path d="M97 183 V203 H155 V219 M150 213 L155 219 L160 213" />
    <path d="M307 183 V203 H265 V219 M260 213 L265 219 L270 213" />
    <path d="M210 264 V285 M205 279 L210 285 L215 279" />
  </g>
  <g fill="currentColor" text-anchor="middle" font-size="17">
    <text x="97" y="173">Q</text>
    <text x="307" y="173">K, V</text>
  </g>
  <rect x="55" y="220" width="310" height="44" rx="8" fill="var(--surface)" stroke="var(--border)" />
  <text x="210" y="248" fill="currentColor" text-anchor="middle" font-size="16">Score Q against K → softmax → mix V</text>
  <text x="210" y="311" fill="currentColor" text-anchor="middle" font-size="15">Updated representation at J’aime</text>
</svg>
</div>
</div>
<figcaption>The same query position, two sources of context: the French prefix in masked self-attention, and the English input in cross-attention. Words are shown as single tokens for illustration; actual tokenizers may split them into smaller pieces. ⟨start⟩ marks the beginning of the decoder input.</figcaption>
</figure>

Cross-attention can attend to all English input positions because the entire source sentence is already available. The causal mask applies to the decoder's self-attention over the French sequence.

[^teacher-forcing]: Training does not have to wait for an earlier prediction. Instead, we supply the ground-truth tokens as the decoder input, shifted by one position relative to the targets. This is called **teacher forcing**.

[^layer-norm-shift]: **What is internal covariate shift?** Each layer receives representations produced by earlier layers. As the earlier weights change during training, the distribution of inputs received by later layers can change too. This is traditionally called *internal covariate shift*.

    For a simple illustration, suppose Layer A feeds Layer B. Before a weight update, A produces $(2, 4, 6, 8)$; afterward, it produces $(20, 40, 60, 80)$. Layer B now receives values at a different scale.

    **How does layer normalization help?** Treat each row below as the feature vector of one token. Subtract the mean $\mu$ and divide by the standard deviation $\sigma$:

    | Input to Layer B | Mean $\mu$ | Standard deviation $\sigma$ | Normalized features $(x-\mu)/\sigma$ |
    | --- | --- | --- | --- |
    | $(2, 4, 6, 8)$ | $(2+4+6+8)/4 = 5$ | $\sqrt{(9+1+1+9)/4} = \sqrt{5}$ | $(-3,-1,1,3)/\sqrt{5} \approx (-1.34,-0.45,0.45,1.34)$ |
    | $(20, 40, 60, 80)$ | $(20+40+60+80)/4 = 50$ | $\sqrt{(900+100+100+900)/4} = \sqrt{500}$ | $(-30,-10,10,30)/\sqrt{500} \approx (-1.34,-0.45,0.45,1.34)$ |

    The two vectors have different scales but produce the same normalized features in this simplified example. Actual layer normalization uses $\sqrt{\sigma^2+\epsilon}$ in the denominator for numerical stability, then applies learned scale and bias parameters. The example omits these adjustments. Controlling feature scale can make optimization more stable, but normalization does not freeze the full input distribution or prevent learned representations from changing.

[^mlp-gpt2-activation]: For GPT-2, replace ReLU with GELU.

[^attention-head-dimensions]: For one attention head, let $d$ be the query and key dimension, as above, and let $d_v$ be the value dimension. Queries and keys need the same dimension so we can take their dot product. Values can have a different dimension.

[^three-layer-encoder]: If $N = 3$, the encoder side of the architecture is:

    ```text
    Input tokens
        ↓
    Embeddings + positional encoding
        ↓
    Encoder layer 1
        ↓
    Encoder layer 2
        ↓
    Encoder layer 3
        ↓
    Final input representations → decoder
    ```

    Each encoder layer updates the full sequence of token vectors. The final representations are supplied to the decoder's cross-attention sublayers.
