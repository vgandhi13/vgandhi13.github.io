---
title: Reinforcement Learning for Large Language Models
description: Notes on RL methods for training LLMs, including GRPO, the critic-free policy gradient method behind recent reasoning models.
date: 2026-07-30
updated: 2026-08-29
---

Yann LeCun has described intelligence with a cake analogy: "If intelligence is a cake, the bulk
of the cake is unsupervised learning, the icing on the cake is supervised learning, and the
cherry on the cake is reinforcement learning (RL)."

Conventional LLMs typically go through a three-step training pipeline, following this:

1. **Pre-training.** Self-supervised learning on vast swaths of internet data makes up the
   majority of the cake, especially when viewed in compute spent (FLOPs).
2. **Supervised fine-tuning (SFT).** The beginning of post-training.
3. **Reinforcement learning.** Used for alignment and for creating "reasoning" or "thinking"
   models, via RLHF (Reinforcement Learning from Human Feedback) or RLVR (Reinforcement Learning
   with Verifiable Rewards).

## Reinforcement Learning from Human Feedback (RLHF)

There is no verifiable answer to check against for most of what we ask a model to do, so RLHF
gets its signal from people instead. Thousands of human judgements are collected, each one a
pairwise preference between two candidate answers to the same prompt: A over B, D over C, and so
on. A neural network, the reward model, is then trained to imitate those preferences, so it can
score responses the way the annotators would have.

<figure>
  <img src="/images/notes/rlhf-reward-model.png" alt="Diagram: three boxes of pairwise human preferences, answer A over answer B, answer D over answer C, answer E over answer F, plus a note that there are thousands more, all feeding by arrows into a reward model described as a whole separate network" />
  <figcaption>Thousands of pairwise human judgements are distilled into a reward model, a whole separate network. Source: <a href="https://www.youtube.com/watch?v=pW34NAiXmns">GRPO explained</a>.</figcaption>
</figure>

That reward model is what the policy is then optimized against, which is the proxy the RLVR
section below contrasts with.

TODO: will update this section later.

## Reinforcement Learning with Verifiable Rewards (RLVR)

The training method for these models, Reinforcement Learning with Verifiable Rewards
(RLVR)[^rlvr], proceeds very similarly to RLHF, but it makes the reward model optional in lieu
of a scoring function that returns a positive reward when the answer is correct and 0 otherwise.

RLHF collects human preference data, trains a reward model on it, then optimizes the policy
against that proxy. RLVR skips all of that when you have a ground truth to check against: the
reward signal is the ground truth itself, not a learned approximation of it.

This can be seen as an RL feedback loop where, instead of a reward model, a verification
function scores the agent's completions.

<figure>
  <img src="/images/notes/rlvr-feedback-loop.png" alt="RLVR feedback loop diagram: training data provides prompts to an agent (policy pi-theta), which produces completions; a Verifiable Reward block scores the completion (reward = gamma if correct, else 0) and feeds the scalar reward back to the agent for a policy update" />
  <figcaption>RLVR as an RL feedback loop: a verification function stands in for the reward model. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
</figure>

See below to see how different it is to score responses for RLHF versus RLVR. In RLHF, a reward
model must evaluate subjective qualities. In contrast, RLVR uses verification functions that
return definitive scores.

<div class="figure-row">
  <div class="figure-col">
    <figure>
      <img src="/images/notes/rlhf-scoring-example.png" alt="RLHF example: a prompt asking to explain opportunity cost in economics, with an open-ended prose response and no verification step, since a reward model must judge subjective quality" />
      <figcaption>RLHF: scoring is a subjective judgment call. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
    </figure>
  </div>
  <div class="figure-col">
    <figure>
      <img src="/images/notes/rlvr-scoring-example.png" alt="RLVR example: a prompt asking for the sum of primes less than 20, with a response boxing the final answer 77, verified by the check extracted_answer == 77 giving Reward = 1" />
      <figcaption>RLVR: scoring is a definitive check against the extracted answer. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
    </figure>
    <figure>
      <img src="/images/notes/rlvr-code-scoring-example.png" alt="RLVR example for code generation: a prompt asking for a Python Fibonacci function, verified by unit tests (fib(0) == 0, fib(1) == 1, fib(10) == 55), all passing for Reward = 1" />
      <figcaption>RLVR for code generation: verification via unit tests. Source: <a href="https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr">RLHF Book</a>.</figcaption>
    </figure>
  </div>
</div>

Unlike RLHF, there is no reward model to train, no reward model to overfit, and no proxy
misalignment to worry about. But this only works when correctness is cleanly verifiable: for
tasks where quality is subjective or multi-dimensional, you are back to needing a learned
reward.

As mentioned before, PPO was the original algorithm used in RLHF.

## Group Relative Policy Optimization (GRPO)

From a technical standpoint, it works perfectly fine to use PPO in the RL pipeline used to
develop reasoning models. However, DeepSeek-R1's RL pipeline instead used an algorithm called
Group Relative Policy Optimization (GRPO), introduced as a variant of Proximal Policy
Optimization (PPO) that improves mathematical reasoning ability while reducing PPO's memory
footprint.

GRPO shares a very similar surrogate loss to PPO, but avoids learning a value function, which
would otherwise require keeping another copy of the policy language model in memory just to
estimate value. GRPO says you don't need a learned critic or a learned reward model: sample a
group of responses, score them against a rule-based check, and use the spread as your training
signal. That is the whole algorithm.

GRPO does this by simplifying value estimation: instead of a learned value function, it assigns
the same baseline to every token in an episode, estimated via a Monte Carlo estimate over
multiple completions ($a_i$) and their rewards ($r_i$), sampled from the same initial
prompt/state ($s$).

For one prompt $s$, GRPO samples a group of $G$ completions $a_1, \ldots, a_G$ from the old
policy $\pi_{\theta_{\text{old}}}$. $G$ is the group size, and two indices matter below: $i = 1,
\ldots, G$ runs over completions in the group, while $t = 1, \ldots, T_i$ runs over the tokens
inside completion $i$.

The split between those two indices is the thing to hold onto, because the two halves of the
objective live at different levels. The **importance ratio is per token**: writing $a_{i,t}$ for
the $t$-th token of completion $i$ and $a_{i,<t}$ for the tokens before it,

$$
\rho_{i,t}(\theta) = \frac{\pi_\theta(a_{i,t} \mid s,\, a_{i,<t})}{\pi_{\theta_{\text{old}}}(a_{i,t} \mid s,\, a_{i,<t})},
$$

so a completion of $T_i$ tokens contributes $T_i$ separate ratios.[^ratio-symbol] The **reward and
the advantage are per sequence**: the verifier scores the finished completion, so there is a
single $A_i$ for completion $i$ and every token in it is pushed by that same number.

Putting the two levels together, the objective (or loss) is:

$$
J(\theta) = \frac{1}{G}\sum_{i=1}^{G} \frac{1}{T_i} \sum_{t=1}^{T_i} \min\left(\rho_{i,t} A_i,\ \text{clip}\left(\rho_{i,t}, 1-\varepsilon, 1+\varepsilon\right) A_i\right) - \beta\, \mathcal{D}_{\text{KL}}(\pi_\theta \Vert \pi_{\text{ref}})
$$

Concretely, if completion $i$ is “The answer is 12”, tokenized as $a_{i,1} = \text{The}$,
$a_{i,2} = \text{ answer}$, $a_{i,3} = \text{ is}$, $a_{i,4} = \text{ 12}$, then $T_i = 4$ and
that completion contributes four ratios $\rho_{i,1}, \ldots, \rho_{i,4}$, each multiplied by the
same sequence-level advantage $A_i$.

To make an update meaningful, the advantage $A_i$ is computed by subtracting this baseline from
the reward. A positive advantage means the response was better than expected, so its probability
should increase; a negative advantage means it was worse than expected, so its probability
should decrease.

In PPO, the baseline comes from a learned value function. GRPO instead gets it from the group
itself, using the rewards $r_1, \ldots, r_G$ of the completions sampled for this prompt:

$$
\text{baseline} = \text{mean}(r_1, \ldots, r_G), \qquad A_i = \frac{r_i - \text{baseline}}{\text{std}(r_1, \ldots, r_G)}.
$$

Completions that score above the group average get a positive advantage and become more likely;
completions that score below average get a negative advantage and become less likely. The model
is always learning relative to itself, not some externally defined standard.

<figure>
  <img src="/images/notes/grpo-group-baseline.png" alt="Diagram titled 'Let the group be its own baseline': a prompt q and a verifier feed K sampled responses, drawn as bars against a dashed horizontal line marking the group mean; bars above the mean carry upward arrows and bars below carry downward arrows, with a note reading 'no value network, no extra model'" />
  <figcaption>The group mean is the baseline: bars above it are reinforced, bars below are suppressed, and no value network is needed to draw the line. Source: <a href="https://www.youtube.com/watch?v=pW34NAiXmns">GRPO explained</a>.</figcaption>
</figure>

<style>
  .grpo-demo {
    --gd-good: #146c3f;
    --gd-good-bg: #e9f5ee;
    --gd-good-border: #a6d5ba;
    --gd-bad: #a32222;
    --gd-bad-bg: #fceaea;
    --gd-bad-border: #eab3b3;
    --gd-warn: #8a6412;
    --gd-warn-bg: #fdf4e3;
    --gd-warn-border: #e5c78d;
    --gd-panel: var(--surface);
    --gd-card: var(--bg);
    --gd-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    margin: 1.75rem 0;
  }
  :root[data-theme='dark'] .grpo-demo {
    --gd-good: #5fd39a;
    --gd-good-bg: #17301f;
    --gd-good-border: #2f6b4b;
    --gd-bad: #f0918f;
    --gd-bad-bg: #341d1d;
    --gd-bad-border: #6e3838;
    --gd-warn: #d9a93a;
    --gd-warn-bg: #332811;
    --gd-warn-border: #6b552a;
    --gd-panel: #15181d;
    --gd-card: var(--surface);
  }
  .grpo-panel {
    background: var(--gd-panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.85rem 1rem 1rem;
  }
  .grpo-step {
    margin: 0 0 0.7rem;
    font-size: 0.78rem;
    letter-spacing: 0.02em;
    color: var(--text-muted);
  }
  .grpo-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.6rem;
  }
  .grpo-card {
    background: var(--gd-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.7rem 0.4rem;
    text-align: center;
  }
  .grpo-card.is-good { border-color: var(--gd-good-border); }
  .grpo-card.is-bad { border-color: var(--gd-bad-border); }
  .grpo-card.is-warn { border-color: var(--gd-warn-border); }
  .grpo-oid {
    font-family: var(--gd-mono);
    font-size: 0.72rem;
    color: var(--text-muted);
  }
  .grpo-ans {
    margin-top: 0.2rem;
    font-family: var(--gd-mono);
    font-size: 1rem;
    font-weight: 600;
    color: var(--heading);
  }
  .grpo-lab {
    margin-top: 0.5rem;
    font-size: 0.7rem;
    color: var(--text-muted);
  }
  .grpo-score {
    font-family: var(--gd-mono);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--heading);
  }
  .grpo-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0;
    color: var(--text-muted);
    font-size: 0.78rem;
  }
  .grpo-arrow i {
    display: block;
    width: 1px;
    height: 13px;
    background: currentColor;
    opacity: 0.45;
  }
  .grpo-arrow b {
    font-weight: 400;
    text-align: center;
  }
  .grpo-eq {
    background: var(--gd-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.8rem 0.6rem;
    text-align: center;
    font-family: var(--gd-mono);
    font-size: 0.95rem;
    color: var(--heading);
    overflow-x: auto;
  }
  .grpo-ask {
    background: var(--gd-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.8rem 0.7rem;
    text-align: center;
    font-size: 1rem;
    font-weight: 600;
    color: var(--heading);
  }
  .grpo-calc {
    font-family: var(--gd-mono);
    font-size: 0.78rem;
    color: var(--text-muted);
  }
  .grpo-adv {
    margin-top: 0.15rem;
    font-family: var(--gd-mono);
    font-size: 1.15rem;
    font-weight: 700;
  }
  .grpo-adv.is-up { color: var(--gd-good); }
  .grpo-adv.is-down { color: var(--gd-bad); }
  .grpo-adv.is-mild { color: var(--gd-warn); }
  .grpo-pill {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.72rem;
    white-space: nowrap;
  }
  .grpo-pill.is-up { background: var(--gd-good-bg); color: var(--gd-good); }
  .grpo-pill.is-down { background: var(--gd-bad-bg); color: var(--gd-bad); }
  .grpo-pill.is-mild { background: var(--gd-warn-bg); color: var(--gd-warn); }
  .grpo-final {
    background: var(--gd-good-bg);
    border: 1px solid var(--gd-good-border);
    border-radius: 8px;
    padding: 0.8rem 0.7rem;
    text-align: center;
    font-weight: 600;
    color: var(--heading);
  }
  .grpo-source {
    margin: 0.5rem 0 0;
    font-size: 0.82rem;
    color: var(--text-muted);
  }
  .grpo-controls {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.9rem;
  }
  .grpo-btn {
    padding: 0.28rem 0.9rem;
    background: none;
    border: 1px solid var(--border);
    border-radius: 999px;
    font: inherit;
    font-size: 0.82rem;
    color: var(--text-muted);
    cursor: pointer;
  }
  .grpo-btn:hover,
  .grpo-btn:focus-visible {
    color: var(--link);
    border-color: var(--link);
  }
  /* Staged reveal. Base state is fully visible, so with no JS (which never adds
     .is-playing) the whole walkthrough still reads as a static diagram. */
  @keyframes grpo-in {
    from { opacity: 0; transform: translateY(7px); }
    to { opacity: 1; transform: none; }
  }
  .grpo-demo.is-playing .grpo-reveal {
    opacity: 0;
    animation: grpo-in 0.42s ease forwards;
    animation-delay: calc(var(--i) * 130ms);
  }
  @media (prefers-reduced-motion: reduce) {
    .grpo-demo.is-playing .grpo-reveal {
      opacity: 1;
      animation: none;
    }
  }
  @media (max-width: 640px) {
    .grpo-cards { grid-template-columns: repeat(2, 1fr); }
    .grpo-eq { font-size: 0.82rem; }
  }
</style>

<div class="grpo-demo" id="grpo-demo">
  <div class="grpo-panel grpo-reveal" style="--i: 0">
    <p class="grpo-step">prompt</p>
    <div class="grpo-ask">“What is 17 × 24?”</div>
  </div>
  <div class="grpo-arrow grpo-reveal" style="--i: 1"><i></i><b>sample 4 answers</b><i></i><span aria-hidden="true">▾</span></div>
  <div class="grpo-panel grpo-reveal" style="--i: 2">
    <p class="grpo-step">① score each answer</p>
    <div class="grpo-cards">
      <div class="grpo-card is-good grpo-reveal" style="--i: 3">
        <div class="grpo-oid">o₁</div>
        <div class="grpo-ans">408 ✓</div>
        <div class="grpo-lab">score</div>
        <div class="grpo-score">1.0</div>
      </div>
      <div class="grpo-card is-bad grpo-reveal" style="--i: 4">
        <div class="grpo-oid">o₂</div>
        <div class="grpo-ans">391 ✗</div>
        <div class="grpo-lab">score</div>
        <div class="grpo-score">0.0</div>
      </div>
      <div class="grpo-card is-good grpo-reveal" style="--i: 5">
        <div class="grpo-oid">o₃</div>
        <div class="grpo-ans">408 ✓</div>
        <div class="grpo-lab">score</div>
        <div class="grpo-score">1.0</div>
      </div>
      <div class="grpo-card is-warn grpo-reveal" style="--i: 6">
        <div class="grpo-oid">o₄</div>
        <div class="grpo-ans">~400 ≈</div>
        <div class="grpo-lab">score</div>
        <div class="grpo-score">0.5</div>
      </div>
    </div>
  </div>
  <div class="grpo-arrow grpo-reveal" style="--i: 7"><i></i><b>average the scores</b><i></i><span aria-hidden="true">▾</span></div>
  <div class="grpo-panel grpo-reveal" style="--i: 8">
    <p class="grpo-step">② group average</p>
    <div class="grpo-eq">(1.0 + 0.0 + 1.0 + 0.5) ÷ 4 = 0.625</div>
  </div>
  <div class="grpo-arrow grpo-reveal" style="--i: 9"><i></i><b>advantage = score − average</b><i></i><span aria-hidden="true">▾</span></div>
  <div class="grpo-panel grpo-reveal" style="--i: 10">
    <p class="grpo-step">③ who was above or below average?</p>
    <div class="grpo-cards">
      <div class="grpo-card grpo-reveal" style="--i: 11">
        <div class="grpo-calc">1.0 − 0.625</div>
        <div class="grpo-adv is-up">+0.38</div>
        <span class="grpo-pill is-up">reinforce ↑</span>
      </div>
      <div class="grpo-card grpo-reveal" style="--i: 12">
        <div class="grpo-calc">0.0 − 0.625</div>
        <div class="grpo-adv is-down">−0.63</div>
        <span class="grpo-pill is-down">suppress ↓</span>
      </div>
      <div class="grpo-card grpo-reveal" style="--i: 13">
        <div class="grpo-calc">1.0 − 0.625</div>
        <div class="grpo-adv is-up">+0.38</div>
        <span class="grpo-pill is-up">reinforce ↑</span>
      </div>
      <div class="grpo-card grpo-reveal" style="--i: 14">
        <div class="grpo-calc">0.5 − 0.625</div>
        <div class="grpo-adv is-mild">−0.13</div>
        <span class="grpo-pill is-mild">suppress ↓</span>
      </div>
    </div>
  </div>
  <div class="grpo-arrow grpo-reveal" style="--i: 15"><i></i><span aria-hidden="true">▾</span></div>
  <div class="grpo-final grpo-reveal" style="--i: 16">update weights: more of o₁, o₃ · less of o₂, o₄</div>
  <p class="grpo-source">Adapted from <a href="https://castform.com/learn/grpo-intro/">Castform's GRPO introduction</a>.</p>
  <div class="grpo-controls" hidden>
    <button type="button" class="grpo-btn grpo-replay">↺ replay</button>
  </div>
</div>

<script>
  (() => {
    const demo = document.getElementById('grpo-demo');
    if (!demo) return;
    const controls = demo.querySelector('.grpo-controls');
    const replayBtn = demo.querySelector('.grpo-replay');
    const play = () => {
      demo.classList.remove('is-playing');
      void demo.offsetWidth; // force reflow so the animations restart
      demo.classList.add('is-playing');
    };
    controls.hidden = false;
    replayBtn.addEventListener('click', play);
    // Play once when it first scrolls into view, rather than on load, so the
    // walkthrough isn't already over by the time the reader reaches it.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
          }
        }
      }, { threshold: 0.25 });
      io.observe(demo);
    } else {
      play();
    }
  })();
</script>

## How DeepSeek-R1 Models Were Trained Using RL

The DeepSeek-R1 release was three kinds of model, differing in how much RL and SFT each one got:

1. **DeepSeek-R1-Zero**, trained with pure RL.
2. **DeepSeek-R1**, trained with instruction fine-tuning (SFT) and RL.
3. **DeepSeek-R1-Distill** variants, created via instruction fine-tuning (SFT) without RL.

<figure>
  <img src="/images/notes/deepseek-r1-pipeline.png" alt="Training pipeline for the DeepSeek-R1 family: DeepSeek-V3 (671B) is trained with RL using accuracy and format rewards (RLVR) into DeepSeek-R1-Zero, which generates SFT cold-start data; that data plus RL with accuracy, format and consistency rewards produces SFT CoT data, which with rule-based verification and human preference (RLVR plus RLHF) yields DeepSeek-R1; the SFT CoT and knowledge data are then used to fine-tune Llama 3 and Qwen 2.5 into the DeepSeek-R1-Distill-Qwen and DeepSeek-R1-Distill-Llama variants" />
  <figcaption>Training pipeline for the DeepSeek-R1 family. Source: <a href="https://magazine.sebastianraschka.com/p/the-state-of-llm-reasoning-model-training">“The State of LLM Reasoning Model Training”</a>, Sebastian Raschka.</figcaption>
</figure>

DeepSeek-R1-Zero was trained using verifiable rewards (RLVR) with GRPO, starting directly from
the DeepSeek-V3 base model: no SFT stage and no human-preference reward model were used for it.
That turned out to be sufficient for the model to exhibit reasoning abilities via
intermediate-step generation, showing that it is possible to skip the SFT stage altogether. The
model improves its reasoning abilities through exploration instead of learning from examples.

<figure>
  <img src="/images/notes/r1-zero-skip-sft.png" alt="Diagram: a base model box, then an SFT warm-up box fed by human-written examples but crossed out with a large X, then an RLVR box, with an arrow running from the base model straight through to RLVR" />
  <figcaption>R1-Zero drops the SFT warm-up on human-written examples and goes from the base model straight into RLVR.</figcaption>
</figure>

What it runs instead is a loop: sample completions from the current policy, check them with the
verifier, update the policy on the result, and repeat.

<figure>
  <svg viewBox="0 0 900 230" role="img" aria-label="The RLVR training loop: rollout feeds verify, verify feeds update, and update loops back around to rollout">
    <defs>
      <marker id="rl-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 z" fill="currentColor" />
      </marker>
    </defs>
    <rect x="30" y="20" width="200" height="92" rx="12" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)" stroke-width="1.5" />
    <text x="130" y="72" text-anchor="middle" font-size="19" fill="currentColor">rollout</text>
    <rect x="350" y="20" width="200" height="92" rx="12" fill="var(--diagram-green)" stroke="var(--diagram-green-border)" stroke-width="1.5" />
    <text x="450" y="72" text-anchor="middle" font-size="19" fill="currentColor">verify</text>
    <rect x="670" y="20" width="200" height="92" rx="12" fill="var(--diagram-blue)" stroke="var(--diagram-blue-border)" stroke-width="1.5" />
    <text x="770" y="72" text-anchor="middle" font-size="19" fill="currentColor">update</text>
    <path d="M240 66 H336" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#rl-arrow)" />
    <path d="M560 66 H656" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#rl-arrow)" />
    <path d="M770 122 V170 Q770 186 754 186 H146 Q130 186 130 170 V126" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#rl-arrow)" />
    <text x="450" y="212" text-anchor="middle" font-size="14" fill="var(--text-muted)">repeat</text>
  </svg>
  <figcaption>The RLVR loop R1-Zero trains in: roll out completions, verify them, update the policy, repeat.</figcaption>
</figure>

## TODO

1. Refer to the Castform GRPO website.
2. [RLHF Book: Reasoning](https://rlhfbook.com/c/07-reasoning)
3. ["The State of LLM Reasoning Model Training"](https://magazine.sebastianraschka.com/p/the-state-of-llm-reasoning-model-training), Sebastian Raschka

[^rlvr]: See the RLHF Book's [discussion of RLVR](https://rlhfbook.com/c/07-reasoning#the-role-of-rlvr).

[^ratio-symbol]: PPO write-ups usually call this ratio $r_t$, but $r_i$ is already the reward of completion $i$ here, so the ratio gets $\rho$ instead.
